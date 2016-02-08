'use strict';

export default function(container, config) {
  container.component([
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
}
