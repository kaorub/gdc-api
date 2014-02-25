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
        this.api.sst = 'sstsstsstsst';
        
        sinon.spy(https, 'request');
    });
    
    afterEach(function() {
        https.request.restore();
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
    
    it('should make a HTTP request to specified hostname and port', function() {
        this.api.request('/gdc/account/token');
        
        expect(https.request).was.calledOnce();
        expect(https.request).was.calledWith({
            path: '/gdc/account/token',
            hostname: this.api.hostname,
            port: this.api.port,
            method: 'GET',
            sst: this.api.sst,
            tt: undefined,
            rejectUnauthorized: false,
            headers: {
                'content-length': 0,
                'accept': 'application/json',
                'cookie': 'GDCAuthSST=sstsstsstsst'
            }
        });
    });
});
