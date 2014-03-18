'use strict';

var PromiseStack = require('./promise_stack');
var utils = require('./utils');

/**
 * Creates new user. Besides the API instance, you'll need the user to be able to perform
 * an autheticated operation on server.
 *
 * You have to pass an API instance to the user object constructor.
 * You can pass optional data object to user in case you fetched server data somewhere else.
 *
 * @constructor
 *
 * @property {Api} api API instance
 *
 * @param {Api}    api     API instance
 */
var User = function(api) {
    User.__super.call(this);

    this.data = {};

    Object.defineProperty(this, 'api', {
        value: api,
        writable: false
    });
};

utils.inherits(User, PromiseStack, {
    /**
     * User URI
     *
     * @readOnly
     * @type {String}
     */
    uri: { get: function() { return this.data.links && this.data.links.self; } },

    /**
     * User's first name
     *
     * @type {String}
     */
    firstName: { get: function() { return this.data.firstName; }, set: function(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('First name must be a string, got ' + value);
        }

        this.data.firstName = value;
    }},

    /**
     * User's last name
     *
     * @type {String}
     */
    lastName: { get: function() { return this.data.lastName; }, set: function(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('Last name must be a string, got ' + value);
        }

        this.data.lastName = value;
    }},

    /**
     * User login
     *
     * @type {String}
     */
    username: { get: function() { return this.data.login; }, set: function(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('Username must be a string, got ' + value);
        }

        this.data.login = value;
    }},

    /**
     * User password
     *
     * @type {String}
     */
    password: { get: function() { return this.__password; }, set: function(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('Password must be a string, got ' + value);
        }

        this.__password = value;
    }}
});

User.prototype.login = PromiseStack.chainedMethod(function(username, password) {
    return this.api.request('/gdc/account/login', {
        method: 'POST',
        data: {
            postUserLogin: {
                captcha: '',
                login: username || this.username,
                password: password || this.password,
                remember: '0',
                verifyCaptcha: ''
            }
        }
    }).then(function(res) {
        return this.__load(res.data.userLogin.profile);
    }.bind(this));
});

/**
 * Load account data from profile resource.
 * This is unchained version of public load() method
 * and thus can be used inside other chained methods.
 *
 * Data is stored in `data` property of this instance
 *
 * @private
 * @see User.load()
 *
 * @param  {String} profileUri [optional] User's profile url
 * @return {Promise}
 */
User.prototype.__load = function(profileUri) {
    profileUri = profileUri || this.uri;

    return this.api.request(profileUri).then(function(res) {
        this.data = res.data.accountSetting;
        this.data.links.self = profileUri;

        return this.data;
    }.bind(this));
};

/**
 * Load account data from profile resource
 *
 * Data is stored in `data` property of this instance
 *
 * @param  {String} profileUri [optional] User's profile url
 * @return {Promise}
 */
User.prototype.load = PromiseStack.chainedMethod(User.prototype.__load);

User.prototype.register = PromiseStack.chainedMethod(function(username, password) {
    var domain = this.api.domain;
    var data = {
        login: username || this.username,
        password: password || this.password,
        email: username || this.username,
        verifyPassword: password || this.password,
        firstName: this.firstName || 'Dummy',
        lastName: this.lastName || 'User',
    };

    if (!domain) {
        throw new Error('In order to create users you have to provide a valid domain and be logged in as organization admin');
    }

    return this.api.request('/gdc/account/domain/' + this.api.domain + '/users', {
        method: 'POST',
        data: {
            accountSetting: data
        }
    }).then(function() {
        this.username = data.login;
        this.password = data.password;
        this.firstName = data.firstName;
        this.lastName = data.lastName;
    }.bind(this));
});

module.exports = User;
