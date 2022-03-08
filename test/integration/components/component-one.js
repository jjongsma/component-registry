'use strict';

// Simple component, with no dependencies
module.exports = function(registration, config) {
  registration.component(() => {
    return { name: 'component-one' };
  });
};
