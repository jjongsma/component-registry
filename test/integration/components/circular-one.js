'use strict';

export default function(container, config) {
  container.component([
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
}
