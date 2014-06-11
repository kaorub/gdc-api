var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();

console.log('Request ID is %s now', api.http.lastRequestId);

api.login(config.username, config.password).done(function() {
    console.log('After a request was performed its value becomes %s', api.http.lastRequestId);
});
