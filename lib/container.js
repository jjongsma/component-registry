'use strict';

var BP = require('bluebird');

function Container(searchPaths, config) {

  searchPaths = searchPaths || [null];

  if (!Array.isArray(searchPaths)) {
    searchPaths = [searchPaths];
  }

  this.searchPaths = searchPaths;
  this.config = config || {};

  // Registered factory providers
  this.providers = {};

  // Registered service factories
  this.factory = {};

  // Initialized singleton services
  this.services = {};

}

// Register a factory provider with the container
Container.prototype.provider = function(dependencies, provider) {
};

// Register a service factory with the container
Container.prototype.factory = function(dependencies, factory) {
};

// Register a singleton service with the container
Container.prototype.service = function(dependencies, service) {
};

Container.prototype._load = function(service) {
  
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

};

Container.prototype._provider = function(service) {

  if (!this.providers[service]) {

    try {
      // Load module to register with current container instance
      this._load(service)(this, this.config);
    } catch (err) {
      return BP.reject(err);
    }

    // Providers can't be loaded asynchronously, so one should exist after previous call
    if (!this.providers[service]) {
      return BP.reject(new Error('No service provider registered after module initialization: ' + service));
    }

  }

  return BP.resolve(this.providers[service]);

};

Container.prototype._factory = function(service) {

  // Factory is already initialized
  if (this.factories[service]) {
    return BP.resolve(this.factories[service]);
  }

  // Create new factory instance and cache for future calls
  return this._provider(service)
    .then((provider) => this._factoryInstance(provider))
    .then((factory) => {
      this.factories[service] = factory;
      return factory;
    });

};

Container.prototype._service = function(service) {

  return this._factory(service)
    .then((factory) => {

      // Singleton service, cache and return
      if (factory.singleton) {

        // Already created
        if (this.services[service]) {
          return this.services[service];
        }

        // Create and cache
        return this._serviceInstance(factory)
          .then((instance) => {
            this.services[service] = instance;
            return instance;
          });

      }

      // Not singleton, new service every time
      return this._serviceInstance(factory);

    });

};

Container.prototype._factoryInstance = function(provider) {
};

Container.prototype._serviceInstance = function(factory) {
};

Container.prototype.require = function(services) {

  if (!services) {
    return BP.reject(new Error('No service name provided for require()'));
  }

  if (!Array.isArray(services)) {
    services = [services];
  }

  return BP.all(
    services.map((svc) => this._service(svc))
  );

};

module.exports = exports = Container;
