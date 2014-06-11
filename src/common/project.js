var Role = require('./role');
var Dashboard = require('./dashboard');
var Metric = require('./metric');
var Report = require('./report');
var ReportDefinition = require('./report_definition');
var PromiseStack = require('./promise_stack');
var Resource = require('./resource');
var Q = require('q');
var utils = require('./utils');

/**
 * Metric resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {User} user User instance
 *
 * @param {Api} api API instance
 * @param {User} user User instance
 * @param {Object} [data] Project data
 */
var Project = function(api, user, data) {
    Project.__super.call(this, api, data);

    this.user = user;
};

/**
 * Mapping between names used by Project.query() method
 * and resource classes. Limited subset of queryable resources is now supported:
 *
 * <ul>
 * <li><code>projectdashboard</code> queries Dashboard resources</li>
 * <li><code>reports</code> queries Report resources</li>
 * <li><code>metrics</code> queries Metric resources</li>
 * </ul>
 *
 * @see  {@link Project.query} for more information on querying
 *
 * @static
 * @type {Object}
 */
Project.QUERY_TYPEMAP = {
    projectdashboards: Dashboard,
    reports: Report,
    metrics: Metric,
};

/**
 * Mapping between names used by Project.using()/Project.usedby() method
 * and resource classes. Limited subset of resources is now supported:
 *
 * <ul>
 * <li><code>projectDashboard</code> maps to Dashboard resource</li>
 * <li><code>report</code> maps to Report resource</li>
 * <li><code>reportDefinition</code> maps to ReportDefinition resource</li>
 * <li><code>metric</code> maps to Metric resource</li>
 * </ul>
 *
 * @static
 * @type {Object}
 */
Project.USING_USEDBY_TYPEMAP = {
    projectDashboard: Dashboard,
    report: Report,
    reportDefinition: ReportDefinition,
    metric: Metric
};

utils.inherits(Project, Resource, {
    namespace: { value: 'project' }
});

function objectsToUris(objects) {
    if (!objects) {
        objects = [];
    }

    if (!utils.isArray(objects)) {
        objects = [objects];
    }

    return objects.map(function(item) {
        return typeof(item) === 'string' ? item : item.uri();
    }).filter(function(uri) {
        return !!uri;
    });
}

/**
 * <p>Getter/setter for project id. This id is extracted from URI
 * and propagates itself to this URI when changed.</p>
 *
 * <p>If set to falsy value, URI will be set to null.</p>
 *
 * @method id
 * @memberOf Project#
 *
 * @param {String} [id] New value for id
 * @return {String|Project} Value of project id if used as a getter, project instance is used as a getter
 */
Project.prototype.id = function() {
    if (!arguments.length) {
        var uri = this.uri();

        return uri && uri.replace('/gdc/projects/', '');
    } else {
        var id = arguments[0];

        return this.uri(id ? '/gdc/projects/' + id : null);
    }
};

/**
 * Getter for URI of using resource. Returns null if project has no metadata link.
 *
 * @method usingUri
 * @memberOf Project#
 *
 * @return {String?} using resource URI
 */
Project.prototype.usingUri = function() {
    var metadataUri = this.links('metadata');

    return metadataUri && metadataUri + '/using2';
};

/**
 * Getter for URI of usedby resource. Returns null if project has no metadata link.
 *
 * @method usedbyUri
 * @memberOf Project#
 *
 * @return {String?} usedby resource URI
 */
Project.prototype.usedbyUri = function() {
    var metadataUri = this.links('metadata');

    return metadataUri && metadataUri + '/usedby2';
};

/**
 * Getter for URI of setPermissions resource. Returns null if project has no id.
 *
 * @see  {@link Project.setObjectPermissions} for more information on permissions
 * @method permissionsUri
 * @memberOf Project#
 *
 * @return {String?} setPermissions resource URI
 */
Project.prototype.permissionsUri = function() {
    var id = this.id();

    return id ? '/gdc/internal/projects/' + id + '/objects/setPermissions' : null;
};

/**
 * Getter for URI of collection resource.
 *
 * @method collectionUri
 * @memberOf Project#
 *
 * @return {String} Projects resource URI
 */
Project.prototype.collectionUri = function() {
    return '/gdc/projects';
};

/**
 * Getter for URI of query resource.
 *
 * @method queryUri
 * @memberOf Project#
 *
 * @return {String} query resource URI
 */
