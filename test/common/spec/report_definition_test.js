'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var Project = require('../../../src/common/project');
var ReportDefinition = require('../../../src/common/report_definition');
var q = require('q');

describe('ReportDefinition', function() {
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
        this.definition = new ReportDefinition(this.api, this.project, {
            meta: {
                uri: '/gdc/dummy/definition'
            }
        });
    });

    afterEach(function() {
        this.api = null;
        this.project = null;
        this.definition = null;
    });

    describe('uri()', function() {
        it('should use meta.uri value', function() {
            expect(this.definition.uri()).to.be('/gdc/dummy/definition');
        });
    });

    describe('metrics()', function() {
        it('should call find() method', function(done) {
            var metrics = [];
            sinon.stub(this.definition, 'find').returns(q(metrics));

            this.definition.metrics().then(function(value) {
                expect(value).to.be(metrics);
                expect(this.definition.find).was.calledOnce();
                expect(this.definition.find).was.calledWith('metric');
            }.bind(this)).done(done);
        });
    });
});
