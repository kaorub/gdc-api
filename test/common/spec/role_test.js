'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var User = require('../../../src/common/user');
var Project = require('../../../src/common/project');
var Role = require('../../../src/common/role');
var q = require('q');

describe('Role', function() {
    beforeEach(function() {
        this.enabled = true;
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };

        this.api = new Api(this.http);
        this.user = new User(this.api, {
            links: {
                self: '/gdc/profile/dummyuser',
                profileSetting: '/gdc/profile/dummyuser/settings'
            }
        });
        this.project = new Project(this.api, this.user, {
            links: {
                self: '/gdc/projects/dummyproject',
                roles: '/gdc/projects/dummyproject/roles',
                users: '/gdc/projects/dummyproject/users',
                metadata: '/gdc/md/dummyproject'
            }
        });
        this.role = new Role(this.api, this.project, {
            links: {
                self: '/gdc/projects/dummyproject/roles/1',
                roleUsers: '/gdc/projects/dummyproject/roles/1/users'
            }
        });
    });

    describe('addUser()', function() {
        it('should reject if user has no URI', function(done) {
            this.user.uri(null);
            this.role.addUser(this.user).done(null, function() {
                done();
            });
        });

        it('should reject if role has no URI', function(done) {
            this.role.uri(null);
            this.role.addUser().done(null, function() {
                done();
            });
        });

        it('should add user specified by URI to role', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject/roles/1/users').returns(q({
                status: 200
            }));

            this.role.addUser(this.user.uri()).andThen(function() {
                expect(this.request).was.calledWith(this.role.data('links.roleUsers'), {
                    method: 'POST',
                    data: {
                        associateUser: {
                            user: this.user.uri()
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should add user specified by resource to role', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject/roles/1/users').returns(q({
                status: 200
            }));

            this.role.addUser(this.user).andThen(function() {
                expect(this.request).was.calledWith(this.role.data('links.roleUsers'), {
                    method: 'POST',
                    data: {
                        associateUser: {
                            user: this.user.uri()
                        }
                    }
                });
            }.bind(this)).done(done);
        });
    });
});
