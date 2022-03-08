'use strict';

module.exports = function(registration, config) {
  registration.component([
    // Dependencies
    'component-one',
    'component-two',
    // Builder
    (one, two) => {
      return {
        name: 'component-three',
        one: one,
        two: two
      };
    }
  ]);
};
