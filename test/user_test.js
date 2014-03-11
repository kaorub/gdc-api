'use strict';

require('colors');

var expect = require('expect.js');
var config = require('./config');
var API = require('../lib/api');

describe('User', function() {
    beforeEach(function(done) {
        this.api = new API(config);

        this.api.login(config).then(function(user) {
            this.user = user;
        }.bind(this)).done(done);
    });

    it('should list projects', function(done) {
        this.user.listProjects().done(function(projects) {
            expect(projects).to.be.an('array');

            done();
        });
    });

    it('should load bootstrap data', function(done) {
        this.user.bootstrap().done(function(data) {
            expect(data).to.have.property('accountSetting');
            expect(data).to.have.property('profileSetting');

            done();
        });
    });

    it('should load account data', function(done) {
        this.user.load().done(function(data) {
            expect(data).to.have.property('login');
            expect(data.login).to.be(config.username);

            done();
        });
    });

    it('should load settings', function(done) {
        this.user.getSettings().done(function(data) {
            expect(data).to.have.property('currentProjectUri');
            expect(data).to.have.property('projectSettings');

            done();
        });
    });

    it('should save settings', function(done) {
        return this.user.getSettings().then(function(settings) {
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

    it('should activate user', function(done) {
        var data = {
            username: config.username.replace('@', '+' + Date.now() + '@'),
            password: config.password
        };

        this.api.createUser(data, config.captcha).then(function(user) {
            return user.activate(data);
        }.bind(this)).done(function() {
            done();
        });
    });

    it('should create project', function(done) {
        var project = {
            title: 'Some great project',
            token: config.projectToken
        };

        this.user.createProject(project).done(function(project) {
            expect(project).to.be.an(API.Project);
            expect(project.data).to.have.property('content');
            expect(project.data).to.have.property('meta');

            done();
        });
    });

    it('should delete user', function(done) {
        var data = {
            username: config.username.replace('@', '+' + Date.now() + '@'),
            password: config.password
        };

        this.api.createUser(data, config.captcha).then(function(user) {
            return user.activate(data);
        }.bind(this)).then(function() {
            return this.user.login(data);
        }.bind(this)).then(function() {
            return this.user.delete();
        }.bind(this)).done(function() {
            done();
        });
    });
});
