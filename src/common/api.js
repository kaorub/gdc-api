'use strict';

var User = require('./user');

/**
 * Entry point class. You need an instance of Api for virtually every operation.
 *
 * @constructor
 *
 * @param {Request} request Request function capable of making HTTP requests
 *
 * @throws {TypeError} If request is not a function
 *
 * @property {Request} request Request function passed to constructor
 * @property {String} domain Domain name. Proxied from request object
 */
var Api = function(request) {
    if (typeof(request) !== 'function') {
        throw new TypeError('Request must be a function, got ' + typeof(request));
    }

    Object.defineProperty(this, 'request', {
        value: request,
        writable: false
    });

    Object.defineProperty(this, 'domain', {
        value: request.domain,
        writable: false
    });
};

/**
 * Reference to User class
 *
 * @static
 * @type {Class}
 */
Api.User = User;

Api.prototype = {

    /**
     * Log debug info to console
     *
     * Only outputs to console if `debug` property is set to true
     */
    log: function() {
        if (this.debug) {
            console.log.apply(console, arguments);
        }
    },

    /**
     * Authenticate user.
     *
     * @param {User|String} username User's login or an instance of User class
     * @param {String} password [optional] User's password. You have to pass password in case you passed string username as first argument
     *
     * @return {User}
     */
    login: function(username, password) {
        var user;

        if (username instanceof User) {
            user = username;
            username = user.username;
            password = user.password;
        } else {
            user = new User(this);
        }

        return user.login(username, password);
    },

    register: function(username, password) {
        var user;

        if (username instanceof User) {
            user = username;
            username = user.username;
            password = user.password;
        } else {
            user = new User(this);
        }

        return user.register(username, password);
    }
};

module.exports = Api;
