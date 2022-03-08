'use strict';

module.exports = function(registration, config) {
  registration.provider([
    // Dependencies
    'provider-one',
    // Builder
    (one) => {
      return {
        one: one,
        $get: [ 'component-three', 'factory-two', (three, two) => {
          return {
            name: 'provider-two',
            three: three,
            two: two
          };
        }]
      };
    }
  ]);
};
