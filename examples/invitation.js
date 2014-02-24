var API = require('../lib/api');
var Project = require('../lib/project');
var User = require('../lib/user');

var api = new API({
    hostname: 'secure.gooddata.com',
    port: 443
});

var user = new User(api);
var project = new Project(api, user);
var invited = new User(api);

return invited.register({
    firstName: 'Seems',
    lastName: 'Legit',
    username: 'YOUR USERNAME HERE',
    password: 'YOUR PASSWORD HERE'
}).then(function(data) {
    console.log('user data');
    console.log(JSON.stringify(data, null, '\t'));
}).then(function() {
    return user.login({
        username: 'SOME REGISTERED USERNAME HERE',
        password: 'SOME REGISTERED PASSWORD HERE'
    });
}).then(function() {
    return project.create({
        title: 'Test project',
        summary: 'Test project for testing tests',
        token: 'YOUR TOKEN HERE'
    });
}).then(function() {
    return project.invite(invited, 'Editor', {
        username: 'YOUR EMAIL USERNAME HERE',
        password: 'YOUR EMAIL PASSWORD HERE'
    });
}).then(function() {
    return user.listProjects();
}).done(function(projects) {
    console.log('projects');
    console.log(JSON.stringify(projects.map(function(project) {
        return project.data;
    }), null, '\t'));
});
