'use strict';

export default function(container, config) {
  container.component(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve({ name: 'delayed', time: Date.now() }), 100); });
  });
}
