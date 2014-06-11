'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Http = require('../../../src/node/http');
var unirest = require('unirest');

describe('Http factory - node', function() {
    describe('configuration', function() {
        it('should throw an exception if port is not a number', function() {
            expect(function() {
                new Http({ hostname: 'secure.gooddata.com' });
            }).to.throwException();

            expect(function() {
                new Http({ hostname: 'secure.gooddata.com', port: 'port' });
            }).to.throwException();
        });

        it('should throw an exception if hostname is falsy', function() {
            expect(function() {
                new Http({ hostname: '', port: 443 });
            }).to.throwException();

            expect(function() {
                new Http({ port: 443 });
            }).to.throwException();
        });

        it('should accept configuration object', function() {
            var request = new Http({
                domain: 'domain',
                hostname: 'hostname',
                port: 8443
            });

            expect(request.config('domain')).to.be('domain');
            expect(request.config('hostname')).to.be('hostname');
            expect(request.config('port')).to.be(8443);
        });
    });

    describe('request()', function() {
        beforeEach(function() {
            this.http = new Http({
                hostname: 'hostname',
                port: 443
            });

            this.httpResponse = {
                status: 200,
                headers: {
                    'x-gdc-request': 'somerequestid'
                },
                body: {
                    response: {
                        property: 'value'
                    }
                }
            };

            this.httpRequest = unirest.get('/initial/uri');
            sinon.stub(this.httpRequest, 'end').yields(this.httpResponse);

            sinon.stub(unirest, 'get').returns(this.httpRequest);
            sinon.stub(unirest, 'post').returns(this.httpRequest);
            sinon.stub(unirest, 'put').returns(this.httpRequest);
        });

        afterEach(function() {
            unirest.get.restore();
            unirest.post.restore();
            unirest.put.restore();
        });

        it('should accept string URL parameter', function(done) {
            this.http.request('/gdc/uri').then(function() {
                expect(unirest.get).was.calledWith('https://hostname:443/gdc/uri');
            }.bind(this)).done(done);
        });

        it('should accept string URL parameter and options object', function(done) {
            this.http.request('/gdc/uri', { method: 'POST' }).then(function() {
                expect(unirest.post).was.calledWith('https://hostname:443/gdc/uri');
            }.bind(this)).done(done);
        });

        it('should accept options object', function(done) {
            this.http.request({ url: '/gdc/uri', method: 'POST' }).then(function() {
                expect(unirest.post).was.calledWith('https://hostname:443/gdc/uri');
            }.bind(this)).done(done);
        });

        it('should use correct HTTP method', function(done) {
            this.http.request('/gdc/uri', { method: 'PUT' }).then(function() {
                expect(unirest.put).was.calledWith('https://hostname:443/gdc/uri');
            }.bind(this)).done(done);
        });

        it('should send payload', function(done) {
            var data = { property: 'value' };
            sinon.spy(this.httpRequest, 'send');

            this.http.request('/gdc/uri', { data: data }).then(function() {
                expect(this.httpRequest.send).was.calledOnce();
                expect(this.httpRequest.send).was.calledWith(data);
            }.bind(this)).done(done);
        });

        it('should send URL query parameters', function(done) {
            var query = { property: 'value' };
            sinon.spy(this.httpRequest, 'query');

            this.http.request('/gdc/uri', { query: query }).then(function() {
                expect(this.httpRequest.query).was.calledOnce();
                expect(this.httpRequest.query).was.calledWith(query);
            }.bind(this)).done(done);
        });

        it('should use JSON accept header and data type', function(done) {
            sinon.spy(this.httpRequest, 'type');
            sinon.spy(this.httpRequest, 'header');

            this.http.request('/gdc/uri').then(function() {
                expect(this.httpRequest.type).was.calledWith('json');
                expect(this.httpRequest.header).was.calledWith('accept', 'application/json');
            }.bind(this)).done(done);
        });

        it('should send headers if specified', function(done) {
            var headers = { header: 'value' };
            sinon.spy(this.httpRequest, 'headers');

            this.http.request('/gdc/uri', { headers: headers }).then(function() {
                expect(this.httpRequest.headers).was.calledWith(headers);
            }.bind(this)).done(done);
        });

        it('should resolve with object containing status and data', function(done) {
            this.http.request('/gdc/uri').then(function(data) {
                expect(data).to.eql({
                    status: 200,
                    data: this.httpResponse.body
                });
            }.bind(this)).done(done);
        });

        it('should not reject if response body is not a valid JSON string', function(done) {
            this.httpResponse.body = '<html/>';

            this.http.request('/gdc/uri').then(function(data) {
                expect(data).to.eql({
                    status: 200,
                    data: {}
                });
            }.bind(this)).done(done);
        });
    });

    describe('lastRequestId', function() {
        it('should return null if __lastRequestId is falsy', function() {
            this.http.__lastRequestId = null;
            expect(this.http.lastRequestId).to.be(null);

            this.http.__lastRequestId = '';
            expect(this.http.lastRequestId).to.be(null);

            this.http.__lastRequestId = undefined;
            expect(this.http.lastRequestId).to.be(null);
        });

        it('should return value of __lastRequestId', function() {
            this.http.__lastRequestId = 'lastrequestid';
            expect(this.http.lastRequestId).to.be('lastrequestid');
        });
    });
});
