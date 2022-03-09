'use strict';

/*
 * A component registration proxy. When a loadable module is initialized, it is
 * passed an instance of ComponentRegistration, which allows the module to register
 * one or more components, factories or providers.
 *
 * See registry.js for more details on creating loadable component modules.
 */
module.exports = class ComponentRegistration {

  /*
   * Create a new registration handler bound to the given registry
   * and component provider path.
   */
  constructor(registry, path) {
    this.registry = registry;
    this.path = path;
    // require() proxy for dynamic runtime dependencies
    this.require = registry.requireFrom(path);
  }

  /* 
   * Convert simple builder functions into the normalized
   * [dependencies..., builder] format.
   */
  normalize(builder, type) {

    if (typeof builder === 'function') {
      builder = [builder];
    } 

    if (!Array.isArray(builder)) {
      throw new Error(type + ' must be a function, optionally as an array prefixed by dependencies');
    }

    if (typeof builder[builder.length - 1] !== 'function') {
      throw new Error(type + ' must be a function, optionally as an array prefixed by dependencies');
    }

    return builder;

  }

  /*
   * A factory wrapper that ensures only a single shared component is created
   * and
   * of a component for the life of this registry.
   */
  singleton(factory) {

    let instance = false;

    return function(...args) {

      if (!instance) {
        instance = factory(...args);
      }

      return instance;

    }

  }

  /*
   * Register a static value as an injectable component. Since values
   * are static, they cannot have any dependencies.
   *
   * Example:
   *
   * value({ field: 'value' });
   * 
   * value: a static value or object
   */
  value(value) {

    this.registry.register(this.path, [/* no dependencies */ () => {
      return {
        $get: [ () => value ]
      };
    }]);

  }

  /*
   * Register a single-instance component.
   *
   * Example component factory with dependencies:
   *
   * component(['http', function($http) {
   *   return function(url) {
   *     return $http.get(url);
   *   };
   * }]);
   *
   * factory: a component builder as a function or in
   *     [dependencies..., builder] format
   */
  component(factory) {

    factory = this.normalize(factory, 'Component');

    // Replace factory function with singleton wrapper
    factory[factory.length - 1] = this.singleton(factory[factory.length - 1]);

    this.registry.register(this.path, [/* no dependencies */ () => {
      return {
        $get: factory
      };
    }]);

  }

  /*
   * Register a component factory. Factories allow more control over
   * component creation than the component() method, by allowing multiple
   * instances of a component to be created (or one per injection)
   * if desired.
   *
   * The factory format is the same as for component(). Using the example
   * from component(), a new component would be created for each injection.
   * Any custom component scoping or sharing must be managed by the factory.
   *
   * factory: a component builder as a function or in
   *     [dependencies..., builder] format
   */
  factory(factory) {

    factory = this.normalize(factory, 'Factory');

    this.registry.register(this.path, [/* no dependencies */ () => {
      return {
        $get: factory
      };
    }]);

  }

  /*
   * Register a factory provider. This provides additional control over
   * factory configuration, since it has access to other providers during
   * instantiation. Providers can only depend on other providers as they
   * are being constructed - components are not available for dependency
   * injection at this stage.
   *
   * The return value of a provider builder must contain a `$get` property
   * that returns the actual component factory (see factory()).
   *
   * Example provider with dependencies:
   *
   * provider(['hosts', function(hostsProvider) {
   *   return {
   *     $get: ['http', function($http) {
   *       return function(path) {
   *         return $http.get(hostsProvider.server + path);
   *       };
   *     }]
   *   };
   * }]);
   *
   * provider: a component provider as a function or in
   *     [dependencies..., builder] format.
   */
  provider(provider) {
    this.registry.register(this.path, this.normalize(provider, 'Provider'));
  }

  /*
   * This path represents an alias / link to the real component (mainly for overriding
   * implementations.)
   */
  alias(target) {
    this.registry.alias(this.path, target);
  }

};
