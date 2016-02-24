'use strict';

module.exports = function(container, config) {
  container.factory([
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
