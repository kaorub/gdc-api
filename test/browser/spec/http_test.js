'use strict';

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Http = require('../../../src/browser/http');
var querystring = require('querystring');

describe('Http factory - browser', function() {
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

            this.responseData = {
                response: {
                    property: 'value'
                }
            };

            this.jQueryXHR = {
                status: 200,
                getResponseHeader: sinon.stub()
            };

            this.promise = {
                done: sinon.stub().yields(this.responseData, 'ok', this.jQueryXHR),
                fail: sinon.stub().yields(this.jQueryXHR)
            };

            this.promise.done.returns(this.promise);

            window.$ = {
                ajax: sinon.stub().returns(this.promise),
                param: function(obj) {
                    return querystring.stringify(obj);
                }
            };
        });

        afterEach(function() {
            window.$ = null;
        });

        it('should accept string URL parameter', function(done) {
            this.http.request('/gdc/uri').then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri', {
                    dataType: 'json',
                    method: 'GET'
                });
            }.bind(this)).done(done);
        });

        it('should accept string URL parameter and options object', function(done) {
            this.http.request('/gdc/uri', { method: 'POST' }).then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri', {
                    dataType: 'json',
                    method: 'POST'
                });
            }.bind(this)).done(done);
        });

        it('should accept options object', function(done) {
            this.http.request({ url: '/gdc/uri', method: 'POST' }).then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri', {
                    dataType: 'json',
                    method: 'POST'
                });
            }.bind(this)).done(done);
        });

        it('should use correct HTTP method', function(done) {
            this.http.request('/gdc/uri', { method: 'PUT' }).then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri', {
                    dataType: 'json',
                    method: 'PUT'
                });
            }.bind(this)).done(done);
        });

        it('should send payload', function(done) {
            var data = { property: 'value' };

            this.http.request('/gdc/uri', { data: data, method: 'POST' }).then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri', {
                    dataType: 'json',
                    method: 'POST',
                    data: data
                });
            }.bind(this)).done(done);
        });

        it('should send URL query parameters', function(done) {
            var query = { property: 'value' };

            this.http.request('/gdc/uri', { query: query }).then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri?property=value', {
                    dataType: 'json',
                    method: 'GET'
                });
            }.bind(this)).done(done);
        });

        it('should send headers if specified', function(done) {
            var headers = { header: 'value' };

            this.http.request('/gdc/uri', { headers: headers }).then(function() {
                expect(window.$.ajax).was.calledWith('/gdc/uri', {
                    dataType: 'json',
                    method: 'GET',
                    headers: headers
                });
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
            this.promise.done = sinon.stub().yields(null, 'ok', this.jQueryXHR).returns(this.promise);

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
