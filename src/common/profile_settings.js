'use strict';

var PromiseStack = require('./promise_stack');
var Resource = require('./resource');
var utils = require('./utils');

/**
 * ProfileSettings resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {User} user User instance
 *
 * @param {Api} api API instance
 * @param {User} user User instance
 * @param {Object} [data] ProfileSettings data
 */
var ProfileSettings = function(api, user, data) {
    ProfileSettings.__super.call(this, api, data);

    this.user = user;
};

utils.inherits(ProfileSettings, Resource, {
    namespace: { value: 'profileSetting' },
});

/**
 * <p>Set project's default dashboard (i.e. the dashboard that will come up when user visits a project
 * without specifying a dashboard URI).
 * Dashboard and its project both have to be loaded or have to have an URI
 * otherwise this method fails.</p>
 *
 * <p><strong>BEWARE</strong> This method does not save changes to server. You need to call any of save-like
 * methods to propagate changes to server.</p>
 *
 * @see {@link User.settings} for more information on ProfileSettings.
 * @method setDefaultDashboard
 * @memberOf ProfileSettings#
 *
 * @param {String|Project} projectOrUri Project URI or project resource object
 * @param {String|Dashboard} dashboardIrUri Dashboard URI or dashboard resource object
 *
 * @return {ProfileSettings} This settings resource
 */
ProfileSettings.prototype.setDefaultDashboard = PromiseStack.chainedMethod(function(projectOrUri, dashboardOrUri) {
    var projectUri = typeof(projectOrUri) === 'string' ? projectOrUri : projectOrUri.uri();
    if (!projectUri) {
        throw new Error('Missing project uri for setDefaultDashboard(), got ' + projectUri);
    }

    var dashboardUri = typeof(dashboardOrUri) === 'string' ? dashboardOrUri : dashboardOrUri.uri();
    if (!dashboardUri) {
        throw new Error('Missing dashboard uri for setDefaultDashboard(), got ' + dashboardUri);
    }

    var projectSettings = this.data('projectSettings') || {};

    projectSettings[projectUri] = projectSettings[projectUri] || {
        tab: null,
        recentSearches: [],
        manageReportsSettings: {}
    };

    projectSettings[projectUri].dashboard = dashboardUri;

    this.data('projectSettings', projectSettings);
});

/**
 * <p>Set user's default project.</p>
 *
 * <p><strong>BEWARE</strong> This method does not save changes to server. You need to call any of save-like
 * methods to propagate changes to server.</p>
 *
 * @method setDefaultDashboard
 * @memberOf ProfileSettings#
 *
 * @param {String|Project} projectOrUri Project URI or project resource object
 * @return {ProfileSettings} This settings resource
 */
ProfileSettings.prototype.setDefaultProject = PromiseStack.chainedMethod(function(projectOrUri) {
    var projectUri = typeof(projectOrUri) === 'string' ? projectOrUri : projectOrUri.uri();
    if (!projectUri) {
        throw new Error('Missing project uri for setDefaultDashboard(), got ' + projectUri);
    }

    this.data('currentProjectUri', projectUri);
});

module.exports = ProfileSettings;
