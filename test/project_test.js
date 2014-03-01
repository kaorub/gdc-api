'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
var config = require('./config');
var API = require('../lib/api');
var User = API.User;
var Project = User.Project;
var Dashboard = Project.Dashboard;

expect = require('sinon-expect').enhance(expect, sinon, 'was');

describe('Project', function() {
    beforeEach(function(done) {
        this.api = new API(config);
        this.api.debug = true;

        this.user = new User(this.api);
        this.project = new Project(this.api, this.user);

        this.user.login(config).done(function() {
            done();
        });
    });

    it('should create project', function(done) {
        this.project.create({
            title: 'Some project title',
            token: config.projectToken,
        }).done(function(data) {
            expect(data).to.have.property('content');
            expect(data).to.have.property('meta');

            done();
        });
    });

    context('when created', function() {
        before(function(done) {
            this.createdProject = new Project(this.api, this.user);
            this.createdProject.create({
                title: 'Some project title',
                token: config.projectToken,
            }).done(function() {
                done();
            });
        });

        it('should load project', function(done) {
            this.createdProject.load().done(function(data) {
                expect(data).to.have.property('content');
                expect(data).to.have.property('meta');

                done();
            });
        });

        it('should list roles', function(done) {
            this.createdProject.listRoles().done(function(roles) {
                expect(roles).to.be.an('array');

                done();
            });
        });

        it('should get role by name', function(done) {
            this.createdProject.getRoleByName('Admin').done(function(role) {
                expect(role).to.be.a(Project.Role);

                done();
            });
        });

        it('should set itself as default', function(done) {
            this.createdProject.setAsDefault().then(function() {
                return this.user.getSettings();
            }.bind(this)).done(function(settings) {
                expect(settings.currentProjectUri).to.be(this.createdProject.uri);

                done();
            }.bind(this));
        });

        it('should invite user', function(done) {
            var userData = {
                username: config.username.replace('@', '+' + Date.now() + '@'),
                password: config.password
            };

            var user = new User(this.api);
            user.register(userData).then(function() {
                return user.activate(userData);
            }).then(function() {
                return this.createdProject.invite(userData.username, 'Admin', userData);
            }.bind(this)).done(function() {
                done();
            });
        });

        it('should query and return array', function(done) {
            this.createdProject.query('projectdashboards').done(function(dashboards) {
                expect(dashboards).to.be.an('array');

                done();
            });
        });

        it('should list dashboards', function(done) {
            this.createdProject.listDashboards('projectdashboards').done(function(dashboards) {
                expect(dashboards).to.be.an('array');

                dashboards.forEach(function(dashboard) {
                    expect(dashboard).to.be.a(Dashboard);
                });

                done();
            });
        });

        it('should delete project', function(done) {
            this.createdProject.delete().done(function() {
                done();
            });
        });
    });
});
