var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();

api.login(config.username, config.password).andThen(function() {
    console.log('Hello %s!', this.data('firstName'));

    return this.projects();
}).done(function(projects) {
    console.log('\nYour projects are:\n');

    projects.forEach(function(project) {
        console.log(project.meta('title'));
    });
});
