var Inbox = require('simple-imap-inbox');

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
 * @property {Object} data Server user data from bootstrap resource
 *
 * @param {API}    api     API instance
 * @param {Object} options User options object
 * @param {Object} data    User data object
 */
var User = function(api, data) {
    this.api = api;
    this.data = data || {};
};

/**
 * Register this user on server. After the user is succesfully registered,
 * bootstrap data is fetched from server and stored in `data` property.
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
 * In case the user options passed to this method (username and password)
 * are not valid email credentials, you can pass these as a next parameter.
 * Email credentails recognize two options, `username` and `password`.
 * 
 * Returned promise is resolved with bootstrap data object.
 * 
 * @param {Object} userData User data to use for registration
 * @param {Object} emailCredentials [optional] Email credentials to use when waiting for registration activation email
 * 
 * @return {Promise}
 */
User.prototype.register = function(userData, emailCredentails) {
    var api = this.api;
    
    emailCredentails = emailCredentails || {};
    
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
    }).then(function() {
        // We are going to poll email inbox until we receive an account activation message
        var criteria = [
            ['FROM', 'registration@gooddata.com'],
            ['TO', userData.username],
            'UNSEEN'
        ];
        var inbox = new Inbox({
            user: emailCredentails.username || userData.username,
            password: emailCredentails.password || userData.password
        }).useGmail();

        inbox.on('error', function(error) {
            // Connection to gmail inbox throws connection refused error
            // after the inbox has been closed. We can safely ignore this error.
            if (error.code !== 'ECONNRESET') {
                throw error;
            }
        });
        
        // Poll inbox until a message arrives
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
        var regexp = new RegExp('https://[a-zA-Z0-9_.:-]+/i/([a-zA-Z0-9_-]+)');
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
    }).then(function() {
        return this.login(userData);
    }.bind(this)).then(function() {
        return this.bootstrap();
    }.bind(this));
};

/**
 * Authenticate this user.
 * 
 * You have to pass an object containing `username` and `password`
 * properties with valid credentials.
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
    }).then(function() {
        return this.bootstrap();
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
    return this.api.request(this.data.accountSetting.links.projects).then(function(res) {
        return res.data.projects.map(function(projectData) {
            return new Project(this.api, this, projectData.project);
        }.bind(this));
    }.bind(this));
};

/**
 * Load user data from bootstrap resource.
 * 
 * Data is stored in `data` property of this instance
 * 
 * @return {Promise}
 */
User.prototype.bootstrap = function() {
    return this.api.request('/gdc/app/account/bootstrap').then(function(res) {
        return res.data.bootstrapResource;
    }).then(function(data) {
        this.data = data;
        
        return data;
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
    this.api.tt = null;
    this.data = null;
    
    return this;
};

module.exports = User;
