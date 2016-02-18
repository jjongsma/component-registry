'use strict';

var ComponentRegistry = require('../../lib/registry');
var ComponentRegistration = require('../../lib/registration');

describe('ComponentRegistration', function() {

  var path = 'test';

  var registryStub;
  var registration;
  var builder;

  beforeEach(function() {
    registryStub = sinon.createStubInstance(ComponentRegistry);
    registration = new ComponentRegistration(registryStub, path);
    builder = sinon.stub().returns({});
  });

  afterEach(function() {
  });

  describe('provider()', function() {

    it('simple builder', function() {
      registration.provider(builder);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      expect(registryStub.register.args[0][1]).to.deep.equal([ builder ]);
    });

    it('builder with dependencies', function() {
      registration.provider(['one', 'two', builder]);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      expect(registryStub.register.args[0][1]).to.deep.equal([ 'one', 'two', builder ]);
    });

    it('missing builder', function() {
      expect(function() {
        registration.provider(['one', 'two']);
      }).to.throw(Error);
    });

    it('no args', function() {
      expect(function() {
        registration.provider();
      }).to.throw(Error);
    });

  });

  describe('factory()', function() {

    it('simple builder', function() {
      registration.factory(builder);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      var spec = registryStub.register.args[0][1];
      expect(spec.length).to.equal(1);
      var provider = spec[0]();
      expect(provider.$get).to.deep.equal([builder]);
    });

    it('builder with dependencies', function() {
      registration.factory(['one', 'two', builder]);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      var spec = registryStub.register.args[0][1];
      expect(spec.length).to.equal(1);
      var provider = spec[0]();
      expect(provider.$get).to.deep.equal(['one', 'two', builder]);
    });

    it('missing builder', function() {
      expect(function() {
        registration.factory(['one', 'two']);
      }).to.throw(Error);
    });

    it('no args', function() {
      expect(function() {
        registration.factory();
      }).to.throw(Error);
    });

  });

  describe('component()', function() {

    it('simple builder', function() {
      registration.component(builder);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      var spec = registryStub.register.args[0][1];
      expect(spec.length).to.equal(1);
      var provider = spec[0]();
      expect(provider.$get[0]).to.equal(builder);
      assert(provider.single);
    });

    it('builder with dependencies', function() {
      registration.component(['one', 'two', builder]);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      var spec = registryStub.register.args[0][1];
      expect(spec.length).to.equal(1);
      var provider = spec[0]();
      expect(provider.$get).to.deep.equal(['one', 'two', builder]);
      assert(provider.single);
    });

    it('missing builder', function() {
      expect(function() {
        registration.component(['one', 'two']);
      }).to.throw(Error);
    });

    it('no args', function() {
      expect(function() {
        registration.component();
      }).to.throw(Error);
    });

  });

});
