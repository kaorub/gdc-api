var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();

api.login(config.username, config.password).andThen(function() {
    console.log('Hello %s!', this.data('firstName'));

    return this.projects();
}).then(function(projects) {
    if (!projects.length) {
        throw new Error('You have to have at least one project to list dashboards');
    }

    var project = (function() {
        for (var i = 0, n = projects.length; i < n; i++) {
            if (projects[i].meta('title').indexOf('Demo') === -1) {
                return projects[i];
            }
        }
    })();

    if (!project) {
        throw new Error('You have to have at least one non-demo project to lock its dashboard');
    }

    return project.dashboards();
}).then(function(dashboards) {
    if (!dashboards.length) {
        throw new Error('You have to have at least one dashboard to lock it');
    }

    console.log('A dashboard from project %s (%s) will be locked', dashboards[0].project.meta('title'), dashboards[0].project.uri());

    return dashboards[0].setLocked(true).promise();
}).done(function(dashboard) {
    console.log('Your dashboard has been locked, its metadata now look like this:\n');

    return dashboard.load().andThen(function() {
        console.log(JSON.stringify(dashboard.meta(), null, '\t'));
    });
});
