'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var Project = require('../../../src/common/project');
var Report = require('../../../src/common/report');
var q = require('q');

describe('Report', function() {
    beforeEach(function() {
        this.enabled = true;
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };

        this.api = new Api(this.http);
        this.project = new Project(this.api, this.user, {
            links: {
                self: '/gdc/projects/dummyproject',
                roles: '/gdc/projects/dummyproject/roles',
                users: '/gdc/projects/dummyproject/users',
                metadata: '/gdc/md/dummyproject'
            }
        });
        this.report = new Report(this.api, this.project, {
            meta: {
                uri: '/gdc/dummy/report'
            }
        });
    });

    describe('uri()', function() {
        it('should use meta.uri value', function() {
            expect(this.report.uri()).to.be('/gdc/dummy/report');
        });
    });

    describe('metrics()', function() {
        it('should call find() method', function(done) {
            var metrics = [];
            sinon.stub(this.report, 'find').returns(q(metrics));

            this.report.metrics().then(function(value) {
                expect(value).to.be(metrics);
                expect(this.report.find).was.calledOnce();
                expect(this.report.find).was.calledWith('metric');
            }.bind(this)).done(done);
        });
    });

    describe('reportDefinitions()', function() {
        it('should call find() method', function(done) {
            var reportDefinitions = [];
            sinon.stub(this.report, 'find').returns(q(reportDefinitions));

            this.report.reportDefinitions().then(function(value) {
                expect(value).to.be(reportDefinitions);
                expect(this.report.find).was.calledOnce();
                expect(this.report.find).was.calledWith('reportDefinition');
            }.bind(this)).done(done);
        });
    });
});
