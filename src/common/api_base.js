'use strict';

var Dashboard = require('./dashboard');
var Metric = require('./metric');
var ProfileSettings = require('./profile_settings');
var Project = require('./project');
var Report = require('./report');
var ReportDefinition = require('./report_definition');
var Resource = require('./resource');
var Role = require('./role');
var User = require('./user');
var q = require('q');
var utils = require('./utils');

/**
 * Entry point class. You need an instance of Api for every operation.
 * This class however acts like an abstact class. Both browser and node.js
 * implementation inherit from this class and specify their own
 * implementation of Http layer.
 *
 * @class
 *
 * @param {Http} http HTTP layer class
 * @param {Object} [config] Configuration object
 * @param {Number} [config.pollInterval] Number of milliseconds to wait between two poll calls
 * @param {String} [config.domain] Domain name. This is required if you want to create new users
 *
 * @see {@link BrowserApi} for browser implementation
 * @see {@link NodeApi} for node implementation
 *
 * @property {Http} http HTTP layer implementation
 *
 * @throws {TypeError} If http is not a valid HTTP layer class
 */
var Api = function(http, config) {
    if (!http || typeof(http.request) !== 'function') {
        throw new Error('Invalid HTTP object passed to Api instance: ' + http);
    }

    /**
     * Request function
     *
     * @readOnly
     * @memberOf Api
     * @type {Request}
     */
    Object.defineProperty(this, 'http', {
        value: http
    });

    config = utils.mixin({
        pollInterval: 1000
    }, config);

    /**
     * Configuration object
     *
     * @private
     * @memberOf Api
     * @type {Object}
     */
    Object.defineProperty(this, '__config', {
        writable: true,
        value: config
    });
};

/**
 * Reference to Dashboard class
 *
 * @static
 * @type {Class}
 */
Api.Dashboard = Dashboard;

/**
 * Reference to Metric class
 *
 * @static
 * @type {Class}
 */
Api.Metric = Metric;

/**
 * Reference to ProfileSettings class
 *
 * @static
 * @type {Class}
 */
Api.ProfileSettings = ProfileSettings;

/**
 * Reference to Project class
 *
 * @static
 * @type {Class}
 */
Api.Project = Project;

/**
 * Reference to Report class
 *
 * @static
 * @type {Class}
 */
Api.Report = Report;

/**
 * Reference to ReportDefinition class
 *
 * @static
 * @type {Class}
 */
Api.ReportDefinition = ReportDefinition;

/**
 * Reference to Resource class
 *
 * @static
 * @type {Class}
 */
Api.Resource = Resource;

/**
 * Reference to Role class
 *
 * @static
 * @type {Class}
 */
Api.Role = Role;

/**
 * Reference to User class
 *
 * @static
 * @type {Class}
 */
Api.User = User;

Api.prototype = {

    /**
     * Accessor function for configuration object.
     *
     * @see {@link utils.accessor} for description of accessor properties
     * @method config
     * @memberOf Api#
     */
    config: utils.accessor('__config'),

    /**
     * Log debug info to console
     *
     * Only outputs to console if debug configuration option is truthy.
     *
     * @memberOf Api#
     */
    log: function() {
        if (this.config('debug')) {
            console.log.apply(console, arguments);
        }
    },

    /**
     * Authenticate user.
     *
     * @param {String} username User's login
     * @param {String} password User's password
     *
     * @memberOf Api#
     * @return {User}
     */
    login: function(username, password) {
        return new User(this).login(username, password);
    },

    /**
     * Register new user.
     *
     * @param {String} username User's login
     * @param {String} password User's password
     * @param {String} firstName User's first name
     * @param {String} lastName User's last name
     *
     * @memberOf Api#
     * @return {User}
     */
    register: function(username, password, firstName, lastName) {
        return new User(this).register(username, password, firstName, lastName);
    },

    /**
     * <p>Perform a HTTP request with all the dirty work done for you.
     * This method handles HTTP 401, 202 codes for you automatically.</p>
     *
     * <p>Returned promise is resolved with response data object.</p>
     *
     * <p>In case 4xx or 5xx code is returned that was not caused by stale
     * TT token, promise is rejected with an error. Error message is as specific
     * as possible.</p>
     *
     * @param  {String|Object} uri Request URI or options object. If a string, this takes priority over options.url
     * @param  {Object} [options] Options object
     * @param  {String} [options.url] Request URL
     * @param  {String} [options.method=GET] Request HTTP method. Defaults to GET
     * @param  {Object} [options.data] Request payload
     * @param  {String|Object} [options.query] URL query string or object containing key/value pairs. Should not contain leading ?
     *
     * @memberOf Api#
     * @return {Promise}
     */
    request: function(uri, options) {
        if (this.__tokenRequest) {
            return this.__sendRequestAfterTokenRenewal(uri, options);
        }

        var method = uri.method || (options && options.method) || 'GET';
        var realUri = typeof(uri) === 'string' ? uri : options.uri;

        this.log('http %s %s', realUri, method);

        return this.http.request(uri, options).then(function(res) {
            var status = res.status,
                data = res.data;

            this.log('http %s %s %s', realUri, method, status);

            var failOn401 = options && options.failOn401;
            if (status === 401 && !failOn401) {
                return this.__sendRequestAfterTokenRenewal(uri, options);
            }

            if (status >= 400) {
                var error = (data && data.error) || {},
                    parameters = error.parameters || [],
                    message;

                if (error.message) {
                    message = error.message.replace(/%s/g, function() { return parameters.shift(); });
                } else {
                    message = 'HTTP Error ' + status;
                }

                throw new Error(message);
            }

            if (status === 202) {
                uri = utils.get(data, 'asyncTask.link.poll') || uri;

                var pollOptions = utils.mixin({}, options, {
                    method: 'GET'
                });

                return this.__sendPollRequestAfterDelay(uri, pollOptions);
            }

            return data;
        }.bind(this));
    },

    /**
     * Helper method that sends a TT token request.
     *
     * @private
     * @memberOf Api#
     * @return {Promise}
     */
    __sendTokenRequest: function() {
        return this.request('/gdc/account/token', {
            failOn401: true
        });
    },

    /**
     * Helper method that waits until TT token is fetched
     * and sends an HTTP request if it resolves.
     *
     * @param  {Object} options See {@link Api.request} for more information.
     *
     * @private
     * @memberOf Api#
     * @return {Promise}
     */
    __sendRequestAfterTokenRenewal: function(uri, options) {
        if (!this.__tokenRequest) {
            this.__tokenRequest = this.__sendTokenRequest();
            this.__tokenRequest.fin(function() {
                this.__tokenRequest = null;
            }.bind(this));
        }

        return this.__tokenRequest.then(function() {
            return this.request(uri, options);
        }.bind(this));
    },

    /**
     * Helper method that waits for a moment (specified by `pollInterval` configuration option)
     * and sends an HTTP request afterwards.
     *
     * @param  {Object} options See {@link Api.request} for more information.
     *
     * @private
     * @memberOf Api#
     * @return {Promise}
     */
    __sendPollRequestAfterDelay: function(uri, options) {
        return q.delay(this.config('pollInterval')).then(function() {
            return this.request(uri, options);
        }.bind(this));
    }
};

module.exports = Api;
