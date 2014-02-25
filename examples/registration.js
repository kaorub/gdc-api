var API = require('../lib/api');
var User = require('../lib/user');

var api = new API({
    hostname: 'secure.gooddata.com',
    port: 443
});

var user = new User(api);

return user.register({
    firstName: 'Seems',
    lastName: 'Legit',
    username: 'YOUR EMAIL HERE',
    password: 'YOUR PASSWORD HERE'
}).done(function() {
    console.log('user has been registered');
});
