'use strict';

require('mocha-as-promised')();

require('colors');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);
chai.should();

var express = require('express');
var https = require('https');
var fs = require('fs');
var expect = require('expect.js');
var sinon = require('sinon');
var Auth = require('../lib/auth.js');

describe('Auth', function() {
    beforeEach(function(done) {
        var options = {
            key: fs.readFileSync(__dirname + '/cert/server.key'),
            cert: fs.readFileSync(__dirname + '/cert/server.crt')
        };

        this.port = 9443;
        this.express = express();
        this.server = https.createServer(options, this.express);

        // Create an HTTPS service identical to the HTTP service.
        this.server.listen(this.port, done);
    });

    afterEach(function() {
        this.server.close();
    });

    it('should get SST token', function(done) {
        var spy = sinon.spy();
        var sentSST = 'kbYU_Bkjkjnklmr';
        var username = 'valid.username@gooddata.com';
        var password = 'valid.password';
        var host = 'localhost:' + this.port;

        this.express.post('/gdc/account/login', function(req, res) {
            var body = '';

            expect(req.headers.host).to.be(host);

            req.on('data', function(chunk) {
                body += chunk;
            });

            req.on('end', function() {
                spy(JSON.parse(body));

                res.writeHead(200, {
                    'set-cookie': 'GDCAuthSST=' + sentSST
                });
                res.end();
            });
        });

        Auth.getSST(username, password, 'localhost', this.port).then(function(sst) {
            expect(spy.calledWith({
                postUserLogin: {
                    captcha: '',
                    login: username,
                    password: password,
                    remember: '0',
                    verifyCaptcha: ''
                }
            })).to.be.ok();
            expect(sst).to.be(sentSST);
        }).finally(done).done();
    });

    it('should get TT token', function(done) {
        var sentSST = 'kbYU_Bkjkjnklmr';
        var sentTT = 'vfdfdku4816bgfKHJFJki--_YTDkikBGHFJBGHhcoiv48bg6nh_nvfd_cdsvckbvku481gbjcdjkhGHRTSDF';
        var host = 'localhost:' + this.port;

        this.express.get('/gdc/account/token', function(req, res) {
            expect(req.headers.host).to.be(host);
            expect(req.headers.cookie).to.contain('GDCAuthSST=' + sentSST);

            res.writeHead(200, {
                'set-cookie': 'GDCAuthTT=' + sentTT
            });
            res.end();
        });

        Auth.getTT(sentSST, 'localhost', this.port).then(function(tt) {
            expect(tt).to.be(sentTT);
        }).finally(done).done();
    });

    it('should delete SST token', function(done) {
        var userId = '125164cddc4d54c5dvd';
        var sentSST = 'kbYU_Bkjkjnklmr';
        var sentTT = 'vfdfdku4816bgfKHJFJki--YTDkikBGHFJBGHhcoiv48bg6nh_nvfd--cdsvckbvku481gbjcdjkhGHRTSDF';
        var host = 'localhost:' + this.port;

        var bootstrapSpy = sinon.spy();
        var loginSpy = sinon.spy();

        this.express.get('/gdc/app/account/bootstrap', function(req, res) {
            expect(req.headers.host).to.be(host);
            expect(req.headers.cookie).to.contain('GDCAuthTT=' + sentTT);

            res.writeHead(200, {
                'set-cookie': 'GDCAuthTT=' + sentTT
            });
            res.write(JSON.stringify({
                bootstrapResource: {
                    accountSetting: {
                        links: {
                            self: '/gdc/account/profile/' + userId
                        }
                    }
                }
            }));
            res.end();

            bootstrapSpy();
        });

        this.express.delete('/gdc/account/login/' + userId, function(req, res) {
            expect(req.headers.host).to.be(host);
            expect(req.headers.cookie).to.contain('GDCAuthSST=' + sentSST);
            expect(req.headers.cookie).to.contain('GDCAuthTT=' + sentTT);

            res.writeHead(200);
            res.end();

            loginSpy();
        });

        Auth.deleteSST(sentSST, sentTT, 'localhost', this.port).then(function() {
            expect(bootstrapSpy.calledOnce).to.be.ok();
            expect(loginSpy.calledOnce).to.be.ok();
        }).finally(done).done();
    });

    it('should fetch valid TT then delete SST token', function(done) {
        var userId = '125164cddc4d54c5dvd';
        var sentSST = 'kbYU_Bkjkjnklmr';
        var sentTT = 'vfdfdku4816bgfKHJFJki--YTDkikBGHFJBGHhcoiv48bg6nh_nvfd--cdsvckbvku481gbjcdjkhGHRTSDF';
        var host = 'localhost:' + this.port;

        var bootstrapSpy = sinon.spy();
        var loginSpy = sinon.spy();
        var tokenSpy = sinon.spy();

        this.express.get('/gdc/app/account/bootstrap', function(req, res) {
            expect(req.headers.host).to.be(host);
            expect(req.headers.cookie).to.contain('GDCAuthTT=' + sentTT);

            if (bootstrapSpy.called) {
                res.writeHead(200, {
                    'set-cookie': 'GDCAuthTT=' + sentTT
                });
                res.write(JSON.stringify({
                    bootstrapResource: {
                        accountSetting: {
                            links: {
                                self: '/gdc/account/profile/' + userId
                            }
                        }
                    }
                }));
                res.end();
            } else {
                res.writeHead(401);
                res.end();
            }

            bootstrapSpy();
        });

        this.express.delete('/gdc/account/login/' + userId, function(req, res) {
            expect(req.headers.host).to.be(host);
            expect(req.headers.cookie).to.contain('GDCAuthSST=' + sentSST);
            expect(req.headers.cookie).to.contain('GDCAuthTT=' + sentTT);

            res.writeHead(200);
            res.end();

            loginSpy();
        });

        this.express.get('/gdc/account/token', function(req, res) {
            expect(req.headers.host).to.be(host);
            expect(req.headers.cookie).to.contain('GDCAuthSST=' + sentSST);

            res.writeHead(200, {
                'set-cookie': 'GDCAuthTT=' + sentTT
            });
            res.end();

            tokenSpy();
        });

        Auth.deleteSST(sentSST, sentTT, 'localhost', this.port).then(function() {
            expect(bootstrapSpy.callCount).to.be(2);
            expect(loginSpy.calledOnce).to.be.ok();
            expect(tokenSpy.calledOnce).to.be.ok();
        }).finally(done).done();
    });
});
