'use strict';

module.exports = function(registration, config) {
  registration.factory([
    // Dependencies
    'component-three',
    'factory-one',
    // Builder
    (three, one) => {
      return {
        name: 'factory-two',
        three: three,
        one: one
      };
    }
  ]);
};
