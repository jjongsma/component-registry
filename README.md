## Component Registry

A component registry for Node server applications with environment-specific configuration,
dependency resolution and injection, and lazy component initialization.

### Quick Start

Configure a new registry in your app using the current directory as the module root path, and
environment variables for module configuration:

```js
var ComponentRegistry = require('component-registry');
var registry = new ComponentRegistry(__dirname, process.env);

// Optional: set global aliases for modules to allow swapping dependency implementations
registry.alias('util/log', 'ext/loggly');
```

The first parameter to `ComponentRegistry` can be a single path, an array of paths, or omitted
entirely. These paths provide a search base for finding locally defined modules. If no modules
are found at the specified path, the registry will attempt to load it as a standard node module
installed from npm (global `require()` behavior). If you are using both local and npm components
in your registry, you may want to group your local modules under a common directory to eliminate
namespace conflicts (i.e. `local/`).

Next, create a component in a subdirectory of the current directory (i.e. `my-app/index.js`):

```js
'use strict';

class MyApplication {

    /*
        ... module code here ...
    */

}

// Return a registration function that the registry will call the first time this component
// is requested
module.exports = function(registration, config) {

  // Tell the registry what type of component we are configuring (component, provider,
  // factory, value)
  registration.component([

    // Dependencies on other local components for runtime injection
    'util/log',

    // Multiple dependencies here will be passed to the constructor below in listed order

    // Component constructor which receives initialized dependency instances as parameters
    // and returns a fully configured component instance
    (logger) => new MyApplication(logger, config)

  ]);

};

// Export underlying component class to simplify unit testing
// (You may also choose to define your module registration and underlying code in
// different files)
module.exports.MyApplication = MyApplication;
```

Then in your app initialization script, instantiate your core app component and let
component-registry inject any dependencies! Note that `require()` is async to accommodate
any complex initialization processes.

```js
let app = await registry.require('my-app');

await app.start();

console.log('Running!');
```

### Provider/Factory/Component Model

Internally, `component-registry` uses a Provider/Factory/Component model that will feel
familiar if you've been exposed to DI frameworks like AngularJS or OSGI.

`Component`: a fully-configured, ready to use instance of a type.

`Factory`: a function that is responsible for configuring and instantiating `Components`.

`Provider`: an object that allows config-time initialization of its `Factory` before
any `Components` have been created.

In simplest terms:
* A `Component` is a shortcut for a `Factory` that will only create a single shared instance
* A `Factory` is a shortcut for a `Provider` that does not require config-time initialization
* A `Provider` gives the most flexibility over this entire process

When you register a module of any type, a `Provider` is created internally which has different
pre-defined behavior depending on the type - the other helper methods are just syntactic
sugar to simplify implementations.

### Registration Types

The registration function implemented in each of your modules (`fn(registration, config)`) allows you
flexibility in how your component is initialized, and can use one of the following four types.

As an alternative to returning a fully initalized instance, you may return a `Promise` from
your factory function which resolves to the instance and the registry will await initialization
before proceeding.

#### component([...dependencies, ]factory)

Register a singleton component, the most common usage. Registering a component this way ensures
all dependent modules will use the same component instance.

Example component with dependency:

```js
// Creates a singleton upon the first dependency request and uses it in every
// dependent module
registration.component([ 'http', http => new RestClient(http) ]);

// Example using a Promise
registration.component([
  'db/postgres',
  async (db) => {
    let branding = await db.loadBranding();
    return new MyApplication(branding);
  }
]);
```

#### factory([...dependencies, ]factory)

Register a component factory. Factories allow more control over
component creation than the component() method, by allowing multiple
instances of a component to be created (or one per injection)
if desired.

The factory format is the same as for component(). Using the example
from component(), a new component would be created for each injection.
Any custom component scoping or sharing must be managed by the factory.

Example factory with dependency:

```js
// The implementation below would return a new RestClient instance for each
// dependent module
registration.factory([ 'http', http => new RestClient(http) ]);
```

#### provider([...dependencies, ]factory)

Register a factory provider. This provides additional control over
factory configuration, since it is created before any components are
instantiated and has access to other `Providers` during creation.
`Providers` can only depend on other `Providers` as they are being
constructed - `Components` are not available for dependency injection
at this stage.

The return value of a provider registration function must contain a
`$get` property that returns the component factory (see factory()), but
other object properties may be defined for use by dependent providers.

Practically speaking, it's generally only useful to explicitly define
providers when they are shared between applications and require factory
configuration that doesn't rely on this registry's `config` object.

Note: unlike other types, a `Provider` cannot return a Promise.

Example provider which exposes a configuration function during the
config phase:

```js
registration.provider(() => {

  let apiServer = 'https://api.example.com/v1';

  return {

    setApiServer: (server) => {
      apiServer = server;
    },

    $get: ['http', (http) => function(path) {
      return http.get(apiServer + path);
    }];

  };

}]);
```

Now we can bootstrap the provider configuration before initializing the app:

```js
let restClient = registry.provider('rest-client');
restClient.setApiServer(config.API_SERVER);

let app = await registry.require('my-app');
await app.start();

```

This can also be accomplished from another `Provider` which is responsible for
configuration. Let's use a `Provider` for `MyApplication` instead of a `Component`
to encapsulate the setup in one place:

```js
// MyApplication module using a provider

module.exports = function(registration, config) {

  // Specify dependency on the rest-client provider
  registration.provider('rest-client', (restClientProvider) => {
  
    restClientProvider.setApiServer(config.API_SERVER);

    return {

      // This is the same factory we used in the above example, except we
      // need to explicitly use the singleton() convenience wrapper
      $get': [
        'util/log',
        registration.singleton(
          (logger) => new MyApplication(logger, config)
        )
      ]

    };

  });

};

```

#### value(val)

Register a static value as an injectable component. Since values
are static, they cannot have any dependencies.

Example:

```js
registration.value({ field: 'value' });
```

### Building / Testing

This package can be used as-is without a specific build process. However, if you
want to deploy a minimal package with your app (no tests, etc) you can run:

`gulp build`

...and use the contents of the `dist/` folder.

Unit and integration tests can be run with:

`gulp test`

### Debugging Initialization Issues

Set REGISTRY_DEBUG=1 to see a detailed log of component initialization events (try
`REGISTRY_DEBUG=1 gulp test`)

### Additional Documentation

More documentation coming, but read the code, it's short!
