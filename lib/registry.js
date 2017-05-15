'use strict';

var DependencyResolver = require('dependency-resolver');
var ComponentRegistration = require('./registration');

const REGISTRY_DEBUG = process.env.REGISTRY_DEBUG;

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

    // Component observers for monitoring lifecycle
    this.observers = [];

    // Currently building components
    this.building = [];

    this.providerResolver = new DependencyResolver();
    this.componentResolver = new DependencyResolver();

  }

  /*
   * Attempt to load a module from relative path from the defined search
   * paths for this registry.
   *
   * path: the relative path to the module script
   */
  load(path) {

    var paths = [null];

    if (path.substring(0,1) !== '/') {
      paths = this.searchPaths.concat(paths);
    }

    for (let base of paths) {

      let prefix = base ? base + '/' : '';

      var module = this.module(prefix + path);

      if (module) {
        return module;
      }

    }

    throw new Error('Component provider "' + path + '" not found in search path ' + this.searchPaths.toString());

  }

  /*
   * Attempt to load a module from a single resolved path.
   *
   * path: the resolved path to the module script
   */
  module(path) {

    var props;

    if (path.indexOf(':') > -1) {
      var parts = path.split(/:/);
      props = parts[1];
      path = parts[0];
    }

    // Verify existence
    try {
      require.resolve(path);
    } catch(err) {
      return false;
    }

    if (props) {
      return props.split(/\./).reduce((m, p) => m[p], require(path));
    }

    return require(path);

  }

  /*
   * De-alias a component path for loading.
   */
  dealias(path, history) {

    history = history || [];

    if (history.length >= 10) {
      throw new Error('Followed 10 aliases, possible infinite loop');
    }

    // Follow aliases to real provider
    for (let prefix of Object.getOwnPropertyNames(this.aliases)) {

      if (path.startsWith(prefix)) {

        var next = path.replace(prefix, this.aliases[prefix]);

        if (history.indexOf(next) > -1) {
          throw new Error('Alias loop detected: ' + history);
        }

        history.push(next);

        return this.dealias(path.replace(prefix, this.aliases[prefix]), history);

      }

    }

    return path;

  }

  /*
   * Get a component provider from the registry. If it has not been created
   * yet, it will lazily initialize it and inject it with any required
   * provider module dependencies.
   *
   * path: the unique path where the provider will be loaded from
   */
  provider(path) {

    if (!this.providers[path]) {

      try {

        // Load module to register with current container instance
        var register = this.load(path);

        if (typeof register !== 'function') {
          throw new Error('Module did not return a registration function: ' + path);
        }

        register(new ComponentRegistration(this, path), this.config, path);

      } catch(err) {

        // Go up the registry chain to find a matching component
        if (this.options.parent) {
          this.providers[path] = this.options.parent.provider(path);
        } else {
          throw err;
        }

      }

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

  /*
   * A provider $builder implementation that only returns a single instance
   * of a component for the life of this registry.
   */
  singletonBuilder() {

    var registry = this;

    return function(path, provider, from, alias) {

      if (!registry.components[path]) {
        registry.components[path] = registry.build(path, provider, from, alias);
      }

      return registry.components[path];

    }

  }

  /*
   * Resolve the specified dependencies into a map of instantiated components,
   * registering the dependencies for circular reference detection.
   *
   * path: the path to the dependent (parent) module
   * dependencies: a list of dependency component paths
   */
  resolve(path, dependencies) {

    // Register as a possible dependency target
    this.componentResolver.add(path);

    if (!dependencies.length) {
      return Promise.resolve({});
    }

    // Track dependencies for cycle detection
    dependencies = dependencies.map(dep => this.dealias(dep));
    dependencies.forEach((dep) => this.componentResolver.setDependency(path, dep));

    // Sort dependencies and verify we don't have a circular dependency
    var sorted = this.componentResolver.resolve(path)
      .filter((c) => dependencies.indexOf(c) > -1);

    this.notify('resolve', path, {
      dependencies: sorted,
      description: REGISTRY_DEBUG ? '>> (' + sorted
        .map((c) => this.components[c] ? c : c + '*')
        .join(', ') + ')' : null
    });

    // Map of dependency instances
    var resolved = {};

    // Load them in correct dependency order
    return sorted.reduce((promise, dep) =>
        promise.then(() =>
          this.component(dep, path).then((instance) => {
            resolved[dep] = instance;
          })),
      Promise.resolve())
      .then(() => resolved);

  }

  /*
   * Build an instance of a component for the given path and provider.
   * This is not dependent on the provider's $builder policy, and always
   * returns a new instance.
   *
   * path: the unique component path
   * factory: the factory spec as [dependencies..., builder]
   */
  build(path, factory, from, alias) {

    if (REGISTRY_DEBUG && alias && alias !== path) {
      console.log(this.label('ALIAS', 7) + alias + ' -> ' + path);
    }

    var dependencies = [].concat(factory);
    var builder = dependencies.pop();

    this.notify('build', path, { description: (from ? '<< ' + from : null) });

    return this.resolve(path, dependencies).then((resolved) => {

      this.building.push(path);

      return Promise.resolve(builder.apply(null, dependencies.map((dep) => resolved[dep])))
        .then((component) => {

          let buildIdx = this.building.indexOf(path);

          if (buildIdx > -1) {
            this.building.splice(buildIdx, 1);
          }

          this.notify('ready', path, { component: component });

          return component;

        });

    });

  }

  /*
   * Get a component from the registry. If it has not yet been created, it
   * will be lazily initialized and injected with any required dependencies.
   *
   * path: the unique path to the component's provider
   */
  component(path, from) {

    var actual = this.dealias(path);

    var provider = this.provider(actual);

    try {

      if (provider.$builder) {
        return provider.$builder(actual, provider.$get, from, path);
      }

      return this.build(actual, provider.$get, from, path);

    } catch(err) {
      return Promise.reject(err);
    }

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

  observe(observer) {
    this.observers.push(observer);
  }

  label(name, length) {
    var label = '(' + name.toUpperCase() + ')';
    while (label.length < length + 2) {
      label += ' ';
    }
    return label + ' ';
  }

  notify(evt, path, context) {

    if (REGISTRY_DEBUG) {
      console.log(this.label(evt, 7) + path + (context.description ? ' ' + context.description : ''));
    }

    if (this.observers.length) {
      this.observers.forEach((o) => o(Object.assign({
        event: evt,
        path: path
      }, context)));
    }

  }


};
