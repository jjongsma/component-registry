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

/*
    ... module code here ...
*/

// Return a registration function that allows the registry to instantiate this component
// when needed
module.exports = function(container, config) {

  // Tell the registry container what type of component we are registering (component,
  // provider, factory)
  container.component([

    // Dependencies on other registered components for dynamic injection
    'util/log',

    // Multiple dependencies here will be passed to the constructor below in listed order

    // Component constructor which receives instantiated dependencies as parameters
    // (config is always last)
    (logger) => new MyApplication(logger, config)

  ]);

};

// Export component class to simplify unit testing
module.exports.MyApplication = MyApplication;
```

In your app initialization script, instantiate your core app component and let component-registry inject
any dependencies!

```
registry.require('my-app').then(app => {
    console.log("Running!")
});
```

More documentation coming, read the code, it's short!