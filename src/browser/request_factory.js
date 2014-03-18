var $ = require('jquery');

module.exports = function() {
    // TODO Parse config string passed as an argument
    // TODO Use existing GoodData XHR

    return function() {
        return $.ajax.apply($, arguments);
    };
};
