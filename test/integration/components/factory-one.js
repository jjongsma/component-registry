'use strict';

export default function(container, config) {
  container.factory(() => {
    return { name: 'factory-one' };
  });
}
