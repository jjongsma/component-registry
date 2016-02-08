'use strict';

export default function(container, config) {
  container.component([
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
}
