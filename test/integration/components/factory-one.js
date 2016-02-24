'use strict';

module.exports = function(container, config) {
  container.factory(() => {
    return { name: 'factory-one' };
  });
};
