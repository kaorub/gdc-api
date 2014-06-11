'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var utils = require('../../../src/common/utils');

describe('Utils', function() {
    describe('get()', function() {
        it('should return first argument if key is undefined, null or empty string', function() {
            var object = {};

            expect(utils.get(object)).to.be(object);
            expect(utils.get(object, '')).to.be(object);
            expect(utils.get(object, undefined)).to.be(object);
            expect(utils.get(object, null)).to.be(object);
        });

        it('should get a direct property of an object', function() {
            var object = { property: 'value' };

            expect(utils.get(object, 'property')).to.be('value');
        });

        it('should get a nested property of an object', function() {
            var object = { nested: { property: 'value' } };

            expect(utils.get(object, 'nested.property')).to.be('value');
        });

        it('should return undefined if an object in property chain is undefined or null', function() {
            var object = { nested: { property: 'value' } };

            expect(utils.get(object, 'some.property')).to.be(undefined);
            expect(utils.get(object, 'nested.elephant')).to.be(undefined);
        });

        it('should get an array element', function() {
            expect(utils.get(['element'], 0)).to.be('element');
        });

        it('should get a nested array element', function() {
            expect(utils.get([['element']], '0.0')).to.be('element');
        });

        describe('@each token', function() {
            it('should return an empty array if parent object is not an array', function() {
                expect(utils.get({ property: 'string' }, 'property.@each.length')).to.eql([]);
            });

            it('should return array of property values', function() {
                expect(utils.get({ property: ['string'] }, 'property.@each.length')).to.eql([6]);
            });

            it('should return array of properties themselves', function() {
                expect(utils.get({ property: ['string'] }, 'property.@each')).to.eql(['string']);
            });
        });
    });

    describe('isArray()', function() {
        it('should return true for an array', function() {
            expect(utils.isArray([])).to.be(true);
        });

        it('should return false for other types', function() {
            expect(utils.isArray({})).to.be(false);
            expect(utils.isArray(false)).to.be(false);
            expect(utils.isArray('')).to.be(false);
            expect(utils.isArray(6)).to.be(false);
            expect(utils.isArray(null)).to.be(false);
            expect(utils.isArray(undefined)).to.be(false);
        });
    });

    describe('set()', function() {
        it('should return an object whose property is being set', function() {
            var object = {};

            expect(utils.set(object, 'property', 'value')).to.be(object);
        });

        it('should modify a direct property of an object', function() {
            var object = { property: null };

            expect(utils.set(object, 'property', 'value').property).to.be('value');
        });

        it('should create a direct property of an object', function() {
            var object = {};

            expect(utils.set(object, 'property', 'value').property).to.be('value');
        });

        it('should modify a nested property of an object', function() {
            var object = { nested: {} };

            expect(utils.set(object, 'nested.property', 'value').property).to.be('value');
        });

        it('should create a nested property of an object', function() {
            var object = {};

            expect(utils.set(object, 'nested.property', 'value').property).to.be('value');
        });
    });

    describe('property()', function() {
        it('should throw an error if called with empty or non-string argument', function() {
            expect(function() { utils.property(); }).to.throwError();
            expect(function() { utils.property(0); }).to.throwError();
            expect(function() { utils.property(''); }).to.throwError();
            expect(function() { utils.property([]); }).to.throwError();
            expect(function() { utils.property({}); }).to.throwError();
            expect(function() { utils.property(true); }).to.throwError();
            expect(function() { utils.property(false); }).to.throwError();
            expect(function() { utils.property(function() {}); }).to.throwError();
        });

        it('should return a function', function() {
            expect(utils.property('property')).to.be.a('function');
        });

        it('should return value of property if called with no arguments', function() {
            var object = {
                property: utils.property('attribute'),
                attribute: 'value'
            };

            expect(object.property()).to.be('value');
        });

        it('should set value of property and return owner if called with no arguments', function() {
            var object = {
                property: utils.property('attribute'),
                attribute: 'value'
            };

            expect(object.property('new value')).to.be(object);
            expect(object.property()).to.be('new value');
        });
    });

    describe('accessor()', function() {
        it('should throw an exception if property name is empty or not a string', function() {
            expect(function() { utils.accessor(); }).to.throwError();
            expect(function() { utils.accessor(''); }).to.throwError();
            expect(function() { utils.accessor(6); }).to.throwError();
            expect(function() { utils.accessor(true); }).to.throwError();
        });

        it('should return a function', function() {
            expect(utils.accessor('property')).to.be.a('function');
        });

        it('should assign new value to property if called with an object and return object', function() {
            var value = {};
            var object = {
                assign: utils.accessor('property')
            };

            expect(object.assign(value)).to.be(object);
            expect(object.property).to.be(value);
        });

        it('should assign new value to nested property if called with an object and return object', function() {
            var value = {};
            var object = {
                assign: utils.accessor('property.attribute')
            };

            expect(object.assign(value)).to.be(object);
            expect(object.property.attribute).to.be(value);
        });

        it('should get value of property called without parameters', function() {
            var object = {
                assign: utils.accessor('property'),
                property: {
                    attribute: 'value'
                }
            };

            expect(object.assign()).to.be(object.property);
        });

        it('should get value of nested property called without parameters', function() {
            var object = {
                assign: utils.accessor('property.attribute'),
                property: {
                    attribute: 'value'
                }
            };

            expect(object.assign()).to.be('value');
        });

        it('should get value of property\'s property if called with a string parameter', function() {
            var object = {
                assign: utils.accessor('property'),
                property: {
                    attribute: 'value'
                }
            };

            expect(object.assign('attribute')).to.be('value');
        });

        it('should get value of nested property\'s property if called with a string parameter', function() {
            var object = {
                assign: utils.accessor('property.attribute'),
                property: {
                    attribute: 'value'
                }
            };

            expect(object.assign('length')).to.be(5);
        });

        it('should assign new value to property\'s property if called with a string and another parameter and return object', function() {
            var object = {
                assign: utils.accessor('property'),
                property: {
                    attribute: 'value'
                }
            };

            expect(object.assign('attribute', 'newValue')).to.be(object);
            expect(object.property.attribute).to.be('newValue');
        });

        it('should assign new value to nested property\'s property if called with a string and another parameter and return object', function() {
            var object = {
                assign: utils.accessor('property.attribute'),
                property: {
                    attribute: {
                        value: 'value'
                    }
                }
            };

            expect(object.assign('value', 'newValue')).to.be(object);
            expect(object.property.attribute.value).to.be('newValue');
        });

        it('should throw an exception if called with non-string/non-number parameter', function() {
            var object = {
                assign: utils.accessor('property'),
                property: {
                    attribute: 'value'
                }
            };

            expect(function() { object.assign(true); }).to.throwError();
            expect(function() { object.assign(true, {}); }).to.throwError();
            expect(function() { object.assign(function() {}); }).to.throwError();
            expect(function() { object.assign(function() {}, {}); }).to.throwError();
        });
    });
});