Project.prototype.queryUri = function() {
    var metadataUri = this.links('metadata');

    return metadataUri && metadataUri + '/query';
};

/**
 * <p>Load project data from project resource.
 * Promise is resolved after the project is in `ENABLED` state.</p>
 *
 * <p>Returned promise is resolved with project data.</p>
 *
 * @method __load
 * @memberOf Project#
 * @private
 *
 * @param  {String} [uri] Project URI. URI returned from uri() method will be used if not specified
 * @return {Promise}
 */
Project.prototype.__load = function(uri) {
    uri = uri || this.uri();
    if (!uri) {
        throw new Error('No URI specified for load()');
    }

    return this.api.request(uri).then(function(data) {
        var enabled = data.project.content.state === 'ENABLED';

        if (enabled) {
            this.data(data.project);

            return data.project;
        } else {
            return Q.delay(1000).then(function() {
                return this.__load(uri);
            }.bind(this));
        }
    }.bind(this));
};

/**
 * Set this project as user's default.
 *
 * @see  {@link ProfileSettings.setDefaultProject} for more information
 * @method setAsDefault
 * @memberOf Project#
 *
 * @return {Promise}
 */
Project.prototype.setAsDefault = PromiseStack.chainedMethod(function() {
    return this.user.settings().then(function(settings) {
        return settings.setDefaultProject(this).save().promise();
    }.bind(this));
});

/**
 * <p>Modify permissions for objects that belong to this project.</p>
 *
 * @param  {Resource|Resource[]} objects  Resource or an array of resources to change permissions on.
 * @param  {Boolean} [locked]   Locked flag. If set to <code>undefined</code>, locked flag will not be modified
 * @param  {Boolean} [unlisted] Unlisted flag. If set to <code>undefined</code>, unlisted flag will not be modified
 * @param  {Boolean} [cascade=false] Whether to cascade the permissions settings down the object hierarchy
 *
 * @method setObjectPermissions
 * @memberOf Project#
 *
 * @return {Project}
 */
Project.prototype.setObjectPermissions = PromiseStack.chainedMethod(function(objects, locked, listed, cascade) {
    var uri = this.permissionsUri();
    if (!uri) {
        throw new Error('No URI for setObjectPermissions()');
    }

    if (locked === undefined && listed === undefined) {
        return;
    }

    var data = {
        items: objectsToUris(objects),
        cascade: !!cascade
    };

    if (!data.items.length) {
        return;
    }

    if (locked !== undefined) {
        data.lock = !!locked;
    }

    if (listed !== undefined) {
        data.listed = !!listed;
    }

    return this.api.request(uri, {
        method: 'POST',
        data: {
            permissions: data
        }
    });
});

/**
 * <p>Query project for list of objects of given type.</p>
 *
 * @see  {@link Project.QUERY_TYPEMAP} for list of available resource types
 *
 * @method query
 * @memberOf Project#
 *
 * @param  {String} type Resource type
 *
 * @return {Promise}
 */
Project.prototype.query = function(type) {
    return this.andThen(function() {
        var uri = this.queryUri();
        if (!uri) {
            throw new Error('No URI specified for query()');
        }

        if (!type) {
            throw new Error('Type of resource to query must be specified');
        }

        var ResourceClass = Project.QUERY_TYPEMAP[type];
        if (!ResourceClass) {
            throw new Error('query() does not support `' + type + '` resource');
        }

        return this.api.request(uri + '/' + type).then(function(data) {
            var meta = data.query.entries;

            return Q.all(meta.map(function(meta) {
                return new ResourceClass(this.api, this).load(meta.link).promise();
            }.bind(this)));
        }.bind(this));
    }.bind(this));
};

/**
 * List all roles contained in the project. Returned promise is resolved with an array of Role instances
 *
 * @see  {@link Project.roles} for public version of this method
 *
 * @private
 * @method __roles
 * @memberOf Project#
 *
 * @return {Promise}
 */
Project.prototype.__roles = function() {
    var uri = this.links('roles');
    if (!uri) {
        throw new Error('No URI specified for roles()');
    }

    var api = this.api;
    var project = this;

    return api.request(uri).then(function(data) {
        return Q.all(data.projectRoles.roles.map(function(roleUri) {
            return new Role(api, project).load(roleUri).promise();
        }));
    });
};

/**
 * List all roles contained in the project. Returned promise is resolved with an array of Role instances
 *
 * @method roles
 * @memberOf Project#
 *
 * @return {Promise}
 */
