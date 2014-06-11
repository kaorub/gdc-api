/**
 * @module utils
 */

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

/**
 * Returns true if object is an array
 *
 * @param  {Mixed}  object
 * @return {Boolean}
 */
exports.isArray = function(object) {
    return Object.prototype.toString.call(object) === '[object Array]';
};

/**
 * Mix multiple objects into target object.
 *
 * @param  {Object}     target Target object
 * @param  {...Object}  mixins Mixins to enhance target object with
 * @return {Object}            Target object
 */
exports.mixin = function(target) {
    var mixins = Array.prototype.slice.call(arguments, 1);
    var getter, setter;

    mixins.forEach(function(mixin) {
        if (!mixin) return;

        for (var name in mixin) {
            getter = mixin.__lookupGetter__(name);
            setter = mixin.__lookupSetter__(name);

            if (getter || setter) {
                if (getter) target.__defineGetter__(name, getter);
                if (setter) target.__defineSetter__(name, setter);
            } else {
                target[name] = mixin[name];
            }
        }
    });

    return target;
};

/**
 * Get property of an object. Property name can contain
 * dots and can lead to an unexisting object without causing any TypeErrors.
 *
 * Property path can contain special `@each` token that modifies the behavior of this method.
 * `@each` causes the method to iterate the array that was found by getting the property
 * at path preceding `@each` and getting the property at path succeeding `@each`
 * of every array element. Result is then an array of properties, one for each array element.
 *
 * If path is null, undefined or an empty string, this method returns the passed object itself.
 *
 * @param  {*} object Object whose property to get
 * @param  {String|Number} path Property name or an array index
 *
 * @return {*}
 */
exports.get = function(object, path) {
    if (path === undefined || path === null || path === '') {
        return object;
    }

    if (typeof(path) === 'number') {
        // array access
        return object[path];
    }

    var pathElements = path.split('.'), pathElement;
    for (var i = 0, n = pathElements.length; i < n; i++) {
        if (object === null || object === undefined) {
            return undefined;
        }

        pathElement = pathElements[i];

        // special `@each` token is recognized within property path
        // this token makes get() function return property of each
        // array element instead of returning property of array itself
        if (pathElement === '@each') {
            if (!exports.isArray(object)) {
                return [];
            }

            // combine what's left of the path back into dot separated string
            var subPath = pathElements.slice(i + 1).join('.');

            /* jshint loopfunc: true */
            return object.map(function(element) {
                return exports.get(element, subPath);
            });
        } else {
            object = object[pathElements[i]];
        }
    }

    return object;
};

/**
 * Set property of an object. Property name can contain dots
 * and can lead to unexisting property, which will cause the method to create
 * the properties as an empty objects as it follows the path. No exception
 * will be throw if there is a nonexisting property along the way.
 *
 * @param {*} object Object whose property to set
 * @param {String|Number} path Property name to set
 * @param {*} value Property value
 *
 * @return {*} Object whose property was set
 */
exports.set = function(object, path, value) {
    if (typeof(path) === 'number') {
        // array access
        object[path] = value;

        return object;
    }

    var pathElements = path.split('.'),
        lastPathElement = pathElements.pop(),
        nextObject;

    for (var i = 0, n = pathElements.length; i < n; i++) {
        nextObject = object[pathElements[i]];

        // we have to create empty objects as we traverse the path
        // the other option would be to throw an exception, but most of the time
        // you would have to set parent objects to empty objects anyway
        if (nextObject === undefined || nextObject === null) {
            // create new object in path and move pointer to this newly created
            // object in a single step
            object = (object[pathElements[i]] = {});
        } else {
            // move on to next object in path
            object = nextObject;
        }
    }

    object[lastPathElement] = value;

    return object;
};

/**
 * Returns property accessor function.
 * This function behavior is similar to jQuery methods such as data() or css().
 *
 * If called with no parameters, accessor returns value of property.
 * If called with one string or number parameter, accessor returns value
 * of property's property found under string (or number) key, e.g. 'length', 'meta.uri' or '0'.
 * If called with one object parameter, property is set to this object.
 * If called with two parameters, accessor sets the value found under string key to passed value.
 *
 * @param  {String} propertyName Name of the accessed property
 * @return {Function}
 */
exports.accessor = function(propertyName) {
    if (!propertyName || typeof(propertyName) !== 'string') {
        throw new Error('Property name for accessor must be a non-empty string');
    }

    return function() {
        var argv = arguments,
            argc = argv.length;

        if (argc === 0) {
            // method acts as a getter for property with propertyName
            // if no arguments were passed in
            return exports.get(this, propertyName);
        }

        var key = argv[0],
            typeofKey = typeof(key);

        if (typeofKey === 'object') {
            // method acts as a setter for the whole property
            // if an object is passed in
            exports.set(this, propertyName, key);
        } else {
            var keyIsValid = typeofKey === 'string' || typeofKey === 'number';
            if (!keyIsValid) {
                throw new Error('Key must be a string or an integer when accessing properties');
            }

            // prepare full path to property for getting/setting
            // this step is required, we cannot just use this[propertyName]
            // since propertyName may also contain dot syntax
            var path = [propertyName, key].join('.');

            if (argc === 1) {
                // method acts as a getter for properties of this[propertyName] object
                // if called with a single argument
                return exports.get(this, path);
            } else {
                exports.set(this, path, argv[1]);
            }
        }

        return this;
    };
};

/**
 * Property generator. This function generates jQuery-like
 * property accessor methods that function as getters when called with no arguments
 * and setters if called with one argument.
 *
 * @param  {String} name
 * @return {Function}
 */
exports.property = function(name) {
    if (!name || typeof(name) !== 'string') {
        throw new Error('Property name must be a non-empty string');
    }

    return function() {
        if (arguments.length === 0) {
            return exports.get(this, name);
        } else {
            exports.set(this, name, arguments[0]);
        }

        return this;
    };
};
