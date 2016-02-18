'use strict';

var DependencyResolver = require('dependency-resolver');
var ComponentRegistration = require('./registration');

/*
 * The component registry. The registry handles loading scripts, managing
 * dependencies and lazily initializing components when requested.
 *
 * When a component is requested via require(), the registry will attempt
 * to find it on the configured search paths if it has not already been loaded,
 * and then will return an initialized instance of the component, injecting
 * any required dependencies into the constructor.
 *
 * A loadable component module should have the following structure:
 *
 * module.exports = function(container, config) {
 * 
 *   // Module should call one of component(), factory(), provider() or value()
 *   container.component(
 *     [
 *
 *       // Required dependencies
 *       'sample/component'
 *
 *       // Service factory method will be called with dependency instances
 *       function(sampleComponent) {
 *         // Return component instance (or promise)
 *       }
 *
 *     ]
 *   );
 *
 * };
 *
 * `container` is an instance of ComponentRegistration which exposes methods for
 * registering a component factory: provider(), factory(), component() and value().
 *
 * `config` is a map of configuration variables applicable to this component
 * (currently global, but may change before final release.)
 */
module.exports = class ComponentRegistry {

  /*
   * Build a new component registry.
   *
   * searchPaths: a string or array or root paths to search for modules
   *    to load, in the order passed
   * config (optional): a map of global config variables
   */
  constructor(optionalSearchPaths, config, options) {

    if (Array.isArray(arguments[0]) || typeof arguments[0] === 'string' || arguments[0] instanceof String) {
      this.searchPaths = arguments[0] ? [].concat(arguments[0]) : [];
      this.config = arguments[1] || {};
      this.options = arguments[2] || {};
    } else {
      this.searchPaths = [];
      this.config = arguments[0] || {};
      this.options = arguments[1] || {};
    }

    // Registered factory providers
    this.providers = {};
    this.components = {};

    // Component aliases (for overriding with common interfaces)
    this.aliases = Object.assign({}, this.options.aliases || {});

    // Currently building components
    this.building = [];

    this.providerResolver = new DependencyResolver();
    this.componentResolver = new DependencyResolver();

  }

  /*
   * Attempt to load a script from relative path from the defined search
   * paths for this registry.
   *
   * path: the relative path to the script
   */
  load(path) {
    
    for (let base of this.searchPaths.concat([null])) {

      let prefix = base ? base + '/' : '';

      try {
        return this.module(prefix + path);
      } catch (err) {
        // Ignore missing module errors
        if (err.code !== 'MODULE_NOT_FOUND') {
          throw err;
        }
      }

    }

    throw new Error('Component provider "' + path + '" not found in search path ' + this.searchPaths.toString());

  }

  module(path) {

    var props;

    if (path.indexOf(':') > -1) {
      var parts = path.split(/:/);
      props = parts[1];
      path = parts[0];
    }

    if (props) {
      return props.split(/\./).reduce((m, p) => m[p], require(path));
    }

    return require(path);

  }

  /*
   * Get a component provider from the registry. If it has not been created
   * yet, it will lazily initialize it and inject it with any required
   * provider module dependencies.
   *
   * path: the unique path where the provider will be loaded from
   */
  provider(path) {

    // Follow aliases to real provider
    while (this.aliases[path]) {
      path = aliases[path];
    }

    if (!this.providers[path]) {
      // Load module to register with current container instance
      this.load(path)(new ComponentRegistration(this, path), this.config);
    }

    if (!this.providers[path]) {
      throw new Error('No component provider registered after module initialization: ' + path);
    }

    return this.providers[path];

  }

  /*
   * Create an alias for the component specified by target.
   */
  alias(name, target) {
    this.aliases[name] = target;
  }

  /*
   * Private, intended for use by ComponentRegistration.
   *
   * path: the unique path where this provider was loaded from
   * provider: the provider spec as [dependencies..., builder]
   */
  register(path, provider) {

    if (!path) {
      throw new Error('No component provider lookup path specified');
    }

    if (!provider) {
      throw new Error('No component provider constructor specified');
    }

    if (this.providers[path]) {
      throw new Error('Component provider \'' + path + '\' is already defined');
    }

    var dependencies = [].concat(provider);
    var builder = dependencies.pop();

    // Register as a possible dependency target
    this.providerResolver.add(path);

    if (dependencies.length) {

      // Track dependencies for cycle detection
      dependencies.forEach((dep) => this.providerResolver.setDependency(path, dep));

      // Sort dependencies and verify we don't have a circular dependency
      var sorted = this.providerResolver.resolve(path);

      // Load them in correct dependency order
      var loaded = sorted.reduce((map, dep) => {
        // Don't recurse on self
        if (dep !== path) {
          map[dep] = this.provider(dep);
        }
        return map;
      }, {});

      // Inject the loaded providers into the builder in argument order
      this.providers[path] = builder.apply(null, dependencies.map((dep) => loaded[dep]));

    } else {

      // No dependencies, create provider immediately
      this.providers[path] = builder();

    }

  }

  cacheSingle(path, component, cache) {
    if (cache) {
      this.components[path] = component;
    }
    return component;
  }

  /*
   * Get a component from the registry. If it has not yet been created, it
   * will be lazily initialized and injected with any required dependencies.
   *
   * path: the unique path to the component's provider
   */
  component(path) {

    var provider = this.provider(path);

    // Check if provider registered a singleton component or if we should regenerate each time
    if (provider.single && this.components[path]) {
      return Promise.resolve(this.components[path]);
    }

    var dependencies = [].concat(provider.$get);
    var builder = dependencies.pop();

    // Register as a possible dependency target
    this.componentResolver.add(path);

    try {

      if (dependencies.length) {

        // Track dependencies for cycle detection
        dependencies.forEach((dep) => this.componentResolver.setDependency(path, dep));

        // Sort dependencies and verify we don't have a circular dependency
        var sorted = this.componentResolver.resolve(path);

        // Last dependency is self
        sorted.pop();

        // Map of dependency instances
        var resolved = {};

        // Load them in correct dependency order
        return sorted.reduce((promise, dep) =>
            promise.then(() =>
              this.component(dep).then((instance) => {
                resolved[dep] = instance;
              })),
          Promise.resolve())
          .then(() => this.building.push(path))
          // Inject the loaded providers into the builder in argument order
          .then(() => this.cacheSingle(
            path,
            builder.apply(null, dependencies.map((dep) => resolved[dep])),
            provider.single
          ))
          .then(this.built(path));

      }

      // No dependencies, return component
      this.building.push(path);
      return this.cacheSingle(path, Promise.resolve(builder()), provider.single)
        .then(this.built(path));

    } catch(err) {
      return Promise.reject(err);
    }

  }

  /*
   * Promise chain that marks a component as built for dependency tracking
   * purposes.
   */
  built(path) {

    var building = this.building;

    return function(component) {

      var buildIdx = building.indexOf(path);

      if (buildIdx > -1) {
        building.splice(buildIdx, 1);
      }

      return component;

    };

  }

  /*
   * Normalize function arguments to an array.
   */
  args() {

    var args = [];

    for (let i = 0; i < arguments.length; i++) {
      args.push(arguments[i]);
    }

    if (args.length === 1 && Array.isArray(args[0])) {
      args = args[0];
    }

    return args;

  }

  /*
   * arguments: strings or an array of component names to load. If a single
   *    string arg is passed, a single component promise will be returned.
   *    If an array, the promise will resolve to an object mapping component
   *    names to instances.
   */
  requireFrom(path) {

    var registry = this;

    return function() {
      // We're still building the component this was called from, mark it as
      // a dependency to prevent deadlocks
      if (registry.building.indexOf(path) > -1) {
        var args = registry.args.apply(registry, arguments);
        args.forEach((dep) => registry.componentResolver.setDependency(path, dep));
      }
      return registry.require.apply(registry, arguments);
    };

  }

  /*
   * arguments: strings or an array of component names to load. If a single
   *    string arg is passed, a single component promise will be returned.
   *    If an array, the promise will resolve to an object mapping component
   *    names to instances.
   */
  require() {

    if (arguments.length === 1 && !Array.isArray(arguments[0])) {
      return this.component(arguments[0]);
    }

    var components = this.args.apply(this, arguments);

    if (!components.length) {
      return Promise.reject(new Error('No component name provided for require()'));
    }

    var loaded = {};
    
    return Promise.all(components.map((svc) => 
        this.component(svc).then((ready) => {
          loaded[svc] = ready;
        })
      ))
      .then(() => loaded);

  }

};
