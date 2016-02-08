'use strict';

import DependencyResolver from 'dependency-resolver';
import ComponentRegistration from './registration';

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
 * export default function(container, config) {
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
export default class ComponentRegistry {

  /*
   * Build a new component registry.
   *
   * searchPaths: a string or array or root paths to search for modules
   *    to load, in the order passed
   * config (optional): a map of global config variables
   */
  constructor(searchPaths, config) {

    if (!searchPaths) {
      throw new Error('No component search paths specified');
    }

    if (!Array.isArray(searchPaths)) {
      searchPaths = [searchPaths];
    }

    this.searchPaths = searchPaths;
    this.config = config || {};

    // Registered factory providers
    this.providers = {};

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
    
    for (let base of this.searchPaths) {

      let prefix = base ? base + '/' : '';

      try {
        return require(prefix + path);
      } catch (err) {
        // Try next path
      }

    }

    throw new Error('Component provider "' + path + '" not found in search path ' + this.searchPaths.toString());

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
      // Load module to register with current container instance
      this.load(path)(new ComponentRegistration(this, path), this.config);
    }

    if (!this.providers[path]) {
      throw new Error('No component provider registered after module initialization: ' + path);
    }

    return this.providers[path];

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
   * Get a component from the registry. If it has not yet been created, it
   * will be lazily initialized and injected with any required dependencies.
   *
   * path: the unique path to the component's provider
   */
  component(path) {

    var provider = this.provider(path);

    var dependencies = [].concat(provider.$get);
    var builder = dependencies.pop();

    // Register as a possible dependency target
    this.componentResolver.add(path);

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
        // Inject the loaded providers into the builder in argument order
        .then(() => builder.apply(null, dependencies.map((dep) => resolved[dep])));

    }

    // No dependencies, return component
    return Promise.resolve(builder());

  }

  /*
   * arguments: strings or an array of component names to load. If a single
   *    string arg is passed, a single component promise will be returned.
   *    If an array, the promise will resolve to an object mapping component
   *    names to instances.
   */
  require() {

    if (!arguments.length) {
      return Promise.reject(new Error('No component name provided for require()'));
    }

    var components = [];

    for (let i = 0; i < arguments.length; i++) {
      components.push(arguments[i]);
    }

    if (components.length === 1) {
      if (Array.isArray(components[0])) {
        components = components[0];
      } else {
        return this.component(components[0]);
      }
    }

    var loaded = {};
    
    return Promise.all(components.map((svc) => 
        this.component(svc).then((ready) => {
          loaded[svc] = ready;
        })
      ))
      .then(function() {
        return loaded;
      });

  }

}
