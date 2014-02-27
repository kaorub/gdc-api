'use strict';

require('colors');

var https = require('https');

var expect = require('expect.js');
var sinon = require('sinon');
var config = require('./config');
var API = require('../lib/api');
var User = API.User;
var Project = API.User.Project;

expect = require('sinon-expect').enhance(expect, sinon, 'was');

describe('Project', function() {
    beforeEach(function(done) {
        this.api = new API(config);
        this.user = new User(this.api);
        this.project = new Project(this.api, this.user);

        sinon.spy(https, 'request');

        this.user.login(config).done(function() {
            done();
        }, function(error) {
            throw error;
        });
    });

    afterEach(function() {
        https.request.restore();
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

        it('should delete project', function(done) {
            this.createdProject.delete().done(function() {
                done();
            });
        });
    });
});
