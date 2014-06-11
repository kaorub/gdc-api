var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();

api.login(config.username, config.password).andThen(function() {
    console.log('Hello %s!', this.data('firstName'));
    console.log('New user will be created in a few moments and deleted right afterwards');

    var login = config.username.replace('@', '+' + Date.now() + '@');
    var password = config.password;

    return api.register(login, password, 'John', 'Smith').login(login, password).promise();
}).then(function(user) {
    console.log('New user was created!');
    console.log('Profile URI is ' + user.uri());

    return user.delete().promise();
}).done(function() {
    console.log('New user was deleted!');
});
