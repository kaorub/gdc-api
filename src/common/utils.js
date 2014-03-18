/**
 * Utility function that simplifies inheritance chain creation.
 *
 * @param  {Function} constructor     Subclass constructor
 * @param  {Function} superConstructor Superclass constructor
 * @param  {Object} properties       [optional] Additional properties object to add to prototype. See Object.create for more details
 */
exports.inherits = function(constructor, superConstructor, properties) {
    properties = properties || {};
    properties.constructor = {
        value: constructor,
        enumerable: false,
        writable: true,
        configurable: true
    };

    constructor.__super = superConstructor;

    constructor.prototype = Object.create(superConstructor.prototype, properties);
};
