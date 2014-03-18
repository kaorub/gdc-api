var Api = require('../common/api');
var requestFactory = require('./request_factory');

module.exports = function(config) {
    var request = requestFactory(config);

    return new Api(request);
};
