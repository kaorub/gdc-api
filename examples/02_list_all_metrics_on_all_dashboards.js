var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();
var project, dashboards;

api.login(config.username, config.password).andThen(function() {
    console.log('Hello %s!', this.data('firstName'));

    return this.projects();
}).then(function(projects) {
    if (!projects.length) {
        throw new Error('You have to have at least one project to list dashboards');
    }

    project = (function() {
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
}).then(function(projectDashboards) {
    dashboards = projectDashboards;

    if (!dashboards.length) {
        throw new Error('You have to have at least one dashboard to lock it');
    }

    return project.using(dashboards, 'metric');
}).done(function(metricsByDashboardUri) {
    dashboards.forEach(function(dashboard) {
        console.log('Dashboard %s', dashboard.meta('title'));

        var metrics = metricsByDashboardUri[dashboard.uri()];
        metrics.forEach(function(metric) {
            console.log('\t', metric.meta('title'));
        });
    });
});
