'use strict';

module.exports = function(registration, config) {
  registration.component([
    // Dependencies
    'circular-runtime-one',
    // Builder
    (one) => {
      return {
        name: 'circular-runtime-two',
        one: one
      };
    }
  ]);
};
