'use strict';

require('colors');

describe('Api', function() {
    var expect = require('expect.js');
    var sinon = require('sinon');
    expect = require('sinon-expect').enhance(expect, sinon, 'was');

    // var util = require('util');
    var q = require('q');
    var Api = require('../../src/common/api');

    describe('constructor', function() {
        it('should throw an exception if request is not a function', function() {
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

    describe('log() method', function() {
        beforeEach(function() {
            this.api = new Api(function() {});
        });

        it('should output to console if debug is truthy', sinon.test(function() {
            this.stub(console, 'log');

            this.api.debug = true;
            this.api.log('log message with param %s', 'param');

            expect(console.log).was.calledOnce();
            expect(console.log).was.calledWith('log message with param %s', 'param');
        }));

        it('should output to console if debug is truthy', sinon.test(function() {
            this.stub(console, 'log');

            this.api.debug = false;
            this.api.log('log message with param %s', 'param');

            expect(console.log).was.notCalled();
        }));
    });

    describe('login() method', function() {
        beforeEach(function() {
            this.request = function(url) {
                if (url === '/gdc/account/login') {
                    return q({
                        statusCode: 200,
                        data: {
                            userLogin: {
                                profile: '/gdc/profile/dummyuser'
                            }
                        }
                    });
                }

                if (url === '/gdc/profile/dummyuser') {
                    return q({
                        statusCode: 200,
                        data: {
                            accountSetting: {
                                login: 'username',
                                links: {
                                    self: '/gdc/profile/dummyuser'
                                }
                            }
                        }
                    });
                }
            }.bind(this);

            this.api = new Api(this.request);
        });

        it('should accept username and password', function() {
            var username = 'username',
                password = 'password';

            expect(function() {
                expect(this.api.login(username, password)).to.be.an(Api.User);
            }.bind(this)).to.not.throwException();
        });

        it('should accept user instance', function() {
            var user = new Api.User(this.api);

            expect(function() {
                expect(this.api.login(user)).to.be(user);
            }.bind(this)).to.not.throwException();
        });

        it('should resolve after user is logged in', function(done) {
            var username = 'username',
                password = 'password';

            this.api.login(username, password).done(function() {
                done();
            });
        });

        it('should load user data', function(done) {
            var username = 'username',
                password = 'password';

            this.api.login(username, password).done(function(data) {
                expect(data).to.be.an('object');
                expect(data.links.self).to.be('/gdc/profile/dummyuser');

                done();
            });
        });
    });

    describe('register() method', function() {
        beforeEach(function() {
            this.request = function(url) {
                if (url === '/gdc/account/domain/testdomain/users') {
                    return q({
                        statusCode: 200,
                        data: {
                            uri: '/gdc/profile/dummyuser'
                        }
                    });
                }

                if (url === '/gdc/profile/dummyuser') {
                    return q({
                        statusCode: 200,
                        data: {
                            accountSetting: {
                                login: 'username',
                                links: {
                                    self: '/gdc/profile/dummyuser'
                                }
                            }
                        }
                    });
                }
            }.bind(this);

            this.request.domain = 'testdomain';
            this.api = new Api(this.request);
        });

        it('should accept username and password', function() {
            var username = 'username',
                password = 'password';

            expect(function() {
                expect(this.api.register(username, password)).to.be.an(Api.User);
            }.bind(this)).to.not.throwException();
        });

        it('should accept user instance', function() {
            var user = new Api.User(this.api);

            expect(function() {
                expect(this.api.register(user)).to.be(user);
            }.bind(this)).to.not.throwException();
        });

        it('should resolve after user is registered', function(done) {
            var username = 'username',
                password = 'password';

            this.api.register(username, password).done(function() {
                done();
            });
        });
    });

    // describe('constructor', function() {
    //     it('should throw an exception if hostname option is not provided', function() {
    //         expect(function() {
    //             new API({});
    //         }).to.throwException();
    //     });

    //     it('should not throw an exception if hostname option is provided', function() {
    //         expect(function() {
    //             new API({
    //                 hostname: 'some.host.com'
    //             });
    //         }).to.not.throwException();
    //     });

    //     it('should use 443 as a default port', function() {
    //         var api = new API({
    //             hostname: 'some.host.com'
    //         });

    //         expect(api.port).to.be(443);
    //     });

    //     it('should parse hostname and port from `host` option', function() {
    //         var api1 = new API({ host: 'some.host.com' });
    //         expect(api1.hostname).to.be('some.host.com');
    //         expect(api1.port).to.be(443);

    //         var api2 = new API({ host: 'some.host.com:8443' });
    //         expect(api2.hostname).to.be('some.host.com');
    //         expect(api2.port).to.be(8443);

    //         var api3 = new API({ host: 'some.host.com', port: 8443 });
    //         expect(api3.hostname).to.be('some.host.com');
    //         expect(api3.port).to.be(8443);
    //     });
    // });

    // it('should log to console if `debug` is set to true', sinon.test(function() {
    //     this.stub(console, 'log');

    //     this.api.debug = true;

    //     this.api.log('log %s %s', true, false);

    //     expect(console.log).was.calledOnce();
    //     expect(console.log).was.calledWith('log %s %s', true, false);
    // }));

    // it('should not log to console if `debug` is set to false', sinon.test(function() {
    //     this.stub(console, 'log');

    //     this.api.debug = false;
    //     this.api.log('log %s %s', true, false);

    //     expect(console.log.called).to.be(false);
    // }));

    // it('should log user in and resolve promise with user instance', function(done) {
    //     this.api.login({
    //         username: config.username,
    //         password: config.password
    //     }).then(function(user) {
    //         expect(user).to.be.an(API.User);
    //         expect(user.password).to.be(config.password);
    //     }).done(done);
    // });
});
