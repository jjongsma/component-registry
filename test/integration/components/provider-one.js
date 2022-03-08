'use strict';

module.exports = function(registration, config) {
  registration.provider([
    () => {
      return {
        url: 'url',
        $get: () => {
          return {
            name: 'provider-one'
          };
        }
      };
    }
  ]);
};
