/**
 * Role resource object.
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
var Role = function(api, project, data) {
    this.api = api;
    this.project = project;
    this.data = data || {};
};

/**
 * Assign this role to the user.
 * 
 * Returned promise is resolved with this instance.
 * 
 * @param {User} user User instance
 * 
 * @return {Promise}
 */
Role.prototype.addUser = function(user) {
    return this.api.request(this.data.links.roleUsers, 'POST', {
        associateUser: {
            user: user.data.accountSetting.links.self
        }
    }).then(function() {
        return this;
    }.bind(this));
};

module.exports = Role;
