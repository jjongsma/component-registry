/*
 * A component registry. When a component() or provider() is requested,
 * the registry will attempt to find it using the search paths if it has not
 * already been loaded, and then will return an initialized instance of the requested
 * type, injecting any required dependencies during initialization.
 *
 * A loadable component module should have the following structure:
 *
 * export default function(container, config) {
 * 
 *   // Module should call one of component(), factory() or provider()
 *   container.factory(
 *     [
 *
 *       // Required dependencies
 *       'sample/component'
 *
 *       // Service factory method
 *       function(
 *         // Injected dependency instances
 *         sample
 *       ) {
 *        // Return component instance (or promise)
 *       }
 *
 *     ]
 *   );
 * };
 *
 * `container` is an instance of ContainerRegistration which exposes methods for
 * registering a component factory: provider(), factory() and component().
 *
 * `config` is a map of configuration variables applicable to this component
 * (currently global, but may change before final release.)
 */
'use strict';

import DependencyResolver from 'dependency-resolver';
import ContainerRegistration from './registration';

export default class ContainerRegistry {

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

  provider(path) {

    if (!this.providers[path]) {
      // Load module to register with current container instance
      this.load(path)(new ContainerRegistration(this, path), this.config);
    }

    if (!this.providers[path]) {
      throw new Error('No component provider registered after module initialization: ' + path);
    }

    return this.providers[path];

  }

  // Private, intended for use by ContainerRegistration
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

  get(path) {

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
            this.get(dep).then((instance) => {
              resolved[dep] = instance;
            })),
        Promise.resolve())
        // Inject the loaded providers into the builder in argument order
        .then(() => builder.apply(null, dependencies.map((dep) => resolved[dep])));

    }

    // No dependencies, return component
    return Promise.resolve(builder());


  }

}
