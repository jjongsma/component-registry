'use strict';

export default function(container, config) {
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
}
