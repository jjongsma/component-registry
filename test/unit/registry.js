'use strict';

var mockery = require('mockery');

var ComponentRegistry = require('../../lib/registry');
var ComponentRegistration = require('../../lib/registration');

describe('ComponentRegistry', function() {

  var path = __dirname + '/components';
  var config = { field: 'value' };

  var registry;

  beforeEach(function() {
    registry = new ComponentRegistry(path, config);
  });

  afterEach(function() {
  });

  describe('constructor', function() {

    it('no paths', () => {
      registry = new ComponentRegistry();
      expect(registry.searchPaths).to.deep.equal([]);
    });

    it('single path', () => {
      registry = new ComponentRegistry('one');
      expect(registry.searchPaths).to.deep.equal(['one']);
    });

    it('multiple paths', () => {
      registry = new ComponentRegistry(['one', 'two']);
      expect(registry.searchPaths).to.deep.equal(['one','two']);
    });

    it('default members', () => {
      assert(registry.config);
      assert(registry.providers);
    });

  });

  describe('require()', function() {

    beforeEach(function() {
      sinon.stub(registry, 'component').returns(Promise.resolve('component'));
    });

    afterEach(function() {
      registry.component.restore();
    });

    it('no component', function() {
      return expect(registry.require()).to.eventually.be.rejectedWith(Error);
    });

    it('single component', function() {
      return registry.require('single').then(function(component) {
        expect(registry.component).to.have.callCount(1);
        expect(registry.component.args[0][0]).to.equal('single');
        expect(component).to.equal('component');
      });;
    });

    it('multiple components', function() {
      return registry.require(['one','two','three']).then((components) => {
        expect(registry.component).to.have.callCount(3);
        expect(registry.component.args[0][0]).to.equal('one');
        expect(registry.component.args[1][0]).to.equal('two');
        expect(registry.component.args[2][0]).to.equal('three');
        expect(components).to.deep.equal({
          'one': 'component',
          'two': 'component',
          'three': 'component'
        });
      });
    });

  });

  describe('load()', function() {

    it('load existing', () => {
      var module = registry.load('component');
      expect(module).to.be.a('function');
    });

    it('load missing', () => {
      expect(() => registry.load('missing')).to.throw(Error);
    });

  });

  describe('module()', function() {

    before(function() {
      mockery.registerMock('external', require('./external'));
      mockery.registerMock('external/sub', require('./external/sub'));
      mockery.registerAllowable(__dirname + '/components/external');
      mockery.registerAllowable(__dirname + '/components/external/sub');
    });

    afterEach(function() {
      mockery.disable();
    });

    it('load from search path', () => {
      var module = registry.load('component');
      expect(module).to.be.a('function');
      expect(module()).to.equal('component');
    });

    it('load from search path + property', () => {
      var module = registry.load('component:prop');
      expect(module).to.be.a('function');
      expect(module()).to.equal('component.prop');
    });

    it('load from search path submodule + property', () => {
      var module = registry.load('component/sub:prop');
      expect(module).to.be.a('function');
      expect(module()).to.equal('component/sub.prop');
    });

    it('load from search path submodule + deep property', () => {
      var module = registry.load('component/sub:prop.deep');
      expect(module).to.be.a('function');
      expect(module()).to.equal('component/sub.prop.deep');
    });

    it('load external', () => {
      mockery.enable();
      var module = registry.load('external');
      mockery.disable();
      expect(module).to.be.a('function');
      expect(module()).to.equal('external');
    });

    it('load external + property', () => {
      mockery.enable();
      var module = registry.load('external:prop');
      mockery.disable();
      expect(module).to.be.a('function');
      expect(module()).to.equal('external.prop');
    });

    it('load external submodule + property', () => {
      mockery.enable();
      var module = registry.load('external/sub:prop');
      mockery.disable();
      expect(module).to.be.a('function');
      expect(module()).to.equal('external/sub.prop');
    });

    it('load missing', () => {
      expect(() => registry.load('missing')).to.throw(Error);
    });

  });

  describe('dealias()', function() {

    it('no aliases', () => {
      expect(registry.dealias('test/component')).to.equal('test/component');
    });

    it('no match', () => {
      registry.alias('foo', 'bar');
      expect(registry.dealias('test/component')).to.equal('test/component');
    });

    it('exact match', () => {
      registry.alias('test', 'replace');
      expect(registry.dealias('test')).to.equal('replace');
    });

    it('prefix match', () => {
      registry.alias('test', 'replace');
      expect(registry.dealias('test/component')).to.equal('replace/component');
    });

    it('recursive match', () => {
      registry.alias('test', 'replace');
      registry.alias('replace', 'again');
      expect(registry.dealias('test/component')).to.equal('again/component');
    });

    it('circular loop detected', () => {
      registry.alias('test', 'replace');
      registry.alias('replace', 'test');
      expect(() => registry.dealias('test/component')).to.throw('Alias loop detected');
    });

    it('infinite loop detected', () => {
      registry.alias('test', 'test/test');
      expect(() => registry.dealias('test/component')).to.throw('Followed 10 aliases, possible infinite loop');
    });

  });

  describe('provider()', function() {
    
    var mockRegistration;

    var module = function(registration, config) {
      assert(registration instanceof ComponentRegistration);
      expect(config).to.equal(registry.config);
      // Fake registry callback to prevent provider() from exploding
      registry.providers['component'] = {};
    }

    it('create existing', () => {
      sinon.stub(registry, 'load').returns(module);
      registry.provider('component');
      expect(registry.load).to.have.callCount(1);
      registry.load.restore();
    });

    it('create missing', () => {
      sinon.stub(registry, 'load').throws(new Error('missing'));
      expect(() => registry.provider('missing')).to.throw(Error);
      registry.load.restore();
    });

    it('inheritance', () => {
      var provider = { $get: 'inherited' };
      var parent = new ComponentRegistry(__dirname = '/parent', config);
      registry.options.parent = parent;
      sinon.stub(registry, 'load').throws(new Error());
      sinon.stub(parent, 'provider').returns(provider);
      var inst = registry.provider('component');
      expect(registry.load).to.have.callCount(1);
      expect(parent.provider).to.have.callCount(1);
      expect(inst).to.equal(provider);
      registry.load.restore();
    });

  });

  describe('register()', function() {

    it('missing path', () => {
      expect(() => registry.register()).to.throw(Error);
    });

    it('missing builder', () => {
      expect(() => registry.register('test')).to.throw(Error);
    });

    it('duplicate path', () => {
      registry.providers['test'] = {};
      expect(() => registry.register('test')).to.throw(Error);
    });

    it('no dependencies', () => {
      var builder = sinon.stub().returns({});
      sinon.stub(registry, 'provider');
      registry.register('test', [ builder ]);
      expect(builder).to.have.callCount(1);
      expect(registry.provider).to.have.callCount(0);
      assert(registry.providers['test']);
      registry.provider.restore();
    });

    it('missing dependencies', function() {
      var builder = sinon.stub().returns('module');
      sinon.stub(registry, 'provider').throws(new Error('missing'));
      expect(() => registry.register('one', [ 'two', builder ])).to.throw(Error);
      registry.provider.restore();
    });

    it('circular dependencies', function() {
      var builder = sinon.stub().returns('module');
      registry.providerResolver.add('two');
      registry.providerResolver.setDependency('two', 'one');
      sinon.stub(registry, 'provider').returns('dependency');
      expect(() => registry.register('one', [ 'two', builder ])).to.throw('Circular reference detected');
      registry.provider.restore();
    });

    describe('valid dependencies', function() {
      
      var builder;

      beforeEach(() => {
        builder = sinon.stub().returns('module');
        sinon.stub(registry, 'provider').returns('dependency');
        registry.register('one', [ 'two', builder ]);
      });

      afterEach(() => {
        registry.provider.restore();
      });

      it('created dependencies', () => {
        expect(registry.provider).to.have.callCount(1);
        expect(registry.provider.args[0][0]).to.equal('two');
      });

      it('called builder with dependencies', () => {
        expect(builder).to.have.callCount(1);
        expect(builder.args[0]).to.have.length(1);
        expect(builder.args[0][0]).to.equal('dependency');
      });

    });

  });

  describe('component()', function() {

    it('not registered', () => {
      expect(() => registry.component('missing')).to.throw(Error);
    });

    it('no dependencies', () => {
      var builder = sinon.stub().returns('component');
      sinon.stub(registry, 'provider').returns({
        $get: builder
      });
      return registry.component('one').then((component) => {
        expect(registry.provider).to.have.callCount(1);
        expect(builder).to.have.callCount(1);
        expect(component).to.equal('component');
        registry.provider.restore();
      });
    });

    it('single instance', () => {
      var builder = sinon.stub().returns('component');
      sinon.stub(registry, 'provider').returns({
        $get: builder,
        $builder: registry.singletonBuilder()
      });
      return registry.component('one').then((component) => {
        expect(registry.provider).to.have.callCount(1);
        expect(builder).to.have.callCount(1);
        expect(component).to.equal('component');
        return registry.component('one').then((component) => {
          expect(registry.provider).to.have.callCount(2);
          expect(builder).to.have.callCount(1);
          expect(component).to.equal('component');
          registry.provider.restore();
        });
      });
    });

    it('missing dependencies', function() {

      var builder = sinon.stub().returns('component');

      sinon.stub(registry, 'provider')
        .returns({ $get: ['two', builder ] })
        .withArgs('two').throws(new Error('missing'));

      return registry.component('one').then((component) => {
        assert.fail('component() should fail');
      }).catch((err) => {
        assert(err);
        expect(registry.provider).to.have.callCount(2);
        expect(registry.provider.args[0][0]).to.equal('one');
        expect(registry.provider.args[1][0]).to.equal('two');
        expect(builder).to.have.callCount(0);
        registry.provider.restore();
      });

    });

    it('circular dependencies', function() {

      var builder = sinon.stub().returns('component');

      sinon.stub(registry, 'provider').returns({ $get: ['two', builder ] });

      registry.componentResolver.add('two');
      registry.componentResolver.setDependency('two', 'one');

      expect(registry.component('one')).to.be.rejectedWith('Circular reference detected');
      registry.provider.restore();

    });

    describe('valid dependencies', function() {
      
      var one;
      var two;
      var result;

      beforeEach(() => {
        one = sinon.stub().returns('one');
        two = sinon.stub().returns('two');
        sinon.stub(registry, 'provider')
          .withArgs('one').returns({ $get: ['two', one ] })
          .withArgs('two').returns({ $get: [ two ] });
        result = registry.component('one');
      });

      afterEach(() => {
        registry.provider.restore();
      });

      it('created dependencies', () => {
        result.then((component) => {
          expect(two).to.have.callCount(1);
        });
      });

      it('called builder with dependencies', () => {
        result.then((component) => {
          expect(one).to.have.callCount(1);
          expect(one.args[0]).to.have.length(1);
          expect(one.args[0][0]).to.equal('two');
        });
      });

      it('component built', () => {
        result.then((component) => {
          expect(compoment).to.equal('one');
        });
      });

    });

  });

});
