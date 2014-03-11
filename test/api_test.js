'use strict';

require('colors');

var https = require('https');

var expect = require('expect.js');
var sinon = require('sinon');
var config = require('./config');
var API = require('../lib/api');

expect = require('sinon-expect').enhance(expect, sinon, 'was');

describe('API', function() {
    beforeEach(function() {
        this.api = new API(config);

        sinon.spy(https, 'request');
    });

    afterEach(function() {
        https.request.restore();
    });

    describe('constructor', function() {
        it('should throw an exception if hostname option is not provided', function() {
            expect(function() {
                new API({});
            }).to.throwException();
        });

        it('should not throw an exception if hostname option is provided', function() {
            expect(function() {
                new API({
                    hostname: 'some.host.com'
                });
            }).to.not.throwException();
        });

        it('should use 443 as a default port', function() {
            var api = new API({
                hostname: 'some.host.com'
            });

            expect(api.port).to.be(443);
        });

        it('should parse hostname and port from `host` option', function() {
            var api1 = new API({ host: 'some.host.com' });
            expect(api1.hostname).to.be('some.host.com');
            expect(api1.port).to.be(443);

            var api2 = new API({ host: 'some.host.com:8443' });
            expect(api2.hostname).to.be('some.host.com');
            expect(api2.port).to.be(8443);

            var api3 = new API({ host: 'some.host.com', port: 8443 });
            expect(api3.hostname).to.be('some.host.com');
            expect(api3.port).to.be(8443);
        });
    });

    it('should log to console if `debug` is set to true', sinon.test(function() {
        this.stub(console, 'log');

        this.api.debug = true;

        this.api.log('log %s %s', true, false);

        expect(console.log).was.calledOnce();
        expect(console.log).was.calledWith('log %s %s', true, false);
    }));

    it('should not log to console if `debug` is set to false', sinon.test(function() {
        this.stub(console, 'log');

        this.api.log('log %s %s', true, false);

        expect(console.log.called).to.be(false);
    }));

    it('should log user in and resolve promise with user instance', function(done) {
        this.api.login({
            username: config.username,
            password: config.password
        }).then(function(user) {
            expect(user).to.be.an(API.User);
            expect(user.password).to.be(config.password);
        }).done(done);
    });
});
