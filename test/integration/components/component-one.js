'use strict';

// Simple component, with no dependencies
module.exports = function(container, config) {
  container.component(() => {
    return { name: 'component-one' };
  });
};