Project.prototype.roles = function() {
    return this.andThen(function() {
        return this.__roles();
    }.bind(this));
};

/**
 * <p>Finds a role by name. In case there s no role with such a name,
 * promise is rejected.</p>
 *
 * <p>Returned promise is resolved with a Role instance.</p>
 *
 * @see {@link Project.roleByName} for public version of this method
 *
 * @private
 * @method __roleByName
 * @memberOf Project#
 *
 * @param  {String} name Role name
 * @return {Promise}
 */
Project.prototype.__roleByName = function(name) {
    return this.__roles().then(function(roles) {
        for (var i = 0, n = roles.length; i < n; i++) {
            if (roles[i].data('meta.title') === name) {
                return roles[i];
            }
        }

        throw new Error('No such role: ' + name);
    });
};

/**
 * <p>Finds a role by name. In case there s no role with such a name,
 * promise is rejected.</p>
 *
 * <p>Returned promise is resolved with a Role instance.</p>
 *
 * @method roleByName
 * @memberOf Project#
 *
 * @param  {String} name Role name
 * @return {Promise}
 */
Project.prototype.roleByName = function(name) {
    return this.andThen(function() {
        return this.__roleByName(name);
    }.bind(this));
};

/**
 * Invite user to this project.
 *
 * @see {@link Project.invite} for public version of this method
 *
 * @private
 * @method __invite
 * @memberOf Project#
 *
 * @param  {User|String} userOrUri User instance or user URI
 * @param  {Role|String} roleOrRoleName Role instance or role name, e.g. `Admin`, `Editor`
 *
 * @return {Promise}
 */
Project.prototype.__invite = function(userOrUri, roleOrRoleName) {
    var uri = this.links('users');
    if (!uri) {
        throw new Error('No URI specified for invite()');
    }

    if (typeof(roleOrRoleName) === 'string') {
        return this.__roleByName(roleOrRoleName).then(function(role) {
            return this.__invite(userOrUri, role);
        }.bind(this));
    }

    var userUri = typeof(userOrUri) === 'string' ? userOrUri : userOrUri.uri();
    if (!userUri) {
        throw new Error('No user URI specified for invite()');
    }

    return this.api.request(uri, {
        method: 'POST',
        data: {
            user: {
                content: {
                    status: 'ENABLED',
                    userRoles: [ roleOrRoleName.uri() ]
                },
                links: {
                    self: userUri
                }
            }
        }
    }).then(function(data) {
        if (data.projectUsersUpdateResult.successful.indexOf(userUri) === -1) {
            throw new Error('Could not invite user ' + userUri + ' to project');
        }
    });
};

/**
 * Invite user to this project.
 *
 * @method invite
 * @memberOf Project#
 *
 * @param  {User|String} userOrUri User instance or user URI
 * @param  {Role|String} roleOrRoleName Role instance or role name, e.g. `Admin`, `Editor`
 *
 * @return {Project}
 */
Project.prototype.invite = PromiseStack.chainedMethod('__invite');

/**
 * <p>Fetch resources that are used by/use provided resources.</p>
 *
 * <p>In case you pass a single object or a sinlge URI to this method
 * returned promise will be resolved with plain array of Resource objects.
 * In case you pass an array, returned promise is resolved with an object containing arrays of Resource objects
 * in objects hash whose keys are source object URIs</p>
 *
 * @see {@link Project.USING_USEDBY_TYPEMAP} for more information on supported resources.
 *
 * @private
 * @method __usingUsedby
 * @memberOf Project#
 *
 * @param  {String} uri     URI of resource (using/usedby)
 * @param  {Resource|Resource[]|String|String[]} objects Objects (or their URIs) that will be used as sources for relation lookup
 * @param  {String|String[]} types   Types of objects to look up
 *
 * @return {Promise}
 */
