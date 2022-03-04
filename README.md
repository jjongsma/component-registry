## Component Registry

A component registry for Node server applications, with dependency resolution,
injection and lazy component initialization.

### Quick Start

Configure a new registry in your app using the current directory as the module root path, and
environment variables for module configuration:

```
var ComponentRegistry = require('component-registry');
var registry = new ComponentRegistry(__dirname, process.env);

// Optional: set global aliases for modules to allow swapping dependency implementations
registry.alias('util/log', 'ext/loggly');
```

Create a component in a subdirectory of the current directory (i.e. `my-app/index.js`):

```
'use strict';

class MyApplication {

    /*
        ... module code here ...
    */

}

// Return a registration function that allows the registry to instantiate this component
// when needed
module.exports = function(container, config) {

  // Tell the registry container what type of component we are registering (component,
  // provider, factory)
  container.component([

    // Dependencies on other local components for runtime instantiation
    'util/log',

    // Multiple dependencies here will be passed to the constructor below in listed order

    // Component constructor which receives instantiated dependencies as parameters
    // (config is always last), and returns a fully configured component instance
    (logger) => new MyApplication(logger, config)

  ]);

};

// Export component class to simplify unit testing
// (You may also choose to define your module registration and underlying code in
// different files)
module.exports.MyApplication = MyApplication;
```

In your app initialization script, instantiate your core app component and let component-registry inject
any dependencies!

```
registry.require('my-app').then(app => {
    app.start().then(() => {
        console.log("Running!");
    });
});
```

### Registration Types

The registration function implemented in each of your modules (`fn(container, config)`) allows you
flexibility in how your component is initialized, and can be one of the following four types.

#### component([...dependencies, ]factory)

Register a singleton component, the most common usage. Registering a component this way ensures
all dependent modules will use the same component instance.

Example component with dependency:

```
// Creates a singleton upon the first dependency request and uses it in every
// dependent module
container.component([ 'http', $http => new RestClient($http) ]);
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

```
// The implementation below would return a new RestClient instance for each
// dependent module
container.factory([ 'http', $http => new RestClient($http) ]);
```

#### provider([...dependencies, ]factory)

Register a factory provider. This provides additional control over
factory configuration, since it has access to other providers during
instantiation. Providers can only depend on other providers as they
are being constructed - components are not available for dependency
injection at this stage.

The return value of a provider builder must contain a `$get` property
that returns the actual component factory (see factory()), but other
object properties may be defined for use by dependent providers.

Example provider with a dependency on another provider object:

```
provider(['hosts', (hostsProvider) => {
  return {
    $get: ['http', ($http) => function(path) {
      return $http.get(hostsProvider.server + path);
    }];
  };
}]);
```

#### value(val)

Register a static value as an injectable component. Since values
are static, they cannot have any dependencies.

Example:

```
container.value({ field: 'value' });
```

### Additional Documentation

More documentation coming, but read the code, it's short!