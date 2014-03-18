var q = require('q');

/**
 * Abstract class definition
 * that provides a promise-based interface.
 *
 * Classes that inherit from this class have then() method
 * that resolves after the last asynchronous operation
 * has completed.
 *
 * @constructor
 */
var PromiseStack = function() {
    this.__promise = q();
};

/**
 * Chained method generator.
 *
 * Chained methods return this object instance
 * and add a then() clause to this object's promise.
 *
 * Beware! Returning this instance from chained method creates
 * a deadlock. Instance has then() method and is considered
 * a promise. Stack has this promise on top and resolves after this promise
 * resolves, thus blocking the stack.
 *
 * In case this happens, promise is rejected.
 *
 * In practice this means that by calling a chained method,
 * we make it run after the promise stack is resolved. Any other
 * chained method is run after this method resolves.
 *
 * In case one method in chain rejects, the others are not run.
 *
 * @static
 *
 * @param  {Function} method Method to be made chained
 * @return {Function}        Generated method
 */
PromiseStack.chainedMethod = function(method) {
    return function() {
        var args = arguments;

        this.__promise = this.__promise.then(function() {
            var result = method.apply(this, args);

            if (result instanceof PromiseStack) {
                throw new Error('You cannot return instance of PromiseStack class from chained method. This causes deadlocks');
            }

            return result;
        }.bind(this));

        return this;
    };
};

PromiseStack.prototype = {

    /**
     * Same as promise.then method.
     * See promise A+ reference for more details on promises.
     *
     * @param  {Function} done Done callback
     * @param  {Function} fail Fail callback
     * @return {Promise}
     */
    then: function(done, fail) {
        return this.__promise.then(done, fail);
    },

    /**
     * Same as promise.done method.
     * See promise A+ reference for more details on promises.
     *
     * @param  {Function} done Done callback
     * @param  {Function} fail Fail callback
     * @return {Promise}
     */
    done: function(done, fail) {
        return this.__promise.done(done, fail);
    },

    /**
     * Execute passed method after current promise stack resolves.
     *
     * Beware! Returning this instance from chained method creates
     * a deadlock. Instance has then() method and is considered
     * a promise. Stack has this promise on top and resolves after this promise
     * resolves, thus blocking the stack.
     *
     * Method is put on top of current promise stack and further calls
     * to then() and done() are resolved/rejected
     * after the method returns (or after the promise returned from the method
     * resolves).
     *
     * @param  {Function} method Method to execute
     * @return {PromiseStack} This instance
     */
    chain: function(method) {
        return PromiseStack.chainedMethod(method).call(this);
    }
};

module.exports = PromiseStack;
