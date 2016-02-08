'use strict';

var ContainerRegistry = require('../../lib/registry');

describe('Container Registry', function() {

  var path = '.';
  var config = {};

  var container;
  var registry;

  beforeEach(function() {
    registry = new ContainerRegistry(path, config);
  });

  afterEach(function() {
  });

  describe('constructor', function() {

    it('no paths');

    it('single path');

    it('multiple paths');

  });

});
