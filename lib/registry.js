/*
 * A service registry. When a service() or provider() is requested,
 * the registry will attempt to find it using the search paths if it has not
 * already been loaded, and then will return an initialized instance of the requested
 * type, injecting any required dependencies during initialization.
 *
 * A loadable service module should have the following structure:
 *
 * export default function(container, config) {
 * 
 *   // Module should call one of singleton(), factory() or provider()
 *   container.factory(
 *     [
 *       // Required dependencies
 *       'sample/service'
 *     ],
 *     // Service factory method
 *     function(
 *       // Injected dependency instances
 *       sample
 *     ) {
 *      // Return service instance (or promise)
 *     }
 *   );
 * };
 *
 * `container` is an instance of ContainerRegistration which exposes methods for
 * registering a service factory: provider(), factory() and singleton().
 *
 * `config` is a map of configuration variables applicable to this service
 * (currently global, but may change before final release.)
 */
'use strict';

import BP from 'bluebird';
import DependencyResolver from 'dependency-resolver';

export default class ContainerRegistry {

  constructor(searchPaths, config) {

    searchPaths = searchPaths || [null];

    if (!Array.isArray(searchPaths)) {
      searchPaths = [searchPaths];
    }

    this.searchPaths = searchPaths;
    this.config = config || {};

    // Registered factory providers
    this.providers = {};

    // Registered service factories
    this.singletons = {};

  }

  load(service) {
    
    var provider;

    for (let path of this.searchPaths) {

      let prefix = path ? path + '/' : '';

      try {
        provider = require(prefix + service);
        break;
      } catch (err) {
        // Try next path
      }

    }

    if (!provider) {
      throw new Error('Service "' + service + '" not found in search path ' + this.searchPaths.toString());
    }

    return provider;

  }

  provider(service) {

    if (!this.providers[service]) {

      try {
        // Load module to register with current container instance
        this.load(service)(this, this.config);
      } catch (err) {
        return BP.reject(err);
      }

      // Providers can't be loaded asynchronously, so one should exist after previous call
      if (!this.providers[service]) {
        return BP.reject(new Error('No service provider registered after module initialization: ' + service));
      }

    }

    return BP.resolve(this.providers[service]);

  }

  get(service) {

    return this.provider(service)
      .then((provider) => {

        // Singleton service, cache and return
        if (provider.singleton) {

          // Already created
          if (this.singletons[service]) {
            return this.singletons[service];
          }

          // Create and cache
          return this.service(provider)
            .then((instance) => {
              this.singletons[service] = instance;
              return instance;
            });

        }

        // Not singleton, new service every time
        return this.service(provider);

      });

  }

  register(path, provider) {

    if (this.providers[path]) {
      throw new Error('Provider \'' + path + '\' is already defined');
    }

    if (provider.length === 1) {
      this.providers[path] = provider[0]();
    }

    // TODO wire up dependencies

  }

  service(provider) {

    // No dependencies, return service
    if (provider.$get.length === 1) {
      return BP.resolve(provider.$get[0]());
    }

    // TODO wire up dependencies

  }

}
