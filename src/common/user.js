'use strict';

var Resource = require('./resource');
var ProfileSettings = require('./profile_settings');
var Project = require('./project');
var PromiseStack = require('./promise_stack');
var utils = require('./utils');

/**
 * User resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {Project} project Project instance
 *
 * @param {Api} api API instance
 * @param {Project} project Project instance
 * @param {Object} [data] User data
 */
var User = function(api, data) {
    User.__super.call(this, api, data);
};

utils.inherits(User, Resource, {
    namespace: { value: 'accountSetting' }
});

/**
 * <p>Getter for URI of collection resource.</p>
 *
 * <p>This URI is only available if a domain was specified in Api configuration</p>
 *
 * @see {@link Api} for more information on configuration
 *
 * @method collectionUri
 * @memberOf User#
 *
 * @return {String} Users resource URI
 */
User.prototype.collectionUri = function() {
    var domain = this.api.config('domain') || null;

    return domain && '/gdc/account/domains/' + domain + '/users';
};

/**
 * Getter for URI of ProfileSettings resource. Returns null if user has no uri.
 *
 * @see  {@link ProfileSettings} for more information on ProfileSettings
 * @method settingsUri
 * @memberOf User#
 *
 * @return {String?} ProfileSettings resource URI
 */
User.prototype.settingsUri = function() {
    var uri = this.uri();

    return uri && uri + '/settings';
};

/**
 * <p>Authenticate this user and load account data. Retured promise is resolved with account data.</p>
 *
 * @method login
 * @memberOf User#
 *
 * @param  {String} [username=this.data('login')] User's login
 * @param  {String} password User's password
 *
 * @return {User}
 */
User.prototype.login = PromiseStack.chainedMethod(function(username, password) {
    username = username || this.data('login');

    return this.api.request('/gdc/account/login', {
        method: 'POST',
        data: {
            postUserLogin: {
                captcha: '',
                login: username,
                password: password,
                remember: '0',
                verifyCaptcha: ''
            }
        }
    }).then(function() {
        this.password = password;

        return this.__load('/gdc/account/profile/current');
    }.bind(this));
});

/**
 * <p>Register user on server.</p>
 *
 * <p>You have to be logged in as organization admin
 * and provide domain configuration option to Api constructor
 * to be able to create users this way.</p>
 *
 * @see {@link Api} for more information on configuration
 *
 * @method register
 * @memberOf User#
 *
 * @param {String} [username=this.data('login')] User's login
 * @param {String} password User's password
 * @param {String} [firstName=this.data('firstName')] User's first name
 * @param {String} [lastName=this.data('lastName')] User's last name
 *
 * @return {User}
 */
User.prototype.register = function(username, password, firstName, lastName) {
    username = username || this.data('login');

    var data = {
        login: username,
        password: password,
        email: username,
        verifyPassword: password,
        firstName: firstName || this.data('firstName'),
        lastName: lastName || this.data('lastName')
    };

    return this.create(data);
};

/**
 * <p>List all of user's projects.</p>
 *
 * @method projects
 * @memberOf User#
 *
 * @return {Promise}
 */
User.prototype.projects = function() {
    return this.andThen(function() {
        var uri = this.links('projects');
        if (!uri) {
            throw new Error('No URI for projects()');
        }

        return this.api.request(uri).then(function(data) {
            return data.projects.map(function(projectData) {
                return new Project(this.api, this, projectData.project);
            }.bind(this));
        }.bind(this));
    }.bind(this));
};

/**
 * Load user data from bootstrap resource.
 *
 * @method bootstrap
 * @memberOf User#
 *
 * @return {Promise}
 */
User.prototype.bootstrap = PromiseStack.chainedMethod(function() {
    return this.api.request('/gdc/app/account/bootstrap').then(function(data) {
        this.data(data.bootstrapResource.accountSetting);

        return data.bootstrapResource;
    }.bind(this));
});

/**
 * Create a new project on server.
 *
 * @see {@link Project} for more information on Project resource
 *
 * @method project
 * @memberOf User#
 *
 * @param  {Object} projectData Project data
 *
 * @return {Promise}
 */
User.prototype.project = function(projectData) {
    return this.andThen(function() {
        return new Project(this.api, this, projectData).create().promise();
    }.bind(this));
};

/**
 * Load user's profile settings
 *
 * @see {@link ProfileSettings} for more information on ProfileSettings resource
 *
 * @method settings
 * @memberOf User#
 *
 * @return {Promise}
 */
User.prototype.settings = function(uri) {
    return this.andThen(function() {
        uri = uri || this.settingsUri();
        if (!uri) {
            throw new Error('No URI specified for settings()');
        }

        return new ProfileSettings(this.api, this).load(uri).promise();
    }.bind(this));
};

module.exports = User;
