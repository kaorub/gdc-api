'use strict';

var Resource = require('./resource');
var utils = require('./utils');

/**
 * ReportDefinition resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {Project} project Project instance
 *
 * @param {Api} api API instance
 * @param {Project} project Project instance
 * @param {Object} [data] ReportDefinition data
 */
var ReportDefinition = function(api, project, data) {
    ReportDefinition.__super.call(this, api, data);

    this.project = project;
};

utils.inherits(ReportDefinition, Resource, {
    namespace: { value: 'report' }
});

/**
 * Uri property.
 * Proxy to __data.meta.uri property
 *
 * @see {@link utils.property} for more information on properties
 * @method uri
 * @memberOf ReportDefinition#
 */
ReportDefinition.prototype.uri = utils.property('__data.meta.uri');

/**
 * Return all the metrics that are used by this report definition.
 * This is just an alias method for Resource.find('metric').
 *
 * @see  {@link Project.using} for more information on nested resources.
 * @see  {@link Resource.find} for more information on finding nested resources.
 * @method metrics
 * @memberOf ReportDefinition#
 *
 * @return {Promise} Resolved with plain array of Metric resources
 */
ReportDefinition.prototype.metrics = function() {
    return this.find('metric');
};

module.exports = ReportDefinition;
