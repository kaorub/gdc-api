'use strict';

var Resource = require('./resource');
var utils = require('./utils');

/**
 * Metric resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {Project} project Project instance
 *
 * @param {Api} api API instance
 * @param {Project} project Project instance
 * @param {Object} [data] Metric data
 */
var Metric = function(api, project, data) {
    Metric.__super.call(this, api, data);

    this.project = project;
};

utils.inherits(Metric, Resource, {
    namespace: { value: 'metric' }
});

/**
 * Uri property. Accessor for __data.meta.uri property
 *
 * @see {@link utils.property} for more information on properties
 * @method uri
 * @memberOf Metric#
 */
Metric.prototype.uri = utils.property('__data.meta.uri');

module.exports = Metric;
