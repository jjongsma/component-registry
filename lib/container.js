/*
 * A component registry container. When a component is requested via Container.require(),
 * the container registry will attempt to find it using the search paths if it has not
 * already been loaded, and then will return an initialized instance of the component
 * from the registered component factory, injecting any required dependencies during
 * initialization.
 *
 * See registry.js for more details on implementing a loadable component module.
 */
'use strict';

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
   * components: a string or array of component names to load. If a string,
   *    a single component promise will be returned. If an array, the promise
   *    will resolve to an object mapping component names to instances.
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
        return this.registry.component(components[0]);
      }
    }

    var loaded = {};
    
    return Promise.all(components.map((svc) => 
        this.registry.component(svc).then((ready) => {
          loaded[svc] = ready;
        })
      ))
      .then(function() {
        return loaded;
      });

  }

}
