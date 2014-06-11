'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var q = require('q');
var Api = require('../../../src/common/api_base');

var Dashboard = require('../../../src/common/dashboard');
var Metric = require('../../../src/common/metric');
var ProfileSettings = require('../../../src/common/profile_settings');
var Project = require('../../../src/common/project');
var Report = require('../../../src/common/report');
var ReportDefinition = require('../../../src/common/report_definition');
var Resource = require('../../../src/common/resource');
var Role = require('../../../src/common/role');
var User = require('../../../src/common/user');

describe('Api', function() {
    beforeEach(function() {
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };
    });

    afterEach(function() {
        this.request = null;
        this.http = null;
    });

    context('class', function() {
        it('should have static `Dashboard` class reference', function() {
            expect(Api.Dashboard).to.be(Dashboard);
        });

        it('should have static `Metric` class reference', function() {
            expect(Api.Metric).to.be(Metric);
        });

        it('should have static `ProfileSettings` class reference', function() {
            expect(Api.ProfileSettings).to.be(ProfileSettings);
        });

        it('should have static `Project` class reference', function() {
            expect(Api.Project).to.be(Project);
        });

        it('should have static `Report` class reference', function() {
            expect(Api.Report).to.be(Report);
        });

        it('should have static `ReportDefinition` class reference', function() {
            expect(Api.ReportDefinition).to.be(ReportDefinition);
        });

        it('should have static `Resource` class reference', function() {
            expect(Api.Resource).to.be(Resource);
        });

        it('should have static `Role` class reference', function() {
            expect(Api.Role).to.be(Role);
        });

        it('should have static `User` class reference', function() {
            expect(Api.User).to.be(User);
        });
    });

    describe('constructor', function() {
        it('should throw an exception if http does not have a request() method', function() {
            expect(function() {
                new Api({});
            }).to.throwException();
        });

        it('should throw an exception if request is not specified', function() {
            expect(function() {
                new Api();
            }).to.throwException();
        });
    });

    describe('config()', function() {
        it('should be a getter to passed config object', function() {
            var config = { domain: 'mydomain' };
            var api = new Api(this.http, config);

            expect(api.config).to.be.a('function');
            expect(api.config('domain')).to.be('mydomain');
        });

        it('should be a setter to passed config object', function() {
            var api = new Api(this.http, {});

            api.config('domain', 'mydomain');
            expect(api.config('domain')).to.be('mydomain');
        });
    });

    describe('request()', function() {
        beforeEach(function() {
            this.api = new Api(this.http, {
                pollInterval: 1
            });
        });

        afterEach(function() {
            this.api = null;
        });

        it('should make a get request and return result data', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 200,
                data: { property: 'value' }
            }));

            this.api.request('/gdc/projects/dummyproject').then(function(data) {
                expect(this.request).was.calledOnce();
                expect(data).to.eql({ property: 'value' });
            }.bind(this)).done(done);
        });

        it('should try fetching new TT token in case HTTP 401 is returned', function(done) {
            this.request.withArgs('/gdc/account/token').returns(q({
                status: 200
            }));

            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 401
            }));

            this.request.withArgs('/gdc/projects/dummyproject').onCall(1).returns(q({
                status: 200,
                data: { property: 'value' }
            }));

            this.api.request('/gdc/projects/dummyproject').then(function(data) {
                expect(this.request).was.calledThrice();
                expect(data).to.eql({ property: 'value' });
            }.bind(this)).done(done);
        });

        it('should not issue multiple TT token requests', function(done) {
            this.request.withArgs('/gdc/account/token').returns(q({
                status: 200
            }));

            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 200,
                data: { property: 'value' }
            }));

            this.request.withArgs('/gdc/projects/dummyproject').onCall(0).returns(q({
                status: 401
            }));

            q.all([this.api.request('/gdc/projects/dummyproject'), this.api.request('/gdc/projects/dummyproject')]).then(function() {
                expect(this.request.withArgs('/gdc/account/token')).was.calledOnce();
            }.bind(this)).done(done);
        });

        it('should fail if token resource returns HTTP 401', function(done) {
            this.request.withArgs('/gdc/account/token').returns(q({
                status: 401
            }));

            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 401
            }));

            this.api.request('/gdc/projects/dummyproject').then(null, function(error) {
                expect(this.request).was.calledTwice();
                expect(error.message).to.be('HTTP Error 401');
            }.bind(this)).done(done);
        });

        it('should fail with returned error message', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 403,
                data: {
                    error: {
                        message: 'Some error: %s',
                        parameters: ['403']
                    }
                }
            }));

            this.api.request('/gdc/projects/dummyproject').then(null, function(error) {
                expect(this.request).was.calledOnce();
                expect(error.message).to.be('Some error: 403');
            }.bind(this)).done(done);
        });

        it('should fail with general error message', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 403
            }));

            this.api.request('/gdc/projects/dummyproject').then(null, function(error) {
                expect(this.request).was.calledOnce();
                expect(error.message).to.be('HTTP Error 403');
            }.bind(this)).done(done);
        });

        it('should poll original URL if 202 code was returned and response is not an asyncTask', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 202
            }));

            this.request.withArgs('/gdc/projects/dummyproject').onCall(4).returns(q({
                status: 200,
                data: { property: 'value' }
            }));

            this.api.request('/gdc/projects/dummyproject').then(function(data) {
                expect(this.request.callCount).to.be(5);
                expect(data).to.eql({ property: 'value' });
            }.bind(this)).done(done);
        });

        it('should poll asyncTask URL if 202 code was returned and response an asyncTask', function(done) {
            this.request.withArgs('/gdc/projects/asynctask').returns(q({
                status: 202,
                data: {
                    asyncTask: {
                        link: {
                            poll: '/gdc/projects/dummyproject'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                status: 202
            }));

            this.request.withArgs('/gdc/projects/dummyproject').onCall(3).returns(q({
                status: 200,
                data: { property: 'value' }
            }));

            this.api.request('/gdc/projects/asynctask').then(function(data) {
                expect(this.request.callCount).to.be(5);
                expect(data).to.eql({ property: 'value' });
            }.bind(this)).done(done);
        });
    });

    describe('log() method', function() {
        beforeEach(function() {
            this.api = new Api(this.http);
        });

        afterEach(function() {
            this.api = null;
        });

        it('should output to console if debug is truthy', sinon.test(function() {
            this.stub(console, 'log');

            this.api.config('debug', true);
            this.api.log('log message with param %s', 'param');

            expect(console.log).was.calledOnce();
            expect(console.log).was.calledWith('log message with param %s', 'param');
        }));

        it('should output to console if debug is truthy', sinon.test(function() {
            this.stub(console, 'log');

            this.api.config('debug', false);
            this.api.log('log message with param %s', 'param');

            expect(console.log).was.notCalled();
        }));
    });

    describe('login() method', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/account/login').returns(q({
                status: 200,
                data: undefined
            }));

            this.request.withArgs('/gdc/account/profile/current').returns(q({
                status: 200,
                data: {
                    accountSetting: {
                        links: {
                            self: '/gdc/account/profile/dummyuser'
                        }
                    }
                }
            }));

            this.api = new Api(this.http);
        });

        afterEach(function() {
            this.api = null;
        });

        it('should return user', function() {
            expect(function() {
                expect(this.api.login('username', 'password')).to.be.an(Api.User);
            }.bind(this)).to.not.throwException();
        });

        it('should resolve after user is logged in', function(done) {
            this.api.login('username', 'password').done(function() {
                done();
            });
        });

        it('should load user data', function(done) {
            this.api.login('username', 'password').done(function(data) {
                expect(this.data()).to.eql(data);
                expect(data).to.be.an('object');
                expect(data.links.self).to.be('/gdc/account/profile/dummyuser');

                done();
            });
        });
    });

    describe('register() method', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/account/domains/testdomain/users').returns(q({
                statusCode: 200,
                data: {
                    uri: '/gdc/profile/dummyuser'
                }
            }));

            this.request.withArgs('/gdc/profile/dummyuser').returns(q({
                statusCode: 200,
                data: {
                    accountSetting: {
                        login: 'username',
                        links: {
                            self: '/gdc/profile/dummyuser'
                        }
                    }
                }
            }));

            this.api = new Api(this.http, { domain: 'testdomain' });
        });

        afterEach(function() {
            this.api = null;
        });

        it('should return user', function() {
            expect(function() {
                expect(this.api.register('username', 'password')).to.be.an(Api.User);
            }.bind(this)).to.not.throwException();
        });

        it('should resolve after user is registered', function(done) {
            this.api.register('username', 'password').done(function() {
                done();
            });
        });
    });
});
