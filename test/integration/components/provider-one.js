'use strict';

module.exports = function(container, config) {
  container.provider([
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
