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
 * @property {String} sst SST token to use with requests
 * @property {String} captchaAnswer Universal captcha answer
 */
var API = function(options) {
    this.hostname = options.hostname;
    this.port = options.port;
    this.captchaAnswer = options.captchaAnswer;
};

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

        this.__port = value;
    },

    /**
     * SST token
     *
     * @type {String}
     */
    get sst() { return this.__sst; },
    set sst(value) {
        if (value !== null && (typeof(value) !== 'string' || !value.match(/^[a-z0-9]+$/i))) {
            throw new Error('Invalid SST: ' + value);
        }

        this.__sst = value;
    }
};

/**
 * Renew TT token after a request has failed with HTTP 401 status
 *
 * @private
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

        if (!tt) {
            throw new Error('No temporary token returned');
        }

        this.__tt = tt;
        
        return tt;
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
        sst: this.sst,
        tt: this.__tt
    };
    
    return request(options, data).then(function(res) {
        if (res.statusCode === 401 && !url.match('^/gdc/account/token') && !url.match('^/gdc/account/login')) { // TT token validity has expired
            return this.__refreshTT().then(function(tt) { // Fetch new TT token
                options.tt = tt;
                
                return request(options, data); // Retry original request
            });
        }

        if (res.statusCode >= 400) {
            var error = url === '/gdc/account/login' ? res.data : res.data && res.data.error; // Login resource returns error message without `error` namespace
            var message = error ? util.format.apply(util, [error.message].concat(error.parameters)) : 'HTTP Error';
            
            throw new Error(message);
        }

        return res;
    }.bind(this));
};

module.exports = API;
