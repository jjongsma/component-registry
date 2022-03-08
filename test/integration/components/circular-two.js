'use strict';

module.exports = function(registration, config) {
  registration.component([
    // Dependencies
    'circular-one',
    // Builder
    (one) => {
      return {
        name: 'circular-two',
        one: one
      };
    }
  ]);
};
