var q = require('q');

/**
 * Abstract class definition
 * that provides a promise-based interface.
 *
 * Classes that inherit from this class have then() method
 * that resolves after the last asynchronous operation
 * has completed.
 *
 * @class
 */
var PromiseStack = function() {
    this.__promise = q();
};

/**
 * <p>Chained method generator.</p>
 *
 * <p>Chained methods return this object instance
 * and add a then() clause to this object's promise.</p>
 *
 * <p><strong>BEWARE</strong> Using chained methods that call other chained methods is a bad practice
 * and can lead to deadlocks.</p>
 *
 * <p>In practice this means that by calling a chained method,
 * we make it run after the promise stack is resolved. Any other
 * chained method is run after this method resolves.</p>
 *
 * <p>In case one method in chain rejects, the others are not run.</p>
 *
 * @static
 * @method chainedMethod
 * @memberOf PromiseStack
 *
 * @param  {Function|String} method Function to wrap
 * @return {Function}        Wrapped function
 */
PromiseStack.chainedMethod = function(methodOrName) {
    return function() {
        var args = arguments;
        var method = typeof(methodOrName) === 'string' ? this[methodOrName] : methodOrName;

        this.__promise = this.__promise.then(function() {
            return method.apply(this, args);
        }.bind(this));

        return this;
    };
};

PromiseStack.prototype = {

    /**
     * Returns underlying promise resolved with this instance.
     *
     * @method promise
     * @memberOf PromiseStack#
     *
     * @return {Promise}
     */
    promise: function() {
        return this.__promise.then(function() { return this; }.bind(this));
    },

    /**
     * <p>Same as promise.then method, but the callbacks are executed
     * with `this` bound to this instance.</p>
     *
     * <p>Since naming this method `then` would cause collisions
     * if returning instances of PromiseStack from done/fail callbacks
     * as they would be falsely identified as promises itself
     * and would cause infinite loops, we have to name it `andThen`</p>
     *
     * <p>See promise A+ reference for more details on promises.</p>
     *
     * @method andThen
     * @memberOf PromiseStack#
     *
     * @param  {Function} [done] Done callback
     * @param  {Function} [fail] Fail callback
     *
     * @return {Promise}
     */
    andThen: function(done, fail) {
        return this.__promise.then(done && function() {
            return done.apply(this, arguments);
        }.bind(this), fail && function() {
            return fail.apply(this, arguments);
        }.bind(this));
    },

    /**
     * <p>Same as promise.done method, but the callbacks are executed
     * with `this` bound to this instance.</p>
     *
     * <p>See promise A+ reference for more details on promises.</p>
     *
     * @method done
     * @memberOf PromiseStack#
     *
     * @param  {Function} [done] Done callback
     * @param  {Function} [fail] Fail callback
     *
     * @return {Promise}
     */
    done: function(done, fail) {
        return this.__promise.done(done && function() {
            return done.apply(this, arguments);
        }.bind(this), fail && function() {
            return fail.apply(this, arguments);
        }.bind(this));
    }
};

module.exports = PromiseStack;
