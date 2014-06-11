var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();
var q = require('q');

api.login(config.username, config.password).andThen(function() {
    console.log('Hello %s!', this.data('firstName'));

    return this.projects();
}).then(function(projects) {
    return q.all(projects.map(function(project) {
        // You could also use project.reports() or project.metrics()
        // depending on what resource you are looking for
        return project.dashboards();
    }));
}).done(function(dashboardSet) {
    console.log('\nYour dashboards are:\n');

    dashboardSet.filter(function(dashboards) {
        return dashboards.length;
    }).forEach(function(dashboards) {
        var project = dashboards[0].project;

        console.log('Project ' + project.meta('title') + ':');

        dashboards.forEach(function(dashboard) {
            console.log('\t' + dashboard.meta('title'));
        });
    });
});
