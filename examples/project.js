var API = require('../lib/api');
var Project = require('../lib/project');
var User = require('../lib/user');

var api = new API({
    hostname: 'secure.gooddata.com',
    port: 443
});

var user = new User(api);
var project = new Project(api, user);

return user.login({
    username: 'YOUR USERNAME HERE',
    password: 'YOUR PASSWORD HERE'
}).then(function() {
    return project.create({
        title: 'Test project',
        summary: 'Test project for testing tests',
        token: 'YOUR PROJECT TOKEN HERE'
    });
}).done(function(data) {
    console.log('project data');
    console.log(JSON.stringify(data, null, '\t'));
});
