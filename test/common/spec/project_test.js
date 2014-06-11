'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var User = require('../../../src/common/user');
var Dashboard = require('../../../src/common/dashboard');
var ProfileSettings = require('../../../src/common/profile_settings');
var Project = require('../../../src/common/project');
var Role = require('../../../src/common/role');
var q = require('q');

describe('Project', function() {
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

        sinon.stub(q, 'delay').returns(q());
    });

    afterEach(function() {
        this.api = null;
        this.user = null;
        this.project = null;

        q.delay.restore();
    });

    it('should load project', function(done) {
        sinon.spy(this.project, '__load');

        this.request.withArgs('/gdc/projects/dummyproject').returns(q({
            status: 200,
            data: {
                project: {
                    content: {
                        state: 'PREPARING'
                    },
                    links: {
                        self: '/gdc/projects/dummyproject'
                    }
                }
            }
        }));

        this.request.withArgs('/gdc/projects/dummyproject').onCall(2).returns(q({
            status: 200,
            data: {
                project: {
                    content: {
                        state: 'ENABLED'
                    },
                    links: {
                        self: '/gdc/projects/dummyproject'
                    }
                }
            }
        }));

        this.project.load().andThen(function() {
            expect(this.project.__load).was.calledThrice();
            expect(this.project.uri()).to.be('/gdc/projects/dummyproject');
            expect(this.project.data('content.state')).to.be('ENABLED');
        }.bind(this)).done(done);
    });

    describe('roles', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/projects/dummyproject/roles').returns(q({
                status: 200,
                data: {
                    projectRoles: {
                        links: {},
                        roles: [
                            '/gdc/projects/dummyproject/roles/1',
                            '/gdc/projects/dummyproject/roles/2'
                        ]
                    }
                }
            }));

            this.request.withArgs('/gdc/projects/dummyproject/roles/1').returns(q({
                status: 200,
                data: {
                    projectRole: {
                        links: {},
                        meta: {
                            title: 'Editor'
                        },
                        permissions: {}
                    }
                }
            }));

            this.request.withArgs('/gdc/projects/dummyproject/roles/2').returns(q({
                status: 200,
                data: {
                    projectRole: {
                        links: {},
                        meta: {
                            title: 'Admin'
                        },
                        permissions: {}
                    }
                }
            }));
        });

        it('should list roles', function(done) {
            this.project.roles().then(function(roles) {
                expect(roles).to.have.length(2);

                expect(roles[0]).to.be.a(Role);
                expect(roles[0].data('meta.title')).to.be('Editor');

                expect(roles[1]).to.be.a(Role);
                expect(roles[1].data('meta.title')).to.be('Admin');
            }.bind(this)).done(done);
        });

        it('should get role by name', function(done) {
            this.project.roleByName('Editor').then(function(role) {
                expect(role).to.be.a(Role);
                expect(role.data('meta.title')).to.be('Editor');
            }.bind(this)).done(done);
        });

        it('should reject if role is not found', function(done) {
            this.project.roleByName('Viewer').done(null, function() {
                done();
            });
        });

        it('should reject if project has no roles URI', function(done) {
            this.project.links('roles', null);
            this.project.roleByName('Viewer').done(null, function() {
                done();
            });
        });
    });

    describe('id()', function() {
        it('should extract project id from uri', function() {
            expect(this.project.id()).to.be('dummyproject');
        });

        it('should build uri from id if calling with one argument', function() {
            this.project.id('someproject');
            expect(this.project.uri()).to.be('/gdc/projects/someproject');
        });

        it('should set uri to null if calling with one null argument', function() {
            this.project.id(null);
            expect(this.project.uri()).to.be(null);
        });

        it('should be null if uri is null', function() {
            this.project.uri(null);
            expect(this.project.id()).to.be(null);
        });
    });

    describe('permissionsUri()', function() {
        it('should extract project id from uri', function() {
            expect(this.project.permissionsUri()).to.be('/gdc/internal/projects/dummyproject/objects/setPermissions');
        });

        it('should be null if id is null', function() {
            this.project.id(null);
            expect(this.project.permissionsUri()).to.be(null);
        });
    });

    describe('queryUri()', function() {
        it('should be ok when metadata URI is not null', function() {
            expect(this.project.queryUri()).to.be('/gdc/md/dummyproject/query');
        });

        it('should be null if metadata URI is null', function() {
            this.project.links('metadata', null);
            expect(this.project.queryUri()).to.be(null);
        });
    });

    describe('collectionUri()', function() {
        it('should be /gdc/projects', function() {
            expect(this.project.collectionUri()).to.be('/gdc/projects');
        });
    });

    describe('invite()', function() {
        beforeEach(function() {
            sinon.stub(this.project, '__roleByName').returns(q(new Role(this.api, this.project, {
                links: {
                    self: '/gdc/projects/dummyproject/roles/1'
                },
                meta: {
                    title: 'Editor'
                },
                permissions: {}
            })));

            this.request.withArgs('/gdc/projects/dummyproject/users').returns(q({
                status: 200,
                data: {
                    projectUsersUpdateResult: {
                        successful: ['/gdc/profile/dummyuser']
                    }
                }
            }));
        });

        it('should reject if project has no users link', function(done) {
            this.project.links('users', null);
            this.project.invite(this.user, 'Editor').andThen(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if user has no URI', function(done) {
            this.user.uri(null);
            this.project.invite(this.user, 'Editor').andThen(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with no user or URI', function(done) {
            this.project.invite(null, 'Editor').andThen(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should invite user specified by URI', function(done) {
            this.project.invite(this.user.uri(), 'Editor').andThen(function() {
                expect(this.request).was.calledWith('/gdc/projects/dummyproject/users', {
                    method: 'POST',
                    data: {
                        user: {
                            content: {
                                status: 'ENABLED',
                                userRoles: [
                                    '/gdc/projects/dummyproject/roles/1'
                                ],
                            },
                            links: {
                                self: this.user.uri()
                            }
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should invite user with string role', function(done) {
            this.project.invite(this.user, 'Editor').andThen(function() {
                expect(this.project.__roleByName).was.calledOnce();
                expect(this.project.__roleByName).was.calledWith('Editor');

                expect(this.request).was.calledWith('/gdc/projects/dummyproject/users', {
                    method: 'POST',
                    data: {
                        user: {
                            content: {
                                status: 'ENABLED',
                                userRoles: [
                                    '/gdc/projects/dummyproject/roles/1'
                                ],
                            },
                            links: {
                                self: this.user.uri()
                            }
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should invite user with role object', function(done) {
            var role = new Api.Role(this.api, this.project, {
                links: {
                    self: '/gdc/projects/dummyproject/roles/1'
                },
                meta: {
                    title: 'Editor'
                },
                permissions: {}
            });

            this.project.invite(this.user, role).andThen(function() {
                expect(this.request).was.calledWith('/gdc/projects/dummyproject/users', {
                    method: 'POST',
                    data: {
                        user: {
                            content: {
                                status: 'ENABLED',
                                userRoles: [
                                    '/gdc/projects/dummyproject/roles/1'
                                ],
                            },
                            links: {
                                self: this.user.uri()
                            }
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should reject if server success response does not contain user uri', function(done) {
            this.request.withArgs('/gdc/projects/dummyproject/users').returns(q({
                status: 200,
                data: {
                    projectUsersUpdateResult: {
                        successful: []
                    }
                }
            }));

            this.project.invite(this.user, 'Editor').andThen(null, function() {
                expect(this.request).was.calledWith('/gdc/projects/dummyproject/users', {
                    method: 'POST',
                    data: {
                        user: {
                            content: {
                                status: 'ENABLED',
                                userRoles: [
                                    '/gdc/projects/dummyproject/roles/1'
                                ],
                            },
                            links: {
                                self: this.user.uri()
                            }
                        }
                    }
                });
            }.bind(this)).done(done);
        });
    });

    describe('load()', function() {
        it('should reject if no URI is available', function(done) {
            this.project.uri(null);
            this.project.load().done(null, function() {
                done();
            });
        });
    });

    describe('query()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/md/dummyproject/query/projectdashboards').returns(q({
                status: 200,
                data: {
                    query: {
                        entries: [{
                            link: '/gdc/projects/dummyproject/obj/916'
                        }, {
                            link: '/gdc/projects/dummyproject/obj/917'
                        }]
                    }
                }
            }));

            this.request.withArgs('/gdc/projects/dummyproject/obj/916').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        content: {},
                        meta: {},
                        links: {
                            self: '/gdc/projects/dummyproject/obj/916'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/projects/dummyproject/obj/917').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        content: {},
                        meta: {},
                        links: {
                            self: '/gdc/projects/dummyproject/obj/917'
                        }
                    }
                }
            }));
        });

        it('should reject if called with null type', function(done) {
            this.project.query().then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with unsupported type', function(done) {
            this.project.query('scheduledmails').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if project has no metadata URI', function(done) {
            this.project.links('metadata', null);
            this.project.query('projectdashboards').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should wrap objects in resource classes', function(done) {
            this.project.query('projectdashboards').then(function(entries) {
                expect(entries).to.have.length(2);

                expect(entries[0]).to.be.a(Dashboard);
                expect(entries[1]).to.be.a(Dashboard);
            }).done(done);
        });
    });

    describe('setAsDefault()', function() {
        it('should reject if project has no URI', function(done) {
            this.project.uri(null);
            this.project.setAsDefault().done(null, function() {
                done();
            });
        });

        it('should reject if user has no URI', function(done) {
            this.user.uri = null;
            this.project.setAsDefault().done(null, function() {
                done();
            });
        });

        it('should update profileSettings', function(done) {
            var settings = new ProfileSettings(this.api, this.user, {
                links: {
                    self: '/gdc/profile/dummyuser/settings'
                }
            });

            sinon.stub(settings, 'save').returns(settings);
            sinon.stub(this.user, 'settings').returns(q(settings));

            this.project.setAsDefault().andThen(function() {
                expect(this.user.settings).was.calledOnce();
                expect(settings.save).was.calledOnce();
                expect(settings.data('currentProjectUri')).to.be(this.project.uri());
            }.bind(this)).done(done);
        });
    });

    describe('setObjectPermissions()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/internal/projects/dummyproject/objects/setPermissions').returns(q({
                status: 200,
                data: {
                    permissions: {}
                }
            }));
        });

        it('should reject if project does not have an id', function(done) {
            this.project.id(null);
            this.project.setObjectPermissions([]).done(null, function() {
                done();
            });
        });

        it('should not make any HTTP request if called with empty objects array', function(done) {
            this.project.setObjectPermissions([], true).andThen(function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should not make any HTTP request if called without `locked` or `unlisted` argument', function(done) {
            this.project.setObjectPermissions(['/gdc/resource/1'], undefined, undefined).andThen(function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should accept string uri as a parameter', function(done) {
            this.project.setObjectPermissions('/gdc/resource/1', true).andThen(function() {
                expect(this.request).was.calledOnce();
                expect(this.request).was.calledWith(this.project.permissionsUri(), {
                    method: 'POST',
                    data: {
                        permissions: {
                            items: ['/gdc/resource/1'],
                            lock: true,
                            cascade: false
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should accept resource object as a parameter', function(done) {
            var resource = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/resource/1'
                }
            });

            this.project.setObjectPermissions(resource, true).andThen(function() {
                expect(this.request).was.calledOnce();
                expect(this.request).was.calledWith(this.project.permissionsUri(), {
                    method: 'POST',
                    data: {
                        permissions: {
                            items: ['/gdc/resource/1'],
                            lock: true,
                            cascade: false
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should accept array of strings/resources as a parameter', function(done) {
            var resource = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/resource/1'
                }
            });

            this.project.setObjectPermissions([resource, '/gdc/resource/2'], true).andThen(function() {
                expect(this.request).was.calledOnce();
                expect(this.request).was.calledWith(this.project.permissionsUri(), {
                    method: 'POST',
                    data: {
                        permissions: {
                            items: ['/gdc/resource/1', '/gdc/resource/2'],
                            lock: true,
                            cascade: false
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should send locked flag only if listed is undefined', function(done) {
            this.project.setObjectPermissions('/gdc/resource/1', false).andThen(function() {
                expect(this.request).was.calledOnce();
                expect(this.request).was.calledWith(this.project.permissionsUri(), {
                    method: 'POST',
                    data: {
                        permissions: {
                            items: ['/gdc/resource/1'],
                            lock: false,
                            cascade: false
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should send listed flag only if locked is undefined', function(done) {
            this.project.setObjectPermissions('/gdc/resource/1', undefined, false).andThen(function() {
                expect(this.request).was.calledOnce();
                expect(this.request).was.calledWith(this.project.permissionsUri(), {
                    method: 'POST',
                    data: {
                        permissions: {
                            items: ['/gdc/resource/1'],
                            listed: false,
                            cascade: false
                        }
                    }
                });
            }.bind(this)).done(done);
        });

        it('should send both listed and locked flag if both are defined', function(done) {
            this.project.setObjectPermissions('/gdc/resource/1', false, false).andThen(function() {
                expect(this.request).was.calledOnce();
                expect(this.request).was.calledWith(this.project.permissionsUri(), {
                    method: 'POST',
                    data: {
                        permissions: {
                            items: ['/gdc/resource/1'],
                            lock: false,
                            listed: false,
                            cascade: false
                        }
                    }
                });
            }.bind(this)).done(done);
        });
    });

    describe('using()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/md/dummyproject/obj/1').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/1',
                            title: 'dashboard 1'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/obj/2').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/2',
                            title: 'dashboard 2'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/obj/5').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/5',
                            title: 'dashboard 5'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/obj/6').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/6',
                            title: 'dashboard 6'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/using2').returns(q({
                status: 200,
                data: {
                    useMany: [{
                        uri: '/gdc/md/dummyproject/obj/0',
                        entries: [{
                            link: '/gdc/md/dummyproject/obj/1',
                            category: 'projectDashboard'
                        }, {
                            link: '/gdc/md/dummyproject/obj/2',
                            category: 'projectDashboard'
                        }]
                    }, {
                        uri: '/gdc/md/dummyproject/obj/4',
                        entries: [{
                            link: '/gdc/md/dummyproject/obj/5',
                            category: 'projectDashboard'
                        }, {
                            link: '/gdc/md/dummyproject/obj/6',
                            category: 'projectDashboard'
                        }]
                    }]
                }
            }));
        });

        it('should reject if project has no metadata URI', function(done) {
            this.project.links('metadata', null);
            this.project.using('/gdc/md/dummyproject/obj/0', ['report']).then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with no URI', function(done) {
            this.project.using(null, ['report']).then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with no types', function(done) {
            this.project.using('/gdc/md/dummyproject/obj/0').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with empty array of types', function(done) {
            this.project.using('/gdc/md/dummyproject/obj/0', []).then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if response object type is unnknown', function(done) {
            this.project.using('/gdc/md/dummyproject/obj/0', 'scheduledMain').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should return plain array of resource objects if called with single URI', function(done) {
            this.project.using('/gdc/md/dummyproject/obj/0', 'projectDashboard').then(function(resources) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/using2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');
            }.bind(this)).done(done);
        });

        it('should return plain array of resource objects if called with single resource object', function(done) {
            var parentObject = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/md/dummyproject/obj/0'
                }
            });

            this.project.using(parentObject, 'projectDashboard').then(function(resources) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/using2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');
            }.bind(this)).done(done);
        });

        it('should return hash of arrays indexed by URIs if called wiath an array of URIs', function(done) {
            this.project.using(['/gdc/md/dummyproject/obj/0', '/gdc/md/dummyproject/obj/4'], ['projectDashboard']).then(function(resourcesByUri) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/using2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0', '/gdc/md/dummyproject/obj/4'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resourcesByUri).to.be.an('object');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/0');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/4');


                var resources = resourcesByUri['/gdc/md/dummyproject/obj/0'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');


                resources = resourcesByUri['/gdc/md/dummyproject/obj/4'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 5');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 6');
            }.bind(this)).done(done);
        });

        it('should return hash of arrays indexed by URIs if called wiath an array of resources', function(done) {
            var parentObject1 = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/md/dummyproject/obj/0'
                }
            });

            var parentObject2 = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/md/dummyproject/obj/4'
                }
            });

            this.project.using([parentObject1, parentObject2], 'projectDashboard').then(function(resourcesByUri) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/using2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0', '/gdc/md/dummyproject/obj/4'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resourcesByUri).to.be.an('object');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/0');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/4');


                var resources = resourcesByUri['/gdc/md/dummyproject/obj/0'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');


                resources = resourcesByUri['/gdc/md/dummyproject/obj/4'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 5');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 6');
            }.bind(this)).done(done);
        });
    });

    describe('usedby()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/md/dummyproject/obj/1').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/1',
                            title: 'dashboard 1'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/obj/2').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/2',
                            title: 'dashboard 2'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/obj/5').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/5',
                            title: 'dashboard 5'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/obj/6').returns(q({
                status: 200,
                data: {
                    projectDashboard: {
                        meta: {
                            uri: '/gdc/md/dummyproject/obj/6',
                            title: 'dashboard 6'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/md/dummyproject/usedby2').returns(q({
                status: 200,
                data: {
                    useMany: [{
                        uri: '/gdc/md/dummyproject/obj/0',
                        entries: [{
                            link: '/gdc/md/dummyproject/obj/1',
                            category: 'projectDashboard'
                        }, {
                            link: '/gdc/md/dummyproject/obj/2',
                            category: 'projectDashboard'
                        }]
                    }, {
                        uri: '/gdc/md/dummyproject/obj/4',
                        entries: [{
                            link: '/gdc/md/dummyproject/obj/5',
                            category: 'projectDashboard'
                        }, {
                            link: '/gdc/md/dummyproject/obj/6',
                            category: 'projectDashboard'
                        }]
                    }]
                }
            }));
        });

        it('should reject if project has no metadata URI', function(done) {
            this.project.links('metadata', null);
            this.project.usedby('/gdc/md/dummyproject/obj/0', ['report']).then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with no URI', function(done) {
            this.project.usedby(null, ['report']).then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with no types', function(done) {
            this.project.usedby('/gdc/md/dummyproject/obj/0').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if called with empty array of types', function(done) {
            this.project.usedby('/gdc/md/dummyproject/obj/0', []).then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should reject if response object type is unnknown', function(done) {
            this.project.usedby('/gdc/md/dummyproject/obj/0', 'scheduledMain').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should return plain array of resource objects if called with single URI', function(done) {
            this.project.usedby('/gdc/md/dummyproject/obj/0', 'projectDashboard').then(function(resources) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/usedby2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');
            }.bind(this)).done(done);
        });

        it('should return plain array of resource objects if called with single resource object', function(done) {
            var parentObject = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/md/dummyproject/obj/0'
                }
            });

            this.project.usedby(parentObject, 'projectDashboard').then(function(resources) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/usedby2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');
            }.bind(this)).done(done);
        });

        it('should return hash of arrays indexed by URIs if called wiath an array of URIs', function(done) {
            this.project.usedby(['/gdc/md/dummyproject/obj/0', '/gdc/md/dummyproject/obj/4'], ['projectDashboard']).then(function(resourcesByUri) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/usedby2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0', '/gdc/md/dummyproject/obj/4'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resourcesByUri).to.be.an('object');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/0');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/4');


                var resources = resourcesByUri['/gdc/md/dummyproject/obj/0'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');


                resources = resourcesByUri['/gdc/md/dummyproject/obj/4'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 5');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 6');
            }.bind(this)).done(done);
        });

        it('should return hash of arrays indexed by URIs if called wiath an array of resources', function(done) {
            var parentObject1 = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/md/dummyproject/obj/0'
                }
            });

            var parentObject2 = new Dashboard(this.api, this.project, {
                meta: {
                    uri: '/gdc/md/dummyproject/obj/4'
                }
            });

            this.project.usedby([parentObject1, parentObject2], 'projectDashboard').then(function(resourcesByUri) {
                expect(this.request).was.calledWith('/gdc/md/dummyproject/usedby2', {
                    method: 'POST',
                    data: {
                        inUseMany: {
                            uris: ['/gdc/md/dummyproject/obj/0', '/gdc/md/dummyproject/obj/4'],
                            types: ['projectDashboard']
                        }
                    }
                });

                expect(resourcesByUri).to.be.an('object');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/0');
                expect(resourcesByUri).to.have.property('/gdc/md/dummyproject/obj/4');


                var resources = resourcesByUri['/gdc/md/dummyproject/obj/0'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 1');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 2');


                resources = resourcesByUri['/gdc/md/dummyproject/obj/4'];

                expect(resources).to.be.an('array');
                expect(resources).to.have.length(2);

                expect(resources[0]).to.be.a(Dashboard);
                expect(resources[0].meta('title')).to.be('dashboard 5');

                expect(resources[1]).to.be.a(Dashboard);
                expect(resources[1].meta('title')).to.be('dashboard 6');
            }.bind(this)).done(done);
        });
    });

    describe('dashboards()', function() {
        it('should call query() method', function(done) {
            var dashboards = [];
            sinon.stub(this.project, 'query').returns(q(dashboards));

            this.project.dashboards().then(function(value) {
                expect(value).to.be(dashboards);
                expect(this.project.query).was.calledOnce();
                expect(this.project.query).was.calledWith('projectdashboards');
            }.bind(this)).done(done);
        });
    });

    describe('reports()', function() {
        it('should call query() method', function(done) {
            var reports = [];
            sinon.stub(this.project, 'query').returns(q(reports));

            this.project.reports().then(function(value) {
                expect(value).to.be(reports);
                expect(this.project.query).was.calledOnce();
                expect(this.project.query).was.calledWith('reports');
            }.bind(this)).done(done);
        });
    });

    describe('metrics()', function() {
        it('should call query() method', function(done) {
            var metrics = [];
            sinon.stub(this.project, 'query').returns(q(metrics));

            this.project.metrics().then(function(value) {
                expect(value).to.be(metrics);
                expect(this.project.query).was.calledOnce();
                expect(this.project.query).was.calledWith('metrics');
            }.bind(this)).done(done);
        });
    });
});
