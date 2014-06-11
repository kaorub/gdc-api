'use strict';

var Resource = require('./resource');
var utils = require('./utils');

/**
 * Report resource object.
 *
 * @class
 * @augments {Resource}
 *
 * @property {Api} api API instance
 * @property {Project} project Project instance
 *
 * @param {Api} api API instance
 * @param {Project} project Project instance
 * @param {Object} [data] Report data
 */
var Report = function(api, project, data) {
    Report.__super.call(this, api, data);

    this.project = project;
};

utils.inherits(Report, Resource, {
    namespace: { value: 'report' }
});

/**
 * Uri property.
 * Proxy to __data.meta.uri property
 *
 * @see {@link utils.property} for more information on properties
 * @method uri
 * @memberOf Report#
 */
Report.prototype.uri = utils.property('__data.meta.uri');

/**
 * Return all the metrics that are used by this report.
 * This is just an alias method for Resource.find('metric').
 *
 * @see  {@link Project.using} for more information on nested resources.
 * @see  {@link Resource.find} for more information on finding nested resources.
 * @method metrics
 * @memberOf Report#
 *
 * @return {Promise} Resolved with plain array of Metric resources
 */
Report.prototype.metrics = function() {
    return this.find('metric');
};

/**
 * Return all the report definitions that are used by this report.
 * This is just an alias method for Resource.find('reportDefinition').
 *
 * @see  {@link Project.using} for more information on nested resources.
 * @see  {@link Resource.find} for more information on finding nested resources.
 * @method reportDefinitions
 * @memberOf Report#
 *
 * @return {Promise} Resolved with plain array of ReportDefinition resources
 */
Report.prototype.reportDefinitions = function() {
    return this.find('reportDefinition');
};

module.exports = Report;
