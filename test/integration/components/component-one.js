'use strict';

// Simple component, with no dependencies
export default function(container, config) {
  container.component(() => {
    return { name: 'component-one' };
  });
}
