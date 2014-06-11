var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();
api.http.debug = true;

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

    console.log('Metrics from dashboard %s will be listed', dashboards[0].meta('title'));

    return dashboards[0].project.using(dashboards[0], 'metric');
}).done(function(metrics) {
    metrics.forEach(function(metric) {
        console.log('\t', metric.meta('title'));
    });
});
