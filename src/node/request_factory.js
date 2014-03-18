var request = require('request');
var q = require('q');
var util = require('util');

var SST_REGEX = /GDCAuthSST=([a-x0-9_=-]*)/i;
var TT_REGEX = /GDCAuthTT=([a-x0-9_=-]*)/i;

var CONFIG_REGEX = /^(?:([a-z_-]+)@)?([a-z0-9._-]+)(?:\:([a-z0-9]+))?$/i;
//                     ^            ^                  ^
//                     1            2                  3

module.exports = function(config) {
    'use strict';

    var sst = null,
        tt = null,
        hostname = null,
        port = null,
        domain = null;

    if (typeof(config) === 'string') {
        // Allow configuration via string in format:
        //
        //  domain@host:port
        //  domain@host
        //  host:port
        //  host
        //
        // Port defaults to 443.
        // In case the domain is not specified
        // operations that require a domain will fail
        var match = config.match(CONFIG_REGEX);

        if (!match) {
            throw new Error('Invalid configuration string: ' + config);
        }

        domain = match[1] || null;
        hostname = match[2] || null;
        port = match[3] || null;
    } else if (typeof(config) === 'object') {
        domain = config.domain || null;
        hostname = config.hostname || null;
        port = config.port || null;
    }

    // Use default HTTPS port if not specified
    port = port ? Number(port) : 443;

    if (!hostname) {
        throw new Error('Hostname must be specified');
    }

    if (isNaN(port)) {
        throw new Error('Port must be an integer, got ' + port);
    }

    if (!domain) {
        console.warn('Warning: Domain not specified. Some operations will fail.');
    }

    /**
     * Request function
     *
     * @param  {String} path        URL to fetch.
     * @param  {Object} settings    [optional] Request settings
     * @param  {Object} data   [optional] Data to send to server
     * @return {Promise}
     */
    var apiRequest = function apiRequest(path, settings) {
        if (typeof(path) === 'object') {
            settings = path;
            path = undefined;
        }

        settings = settings || {};

        // Grab actual URL
        path = path || settings.url || '';

        // Remove leading slash from URL
        path = path.replace(/^\//, '');

        // Clear tokens if a login request was issued
        if (path === 'gdc/account/login') {
            sst = null;
            tt = null;
        }

        // Some verbose debug messages are logged to console
        // in case debug flag is set to true on this function object
        var debug = apiRequest.debug;
        var log = debug ? console.log : function() {};

        // Add auth cookies to request headers
        var headers = settings.headers || {};
        headers.cookie = headers.cookie || '';
        headers.cookie += '; ' + apiRequest.cookie;
        headers.cookie = headers.cookie.replace(/^;/, '');

        // Support a subset of jQuery ajax() options
        var requestOptions = {
            url: 'https://' + hostname + ':' + port + '/' + path,
            method: settings.method || settings.type || 'GET',
            json: settings.data,
            headers: headers,
            timeout: settings.timeout,
            strictSSL: false // Prevent node from throwing DEPTH_ZERO_SELF_SIGNED_CERT error
        };

        var deferred = q.defer();

        log('http %s %s', requestOptions.method, path);

        request(requestOptions, function(error, res, body) {
            log('http %s %s %d', requestOptions.method, path, res.statusCode);

            if (error) {
                return deferred.reject(error);
            }

            res.body = body;

            try {
                // Try to parse response body as a JSON string
                res.data = JSON.parse(body);
            } catch(ignore) {}

            var setCookies = res.headers['set-cookie'] || [];
            setCookies.forEach(function(cookie) {
                var sstMatch = cookie.match(SST_REGEX);
                var ttMatch = cookie.match(TT_REGEX);

                if (sstMatch) {
                    sst = sstMatch[1];
                }

                if (ttMatch) {
                    tt = ttMatch[1];
                }
            });

            if (res.statusCode === 401 && path !== 'gdc/account/token') {
                return apiRequest('gdc/account/token').then(function() {
                    return apiRequest(path, settings);
                }).then(deferred.resolve, deferred.reject);
            }

            if (res.statusCode >= 400) {
                var errorData = path === 'gdc/account/login' ? res.data : res.data && res.data.error; // Login resource returns error message without `error` namespace
                var message = errorData ? util.format.apply(util, [errorData.message].concat(errorData.parameters)) : 'HTTP Error ' + res.statusCode;

                return deferred.reject(new Error(message));
            }

            if (res.statusCode === 202) {
                var asyncTaskPollUrl = res.data && res.data.asyncTask && res.data.asyncTask.link && res.data.asyncTask.poll;

                path = asyncTaskPollUrl || path;

                delete settings.method;
                delete settings.type;
                delete settings.data;

                return apiRequest(path, settings).then(deferred.resolve, deferred.reject);
            }

            deferred.resolve(res);
        });

        return deferred.promise;
    };

    Object.defineProperties(apiRequest, {
        hostname: {
            enumerable: true,
            writable: false,
            value: hostname
        },
        port: {
            enumerable: true,
            writable: false,
            value: port
        },
        domain: {
            enumerable: true,
            writable: false,
            value: domain
        },
        cookie: {
            enumerable: true,
            get: function() {
                var cookie = [];

                if (sst) {
                    cookie.push('GDCAuthSST=' + sst + '; path=/; HttpOnly;');
                }

                if (tt) {
                    cookie.push('GDCAuthTT=' + tt + '; path=/; HttpOnly;');
                }

                return cookie.join();
            }
        }
    });

    return apiRequest;
};
