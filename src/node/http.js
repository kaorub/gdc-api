var utils = require('../common/utils');
var unirest = require('unirest');
var q = require('q');

/**
 * Node.js specific implementation of HTTP layer
 *
 * @class
 *
 * @param {Object} config Configuration object
 * @param {String} config.hostname Remote server hostname
 * @param {Number} config.port Remote server port
 */
var NodeHttp = function(config) {
    if (!config.hostname) {
        throw new Error('Hostname must be specified');
    }

    if (isNaN(parseInt(config.port, 10))) {
        throw new Error('Port must be an integer, got ' + config.port);
    }

    /**
     * Configuration object
     *
     * @private
     * @memberOf NodeHttp#
     * @type {Object}
     */
    Object.defineProperty(this, '__config', {
        writable: true,
        value: config
    });

    /**
     * Cookie jar object
     *
     * @private
     * @memberOf NodeHttp#
     * @type {Object}
     */
    Object.defineProperty(this, '__cookieJar', {
        value: unirest.jar()
    });
};

NodeHttp.prototype = {

    /**
     * Last request ID. This value is obtained from response headers.
     *
     * @readOnly
     * @property {?String} lastRequestId
     * @memberOf NodeHttp#
     */
    get lastRequestId() { return this.__lastRequestId || null; },

    /**
     * Accessor function for configuration object.
     *
     * @see {@link utils.accessor} for description of accessor properties
     * @method config
     * @memberOf NodeHttp#
     */
    config: utils.accessor('__config'),

    /**
     * Performs a HTTP request and returns a promise
     * resolved after the request is done. This promise is resolved
     * with object containing `data` and `status` keys containing HTTP response status
     * and response body parsed with JSON.parse().
     *
     * @param  {String|Object} path Request URI or options object. If a string, this takes priority over options.url
     * @param  {Object} [options] Options object
     * @param  {String} [options.url] Request URL
     * @param  {String} [options.method=GET] Request HTTP method. Defaults to GET
     * @param  {Object} [options.data] Request payload
     * @param  {String|Object} [options.query] URL query string or object containing key/value pairs. Should not contain leading `?`
     *
     * @method request
     * @memberOf NodeHttp#
     *
     * @return {Promise}
     */
    request: function(path, options) {
        if (typeof(path) === 'object') {
            options = path;
            path = undefined;
        }

        options = utils.mixin({}, options);
        options.url = this.__buildUrl(options.url || path);

        return this.__sendRequest(options);
    },

    /**
     * Builds full URL string from hostname, port and path
     *
     * @private
     * @method __buildUrl
     * @memberOf NodeHttp#
     *
     * @param  {String} path
     *
     * @return {String} Full URL
     */
    __buildUrl: function(path) {
        var hostname = this.config('hostname'),
            port = this.config('port');

        return 'https://' + hostname + ':' + port + path;
    },

    /**
     * Sends a HTTP request
     *
     * @private
     * @method __sendRequest
     * @memberOf NodeHttp#
     *
     * @param  {Object} options
     * @return {Promise}
     */
    __sendRequest: function(options) {
        var method = (options.method || 'GET').toLowerCase();
        var request = unirest[method](options.url);
        var deferred = q.defer();

        request.jar(this.__cookieJar);
        request.type('json');
        request.header('accept', 'application/json');
        request.strictSSL(false); // Prevent node from throwing DEPTH_ZERO_SELF_SIGNED_CERT error

        if (options.headers) {
            request.headers(options.headers);
        }

        if (options.data) {
            request.send(options.data);
        }

        if (options.query) {
            request.query(options.query);
        }

        request.end(function(response) {
            var data;

            this.__lastRequestId = response.headers['x-gdc-request'];

            try {
                data = typeof(response.body) === 'object' ? response.body : JSON.parse(response.body);
            } catch(e) {
                data = {};
            }

            deferred.resolve({
                status: response.status,
                data: data
            });
        }.bind(this));

        return deferred.promise;
    }
};

module.exports = NodeHttp;
