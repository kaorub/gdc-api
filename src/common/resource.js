'use strict';

var PromiseStack = require('./promise_stack');
var utils = require('./utils');

/**
 * Resource base class. Provides basic methods for data manipulation
 * via GoodData's RESTful API. For more information REST API please
 * see http://docs.gooddata.apiary.io/
 *
 * @class
 * @augments {PromiseStack}
 *
 * @property {Api} api API instance
 *
 * @param {Api} api API instance
 * @param {Object} [data] Dashboard data
 */
var Resource = function(api, data) {
    Resource.__super.call(this);

    this.api = api;
    this.__data = data || {};
};

utils.inherits(Resource, PromiseStack, {

    /**
     * Data belonging to this resource without namespace
     *
     * @private
     * @memberOf Resource#
     *
     * @type {Object}
     */
    __data: {
        writable: true,
        enumerable: false
    }

});

/**
 * Accessor function for __data object.
 *
 * @see {@link Resource.__data}
 * @see {@link utils.accessor} for description of accessor properties
 * @method data
 * @memberOf Resource#
 *
 * @returns {Resource|*}
 */
Resource.prototype.data = utils.accessor('__data');

/**
 * Accessor function for __data.links object.
 *
 * @see {@link Resource.__data}
 * @see {@link utils.accessor} for description of accessor properties
 * @method links
 * @memberOf Resource#
 *
 * @returns {Resource|*}
 */
Resource.prototype.links = utils.accessor('__data.links');

/**
 * Accessor function for __data.meta object.
 *
 * @see {@link Resource.__data}
 * @see {@link utils.accessor} for description of accessor properties
 * @method meta
 * @memberOf Resource#
 *
 * @returns {Resource|*}
 */
Resource.prototype.meta = utils.accessor('__data.meta');

/**
 * Accessor function for __data.content object.
 *
 * @see {@link Resource.__data}
 * @see {@link utils.accessor} for description of accessor properties
 * @method content
 * @memberOf Resource#
 *
 * @returns {Resource|*}
 */
Resource.prototype.content = utils.accessor('__data.content');

/**
 * Uri property. Accessor for __data.meta.uri property
 *
 * @see {@link utils.property} for more information on properties
 * @method uri
 * @memberOf Resource#
 */
Resource.prototype.uri = utils.property('__data.links.self');

/**
 * Getter for collection URI. Used when creating new resources on server.
 *
 * @method collectionUri
 * @memberOf Resource#
 */
Resource.prototype.collectionUri = function() {
    return null;
};

/**
 * Load resource data.
 *
 * @see {@link Resource.load} for public version of this method
 *
 * @private
 * @method __load
 * @memberOf Resource#
 *
 * @param  {String} [uri=this.uri()] Resource URI
 *
 * @return {Promise}
 */
Resource.prototype.__load = function(uri) {
    uri = uri || this.uri();
    if (!uri) {
        throw new Error('No URI specified for load()');
    }

    return this.api.request(uri).then(function(data) {
        data = data[this.namespace];

        if (!data) {
            throw new Error('No data or invalid namespace: ' + this.namespace);
        }

        this.__data = data;

        if (!this.uri()) {
            this.uri(uri);
        }

        return this.__data;
    }.bind(this));
};

/**
 * Load resource data.
 *
 * @method load
 * @memberOf Resource#
 *
 * @param  {String} [uri=this.uri()] Resource URI
 *
 * @return {Resource}
 */
Resource.prototype.load = PromiseStack.chainedMethod('__load');

/**
 * Create resource on server
 *
 * @method create
 * @memberOf Resource#
 *
 * @param  {Object} [data] Resource data
 *
 * @return {Resource}
 */
Resource.prototype.create = PromiseStack.chainedMethod(function(data) {
    var payload = {};
    payload[this.namespace] = data || this.data();

    var uri = this.collectionUri();
    if (!uri) {
        throw new Error('No URI for create()');
    }

    return this.api.request(uri, {
        method: 'POST',
        data: payload
    }).then(function(data) {
        var uri = data.uri;

        if (!uri) {
            throw new Error('No URI returned from create call');
        }

        return this.__load(uri);
    }.bind(this));
});

/**
 * Update resource on server
 *
 * @method update
 * @memberOf Resource#
 *
 * @param  {Object} [data] Resource data. If specified, this data object will take priority over resource data
 *
 * @return {Resource}
 */
