/*
 * A service registration proxy. When a loadable module is initialized, it is
 * passed an instance of ContainerRegistration, which allows the module to register
 * one or more service, factory or provider methods.
 *
 * See regitry.js for more details on creating loadable service modules.
 */
'use strict'

import _ from 'lodash';
import BP from 'bluebird';

export default class ContainerRegistration {

  constructor(registry, path) {
    this.registry = registry;
    this.path = path;
  }

  decorate(builder, type, decorator) {

    if (_.isFunction(builder)) {
      builder = [builder];
    } 

    if (!Array.isArray(builder)) {
      throw new Error(type + ' must be a function, optionally as an array prefixed by dependencies');
    }

    if (!_.isFunction(builder[builder.length - 1])) {
      throw new Error(type + ' must be a function, optionally as an array prefixed by dependencies');
    }

    if (decorator) {
      return decorator(builder);
    }

    return builder;

  }

  /*
   * Register a factory provider with the container. This provides
   * additional control over factory configuration, since it has access
   * to other providers during instantiation.
   */
  provider(provider) {
    this.registry.register(this.path, this.decorate(provider, 'Provider'));
  }

  /*
   * Register a service factory with the container. This method allows
   * more control over service creation than the singleton() method, allowing
   * multiple instances of a service to be created (or one per injection)
   * if desired.
   */
  factory(factory) {
    this.registry.register(this.path, this.decorate(factory, 'Factory', (factory) => {
      return [/* no dependencies */ function() {
        return {
          $get: () => BP.resolve(factory)
        };
      }]
    }));
  }

  /*
   * Register a singleton service with the container.
   */
  singleton(factory) {
    this.registry.register(this.path, this.decorate(factory, 'Service', (factory) => {
      return [/* no dependencies */ function() {
        return {
          $get: () => BP.resolve(factory),
          singleton: true
        };
      }]
    }));
  }

}
