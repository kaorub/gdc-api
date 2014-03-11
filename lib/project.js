var Inbox = require('simple-imap-inbox');
var Role = require('./role');
var Dashboard = require('./dashboard');
var Q = require('q');
var path = require('path');

/**
 * Project resource.
 *
 * @constructor
 *
 * @property {API} api API instance
 * @property {User} user User instance
 * @property {Object} data Server data
 *
 * @param {API} api  API instance
 * @param {User} user User instance
 * @param {Object} data [optional] Server data
 */
var Project = function(api, user, data) {
    this.api = api;
    this.user = user;
    this.data = data || {};
};

Project.prototype = {
    /**
     * Project URI
     *
     * @readOnly
     * @type {String}
     */
    get uri() { return this.data.links && this.data.links.self; }
};

/**
 * Load project data from project resource
 *
 * Data is stored in `data` property of this instance
 *
 * @param  {String} projectUri [optional] Project URL
 * @return {Promise}
 */
Project.prototype.load = function(projectUri) {
    projectUri = projectUri || this.uri;

    return this.api.request(projectUri).then(function(res) {
        this.data = res.data.project;

        return this.data;
    }.bind(this));
};

/**
 * Delete project on server.
 *
 * @param  {String} projectUri [optional] Project URI
 * @return {Promise}
 */
Project.prototype.delete = function(projectUri) {
    projectUri = projectUri || this.uri;

    return this.api.request(projectUri, 'DELETE').then(function() {
        this.data = null;
    }.bind(this));
};

/**
 * Set this project as user's default
 *
 * @param {String} projectUri [optional] Project URI
 *
 * @return {Promise}
 */
Project.prototype.setAsDefault = function(projectUri) {
    projectUri = projectUri || this.uri;

    return this.user.getSettings().then(function(settings) {
        settings.currentProjectUri = projectUri;

        return this.user.setSettings(settings);
    }.bind(this));
};

/**
 * Query project for list of objects of given type.
 *
 * Available objects include:
 *
 * - projectdashboards
 * - reports
 * - datasets
 * - userfilters
 * - scheduledemails
 *
 * Returned promise is resolved with an array of result objects
 *
 * @param  {String} type Subject of query, e.g. projectdashboards
 * @return {Promise}
 */
Project.prototype.query = function(type) {
    var queryUrl = path.join(this.data.links.metadata, 'query', type);

    return this.api.request(queryUrl).then(function(res) {
        return res.data.query.entries;
    });
};

/**
 * Query project for list of objects of given type
 * and load each object's data.
 *
 * You can pass second parameter of type function that will be called
 * for each returned object and return value of this call will be used
 * instead of raw data.
 *
 * Returned promise is resolved with array of loaded objects.
 *
 * @private
 *
 * @param  {String} type    Subject of query, e.g. projectdashboards
 * @param  {Function} wrapper [optional] Processor callback
 * @return {Promise}
 */
Project.prototype.__queryAndLoad = function(type, wrapper) {
    var api = this.api;

    wrapper = wrapper || function(data) { return data; };

    return this.query(type).then(function(entries) {
        return Q.all(entries.map(function(entry) {
            return api.request(entry.link).then(function(res) {
                return wrapper(res.data);
            });
        }));
    });
};

/**
 * List project dashboards
 *
 * Returned promise is resolved with an array of Dashboard objects
 *
 * @return {Promise}
 */
Project.prototype.listDashboards = function() {
    var project = this;
    var api = this.api;

    return this.__queryAndLoad('projectdashboards', function(data) {
        return new Dashboard(api, project, data.projectDashboard);
    });
};

/**
 * List all the project roles
 *
 * Returned promise is resolved with an array of Role instances
 *
 * @return {Promise}
 */
Project.prototype.listRoles = function() {
    var project = this;
    var api = this.api;

    return api.request(this.data.links.roles).then(function(res) {
        return Q.all(res.data.projectRoles.roles.map(function(role) {
            return api.request(role).then(function(res) {
                res.data.projectRole.links.self = role;

                return res.data.projectRole;
            });
        })).then(function(rolesData) {
            return rolesData.map(function(roleData) {
                return new Role(api, project, roleData);
            });
        });
    });
};

/**
 * Finds a role by name. In cae there s no role with such a name,
 * promise is rejected.
 *
 * Returned promise is resolved with found Role instance.
 *
 * @param  {String} name Role name
 * @return {Promise}
 */
Project.prototype.getRoleByName = function(name) {
    return this.listRoles().then(function(roles) {
        return (function() {
            for (var i = 0, n = roles.length; i < n; i++) {
                if (roles[i].data.meta.title === name) {
                    return roles[i];
                }
            }
        })();
    });
};

/**
 * Invite user to this project.
 *
 * This method receives an instance of User object (user HAS to be at least logged in!),
 * String name of the role that this user should be assigned and Object containing
 * email credentials needed to accept invitation sent by email.
 *
 * Returned promise is resolved with this instance.
 *
 * @throws {Error} If user is not loaded
 *
 * @param  {User|String} user User instance or user login email
 * @param  {String} roleName Role name, e.g. `Admin`, `Editor`
 * @return {Promise}
 */
Project.prototype.invite = function(user, roleName, emailCredentials) {
    var login = typeof(user) === 'string' ? user : user.data.login;

    if (!login) {
        throw new Error('No login for invitation provided');
    }

    return this.getRoleByName(roleName).then(function(role) { // Load role definition
        return this.api.request(this.data.links.invitations, 'POST', { // Create invitation
            invitations: [
                {
                    invitation: {
                        content: {
                            email: login,
                            firstname: '',
                            lastname: '',
                            role: role.data.links.self,
                            action: {
                                setMessage: ''
                            }
                        }
                    }
                }
            ]
        });
    }.bind(this)).then(function() {
        var criteria = [
            ['FROM', 'invitation@gooddata.com'],
            ['TO', login],
            'UNSEEN'
        ];
        var inbox = new Inbox({
            user: emailCredentials.username,
            password: emailCredentials.password
        }).useGmail();

        var search = function() {
            return inbox.search(criteria, { markSeen: true }).then(function(messages) {
                return messages.length ? messages.pop() : search();
            });
        };

        return inbox.connect().then(function() {
            return search();
        }).then(function(message) {
            inbox.on('error', function() {});

            return inbox.disconnect().then(function() {
                return message;
            });
        });
    }).then(function(message) {
        var regexp = new RegExp('https://[a-zA-Z0-9_.:-]+/p/([a-zA-Z0-9_-]+)');
        var matches = message.body.match(regexp);

        if (!matches) {
            throw new Error('Email with invitation link not found');
        }

        return matches[1];
    }).then(function(invitationId) {
        var invitationUri = '/gdc/account/invitations/' + invitationId;

        return this.api.request(invitationUri, 'POST', {
            invitationStatusAccept: {
                status: 'ACCEPTED'
            }
        });
    }.bind(this)).then(function() {
        return this;
    }.bind(this));
};

module.exports = Project;