Resource.prototype.update = PromiseStack.chainedMethod(function(data) {
    var payload = {};
    payload[this.namespace] = data || this.data();

    var uri = this.uri();
    if (!uri) {
        throw new Error('No URI specified for update()');
    }

    return this.api.request(uri, {
        method: 'PUT',
        data: payload
    }).then(function() {
        return this.__load();
    }.bind(this));
});

/**
 * Update or create resource on server. Action will be determined based on its URI.
 * Resource with URI will be updated, resource without one will be created.
 *
 * @see {@link Resource.update} for more information on update method
 * @see {@link Resource.create} for more information on create method
 *
 * @method save
 * @memberOf Resource#
 *
 * @param  {Object} [data] Resource data. If specified, this data object will take priority over resource data
 *
 * @return {Resource}
 */
Resource.prototype.save = PromiseStack.chainedMethod(function(data) {
    var uri = this.uri();

    if (!uri) {
        return this.create(data);
    } else {
        return this.update(data);
    }
});

/**
 * Delete resource on server
 *
 * @method delete
 * @memberOf Resource#
 *
 * @param  {String} [uri=this.uri()] Resource URI
 *
 * @return {Resource}
 */
Resource.prototype.delete = PromiseStack.chainedMethod(function(uri) {
    uri = uri || this.uri();
    if (!uri) {
        throw new Error('No URI specified for delete()');
    }

    return this.api.request(uri, { method: 'DELETE' }).then(function() {
        this.data({});
    }.bind(this));
});

/**
 * Set locked flag in resource metadata.
 *
 * @see {@link Project.setObjectPermissions} for more information on permissions setting
 *
 * @method setLocked
 * @memberOf Resource#
 *
 * @param {Boolean} locked Locked meta value
 * @param {Boolean} [cascade=false] Whether to apply lock hierarchically
 *
 * @return {Resource}
 */
Resource.prototype.setLocked = PromiseStack.chainedMethod(function(locked, cascade) {
    if (!this.project) {
        throw new Error('Resource must have a project to use locking functionality');
    }

    return this.project.setObjectPermissions(this, !!locked, undefined, cascade).andThen(function() {
        this.meta('locked', Number(!!locked));
    }.bind(this));
});

/**
 * Set unlisted flag in resource metadata.
 *
 * @see {@link Project.setObjectPermissions} for more information on permissions setting
 *
 * @method setListed
 * @memberOf Resource#
 *
 * @param {Boolean} listed Inverse value for  unlisted meta value
 * @param {Boolean} [cascade=false] Whether to apply visibility setting hierarchically
 *
 * @return {Resource}
 */
Resource.prototype.setListed = PromiseStack.chainedMethod(function(listed, cascade) {
    if (!this.project) {
        throw new Error('Resource must have a project to use list visibility functionality');
    }

    return this.project.setObjectPermissions(this, undefined, !!listed, cascade).andThen(function() {
        this.meta('unlisted', Number(!!listed));
    }.bind(this));
});

/**
 * Alias for {@link Resource.find}
 *
 * @see {@link Resource.find} for documentation
 *
 * @method using
 * @memberOf Resource#
 */

/**
 * Find resources used by this resource.
 *
 * @see {@link Project.find} for more information on nested resources
 *
 * @method find
 * @memberOf Resource#
 *
 * @param  {String|String[]} types   Types of objects to look up
 *
 * @return {Promise}
 */
Resource.prototype.find = Resource.prototype.using = function(types) {
    return this.andThen(function() {
        if (!this.project) {
            throw new Error('Resource must have a project to use using/usedby functionality');
        }

        return this.project.using(this, types);
    }.bind(this));
};

/**
 * Alias for {@link Resource.parents}
 *
 * @see {@link Resource.parents} for documentation
 *
 * @method usedby
 * @memberOf Resource#
 */

/**
 * Find resources that use this resource.
 *
 * @see {@link Project.parents} for more information on nested resources
 *
 * @method parents
 * @memberOf Resource#
 *
 * @param  {String|String[]} types   Types of objects to look up
 *
 * @return {Promise}
 */
Resource.prototype.parents = Resource.prototype.usedby = function(types) {
    return this.andThen(function() {
        if (!this.project) {
            throw new Error('Resource must have a project to use using/usedby functionality');
        }

        return this.project.usedby(this, types);
    }.bind(this));
};

module.exports = Resource;
