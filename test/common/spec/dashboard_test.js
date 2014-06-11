'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var User = require('../../../src/common/user');
var ProfileSettings = require('../../../src/common/profile_settings');
var Project = require('../../../src/common/project');
var Dashboard = require('../../../src/common/dashboard');
var q = require('q');

describe('Dashboard', function() {
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
        this.project = new Project(this.api, this.user, {
            links: {
                self: '/gdc/projects/dummyproject',
                roles: '/gdc/projects/dummyproject/roles',
                users: '/gdc/projects/dummyproject/users',
                metadata: '/gdc/md/dummyproject'
            }
        });
        this.dashboard = new Dashboard(this.api, this.project, {
            meta: {
                uri: '/gdc/dummy/dashboard'
            }
        });
    });

    afterEach(function() {
        this.api = null;
        this.user = null;
        this.project = null;
        this.dashboard = null;
    });

    describe('uri()', function() {
        it('should use meta.uri value', function() {
            expect(this.dashboard.uri()).to.be('/gdc/dummy/dashboard');
        });
    });

    describe('setAsDefault()', function() {
        it('should reject if dashboard has no URI', function(done) {
            this.dashboard.uri(null);
            this.dashboard.setAsDefault().done(null, function() {
                done();
            });
        });

        it('should reject if dashboard\'s project has no URI', function(done) {
            this.project.uri(null);
            this.dashboard.setAsDefault().done(null, function() {
                done();
            });
        });

        it('should reject if user has no URI', function(done) {
            this.user.uri(null);
            this.dashboard.setAsDefault().done(null, function() {
                done();
            });
        });

        it('should update profileSettings', function(done) {
            var settings = new ProfileSettings(this.api, this.user, {
                projectSettings: {},
                links: {
                    self: '/gdc/profile/dummyuser/settings'
                }
            });

            sinon.stub(settings, 'save').returns(settings);
            sinon.stub(this.user, 'settings').returns(q(settings));

            this.dashboard.setAsDefault().andThen(function() {
                var projectSettings = settings.data('projectSettings');

                expect(projectSettings[this.project.uri()]).to.be.ok();
                expect(projectSettings[this.project.uri()].dashboard).to.be(this.dashboard.uri());
            }.bind(this)).done(done);
        });
    });

    describe('reports()', function() {
        it('should call find() method', function(done) {
            var reports = [];
            sinon.stub(this.dashboard, 'find').returns(q(reports));

            this.dashboard.reports().then(function(value) {
                expect(value).to.be(reports);
                expect(this.dashboard.find).was.calledOnce();
                expect(this.dashboard.find).was.calledWith('report');
            }.bind(this)).done(done);
        });
    });
});
