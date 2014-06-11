var PromiseStack = require('./promise_stack');
var Resource = require('./resource');
var utils = require('./utils');

/**
 * Role resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {Project} project Project instance
 *
 * @param {Api} api API instance
 * @param {Project} project Project instance
 * @param {Object} [data] Role data
 */
var Role = function(api, project, data) {
    Role.__super.call(this, api, data);

    this.project = project;
};

utils.inherits(Role, Resource, {
    namespace: { value: 'projectRole' }
});

/**
 * Assign user to this role.
 *
 * @method addUser
 * @memberOf Role#
 *
 * @param  {String|User} userOrUri User resource object or user URI
 *
 * @return {Role}
 */
Role.prototype.addUser = PromiseStack.chainedMethod(function(userOrUri) {
    var uri = this.links('roleUsers');
    if (!uri) {
        throw new Error('Role must have users\' URI for adding user');
    }

    var userUri = typeof(userOrUri) === 'string' ? userOrUri : userOrUri.uri();
    if (!userUri) {
        throw new Error('User must have an URI to be assigned a role');
    }

    return this.api.request(uri, {
        method: 'POST',
        data: {
            associateUser: {
                user: userUri
            }
        }
    });
});

module.exports = Role;
