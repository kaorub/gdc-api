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

    return this.api.request(this.data.meta.uri, 'POST', {
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
    dashboardUri = dashboardUri || this.data.meta.uri;

    return this.api.request(dashboardUri).then(function(res) {
        this.data = res.data.projectDashboard;

        return this.data;
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
