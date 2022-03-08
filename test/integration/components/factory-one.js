'use strict';

module.exports = function(registration, config) {
  registration.factory(() => {
    return { name: 'factory-one' };
  });
};
