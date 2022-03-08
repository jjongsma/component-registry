'use strict';

module.exports = function(registration, config) {
  registration.component([
    // Dependencies
    'circular-two',
    // Builder
    (two) => {
      return {
        name: 'circular-one',
        two: two
      };
    }
  ]);
};
