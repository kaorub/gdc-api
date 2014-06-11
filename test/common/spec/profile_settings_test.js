'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var Dashboard = require('../../../src/common/dashboard');
var Project = require('../../../src/common/project');
var User = require('../../../src/common/user');
var ProfileSettings = require('../../../src/common/profile_settings');

describe('ProfileSettings', function() {
    beforeEach(function() {
        this.enabled = true;
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };

        this.api = new Api(this.http);
        this.user = new User(this.api, {
            links: {
                self: '/gdc/profile/dummyuser',
                profileSetting: '/gdc/profile/dummyuser/settings'
            }
        });
        this.settings = new ProfileSettings(this.api, this.user, {
            links: {
                self: '/gdc/profile/dummy/settings'
            }
        });
    });

    afterEach(function() {
        this.api = null;
        this.user = null;
        this.settings = null;
    });

    describe('setDefaultDashboard()', function() {
        it('should accept project resource', function(done) {
            var project = new Project(this.api, this.user, {
                links: {
                    self: '/gdc/projects/dummy'
                }
            });

            this.settings.setDefaultDashboard(project, '/gdc/dashboards/dummy').andThen(function() {
                expect(this.settings.data('projectSettings')).to.eql({
                    '/gdc/projects/dummy': {
                        tab: null,
                        recentSearches: [],
                        manageReportsSettings: {},
                        dashboard: '/gdc/dashboards/dummy'
                    }
                });
            }.bind(this)).done(done);
        });

        it('should accept project URI', function(done) {
            this.settings.setDefaultDashboard('/gdc/projects/dummy', '/gdc/dashboards/dummy').andThen(function() {
                expect(this.settings.data('projectSettings')).to.eql({
                    '/gdc/projects/dummy': {
                        tab: null,
                        recentSearches: [],
                        manageReportsSettings: {},
                        dashboard: '/gdc/dashboards/dummy'
                    }
                });
            }.bind(this)).done(done);
        });

        it('should accept dashboard resource', function(done) {
            var dashboard = new Dashboard(this.api, this.user, {
                meta: {
                    uri: '/gdc/dashboards/dummy'
                }
            });

            this.settings.setDefaultDashboard('/gdc/projects/dummy', dashboard).andThen(function() {
                expect(this.settings.data('projectSettings')).to.eql({
                    '/gdc/projects/dummy': {
                        tab: null,
                        recentSearches: [],
                        manageReportsSettings: {},
                        dashboard: '/gdc/dashboards/dummy'
                    }
                });
            }.bind(this)).done(done);
        });

        it('should reject project URI is falsy', function(done) {
            this.settings.setDefaultDashboard(null, '/gdc/dummy/dashboard').done(null, function() {
                done();
            });
        });

        it('should reject when missing project URI', function(done) {
            var project = new Project(this.api, this.user);
            this.settings.setDefaultDashboard(project, '/gdc/dummy/dashboard').done(null, function() {
                done();
            });
        });

        it('should reject dashboard URI is falsy', function(done) {
            this.settings.setDefaultDashboard('/gdc/projects/dummy', null).done(null, function() {
                done();
            });
        });

        it('should reject when missing dashboard URI', function(done) {
            var dashboard = new Dashboard(this.api, this.user);
            this.settings.setDefaultDashboard('/gdc/projects/dummy', dashboard).done(null, function() {
                done();
            });
        });
    });

    describe('setDefaultProject()', function() {
        it('should accept project resource', function(done) {
            var project = new Project(this.api, this.user, {
                links: {
                    self: '/gdc/projects/dummy'
                }
            });

            this.settings.setDefaultProject(project).andThen(function() {
                expect(this.settings.data('currentProjectUri')).to.be('/gdc/projects/dummy');
            }.bind(this)).done(done);
        });

        it('should accept project URI', function(done) {
            this.settings.setDefaultProject('/gdc/projects/dummy').andThen(function() {
                expect(this.settings.data('currentProjectUri')).to.be('/gdc/projects/dummy');
            }.bind(this)).done(done);
        });

        it('should reject project URI is falsy', function(done) {
            this.settings.setDefaultProject(null).done(null, function() {
                done();
            });
        });

        it('should reject when missing project URI', function(done) {
            var project = new Project(this.api, this.user);
            this.settings.setDefaultProject(project).done(null, function() {
                done();
            });
        });
    });
});
