var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();

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
}).then(function(project) {
    console.log('Your project was created!');
    console.log('URI of your new project is ' + project.uri());

    return project.delete().promise;
}).done(function() {
    console.log('Your project was deleted!');
});
