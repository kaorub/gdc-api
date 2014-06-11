var ApiBase = require('../common/api_base');
var Http = require('./http');
var utils = require('../common/utils');

/**
 * Node.js specific subclass of API class
 *
 * @class
 *
 * @augments {Api}
 *
 * @param {Object} config Configuration object. See {@link Api} for more information
 * @param {Number} [config.port=443] Remote server port number
 * @param {String} config.hostname Remote server hostname
 */
var NodeApi = function(config) {
    var httpConfig = utils.mixin({
        port: 443
    }, config);
    var http = new Http(httpConfig);

    NodeApi.__super.call(this, http, config);
};

utils.inherits(NodeApi, ApiBase);

module.exports = NodeApi;
