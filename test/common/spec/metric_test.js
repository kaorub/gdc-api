'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var Project = require('../../../src/common/project');
var Metric = require('../../../src/common/metric');

describe('Metric', function() {
    beforeEach(function() {
        this.enabled = true;
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };

        this.api = new Api(this.http);
        this.project = new Project(this.api, this.user);
        this.metric = new Metric(this.api, this.project, {
            meta: {
                uri: '/gdc/dummy/metric'
            }
        });
    });

    afterEach(function() {
        this.api = null;
        this.project = null;
        this.metric = null;
    });

    describe('uri()', function() {
        it('should use meta.uri value', function() {
            expect(this.metric.uri()).to.be('/gdc/dummy/metric');
        });
    });
});
