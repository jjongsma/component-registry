'use strict';

export default function(container, config) {
  container.component([
    () => {
      // Request a runtime component during building
      return container.require('circular-runtime-two').then(function(two) {
        return {
          name: 'circular-runtime-one',
          two: two
        };
      });
    }
  ]);
}
