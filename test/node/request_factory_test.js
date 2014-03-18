'use strict';

require('colors');

var expect = require('expect.js');
var express = require('express');
var https = require('https');
var fs = require('fs');

describe('Request factory - node', function() {
    var factory = require('../../src/node/request_factory');

    before(function(done) {
        this.app = express();
        this.port = 36594;

        this.app.use(express.json());
        this.app.use(express.cookieParser());

        this.app.get('/gdc/url/error/nomessage', function(req, res) {
            res.writeHead(401);
            res.end('<html><head></head><body></body></html>');
        });

        this.app.get('/gdc/url/error/message', function(req, res) {
            res.writeHead(500);
            res.end(JSON.stringify({
                error: {
                    message: 'Error: %s',
                    parameters: [
                        'You are unauthorized'
                    ]
                }
            }));
        });

        this.app.get('/gdc/public/url', function(req, res) {
            res.end(JSON.stringify({
                data: 'data'
            }));
        });

        this.notAsyncTaskPolls = 0;
        this.app.get('/gdc/poll/notasynctask', function(req, res) {
            this.notAsyncTaskPolls++;

            if (this.notAsyncTaskPolls > 3) {
                res.end(JSON.stringify({
                    data: 'data'
                }));
            } else {
                res.writeHead(202);
                res.end();
            }
        }.bind(this));

        this.asyncTaskPolls = 0;
        this.app.get('/gdc/poll/asynctask', function(req, res) {
            this.asyncTaskPolls++;

            if (this.asyncTaskPolls > 3) {
                res.end(JSON.stringify({
                    data: 'data'
                }));
            } else {
                res.writeHead(202);
                res.end(JSON.stringify({
                    asyncTask: {
                        link: {
                            poll: '/gdc/poll/asynctask'
                        }
                    }
                }));
            }
        }.bind(this));

        this.app.get('/gdc/auth/url', function(req, res) {
            var tt = req.cookies.GDCAuthTT;

            if (!tt) {
                res.writeHead(401);
            } else {
                res.writeHead(200);
            }

            res.end();
        });

        this.app.post('/gdc/account/login', function(req, res) {
            res.cookie('GDCAuthSST', 'ssttokenvalue');
            res.writeHead(200);
            res.end();
        });

        this.app.get('/gdc/account/token', function(req, res) {
            var sst = req.cookies.GDCAuthSST;

            if (!sst) {
                res.writeHead(401);
            } else {
                res.cookie('GDCAuthTT', 'tttokenvalue');
            }

            res.end();
        });

        var options = {
            key: fs.readFileSync(__dirname + '/../cert/server.key'),
            cert: fs.readFileSync(__dirname + '/../cert/server.crt'),
            rejectUnauthorized: false
        };

        this.server = https.createServer(options, this.app).listen(this.port, done);
    });

    after(function(done) {
        this.server.close(done);
    });

    context('configuration', function() {
        it('should accept domain@host:port configuration string', function() {
            var request = factory('domain@hostname:8443');

            expect(request.domain).to.be('domain');
            expect(request.hostname).to.be('hostname');
            expect(request.port).to.be(8443);
        });

        it('should accept domain@host configuration string', function() {
            var request = factory('domain@hostname');

            expect(request.domain).to.be('domain');
            expect(request.hostname).to.be('hostname');
            expect(request.port).to.be(443);
        });

        it('should accept host:port configuration string', function() {
            var request = factory('hostname:8443');

            expect(request.domain).to.be(null);
            expect(request.hostname).to.be('hostname');
            expect(request.port).to.be(8443);
        });

        it('should accept host configuration string', function() {
            var request = factory('hostname');

            expect(request.domain).to.be(null);
            expect(request.hostname).to.be('hostname');
            expect(request.port).to.be(443);
        });

        it('should throw an exception if port is not a number', function() {
            expect(function() {
                factory('hostname:ole');
            }).to.throwException();
        });

        it('should throw an exception if configuration string is invalid', function() {
            expect(function() {
                factory('*--+--980');
            }).to.throwException();
        });

        it('should throw an exception if configuration string is empty', function() {
            expect(function() {
                factory('');
            }).to.throwException();
        });

        it('should accept configuration object', function() {
            var request = factory({
                domain: 'domain',
                hostname: 'hostname',
                port: 8443
            });

            expect(request.domain).to.be('domain');
            expect(request.hostname).to.be('hostname');
            expect(request.port).to.be(8443);
        });

        it('should use port 443 by default', function() {
            var request = factory({
                domain: 'domain',
                hostname: 'hostname'
            });

            expect(request.domain).to.be('domain');
            expect(request.hostname).to.be('hostname');
            expect(request.port).to.be(443);
        });

        it('should not throw an exception if domain is not specified', function() {
            expect(function() {
                factory({
                    hostname: 'hostname'
                });
            }).not.to.throwException();
        });
    });

    describe('request', function() {
        beforeEach(function() {
            this.request = factory({
                domain: 'test',
                hostname: 'localhost',
                port: this.port
            });

            // this.request.debug = true;
        });

        it('should make a get request and return result data', function(done) {
            this.request('/gdc/public/url').then(function(res) {
                expect(res.body).to.be(JSON.stringify({ data: 'data' }));
                expect(res.data).to.eql({ data: 'data' });
            }).done(done);
        });

        it('should reject with HTTP Error 401', function(done) {
            this.request('/gdc/url/error/nomessage').then(null, function(error) {
                expect(error.message).to.be('HTTP Error 401');
            }).done(done);
        });

        it('should reject with specific error', function(done) {
            this.request('/gdc/url/error/message').then(null, function(error) {
                expect(error.message).to.be('Error: You are unauthorized');
            }).done(done);
        });

        it('should try fetching new TT token in case 401 is returned and reject if unsuccessful', function(done) {
            this.request('/gdc/auth/url').then(null, function(error) {
                expect(error.message).to.be('HTTP Error 401');
            }).done(done);
        });

        it('should try fetching new TT token in case 401 is returned and resolve if successful', function(done) {
            this.request('/gdc/account/login', {
                method: 'POST'
            }).then(function() {
                return this.request('/gdc/auth/url');
            }.bind(this)).then(function(res) {
                expect(res.statusCode).to.be(200);
            }).done(done);
        });

        it('should preserve authentication cookies when passing some additional ones', function(done) {
            this.request('/gdc/account/login', {
                method: 'POST'
            }).then(function() {
                return this.request('/gdc/auth/url', {
                    headers: {
                        cookie: 'MyCookie=1'
                    }
                });
            }.bind(this)).then(function(res) {
                expect(res.statusCode).to.be(200);
            }).done(done);
        });

        it('should poll original URL if 202 code was returned and response is not an asyncTask', function(done) {
            this.request('/gdc/account/login', {
                method: 'POST'
            }).then(function() {
                return this.request('/gdc/poll/notasynctask');
            }.bind(this)).then(function(res) {
                expect(this.notAsyncTaskPolls).to.be(4);
                expect(res.data).to.eql({ data: 'data' });
            }.bind(this)).done(done);
        });

        it('should poll original URL if 202 code was returned and response is an asyncTask', function(done) {
            this.request('/gdc/account/login', {
                method: 'POST'
            }).then(function() {
                return this.request('/gdc/poll/asynctask');
            }.bind(this)).then(function(res) {
                expect(this.asyncTaskPolls).to.be(4);
                expect(res.data).to.eql({ data: 'data' });
            }.bind(this)).done(done);
        });
    });
});
