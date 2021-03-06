var Inbox = require('simple-imap-inbox');
var Q = require('q');
var path = require('path');

var Project = require('./project');

/**
 * Creates new user. Besides the API instance, you'll need the user to be able to perform
 * an autheticated operation on server.
 *
 * You have to pass an API instance to the user object constructor.
 * You can pass optional data object to user in case you fetched server data somewhere else.
 *
 * @constructor
 *
 * @property {API} api API instance
 * @property {Object} data Server user data from account resource
 *
 * @param {API}    api     API instance
 * @param {Object} data    [optional] User data object
 * @param {String} password [optional] User's password
 */
var User = function(api, data, password) {
    this.api = api;
    this.data = data || {};
    this.password = password;
};

User.prototype = {
    /**
     * User URI
     *
     * @readOnly
     * @type {String}
     */
    get uri() { return this.data.links && this.data.links.self; },

    /**
     * User's first name
     *
     * @type {String}
     */
    get firstName() { return this.data.firstName; },
    set firstName(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('First name must be a string, got ' + value);
        }

        this.data.firstName = value;
    },

    /**
     * User's last name
     *
     * @type {String}
     */
    get lastName() { return this.data.lastName; },
    set lastName(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('Last name must be a string, got ' + value);
        }

        this.data.lastName = value;
    },

    /**
     * User login
     *
     * @type {String}
     */
    get username() { return this.data.login; },
    set username(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('Username must be a string, got ' + value);
        }

        this.data.login = value;
    },

    /**
     * User password
     *
     * @type {String}
     */
    get password() { return this.__password; },
    set password(value) {
        if (value && typeof(value) !== 'string') {
            throw new Error('Password must be a string, got ' + value);
        }

        this.__password = value;
    }
};

/**
 * Activate registered user
 *
 * Email credentails object recognizes two options, `username` and `password`.
 * Properties not found on this object are substitued by properties from user object.
 *
 * @param  {Object} emailCredentails [optional] Email credentials
 *
 * @return {Promise}
 */
User.prototype.activate = function(emailCredentails) {
    emailCredentails = emailCredentails || {};

    var api = this.api;
    var regexp = new RegExp('https://[a-zA-Z0-9._-]+/i/([a-zA-Z0-9_-]+)');

    var username = this.username;
    var criteria = [
        ['FROM', 'registration@gooddata.com'],
        ['TO', this.username],
        ['SUBJECT', 'Activate Your GoodData Account']
    ];

    var inbox = new Inbox({
        user: emailCredentails.username || this.username,
        password: emailCredentails.password || this.password
    }).useGmail();

    var disconnect = function() {
        inbox.on('error', function() {});

        return inbox.disconnect().then(function() {
            api.log('Mail inbox disconnected succesfully');
        });
    };

    // Poll inbox until a message arrives
    var search = function() {
        return inbox.search(criteria, { markSeen: true }).then(function(messages) {
            messages = messages.filter(function(message) {
                return message.recipients[0] === username && message.body.match(regexp); // Imap search would find all the '+' suffixed messages too
            });

            return messages.length ? messages.pop() : Q.delay(1000).then(function() {
                return search();
            });
        });
    };

    api.log('Waiting for activation message for user %s', username);

    return inbox.connect().then(function() {
        return search();
    }).then(function(message) {
        var matches = message.body.match(regexp);

        if (!matches) {
            throw new Error('Email with confirmation link not found');
        }

        return matches[1];
    }).then(function(registrationId) {
        var registrationUri = '/gdc/account/registration/' + registrationId;

        return api.request('/gdc/account/profile', 'POST', {
            registrationProfile: {
                uri: registrationUri
            }
        });
    }).finally(disconnect, disconnect);
};

/**
 * Authenticate this user.
 *
 * You have to pass an object containing `username` and `password`
 * properties with valid credentials.
 *
 * Retured promise is resolved with account data.
 *
 * @param  {Object} userData User credentials
 * @return {Promise}
 */
User.prototype.login = function() {
    return this.api.login(this);
};

/**
 * Create a new project on server.
 *
 * Returned promise is resolved with instance of project class
 * after the project is in `ENABLED` state.
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
 * @param  {Object} project Project definition
 *
 * @return {Promise}
 */
User.prototype.createProject = function(project) {
    var api = this.api;

    return api.request('/gdc/projects', 'POST', {
        project: {
            content: {
                authorizationToken: project.token,
                guidedNavigation: 1,
                driver: project.driver || 'Pg',
            },
            meta: {
                title: project.title,
                summary: project.summary,
                projectTemplate: project.template
            }
        }
    }).then(function(res) {
        var projectUri = res.data.uri;

        var check = function() {
            return api.request(projectUri).then(function(res) {
                return res.data.project.content.state !== 'ENABLED' ? Q.delay(1000).then(function() {
                    return check();
                }) : res.data.project;
            });
        };

        return check();
    }.bind(this)).then(function(data) {
        return new Project(api, this, data);
    }.bind(this));
};

/**
 * List all of user's projects.
 *
 * Returned promise is resolved with an array of Project instances.
 *
 * @return {Promise} [description]
 */
User.prototype.listProjects = function() {
    return this.api.request(this.data.links.projects).then(function(res) {
        return res.data.projects.map(function(projectData) {
            return new Project(this.api, this, projectData.project);
        }.bind(this));
    }.bind(this));
};

/**
 * Load user data from bootstrap resource.
 *
 * @return {Promise}
 */
User.prototype.bootstrap = function() {
    return this.api.request('/gdc/app/account/bootstrap').then(function(res) {
        return res.data.bootstrapResource;
    });
};

/**
 * Load account data from profile resource
 *
 * Data is stored in `data` property of this instance
 *
 * @param  {String} profileUri [optional] User's profile url
 * @return {Promise}
 */
User.prototype.load = function(profileUri) {
    profileUri = profileUri || this.uri;

    return this.api.request(profileUri).then(function(res) {
        this.data = res.data.accountSetting;
        this.data.links.self = profileUri;

        return this.data;
    }.bind(this));
};

/**
 * Load user's profile settings
 *
 * @param  {String} profileUri [optional] User URI
 * @return {Promise}
 */
User.prototype.getSettings = function(profileUri) {
    profileUri = profileUri || this.uri;

    var settingsUri = path.join(profileUri, 'settings');

    return this.api.request(settingsUri).then(function(res) {
        return res.data.profileSetting;
    }.bind(this));
};

/**
 * Store user's settings
 *
 * Settings must be a comlete object, no merging is performed
 *
 * @param {String} profileUri [optional] User URI
 * @param {Object} settings   Settings object to store
 *
 * @return {Promise}
 */
User.prototype.setSettings = function(profileUri, settings) {
    if (arguments.length === 1) {
        settings = profileUri;
        profileUri = null;
    }

    profileUri = profileUri || this.uri;

    var settingsUri = path.join(profileUri, 'settings');

    return this.api.request(settingsUri, 'PUT', {
        profileSetting: settings
    });
};

/**
 * Clear authentication information.
 *
 * Beware, this function erases authentication for all users, i.e. if logout method
 * was called on one user object, login method must be called on another user to continue
 * using authenticated API
 *
 * @return {User} This user instance
 */
User.prototype.logout = function() {
    this.api.sst = null;
    this.data = null;

    return this;
};

/**
 * Delete user on server
 *
 * @param  {String} profileUri [optional] User's profile url
 * @return {Promise}
 */
User.prototype.delete = function(profileUri) {
    profileUri = profileUri || this.uri;

    return this.api.request(profileUri, 'DELETE').then(function() {
        this.logout();
    }.bind(this));
};

module.exports = User;
