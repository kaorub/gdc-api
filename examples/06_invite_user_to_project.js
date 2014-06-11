var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();
var user, project;

api.login(config.username, config.password).andThen(function() {
    console.log('Hello %s!', this.data('firstName'));
    console.log('New project will be created in a few moments and deleted right afterwards');

    var title = 'Project generated by GDC-API, secret ID ' + Date.now();
    console.log('The project\'s title will be ' + title);

    return this.project({
        content: {
            guidedNavigation: 1,
            driver: 'Pg',
            authorizationToken: config.token
        },
        meta: {
            title: title,
            summary: 'Automatically created project'
        }
    });
}).then(function(newProject) {
    project = newProject;

    console.log('Your project was created!');
    console.log('URI of your new project is ' + project.uri());
    console.log('New user will be created in a few moments');

    var login = config.username.replace('@', '+' + Date.now() + '@');
    var password = config.password;

    return api.register(login, password, 'John', 'Smith').promise();
}).then(function(newUser) {
    user = newUser;

    console.log('User will be invited to project in a few moments');

    return project.invite(user, 'Editor').promise();
}).then(function() {
    console.log('User was invited to project!');

    return project.delete().promise();
}).then(function() {
    console.log('Your project was deleted!');

    return user.delete().promise();
}).done(function() {
    console.log('New user was deleted!');
}, function(error) {
    console.log('error', error, error.stack);
});
