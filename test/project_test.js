'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
var config = require('./config');
var API = require('../lib/api');
var User = API.User;
var Project = API.Project;
var Dashboard = API.Dashboard;

expect = require('sinon-expect').enhance(expect, sinon, 'was');

describe('Project', function() {
    beforeEach(function(done) {
        this.api = new API(config);

        this.api.login(config).then(function(user) {
            this.user = user;
        }.bind(this)).done(done);
    });

    it('should create project', function(done) {
        this.user.createProject({
            title: 'Some project title',
            token: config.projectToken,
        }).then(function(project) {
            this.project = project;

            expect(project).to.be.an(API.Project);
        }.bind(this)).done(done);
    });

    it('should load project', function(done) {
        this.project.load().done(function(data) {
            expect(data).to.have.property('content');
            expect(data).to.have.property('meta');

            done();
        });
    });

    it('should list roles', function(done) {
        this.project.listRoles().done(function(roles) {
            expect(roles).to.be.an('array');

            done();
        });
    });

    it('should get role by name', function(done) {
        this.project.getRoleByName('Admin').done(function(role) {
            expect(role).to.be.a(API.Role);

            done();
        });
    });

    it('should set itself as default', function(done) {
        this.project.setAsDefault().then(function() {
            return this.user.getSettings();
        }.bind(this)).done(function(settings) {
            expect(settings.currentProjectUri).to.be(this.project.uri);

            done();
        }.bind(this));
    });

    it('should invite user', function(done) {
        var userData = {
            username: config.username.replace('@', '+' + Date.now() + '@'),
            password: config.password
        };

        this.api.createUser(userData, config.captcha).then(function(user) {
            return user.activate();
        }).then(function() {
            return this.project.invite(userData.username, 'Admin', userData);
        }.bind(this)).done(function() {
            done();
        });
    });

    it('should query and return array', function(done) {
        this.project.query('projectdashboards').done(function(dashboards) {
            expect(dashboards).to.be.an('array');

            done();
        });
    });

    it('should list dashboards', function(done) {
        this.project.listDashboards('projectdashboards').done(function(dashboards) {
            expect(dashboards).to.be.an('array');

            dashboards.forEach(function(dashboard) {
                expect(dashboard).to.be.a(Dashboard);
            });

            done();
        });
    });

    it('should delete project', function(done) {
        this.project.delete().done(function() {
            done();
        });
    });
});
