'use strict';

module.exports = function(registration, config) {
  registration.component([
    () => {
      // Request a runtime component during building
      return registration.require('circular-runtime-two').then(function(two) {
        return {
          name: 'circular-runtime-one',
          two: two
        };
      });
    }
  ]);
};
