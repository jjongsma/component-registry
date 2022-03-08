'use strict';

module.exports = function(registration, config) {
  registration.component(() => {
    return new Promise((resolve, reject) => {
      setTimeout(() => resolve({ name: 'delayed', time: Date.now() }), 100); });
  });
};
