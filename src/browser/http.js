var utils = require('../common/utils');
var q = require('q');

/**
 * Browser specific implementation of HTTP layer
 *
 * @class
 *
 * @param {Object} [config] Configuration object. This object is mostly redundant and is here only to comply with node.js implementation
 */
var BrowserHttp = function(config) {
    config = utils.mixin({}, config, {
        hostname: window.location.hostname,
        port: window.location.port
    });

    /**
     * Configuration object
     *
     * @private
     * @memberOf BrowserHttp#
     * @type {Object}
     */
    Object.defineProperty(this, '__config', {
        writable: true,
        value: config
    });
};

BrowserHttp.prototype = {

    /**
     * Last request ID. This value is obtained from response headers.
     *
     * @readOnly
     * @property {?String} lastRequestId
     * @memberOf BrowserHttp#
     */
    get lastRequestId() { return this.__lastRequestId || null; },

    /**
     * Accessor function for configuration object.
     *
     * @see {@link utils.accessor} for description of accessor properties
     * @method config
     * @memberOf BrowserHttp#
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
     * @memberOf BrowserHttp#
     *
     * @return {Promise}
     */
    request: function(path, options) {
        if (typeof(path) === 'object') {
            options = path;
            path = undefined;
        }

        options = utils.mixin({
            resendAfterTokenRenewal: true
        }, options);
        options.url = path || options.url;

        return this.__sendRequest(options);
    },

    /* global $ */
    /**
     * Sends a HTTP request
     *
     * @private
     * @method __sendRequest
     * @memberOf BrowserHttp#
     *
     * @param  {Object} options
     * @return {Promise}
     */
    __sendRequest: function(options) {
        // we'll pass URL as a separate parameter for easier testing
        var url = options.url;

        var ajaxOptions = {
            dataType: 'json',
            method: options.method || 'GET',
        };

        if (options.data) {
            ajaxOptions.data = options.data;
        }

        if (options.headers) {
            ajaxOptions.headers = options.headers;
        }

        if (options.query) {
            var serialized = typeof(options.query) === 'string' ? options.query : $.param(options.query);
            var separator = options.url.indexOf('?') === -1 ? '?' : '&';

            url += separator + serialized;
        }

        var deferred = q.defer();

        $.ajax(url, ajaxOptions).done(function(data, textStatus, xhr) {
            this.__lastRequestId = xhr.getResponseHeader('x-gdc-request');

            deferred.resolve({
                status: xhr.status,
                data: data || {}
            });
        }.bind(this)).fail(function(xhr) {
            this.__lastRequestId = xhr.getResponseHeader('x-gdc-request');

            var data = {};

            try {
                data = JSON.parse(xhr.responseText);
            } catch(ignored) {}

            deferred.resolve({
                status: xhr.status,
                data: data
            });
        }.bind(this));

        return deferred.promise;
    }
};

module.exports = BrowserHttp;
