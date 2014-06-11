'use strict';

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var utils = require('../../../src/common/utils');
var q = require('q');
var PromiseStack = require('../../../src/common/promise_stack');

describe('PromiseStack', function() {
    /**
     * Create custom subclass of PromiseStack class
     *
     * @constructor
     */
    var Class = function() {
        Class.__super.call(this);
    };

    // Make it inherit from PromiseStack
    // This also adds super_ property to this class (see above constructor)
    utils.inherits(Class, PromiseStack);

    Class.prototype.privateMethodA = function() {
        return null;
    };

    Class.prototype.privateMethodB = function() {
        return null;
    };

    Class.prototype.methodA = PromiseStack.chainedMethod(function() {
        return this.privateMethodA();
    });

    Class.prototype.methodB = PromiseStack.chainedMethod(function() {
        return this.privateMethodB();
    });

    beforeEach(function() {
        this.instance = new Class();
    });

    it('should have andThen method', function() {
        expect(this.instance.andThen).to.be.a(Function);
    });

    it('should have done method', function() {
        expect(this.instance.done).to.be.a(Function);
    });

    it('should be resolved with undefined by default', function(done) {
        this.instance.done(function(obj) {
            expect(obj).to.be(undefined);

            done();
        }.bind(this));
    });

    it('should return this object from chained method', function() {
        expect(this.instance.methodA()).to.be(this.instance);
    });

    it('should resolve after the last chained method resolves', function(done) {
        var deferred = q.defer();
        var spy = sinon.spy();

        // Simulate some background work controlled by us
        sinon.stub(this.instance, 'privateMethodA').returns(deferred.promise);

        this.instance.methodA().andThen(spy).done(done);

        // Our deferred object was not resolved yet,
        // our spy should not be called by now
        expect(spy).was.notCalled();

        // resolve our deferred object
        deferred.resolve();
    });

    it('should reject after the last chained method rejects', function(done) {
        var deferred = q.defer();
        var spy = sinon.spy();

        // Simulate some background work controlled by us
        sinon.stub(this.instance, 'privateMethodA').returns(deferred.promise);

        this.instance.methodA().andThen(null, spy).done(done);

        // Our deferred object was not rejected yet,
        // our spy should not be called by now
        expect(spy).was.notCalled();

        // reject our deferred object
        deferred.reject();
    });

    it('should resolve sequentially', function(done) {
        var deferredA = q.defer();
        var deferredB = q.defer();
        var spyA = sinon.spy();
        var spyB = sinon.spy();

        // Simulate some background work controlled by us
        sinon.stub(this.instance, 'privateMethodA').returns(deferredA.promise);
        sinon.stub(this.instance, 'privateMethodB').returns(deferredB.promise);

        this.instance.methodA().andThen(spyA);
        this.instance.methodB().andThen(spyB);

        this.instance.done(function() {
            expect(spyA.calledBefore(spyB)).to.be(true);
            expect(this.instance.privateMethodA.calledBefore(this.instance.privateMethodB)).to.be(true);

            done();
        }.bind(this));

        // Our deferred objects were not resolved yet,
        // our spies should have not been called
        expect(spyA).was.notCalled();
        expect(spyB).was.notCalled();

        // resolve our deferred objects in arbitrary order
        deferredB.resolve();
        deferredA.resolve();
    });

    it('should resolve chained methods sequentially', function(done) {
        var deferredA = q.defer();
        var deferredB = q.defer();

        // Simulate some background work controlled by us
        sinon.stub(this.instance, 'privateMethodA').returns(deferredA.promise);
        sinon.stub(this.instance, 'privateMethodB').returns(deferredB.promise);

        expect(this.instance.methodA().methodB()).to.be(this.instance);

        this.instance.done(function() {
            expect(this.instance.privateMethodA.calledBefore(this.instance.privateMethodB)).to.be(true);

            done();
        }.bind(this));

        // resolve our deferred objects in arbitrary order
        deferredB.resolve();
        deferredA.resolve();
    });

    it('should stop chain of methods on rejection', function(done) {
        var deferredA = q.defer();
        var deferredB = q.defer();

        // Simulate some background work controlled by us
        sinon.stub(this.instance, 'privateMethodA').returns(deferredA.promise);
        sinon.stub(this.instance, 'privateMethodB').returns(deferredB.promise);

        expect(this.instance.methodA().methodB()).to.be(this.instance);

        this.instance.done(null, function() {
            expect(this.instance.privateMethodA).was.calledOnce();
            expect(this.instance.privateMethodB).was.notCalled();

            done();
        }.bind(this));

        // resolve our deferred objects in arbitrary order
        deferredB.resolve();
        deferredA.reject({message: 'Rejected'});
    });

    it('should not create a deadlock when returning promises', function(done) {
        this.instance.methodA().andThen(function() {
            return this.methodB();
        }).done(function() {
            done();
        });
    });
});
