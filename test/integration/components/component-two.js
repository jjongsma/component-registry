'use strict';

module.exports = function(registration, config) {
  registration.component([
    // Dependencies
    'component-one',
    // Builder
    (one) => {
      return {
        name: 'component-two',
        one: one
      };
    }
  ]);
};