Project.prototype.__usingUsedBy = function(uri, objects, types) {
    var uris = objectsToUris(objects);
    if (!uris.length) {
        throw new Error('You must specify an URI of root object for using/usedby operation');
    }

    if (!types || !types.length) {
        throw new Error('You must specify types of objects for using/usedby operation');
    }

    types = utils.isArray(types) ? types : [types];
    types.forEach(function(type) {
        if (!Project.USING_USEDBY_TYPEMAP[type]) {
            throw new Error('Resource type ' + type + ' is not supported when calling using()/usedby()');
        }
    });

    return this.api.request(uri, {
        method: 'POST',
        data: {
            inUseMany: {
                uris: uris,
                types: types
            }
        }
    }).then(function(data) {
        var objectsByUri = {};
        var allResources = [];

        data.useMany.forEach(function(resourceSet) {
            var resources = resourceSet.entries.map(function(meta) {
                var type = meta.category;
                var ResourceClass = Project.USING_USEDBY_TYPEMAP[type];

                return new ResourceClass(this.api, this).load(meta.link);
            }.bind(this));

            objectsByUri[resourceSet.uri] = resources;
            allResources = allResources.concat(resources);
        }.bind(this));

        return Q.all(allResources.map(function(resource) {
            return resource.load().promise();
        })).then(function() {
            if (utils.isArray(objects)) {
                return objectsByUri;
            } else {
                var uri = typeof(objects) === 'string' ? objects : objects.uri();

                return objectsByUri[uri];
            }
        });
    }.bind(this));
};

/**
 * Alias for Project.find
 *
 * @see {@link Project.find} for documentation
 *
 * @method using
 * @memberOf Project#
 */

/**
 * <p>Find underlying resources.</p>
 *
 * <p>In case you pass a single object or a sinlge URI to this method
 * returned promise will be resolved with plain array of Resource objects.
 * In case you pass an array, returned promise is resolved with an object containing arrays of Resource objects
 * in objects hash whose keys are source object URIs</p>
 *
 * @see {@link Project.USING_USEDBY_TYPEMAP} for more information on supported resources.
 *
 * @method find
 * @memberOf Project#
 *
 * @param  {Resource|Resource[]|String|String[]} objects Objects (or their URIs) that will be used as sources for relation lookup
 * @param  {String|String[]} types   Types of objects to look up
 *
 * @return {Promise}         [description]
 */
Project.prototype.find = Project.prototype.using = function(objects, types) {
    return this.andThen(function() {
        var uri = this.usingUri();
        if (!uri) {
            throw new Error('No URI for using()');
        }

        return this.__usingUsedBy(uri, objects, types);
    }.bind(this));
};

/**
 * Alias for Project.parents
 *
 * @see {@link Project.parents} for documentation
 *
 * @method usedby
 * @memberOf Project#
 */

/**
 * <p>Find containing resources.</p>
 *
 * <p>In case you pass a single object or a sinlge URI to this method
 * returned promise will be resolved with plain array of Resource objects.
 * In case you pass an array, returned promise is resolved with an object containing arrays of Resource objects
 * in objects hash whose keys are source object URIs</p>
 *
 * @see {@link Project.USING_USEDBY_TYPEMAP} for more information on supported resources.
 *
 * @method parents
 * @memberOf Project#
 *
 * @param  {Resource|Resource[]|String|String[]} objects Objects (or their URIs) that will be used as sources for relation lookup
 * @param  {String|String[]} types   Types of objects to look up
 *
 * @return {Promise}         [description]
 */
Project.prototype.parents = Project.prototype.usedby = function(objects, types) {
    return this.andThen(function() {
        var uri = this.usedbyUri();
        if (!uri) {
            throw new Error('No URI for usedby()');
        }

        return this.__usingUsedBy(uri, objects, types);
    }.bind(this));
};

/**
 * Return all the dashboards in this project.
 * This is just an alias method for Project.query('projectdashboards').
 *
 * @see  {@link Project.query} for more information on nested resources.
 *
 * @method dashboards
 * @memberOf Project#
 *
 * @return {Promise} Resolved with plain array of Dashboard resources
 */
Project.prototype.dashboards = function() {
    return this.query('projectdashboards');
};

/**
 * Return all the reports in this project.
 * This is just an alias method for Project.query('reports').
 *
 * @see  {@link Project.query} for more information on nested resources.
 *
 * @method reports
 * @memberOf Project#
 *
 * @return {Promise} Resolved with plain array of Report resources
 */
Project.prototype.reports = function() {
    return this.query('reports');
};

/**
 * Return all the metrics in this project.
 * This is just an alias method for Project.query('metrics').
 *
 * @see  {@link Project.query} for more information on nested resources.
 *
 * @method metrics
 * @memberOf Project#
 *
 * @return {Promise} Resolved with plain array of Metric resources
 */
Project.prototype.metrics = function() {
    return this.query('metrics');
};

module.exports = Project;