var API = require('../lib/api');
var User = require('../lib/user');

var api = new API({
    hostname: 'secure.gooddata.com',
    port: 443
});

var userData = {
    firstName: 'Seems',
    lastName: 'Legit',
    username: 'YOUR EMAIL HERE',
    password: 'YOUR PASSWORD HERE'
};

var user = new User(api);

return user.register(userData).then(function() {
    return user.activate(userData);
}).then(function() {
    return user.login(userData);
}).then(function() {
    return user.bootstrap();
}).done(function(data) {
    console.log('user data');
    console.log(JSON.stringify(data, null, '\t'));
});
