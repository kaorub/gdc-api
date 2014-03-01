var Inbox = require('simple-imap-inbox');
var Q = require('q');

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
 * @param {Object} data    User data object
 */
var User = function(api, data) {
    this.api = api;
    this.data = data || {};
};

/**
 * Reference to project class
 *
 * @static
 * @type {Class}
 */
User.Project = Project;

/**
 * Register this user on server. After the user is succesfully registered,
 * account data is fetched from server and stored in `data` property.
 *
 * You'll need to pass user options object as a parameter. This is basically a simplified
 * user data object used to authenticate user. This object can contain following properties:
 *
 * - username (User's login)
 * - password
 * - firstName
 * - lastName
 * - phone
 * - company
 *
 * Returned promise is resolved with no parameters.
 *
 * @param {Object} userData User data to use for registration
 *
 * @return {Promise}
 */
User.prototype.register = function(userData) {
    var api = this.api;

    var data = {
        firstName: userData.firstName || 'Dummy',
        lastName: userData.lastName || 'User',
        licence: '1', // Beware! It truly is licence with c
        login: userData.username,
        password: userData.password,
        verifyPassword: userData.password,
        phoneNumber: userData.phone || '775209302',
        role: userData.role || 'Developer',
        industry: userData.industry || 'IT',
        companyName: userData.company || 'GoodData',
        verifyCaptcha: null,
        captcha: api.captchaAnswer
    };

    return api.request('/gdc/tool/captcha').then(function(res) { // first we need a valid captcha
        return res.data.captcha.verifyCaptcha;
    }).then(function(verifyCaptcha) {
        data.verifyCaptcha = verifyCaptcha;

        return api.request('/gdc/account/registration', 'POST', { // post a registration request
            postRegistration: data
        });
    }).then(function(res) {
        this.__profileLink = res.data.registrationCreated.profile;

        api.log('successfully registered user ' + userData.username);
    }.bind(this));
};

/**
 * Activate registered user
 *
 * User data object must contain `username` property. If `emailCredentials` object is not provided,
 * You have to pass `password` property to userData object too.
 *
 * Email credentails object recognizes two options, `username` and `password`.
 * Properties not found on this object are substitued by properties from `userData` object.
 *
 * @param {Object} userData User data object
 * @param  {Object} emailCredentails [optional] Email credentials
 *
 * @return {Promise}
 */
User.prototype.activate = function(userData, emailCredentails) {
    emailCredentails = emailCredentails || {};

    var api = this.api;
    var regexp = new RegExp('https://[a-zA-Z0-9._-]+/i/([a-zA-Z0-9_-]+)');

    var criteria = [
        ['FROM', 'registration@gooddata.com'],
        ['TO', userData.username],
        ['SUBJECT', 'Activate Your GoodData Account']
    ];

    var inbox = new Inbox({
        user: emailCredentails.username || userData.username,
        password: emailCredentails.password || userData.password
    }).useGmail();

    var disconnect = function() {
        // Connection to gmail inbox throws connection refused error
        // after the inbox has been closed. We can safely ignore this error.
        inbox.on('error', function(error) {
            if (error.code !== 'ECONNRESET') {
                throw error;
            }

            api.log('Mail inbox encountered an error', error);
        });

        return inbox.disconnect().then(function() {
            api.log('Mail inbox disconnected succesfully');
        });
    };

    // Poll inbox until a message arrives
    var search = function() {
        return inbox.search(criteria, { markSeen: true }).then(function(messages) {
            messages = messages.filter(function(message) {
                return message.recipients[0] === userData.username && message.body.match(regexp); // Imap search would find all the '+' suffixed messages too
            });

            return messages.length ? messages.pop() : Q.delay(1000).then(function() {
                return search();
            });
        });
    };

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
User.prototype.login = function(userData) {
    var api = this.api;

    return api.request('/gdc/account/login', 'POST', {
        postUserLogin: {
            captcha: '',
            login: userData.username,
            password: userData.password,
            remember: '0',
            verifyCaptcha: ''
        }
    }).then(function(res) {
        var cookies = res.headers['set-cookie'] || [];
        var sst = (function() {
            for (var i = 0, n = cookies.length; i < n; i++) {
                var match = cookies[i].match(/GDCAuthSST=(.+?)(;| |$)/);

                if (match) return match[1];
            }
        })();

        if (!sst) {
            throw new Error('SST not found in response headers');
        }

        api.sst = sst;
        this.__profileLink = res.data.userLogin.profile;

        return this.load();
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
 * @param  {String} profileLink [optional] User's profile url
 * @return {Promise}
 */
User.prototype.load = function(profileLink) {
    profileLink = profileLink || this.__profileLink;

    return this.api.request(profileLink).then(function(res) {
        this.data = res.data.accountSetting;

        return this.data;
    }.bind(this));
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

    this.__profileLink = null;

    return this;
};

/**
 * Delete user on server
 *
 * @param  {String} profileLink [optional] User's profile url
 * @return {Promise}
 */
User.prototype.delete = function(profileLink) {
    profileLink = profileLink || this.__profileLink;

    return this.api.request(profileLink, 'DELETE').then(function() {
        this.logout();
    }.bind(this));
};

module.exports = User;
