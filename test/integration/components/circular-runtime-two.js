'use strict';

export default function(container, config) {
  container.component([
    // Dependencies
    'circular-runtime-one',
    // Builder
    (one) => {
      return {
        name: 'circular-runtime-two',
        one: one
      };
    }
  ]);
}
