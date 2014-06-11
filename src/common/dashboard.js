'use strict';

var PromiseStack = require('./promise_stack');
var Resource = require('./resource');
var utils = require('./utils');

/**
 * Dashboard resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {Project} project Project instance
 *
 * @param {Api} api API instance
 * @param {Project} project Project instance
 * @param {Object} [data] Dashboard data
 */
var Dashboard = function(api, project, data) {
    Dashboard.__super.call(this, api, data);

    this.project = project;
};

utils.inherits(Dashboard, Resource, {
    namespace: { value: 'projectDashboard' }
});

/**
 * Uri property. Accessor for __data.meta.uri property
 *
 * @see {@link utils.property} for more information on properties
 * @method uri
 * @memberOf Dashboard#
 */
Dashboard.prototype.uri = utils.property('__data.meta.uri');

/**
 * <p>Set this dashboard as project's default dashboard.
 * Dashboard and its project both have to be loaded or have to have an URI
 * otherwise this method fails.</p>
 *
 * <p>This method relies on ProfileSettings.setDefaultProjectDashboard() method
 * to perform input validation.</p>
 *
 * @see {@link ProfileSettings.setDefaultProjectDashboard} for more information on ProfileSettings.
 * @method setAsDefault
 * @memberOf Dashboard#
 *
 * @return {Dashboard} This dashboard
 */
Dashboard.prototype.setAsDefault = PromiseStack.chainedMethod(function() {
    return this.project.user.settings().then(function(settings) {
        return settings.setDefaultDashboard(this.project, this).save().promise();
    }.bind(this));
});

/**
 * Return all the reports that are used by this dashboard.
 * This is just an alias method for Resource.find('report').
 *
 * @see  {@link Project.using} for more information on nested resources.
 * @see  {@link Resource.find} for more information on finding nested resources.
 * @method reports
 * @memberOf Dashboard#
 *
 * @return {Promise} Resolved with plain array of Report resources
 */
Dashboard.prototype.reports = function() {
    return this.find('report');
};

module.exports = Dashboard;
