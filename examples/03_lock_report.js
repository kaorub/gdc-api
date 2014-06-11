var utils = require('./utils');
var config = utils.getConfig();
var api = utils.getApi();
api.debug = true;

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

    return dashboards[0].find('report');
}).then(function(reports) {
    if (!reports.length) {
        throw new Error('You have to have at least one report to lock it');
    }

    var report = reports[0];

    console.log('A report %s from project %s (%s) will be locked', report.meta('title'), report.project.meta('title'), report.project.uri());

    return report.setLocked(true).promise();
}).done(function() {
    console.log('Report was locked');
});
