'use strict';

var ContainerRegistry = require('../../lib/registry');
var ContainerRegistration = require('../../lib/registration');

describe('ContainerRegistration', function() {

  var path = 'test';

  var registryStub;
  var registration;
  var builder;

  beforeEach(function() {
    registryStub = sinon.createStubInstance(ContainerRegistry);
    registration = new ContainerRegistration(registryStub, path);
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
      expect(provider.$get[0]).to.not.equal(builder);
      return provider.$get[0]().then(function(component) {
        expect(builder).to.have.callCount(1);
        return provider.$get[0]().then(function(component) {
          expect(builder).to.have.callCount(1);
        });
      });
    });

    it('builder with dependencies', function() {
      registration.component(['one', 'two', builder]);
      expect(registryStub.register).to.have.callCount(1);
      expect(registryStub.register.args[0][0]).to.equal('test');
      var spec = registryStub.register.args[0][1];
      expect(spec.length).to.equal(1);
      var provider = spec[0]();
      expect(provider.$get[0]).to.equal('one');
      expect(provider.$get[1]).to.equal('two');
      expect(provider.$get[2]).to.not.equal(builder);
      return provider.$get[2]().then(function(component) {
        expect(builder).to.have.callCount(1);
        return provider.$get[2]().then(function(component) {
          expect(builder).to.have.callCount(1);
        });
      });
    });

    it('block concurrent creation', function() {

      var callCt = 0;

      // Return async builder with delay
      builder = function() {
        callCt++;
        return new Promise(function(resolve, reject) {
          // Builder takes 200 ms to complete
          setTimeout(() => resolve({ name: 'built:' + Date.now() }), 100);
        });
      };

      registration.component(builder);
      var provider = registryStub.register.args[0][1][0]();

      return Promise.all([
        provider.$get[0](),
        // Delay second component request 50 ms, after first starts but not finished
        new Promise(function(resolve, reject) {
          setTimeout(() => resolve(provider.$get[0]()), 50);
        })
      ]).then(function(components) {
        expect(callCt).to.equal(1);
        expect(components).to.have.length(2);
        expect(components[0]).to.equal(components[1]);
      });

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
