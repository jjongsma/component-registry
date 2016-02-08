'use strict';

export default function(container, config) {
  container.provider([
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
}
