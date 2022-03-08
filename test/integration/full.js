'use strict';

var _ = require('lodash');

var ComponentRegistry = require('../../lib/registry.js');

describe('Component registry integration', () => {

  var registry;

  beforeEach(() => {
    registry = new ComponentRegistry(
      __dirname + '/components',
      {
        'host': 'localhost',
        'component-three': {
          name: 'val'
        }
      });
  });

  describe('Value', () => {

    it('require value', () => {
      return registry.require('value').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(1);
        expect(component).to.equal('value');
      });
    });

  });

  describe('Component', () => {
    
    it('require single', () => {
      return registry.require('component-one').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(1);
        expect(component.name).to.equal('component-one');
      });
    });

    it('require again', () => {
      return registry.require('component-one').then(function() {
        return registry.require('component-one').then(function(component) {
          expect(_.keys(registry.providers)).to.have.length(1);
          expect(component.name).to.equal('component-one');
        });
      });
    });

    it('require multiple', () => {
      return registry.require('component-one', 'component-two').then(function(components) {
        expect(_.keys(registry.providers)).to.have.length(2);
        expect(_.keys(components)).to.have.length(2);
        expect(components['component-one'].name).to.equal('component-one');
        expect(components['component-two'].name).to.equal('component-two');
      });
    });

    it('single-path chain', () => {
      return registry.require('component-two').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(2);
        expect(component.name).to.equal('component-two');
        expect(component.one.name).to.equal('component-one');
      });
    });

    it('multi-path chain', () => {
      return registry.require('component-three').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(3);
        expect(component.name).to.equal('component-three');
        expect(component.one.name).to.equal('component-one');
        expect(component.two.name).to.equal('component-two');
      });
    });

  });

  describe('Factory', () => {

    it('require single', () => {
      return registry.require('factory-one').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(1);
        expect(component.name).to.equal('factory-one');
      });
    });

    it('require chain', () => {
      return registry.require('factory-two').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(5);
        expect(component.name).to.equal('factory-two');
        expect(component.one.name).to.equal('factory-one');
        expect(component.three.name).to.equal('component-three');
      });
    });

  });

  describe('Provider', () => {

    it('require single', () => {
      return registry.require('provider-one').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(1);
        expect(registry.providers['provider-one'].url).to.equal('url');
        expect(component.name).to.equal('provider-one');
      });
    });

    it('require chain', () => {
      return registry.require('provider-two').then(function(component) {
        expect(_.keys(registry.providers)).to.have.length(7);
        expect(registry.providers['provider-two'].one.url).to.equal('url');
        expect(component.name).to.equal('provider-two');
        expect(component.two.name).to.equal('factory-two');
        expect(component.three.name).to.equal('component-three');
      });
    });

  });

  describe('Circular dependencies', () => {
  
    it('explicit', () => {
      expect(registry.require('circular-one')).to.be.rejectedWith('Circular reference detected');
    });

    it('runtime', () => {
      expect(registry.require('circular-runtime-one')).to.be.rejectedWith('Circular reference detected');
    });

  });

  describe('Exclusive locks', () => {

    it('prevent duplicate component creation', () => {
      return Promise.all([
        registry.require('delayed'),
        new Promise((resolve, reject) => setTimeout(() => resolve(registry.require('delayed')), 50))
      ]).then((components) => {
        expect(components).to.have.length(2);
        expect(components[0]).to.equal(components[1]);
      });
    });

  });

});
