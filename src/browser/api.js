var ApiBase = require('../common/api_base');
var Http = require('./http');
var utils = require('../common/utils');

/**
 * Browser specific subclass of API class
 *
 * @class
 *
 * @augments {Api}
 * @param {Object} [config] Configuration object. See {@link Api} for more information
 */
var BrowserApi = function(config) {
    var httpConfig = utils.mixin({}, config);
    var http = new Http(httpConfig);

    BrowserApi.__super.call(this, http, config);
};

utils.inherits(BrowserApi, ApiBase);

module.exports = BrowserApi;
