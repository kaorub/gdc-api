/**
 * Dashboard resource object.
 *
 * @constructor
 *
 * @property {API} api API instance
 * @property {Project} project Project instance
 *
 * @param {API} api API instance
 * @param {Project} project Project instance
 * @param {Object} data [optional] Server data
 */
var Dashboard = function(api, project, data) {
    this.api = api;
    this.project = project;
    this.data = data || {};
};

Dashboard.prototype = {
    /**
     * Dashboard URI
     *
     * @readOnly
     * @type {String}
     */
    get uri() { return this.data.meta && this.data.meta.uri; }
};

/**
 * Set `locked` meta property to specified value
 *
 * @private
 * @param  {Boolean} lock New `locked` value
 *
 * @return {Promise}
 */
Dashboard.prototype.__setLocked = function(lock) {
    this.data.meta.locked = lock ? '1' : '0';

    return this.api.request(this.uri, 'POST', {
        projectDashboard: this.data
    });
};

/**
 * Load dashboard data from dashboard resource
 *
 * Data is stored in `data` property of this instance
 *
 * @param  {String} dashboardUri [optional] Dashboard URL
 * @return {Promise}
 */
Dashboard.prototype.load = function(dashboardUri) {
    dashboardUri = dashboardUri || this.uri;

    return this.api.request(dashboardUri).then(function(res) {
        this.data = res.data.projectDashboard;

        return this.data;
    }.bind(this));
};

/**
 * Set this dashboard as project's default
 *
 * @param {String} dashboardUri [optional] Dashboard URI
 *
 * @return {Promise}
 */
Dashboard.prototype.setAsDefault = function(dashboardUri) {
    dashboardUri = dashboardUri || this.uri;

    var projectUri = this.project.uri;

    return this.project.user.getSettings().then(function(settings) {
        settings.projectSettings[projectUri] = settings.projectSettings[projectUri] || {
            tab: null,
            recentSearches: [],
            manageReportsSettings: {}
        };

        settings.projectSettings[projectUri].dashboard = dashboardUri;

        return this.project.user.setSettings(settings);
    }.bind(this));
};

/**
 * Lock dashboard for editing by non-admin users
 *
 * @return {Promise} [description]
 */
Dashboard.prototype.lock = function() {
    return this.__setLocked(true);
};

/**
 * Unlock dashboard for editing by non-admin users
 *
 * @return {Promise} [description]
 */
Dashboard.prototype.unlock = function() {
    return this.__setLocked(false);
};

module.exports = Dashboard;
