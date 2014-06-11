'use strict';

require('colors');

var expect = require('expect.js');
var sinon = require('sinon');
expect = require('sinon-expect').enhance(expect, sinon, 'was');

var Api = require('../../../src/common/api_base');
var PromiseStack = require('../../../src/common/promise_stack');
var Resource = require('../../../src/common/resource');
var q = require('q');

describe('Resource', function() {
    beforeEach(function() {
        this.request = sinon.stub();
        this.http = {
            request: this.request
        };

        this.api = new Api(this.http);

        this.data = {
            property: 'value',
            nested: {
                property: 'nested value'
            },
            links: {
                self: '/gdc/dummy/resource/1'
            }
        };
        this.resource = new Resource(this.api, this.data);
        this.resource.namespace = 'resource';
    });

    describe('data()', function() {
        it('should return resource data if called without arguments', function() {
            expect(this.resource.data()).to.eql(this.data);
        });

        it('should return resource data value belonging to a key if called with a string', function() {
            expect(this.resource.data('property')).to.eql('value');
        });

        it('should return nested resource data value belonging to a key if called with a string', function() {
            expect(this.resource.data('nested.property')).to.eql('nested value');
        });

        it('should return this if called with single object argument', function() {
            expect(this.resource.data({})).to.be(this.resource);
        });

        it('should return this if called with a string and a value arguments', function() {
            expect(this.resource.data('property', 'value')).to.be(this.resource);
        });

        it('should merge resource data with argument if called with an object', function() {
            expect(this.resource.data({ another: 2 }).data('another')).to.be(2);
        });

        it('should set data property if called with a string and a value', function() {
            expect(this.resource.data('property', 2).data('property')).to.be(2);
        });

        it('should set nested data property if called with a string and a value', function() {
            expect(this.resource.data('nested.property', 2).data('nested').property).to.be(2);
        });

        it('should set nonexisting nested data property if called with a string and a value', function() {
            expect(this.resource.data('some.nested.property', 2).data().some.nested.property).to.be(2);
        });
    });

    describe('uri()', function() {
        it('should return resource URI from resource data', function() {
            expect(this.resource.uri()).to.be(this.resource.data('links.self'));
        });
    });

    describe('load()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/dummy/resource/2').returns(q({
                status: 200,
                data: {
                    resource: {
                        links: {
                            self: '/gdc/dummy/resource/2'
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/dummy/resource/1').returns(q({
                status: 200,
                data: {
                    resource: {
                        links: {
                            self: '/gdc/dummy/resource/1'
                        }
                    }
                }
            }));
        });

        it('should use uri passed to method', function(done) {
            this.resource.load('/gdc/dummy/resource/2').andThen(function() {
                expect(this.request).was.calledWith('/gdc/dummy/resource/2');
            }.bind(this)).done(done);
        });

        it('should use resource URI', function(done) {
            this.resource.load().andThen(function() {
                expect(this.request).was.calledWith('/gdc/dummy/resource/1');
            }.bind(this)).done(done);
        });

        context('when called with no parameters', function() {
            it('should make a GET request to resource URI', function(done) {
                this.resource.load().andThen(function() {
                    expect(this.request).was.calledWith(this.resource.uri());
                }.bind(this)).done(done);
            });

            it('should resolve with data object', function(done) {
                this.resource.load().andThen(function(data) {
                    expect(data).to.be.an('object');
                }).done(done);
            });

            it('should set URI to return value from uri method if not set in data', function(done) {
                // we make the response not contain resource URI
                // and require resource to set URI that a HTTP request was issued to
                this.request.withArgs('/gdc/dummy/resource/2').returns(q({
                    status: 200,
                    data: {
                        resource: {
                            links: {}
                        }
                    }
                }));

                this.resource.uri('/gdc/dummy/resource/2');
                this.resource.load().andThen(function() {
                    expect(this.resource.uri()).to.be('/gdc/dummy/resource/2');
                }.bind(this)).done(done);
            });

            it('should reject if no URI is available', function(done) {
                this.resource.uri(null);
                this.resource.load().done(null, function() {
                    done();
                });
            });
        });

        context('when called with URI parameter', function() {
            it('should make a GET request to passed URI', function(done) {
                this.resource.load('/gdc/dummy/resource/2').andThen(function() {
                    expect(this.request).was.calledWith('/gdc/dummy/resource/2');
                }.bind(this)).done(done);
            });

            it('should resolve with data object', function(done) {
                this.resource.load('/gdc/dummy/resource/2').andThen(function(data) {
                    expect(data).to.be.an('object');
                }).done(done);
            });

            it('should set uri to passed URI if not set in data', function(done) {
                // we make the response not contain resource URI
                // and require resource to set URI that a HTTP request was issued to
                this.request.withArgs('/gdc/dummy/resource/2').returns(q({
                    status: 200,
                    data: {
                        resource: {
                            links: {}
                        }
                    }
                }));

                this.resource.load('/gdc/dummy/resource/2').andThen(function() {
                    expect(this.resource.uri()).to.be('/gdc/dummy/resource/2');
                }.bind(this)).done(done);
            });

            it('should set to URI from response data object', function(done) {
                this.request.withArgs('/gdc/dummy/resource/current').returns(q({
                    status: 200,
                    data: {
                        resource: {
                            links: {
                                self: '/gdc/dummy/resource/1'
                            }
                        }
                    }
                }));

                this.resource.load('/gdc/dummy/resource/current').andThen(function() {
                    expect(this.resource.uri()).to.be('/gdc/dummy/resource/1');
                }.bind(this)).done(done);
            });
        });

        it('should reject if response data do not contain namespace', function(done) {
            this.resource.namespace = 'otherResource';

            this.resource.load().done(null, function() {
                done();
            });
        });
    });

    describe('create()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/dummy/resource/1').returns(q({
                status: 200,
                data: {
                    resource: {
                        content: {
                            property: 'value'
                        },
                        meta: {
                            unlisted: false
                        }
                    }
                }
            }));

            this.request.withArgs('/gdc/dummy/resource').returns(q({
                status: 204,
                data: {
                    uri: '/gdc/dummy/resource/1'
                }
            }));

            this.resource.collectionUri = function() {
                return '/gdc/dummy/resource';
            };
        });

        it('should call resource.__load() method with URI of resource', function(done) {
            sinon.spy(this.resource, '__load');
            this.resource.create().andThen(function() {
                expect(this.resource.__load).was.calledOnce();
                expect(this.resource.__load).was.calledWith(this.resource.uri());
            }.bind(this)).done(done);
        });

        it('should make a POST request to resource.collectionUri() using passed data', function(done) {
            this.data.property = 'another value';
            this.resource.create(this.data).andThen(function() {
                expect(this.request).was.calledWith(this.resource.collectionUri(), {
                    method: 'POST',
                    data: {
                        resource: this.data
                    }
                });
            }.bind(this)).done(done);
        });

        it('should make a POST request to resource.collectionUri() using resource data', function(done) {
            this.resource.create().andThen(function() {
                expect(this.request).was.calledWith(this.resource.collectionUri(), {
                    method: 'POST',
                    data: {
                        resource: this.data
                    }
                });
            }.bind(this)).done(done);
        });

        it('should reject if response data do not contain namespace', function(done) {
            this.resource.namespace = 'otherResource';

            this.resource.create().done(null, function() {
                done();
            });
        });

        it('should reject if response data do not contain created resource URI', function(done) {
            this.request.withArgs('/gdc/dummy/resource').returns(q({
                status: 204,
                data: {}
            }));

            this.resource.create().done(null, function() {
                done();
            });
        });
    });

    describe('update()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/dummy/resource/1').returns(q({
                status: 200,
                data: {
                    resource: this.data
                }
            }));
        });

        it('should make a PUT request to resource URI using passed data', function(done) {
            this.data.property = 'another value';
            this.resource.update(this.data).andThen(function(data) {
                expect(this.resource.data()).to.be(data);
                expect(this.resource.data()).to.eql(this.data);
                expect(this.request).was.calledWith(this.resource.uri(), {
                    method: 'PUT',
                    data: {
                        resource: this.data
                    }
                });
            }.bind(this)).done(done);
        });

        it('should make a PUT request to resource URI using resource.data', function(done) {
            this.resource.update().andThen(function(data) {
                expect(this.resource.data()).to.be(data);
                expect(this.resource.data()).to.eql(this.data);
                expect(this.request).was.calledWith(this.resource.uri(), {
                    method: 'PUT',
                    data: {
                        resource: data
                    }
                });
            }.bind(this)).done(done);
        });

        it('should reject if response data do not contain namespace', function(done) {
            this.resource.namespace = 'otherResource';

            this.resource.update().done(null, function() {
                done();
            });
        });

        it('should reject if no URI is available', function(done) {
            this.resource.uri(null);
            this.resource.update().done(null, function() {
                done();
            });
        });
    });

    describe('delete()', function() {
        beforeEach(function() {
            this.request.withArgs('/gdc/dummy/resource/2').returns(q({
                status: 200,
                data: {}
            }));

            this.request.withArgs('/gdc/dummy/resource/1').returns(q({
                status: 200,
                data: {}
            }));
        });

        it('should use URI passed to method', function(done) {
            this.resource.delete('/gdc/dummy/resource/2').andThen(function() {
                expect(this.request).was.calledWith('/gdc/dummy/resource/2', {
                    method: 'DELETE'
                });
            }.bind(this)).done(done);
        });

        it('should make a DELETE request to passed URI and clean data', function(done) {
            this.resource.delete('/gdc/dummy/resource/2').andThen(function() {
                expect(this.resource.data()).to.eql({});
                expect(this.request).was.calledWith('/gdc/dummy/resource/2', {
                    method: 'DELETE'
                });
            }.bind(this)).done(done);
        });

        it('should make a DELETE request to resource URI and clean data', function(done) {
            this.resource.delete().andThen(function() {
                expect(this.resource.data()).to.eql({});
                expect(this.request).was.calledWith('/gdc/dummy/resource/1', {
                    method: 'DELETE'
                });
            }.bind(this)).done(done);
        });

        it('should reject if no URI is available', function(done) {
            this.resource.uri(null);
            this.resource.delete().done(null, function() {
                done();
            });
        });
    });

    describe('save()', function() {
        it('should call create() if there is no URI', function(done) {
            sinon.spy(this.resource, 'create');
            this.resource.uri(null);
            this.resource.save().andThen(function() {
                expect(this.resource.create).was.calledOnce();
            }.bind(this)).done(done);
        });

        it('should call update() if there is an URI', function(done) {
            sinon.spy(this.resource, 'update');
            this.resource.save().andThen(function() {
                expect(this.resource.update).was.calledOnce();
            }.bind(this)).done(done);
        });
    });

    describe('find()', function() {
        it('should be aliased by using() method', function() {
            expect(this.resource.find).to.be(this.resource.using);
        });

        it('should reject if resource has no project', function(done) {
            this.resource.find('report').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should call project.using with correct parameters', function(done) {
            this.resource.project = {
                using: sinon.stub()
            };

            this.resource.find('report').then(function() {
                expect(this.resource.project.using).was.calledWith(this.resource, 'report');
            }.bind(this)).done(done);
        });
    });

    describe('parents()', function() {
        it('should be aliased by usedby() method', function() {
            expect(this.resource.find).to.be(this.resource.using);
        });

        it('should reject if resource has no project', function(done) {
            this.resource.parents('report').then(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should call project.using with correct parameters', function(done) {
            this.resource.project = {
                usedby: sinon.stub()
            };

            this.resource.parents('report').then(function() {
                expect(this.resource.project.usedby).was.calledWith(this.resource, 'report');
            }.bind(this)).done(done);
        });
    });

    describe('setLocked()', function() {
        it('should reject if resource has no project', function(done) {
            this.resource.setLocked(true).andThen(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should call project.setObjectPermissions', function(done) {
            this.resource.project = {
                setObjectPermissions: sinon.stub().returns(new PromiseStack())
            };

            this.resource.setLocked(true, false).andThen(function() {
                expect(this.resource.project.setObjectPermissions).was.calledWith(this.resource, true, undefined, false);
            }.bind(this)).done(done);
        });

        it('should update resource meta', function(done) {
            this.resource.project = {
                setObjectPermissions: sinon.stub().returns(new PromiseStack())
            };

            this.resource.setLocked(true, false).andThen(function() {
                expect(this.resource.meta('locked', true));
            }.bind(this)).done(done);
        });
    });

    describe('setListed()', function() {
        it('should reject if resource has no project', function(done) {
            this.resource.setListed(true).andThen(null, function() {
                expect(this.request).was.notCalled();
            }.bind(this)).done(done);
        });

        it('should call project.setObjectPermissions', function(done) {
            this.resource.project = {
                setObjectPermissions: sinon.stub().returns(new PromiseStack())
            };

            this.resource.setListed(true, false).andThen(function() {
                expect(this.resource.project.setObjectPermissions).was.calledWith(this.resource, undefined, true, false);
            }.bind(this)).done(done);
        });

        it('should update resource meta', function(done) {
            this.resource.project = {
                setObjectPermissions: sinon.stub().returns(new PromiseStack())
            };

            this.resource.setListed(true, false).andThen(function() {
                expect(this.resource.meta('unlisted', false));
            }.bind(this)).done(done);
        });
    });
});
