var request = require('./request');
var util = require('util');

/**
 * Entry point class. You need an instance of API for virtually every operation.
 *
 * Options object passed to this constructor has to contain `hostname`, `port` and `captchaAnswer`
 * properties. captchaAnswer is a special universal captcha answer string to be used
 * for i.e. registration.
 *
 * @constructor
 *
 * @param {Object} options Options hash
 *
 * @property {String} hostname Target hostname
 * @property {Number} port Target port number
 * @property {Boolean} debug If true, outputs verbose debug information to console
 */
var API = function(options) {
    this.debug = !!options.debug;

    var hostname, port;

    if (options.host) {
        var match = options.host.match(/^(?:https:\/\/)?(.*?)(?:\:(\d+))?$/i);

        if (match) {
            hostname = match[1];
            port = options.port || match[2] || 443;
        }
    } else {
        hostname = options.hostname;
        port = options.port || 443;
    }

    this.log('Using backend %s:%s', hostname, port);

    this.hostname = hostname;
    this.port = port;
};

/**
 * Reference to User class
 *
 * @static
 * @type {Class}
 */
API.User = require('./user');

/**
 * Reference to project class
 *
 * @static
 * @type {Class}
 */
API.Project = require('./project');

/**
 * Reference to Role class
 *
 * @static
 * @type {Class}
 */
API.Role = require('./role');

/**
 * Reference to dashboard class
 *
 * @static
 * @type {Class}
 */
API.Dashboard = require('./dashboard');

API.prototype = {

    /**
     * Target hostname
     *
     * @type {String}
     */
    get hostname() { return this.__hostname; },
    set hostname(value) {
        if (typeof(value) !== 'string' || !value.match(/^[a-z0-9_.-]+$/i)) {
            throw new Error('Invalid hostname: ' + value);
        }

        this.__hostname = value;
    },

    /**
     * Target port
     *
     * @type {String}
     */
    get port() { return this.__port; },
    set port(value) {
        var port = Number(value);

        if (isNaN(port) || port <= 0 || port % 1 !== 0) {
            throw new Error('Invalid port number: ' + port);
        }

        this.__port = port;
    }
};

/**
 * Helper function that creates and loads user based on his profile URI
 *
 * @param  {String} profileUri
 * @param  {String} password
 * @return {Promise}
 */
API.prototype.__createUser = function(profileUri, password) {
    var userInstance = new API.User(this, null, password);

    return userInstance.load(profileUri).then(function() {
        return userInstance;
    });
};

/**
 * Renew TT token after a request has failed with HTTP 401 status
 *
 * @private
 *
 * @return {Promise}
 */
API.prototype.__refreshTT = function() {
    return this.request('/gdc/account/token').then(function(res) {
        var cookies = res.headers['set-cookie'] || [];
        var tt = (function() {
            for (var i = 0, n = cookies.length; i < n; i++) {
                var match = cookies[i].match(/GDCAuthTT=(.+?)(;| |$)/);

                if (match) return match[1];
            }
        })();

        this.__tt = tt;

        if (!tt) {
            throw new Error('No temporary token returned');
        }
    }.bind(this));
};

/**
 * Log debug info to console
 *
 * Only outputs to console if `debug` is set to true
 */
API.prototype.log = function() {
    if (this.debug) {
        console.log.apply(console, arguments);
    }
};

/**
 * Authenticates user
 *
 * Returned promise is resolved with instance of User class.
 * This instance is filled with user data from server.
 *
 * @param  {Object} credentials Login credentials. Must contain `username` and `password` properties
 * @return {Promise}
 */
API.prototype.login = function(user) {
    return this.request('/gdc/account/login', 'POST', {
        postUserLogin: {
            captcha: '',
            login: user.username,
            password: user.password,
            remember: '0',
            verifyCaptcha: ''
        }
    }).then(function(res) {
        var cookies = res.headers['set-cookie'] || [];
        var sst = (function() {
            for (var i = 0, n = cookies.length; i < n; i++) {
                var match = cookies[i].match(/GDCAuthSST=(.+?)(;| |$)/);

                if (match) return match[1];
            }
        })();

        if (!sst) {
            throw new Error('SST not found in response headers');
        }

        this.__sst = sst;

        return this.__createUser(res.data.userLogin.profile, user.password);
    }.bind(this));
};

/**
 * Authenticates user
 *
 * Returned promise is resolved with instance of User class.
 * This instance is filled with user data from server.
 *
 * @param  {Object|User} user    User object. Must contain at least `username` and `password` properties
 * @param  {String} captcha Captcha answer
 * @return {Promise}
 */
API.prototype.createUser = function(user, captcha) {
    var data = {
        firstName: user.firstName || 'Dummy',
        lastName: user.lastName || 'User',
        licence: '1', // Beware! It truly is licence with c
        login: user.username,
        password: user.password,
        verifyPassword: user.password,
        phoneNumber: '777777777',
        role: 'Developer',
        industry: 'IT',
        companyName: 'GoodData',
        verifyCaptcha: null,
        captcha: captcha
    };

    return this.request('/gdc/tool/captcha').then(function(res) { // first we need a valid captcha
        return res.data.captcha.verifyCaptcha;
    }).then(function(verifyCaptcha) {
        data.verifyCaptcha = verifyCaptcha;

        return this.request('/gdc/account/registration', 'POST', { // post a registration request
            postRegistration: data
        });
    }.bind(this)).then(function() {
        return new API.User(this, data, user.password);
    }.bind(this));
};

/**
 * Make an HTTP request to server.
 *
 * This method automatically parses server response and stores it in `body`
 * property of response object. If body is a valid JSON object, it is stored in
 * `data` property as an object.
 *
 * Returned promise only resolves if status code is 2xx or 3xx, otherwise
 * the promise rejects with error containing server error message.
 *
 * @param  {String} url    Target URL
 * @param  {String} method HTTP method to use. Defaults to GET
 * @param  {Object} data   Data to send with request
 * @return {Promise}       Promise resolved with response object.
 */
API.prototype.request = function(url, method, data) {
    var options = {
        hostname: this.hostname,
        port: this.port,
        path: url,
        method: method || 'GET',
        sst: this.__sst,
        tt: this.__tt
    };

    this.log('http %s %s', options.method, options.path);

    if (url.match('^/gdc/account/login') && method === 'POST') { // If this request is a login attempt
        this.__sst = null;
        this.__tt = null; // Delete TT token since every possible response path must lead to TT refresh
    }

    return request(options, data).then(function(res) {
        this.log('http %s %s %d', options.method, options.path, res.statusCode);

        if (res.statusCode === 401 && !url.match('^/gdc/account/token')) { // TT token validity has expired
            return this.__refreshTT().then(function() { // Fetch new TT token
                return this.request(url, method, data); // Retry original request
            }.bind(this));
        }

        if (res.statusCode >= 400) {
            var error = url === '/gdc/account/login' ? res.data : res.data && res.data.error; // Login resource returns error message without `error` namespace
            var message = error ? util.format.apply(util, [error.message].concat(error.parameters)) : 'HTTP Error ' + res.statusCode;

            throw new Error(message);
        }

        return res;
    }.bind(this));
};

module.exports = API;
