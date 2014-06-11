'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var Project = require('../../../src/common/project');
var ProfileSettings = require('../../../src/common/profile_settings');
var User = require('../../../src/common/user');
var q = require('q');

describe('User', function() {
    beforeEach(function() {
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };

        this.api = new Api(this.http);
        this.user = new User(this.api, {
            firstName: 'First',
            lastName: 'Last',
            links: {
                self: '/gdc/profile/dummyuser',
                projects: '/gdc/profile/dummyuser/projects',
                profileSetting: '/gdc/profile/dummyuser/settings'
            }
        });
    });

    describe('properties', function() {
        it('should have `accountSetting` namespace', function() {
            expect(this.user.namespace).to.be('accountSetting');
        });
    });

    describe('collectionUri()', function() {
        it('should be ok if domain is specified in Api config', function() {
            this.api.config('domain', 'mydomain');
            expect(this.user.collectionUri()).to.be('/gdc/account/domains/mydomain/users');
        });

        it('should be null if domain is not specified in Api config', function() {
            this.api.config('domain', null);
            expect(this.user.collectionUri()).to.be(null);
        });
    });

    describe('login()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/account/login').returns(q({
                statusCode: 200,
                data: undefined
            }));

            this.request.withArgs('/gdc/account/profile/current').returns(q({
                statusCode: 200,
                data: {
                    accountSetting: {
                        links: {
                            self: '/gdc/profile/dummyuser'
                        }
                    }
                }
            }));
        });

        it('should use login data field if username is not provided', function(done) {
            this.user.data('login', 'username');
            this.user.login(null, 'password').andThen(function() {
                expect(this.request).was.calledWith('/gdc/account/login', {
                    method: 'POST',
                    data: {
                        postUserLogin: {
                            captcha: '',
                            login: 'username',
                            password: 'password',
                            remember: '0',
                            verifyCaptcha: ''
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should make a POST request to /gdc/account/login', function(done) {
            this.user.login('username', 'password').andThen(function() {
                expect(this.request).was.calledWith('/gdc/account/login', {
                    method: 'POST',
                    data: {
                        postUserLogin: {
                            captcha: '',
                            login: 'username',
                            password: 'password',
                            remember: '0',
                            verifyCaptcha: ''
                        }
                    }
                });
            }.bind(this)).done(done);
        });
    });

    describe('register()', function() {
        it('should reject if no domain is specified', function(done) {
            this.user.register('username', 'password').andThen(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should use data fields if not provided as function parameters', function(done) {
            this.user.data('login', 'username');
            this.user.data('firstName', 'John');
            this.user.data('lastName', 'Smith');

            sinon.stub(this.user, 'create').returns(this.user);

            this.user.register(null, 'password').andThen(function() {
                expect(this.user.create).was.calledWith({
                    login: 'username',
                    password: 'password',
                    email: 'username',
                    verifyPassword: 'password',
                    firstName: 'John',
                    lastName: 'Smith'
                });
            }.bind(this)).done(done);
        });

        it('should call user.create() method', function(done) {
            sinon.stub(this.user, 'create').returns(this.user);

            this.user.register('username', 'password', 'John', 'Smith').andThen(function() {
                expect(this.user.create).was.calledOnce();
                expect(this.user.create).was.calledWith({
                    login: 'username',
                    password: 'password',
                    email: 'username',
                    verifyPassword: 'password',
                    firstName: 'John',
                    lastName: 'Smith'
                });
            }.bind(this)).done(done);
        });
    });

    describe('project()', function() {
        it('should create project', function(done) {
            this.request.withArgs('/gdc/projects').returns(q({
                statusCode: 204,
                data: { uri: '/gdc/projects/dummyproject' }
            }));

            this.request.withArgs('/gdc/projects/dummyproject').returns(q({
                statusCode: 200,
                data: {
                    project: {
                        content: {
                            state: 'ENABLED'
                        },
                        links: {
                            self: '/gdc/projects/dummyproject'
                        }
                    }
                }
            }));

            this.user.project({
                content: {
                    token: 'authtoken'
                },
                meta: {
                    title: 'A project'
                }
            }).then(function(project) {
                expect(this.request).was.calledWith('/gdc/projects', {
                    method: 'POST',
                    data: {
                        project: {
                            content: {
                                token: 'authtoken'
                            },
                            meta: {
                                title: 'A project'
                            }
                        }
                    }
                });
                expect(project).to.be.a(Project);
            }.bind(this)).done(done);
        });
    });

    describe('projects()', function() {
        it('should reject if user has no projects URI', function(done) {
            this.user.links('projects', null);
            this.user.projects().then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should list projects', function(done) {
            this.request.withArgs('/gdc/profile/dummyuser/projects').returns(q({
                statusCode: 200,
                data: {
                    projects: [{
                        project: {
                            links: {
                                self: '/gdc/dummy/project/1'
                            }
                        }
                    }]
                }
            }));

            this.user.projects().then(function(projects) {
                expect(projects).to.be.an('array');
                expect(projects).to.have.length(1);
                expect(projects[0].uri()).to.be('/gdc/dummy/project/1');
            }).done(done);
        });
    });

    describe('settings()', function() {
        it('should reject if user has no settings URI', function(done) {
            this.user.uri(null);
            this.user.settings().then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should load settings', function(done) {
            this.request.withArgs('/gdc/profile/dummyuser/settings').returns(q({
                statusCode: 200,
                data: {
                    profileSetting: {
                        links: {
                            self: '/gdc/profile/dummyuser/settings'
                        }
                    }
                }
            }));

            this.user.settings().then(function(settings) {
                expect(settings).to.be.a(ProfileSettings);
                expect(settings.uri()).to.be('/gdc/profile/dummyuser/settings');
            }).done(done);
        });
    });

    it('should load bootstrap data', function(done) {
        this.request.withArgs('/gdc/app/account/bootstrap').returns(q({
            statusCode: 200,
            data: {
                bootstrapResource: {
                    accountSetting: {
                        content: {},
                        meta: {}
                    },
                    profileSetting: {}
                }
            }
        }));

        this.user.bootstrap().andThen(function(data) {
            expect(this.user.data()).to.eql({
                content: {},
                meta: {}
            });

            expect(data).to.eql({
                accountSetting: {
                    content: {},
                    meta: {}
                },
                profileSetting: {}
            });
        }.bind(this)).done(done);
    });
});
