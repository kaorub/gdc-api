var Api = require('../src/node/api');

exports.getApi = function() {
    var config = exports.getConfig();

    // Normally you would instantiate api by requiring it by calling
    //
    //  var Api = require('gdc-api');
    //
    // and instantiating it by calling
    //
    //  var api = new Api(configurationObject);
    var api = new Api(config.api);

    return api;
};

exports.getConfig = function() {
    return JSON.parse(require('fs').readFileSync(__dirname + '/config.json'));
};
