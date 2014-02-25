var Inbox = require('simple-imap-inbox');
var Role = require('./role');
var Q = require('q');

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

/**
 * Reference to Role class
 * 
 * @static
 * @type {Class}
 */
Project.Role = Role;

/**
 * Create new project on server.
 * 
 * Returned promise is resolved after the project is in `ENABLED` state.
 * 
 * Passed object is a simplification of project definition. It should contain following
 * properties:
 * 
 * - token
 * - driver (Defaults to `Pg`)
 * - title
 * - summary
 * - template
 * 
 * Returned promise is resolved with project data.
 * 
 * @param  {Object} projectData Project definition
 * 
 * @return {Promise}
 */
Project.prototype.create = function(projectData) {
    var api = this.api;
    
    return api.request('/gdc/projects', 'POST', {
        project: {
            content: {
                authorizationToken: projectData.token,
                guidedNavigation: 1,
                driver: projectData.driver || 'Pg',
            },
            meta: {
                title: projectData.title,
                summary: projectData.summary,
                projectTemplate: projectData.template
            }
        }
    }).then(function(res) {
        var projectUri = res.data.uri;
        
        var check = function() {
            return api.request(projectUri).then(function(res) {
                return res.data.project.content.state === 'LOADING' ? check() : res.data.project;
            });
        };

        return check();
    }.bind(this)).then(function(data) {
        this.data = data;

        return data;
    }.bind(this));
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
 * This is a convenience method that speeds up the search for a role
 * otherwise accomplished by iterating the array returned by listRoles() method.
 * 
 * Returned promise is resolved with found Role instance.
 * 
 * @param  {String} name Role name
 * @return {Promise}
 */
Project.prototype.getRoleByName = function(name) {
    var project = this;
    var api = this.api;

    return api.request(this.data.links.roles).then(function(res) {
        var roleUris = res.data.projectRoles.roles;
        var check = function() {
            var roleUri = roleUris.pop();

            if (roleUri) {
                return api.request(roleUri).then(function(res) {
                    if (res.data.projectRole.meta.title === name) {
                        return res.data.projectRole;
                    } else {
                        return check();
                    }
                });
            } else {
                throw new Error('Roles with name ' + name + ' not found');
            }
        };


        return check().then(function(roleData) {
            return new Role(api, project, roleData);
        });
    });
};

/**
 * Invite user to this project.
 * 
 * This method receives an instance of User object (does not have to be bootstrapped yet),
 * String name of the role that this user should be assigned and Object containing
 * email credentials needed to accept invitation sent by email.
 * 
 * Returned promise is resolved with this instance.
 * 
 * @param  {User} user User instance
 * @param  {String} roleName Role name, e.g. `Admin`, `Editor`
 * @return {Promise}
 */
Project.prototype.invite = function(user, roleName, emailCredentials) {
    if (!user.data.accountSetting) { // Load bootstrap data first
        return user.bootstrap().then(function() {
            this.invite(user, roleName);
        }.bind(this));
    }
    
    var account = user.data.accountSetting;
    
    return this.getRoleByName(roleName).then(function(role) { // Load role definition
        return this.api.request(this.data.links.invitations, 'POST', { // Create invitation
            invitations: [
                {
                    invitation: {
                        content: {
                            email: account.login,
                            firstname: account.firstName,
                            lastname: account.lastName,
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
            ['TO', account.login],
            'UNSEEN'
        ];
        var inbox = new Inbox({
            user: emailCredentials.username,
            password: emailCredentials.password
        }).useGmail();

        inbox.on('error', function(error) {
            // Connection to gmail inbox throws connection refused error
            // after the inbox has been closed. We can safely ignore this error.
            if (error.code !== 'ECONNRESET') {
                throw error;
            }
        });

        var search = function() {
            return inbox.search(criteria, { markSeen: true }).then(function(messages) {
                return messages.length ? messages.pop() : search();
            });
        };

        return inbox.connect().then(function() {
            return search();
        }).then(function(message) {
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
