'use strict';

var Container = require('../../lib/container');

describe('Container', function() {

  var path = '.';
  var config = {};

  var container;
  var registryMock;

  beforeEach(function() {
    container = new Container(path, config);
    registryMock = sinon.mock(container.registry);
  });

  afterEach(function() {
    registryMock.verify();
    registryMock.restore();
  });

  describe('require()', function() {

    it('no component', function() {
      return expect(container.require()).to.eventually.be.rejectedWith(Error);
    });

    it('single component', function() {
      registryMock.expects('component').once().withArgs('single').returns(Promise.resolve('component'));
      var result = container.require('single');
      return Promise.all([
        expect(result).to.eventually.be.fulfilled,
        expect(result).to.eventually.equal('component')
      ]);
    });

    it('multiple components', function() {
      registryMock.expects('component').once().withArgs('one').returns(Promise.resolve('component'));
      registryMock.expects('component').once().withArgs('two').returns(Promise.resolve('component'));
      registryMock.expects('component').once().withArgs('three').returns(Promise.resolve('component'));
      return expect(container.require(['one','two','three'])).to.eventually.deep.equal({
        'one': 'component',
        'two': 'component',
        'three': 'component'
      });
    });

  });

});
