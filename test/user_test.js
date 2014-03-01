'use strict';

require('colors');

var https = require('https');

var expect = require('expect.js');
var sinon = require('sinon');
var config = require('./config');
var API = require('../lib/api');
var User = API.User;

expect = require('sinon-expect').enhance(expect, sinon, 'was');

describe('User', function() {
    beforeEach(function() {
        this.api = new API(config);
        this.api.debug = true;

        this.user = new User(this.api);

        sinon.spy(https, 'request');
    });

    afterEach(function() {
        https.request.restore();
    });

    it('should login, get SST and return account data', function(done) {
        this.user.login(config).done(function(data) {
            expect(this.api.sst).to.be.ok();
            expect(data).to.have.property('login');
            expect(data.login).to.be(config.username);

            done();
        }.bind(this));
    });

    it('should list projects', function(done) {
        this.user.login(config).then(function() {
            return this.user.listProjects();
        }.bind(this)).done(function(projects) {
            expect(projects).to.be.an('array');

            done();
        });
    });

    it('should load bootstrap data', function(done) {
        this.user.login(config).then(function() {
            return this.user.bootstrap();
        }.bind(this)).done(function(data) {
            expect(data).to.have.property('accountSetting');
            expect(data).to.have.property('profileSetting');

            done();
        });
    });

    it('should load account data', function(done) {
        this.user.login(config).then(function() {
            return this.user.load();
        }.bind(this)).done(function(data) {
            expect(data).to.have.property('login');
            expect(data.login).to.be(config.username);

            done();
        });
    });

    it('should load settings', function(done) {
        this.user.login(config).then(function() {
            return this.user.getSettings();
        }.bind(this)).done(function(data) {
            expect(data).to.have.property('currentProjectUri');
            expect(data).to.have.property('projectSettings');

            done();
        });
    });

    it('should save settings', function(done) {
        this.user.login(config).then(function() {
            return this.user.getSettings();
        }.bind(this)).then(function(settings) {
            settings.currentProjectUri = null;

            return this.user.setSettings(settings);
        }.bind(this)).then(function() {
            return this.user.getSettings();
        }.bind(this)).then(function(settings) {
            expect(settings.currentProjectUri).to.not.be.ok();

            return settings;
        }).then(function(settings) {
            return this.user.listProjects().then(function(projects) {
                return projects[0].uri;
            }).then(function(projectUri) {
                settings.currentProjectUri = projectUri;

                return this.user.setSettings(settings).then(function() {
                    return this.user.getSettings();
                }.bind(this)).done(function(settings) {
                    expect(settings.currentProjectUri).to.be(projectUri);

                    done();
                });
            }.bind(this));
        }.bind(this)).done();
    });

    it('should register user', function(done) {
        var data = {
            username: config.username.replace('@', '+' + Date.now() + '@'),
            password: config.password
        };

        this.user.register(data).done(function() {
            done();
        });
    });

    it('should activate user', function(done) {
        var data = {
            username: config.username.replace('@', '+' + Date.now() + '@'),
            password: config.password
        };

        this.user.register(data).then(function() {
            return this.user.activate(data);
        }.bind(this)).done(function() {
            done();
        });
    });

    it('should delete user', function(done) {
        var data = {
            username: config.username.replace('@', '+' + Date.now() + '@'),
            password: config.password
        };

        this.user.register(data).then(function() {
            return this.user.activate(data);
        }.bind(this)).then(function() {
            return this.user.login(data);
        }.bind(this)).then(function() {
            return this.user.delete();
        }.bind(this)).done(function() {
            done();
        });
    });
});
