'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
var config = require('./config');
var API = require('../lib/api');
var Dashboard = API.Dashboard;

expect = require('sinon-expect').enhance(expect, sinon, 'was');

describe('Dashboard', function() {
    before(function(done) {
        var api = this.api = new API(config);

        api.login(config).then(function(user) {
            this.user = user;

            return user.createProject({
                title: 'Some project title',
                template: '/projectTemplates/GoodSalesDemo/2/',
                token: config.projectToken,
            });
        }.bind(this)).then(function(project) {
            this.project = project;

            return project.listDashboards();
        }.bind(this)).then(function(dashboards) {
            this.dashboard = dashboards[0];
        }.bind(this)).done(done);
    });

    after(function(done) {
        this.project.delete().done(function() {
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
