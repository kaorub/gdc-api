var API = require('../lib/api');
var User = require('../lib/user');

var api = new API({
    hostname: 'secure.gooddata.com',
    port: 443
});

var user = new User(api);

return user.login({
    username: 'YOUR USERNAME HERE',
    password: 'YOUR PASSWORD HERE'
}).done(function(data) {
    console.log('user data');
    console.log(JSON.stringify(data, null, '\t'));
});
