/*
 * A service registry container. When a service is requested via Container.require(),
 * the container registry will attempt to find it using the search paths if it has not
 * already been loaded, and then will return an initialized instance of the service
 * from the registered service factory, injecting any required dependencies during
 * initialization.
 *
 * See registry.js for more details on implementing a loadable service module.
 */
'use strict';

import BP from 'bluebird';
import ContainerRegistry from './registry';

export default class Container {
  
  /*
   * searchPaths: a string or array or root paths to search for modules
   *    to load, in the order passed
   * config (optional): a map of global config variables
   */
  constructor(searchPaths, config) {
    this.registry = new ContainerRegistry(searchPaths, config);
  }

  /*
   * services: a string or array of service names to load. If a string,
   *    a single service promise will be returned. If an array, the promise
   *    will resolve to an object mapping service names to instances.
   */
  require(services) {

    if (!services) {
      return BP.reject(new Error('No service name provided for require()'));
    }

    if (!Array.isArray(services)) {
      return this.registry.get(services);
    }

    var loaded = {};
    
    return BP.all(services.map((svc) => 
        this.registry.get(svc).then((ready) => {
          loaded[svc] = ready;
        })
      ))
      .thenReturn(loaded);

  }

}
