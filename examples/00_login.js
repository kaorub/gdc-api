var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();

api.http.config('debug', true);

api.login(config.username, config.password).done(function() {
    console.log('Hello %s!', this.data('firstName'));
});
