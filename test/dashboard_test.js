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

describe('Dashboard', function() {
    before(function(done) {
        this.api = new API(config);
        this.user = new User(this.api);
        this.project = new Project(this.api, this.user);

        this.user.login(config).then(function() {
            return this.project.create({
                title: 'Some project title',
                template: '/projectTemplates/GoodSalesDemo/2/',
                token: config.projectToken,
            });
        }.bind(this)).then(function() {
            return this.project.listDashboards();
        }.bind(this)).done(function(dashboards) {
            this.dashboard = dashboards[0];

            done();
        }.bind(this));
    });

    after(function(done) {
        this.project.delete().then(function() {
            done();
        });
    });

    context('not loaded', function() {
        it('should load data', function(done) {
            var dashboardUri = this.dashboard.data.meta.uri;
            var dashboard = new Dashboard(this.api, this.project);

            dashboard.load(dashboardUri).done(function(data) {
                expect(data).to.have.property('content');
                expect(data).to.have.property('meta');

                done();
            });
        });
    });

    context('loaded', function() {
        it('should load data', function(done) {
            this.dashboard.load().done(function(data) {
                expect(data).to.have.property('content');
                expect(data).to.have.property('meta');

                done();
            });
        });

        it('should lock dashboard', function(done) {
            this.dashboard.lock().then(function() {
                return this.dashboard.load();
            }.bind(this)).done(function(data) {
                expect(data.meta.locked).to.be(1);

                done();
            });
        });

        it('should unlock dashboard', function(done) {
            this.dashboard.unlock().then(function() {
                return this.dashboard.load();
            }.bind(this)).done(function(data) {
                expect(data.meta.locked).to.not.be.ok();

                done();
            });
        });

        it('should set itself as default', function(done) {
            this.dashboard.setAsDefault().then(function() {
                return this.user.getSettings();
            }.bind(this)).done(function(settings) {
                expect(settings.projectSettings[this.project.uri].dashboard).to.be(this.dashboard.uri);

                done();
            }.bind(this));
        });
    });
});
