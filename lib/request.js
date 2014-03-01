var q = require('q');
var https = require('https');

/**
 * Performs a HTTP request, waits for the response body and tries
 * to deserialize it into valid JSON object.
 *
 * First parameter is a superset of options passed to http.request() method.
 * It accepts `sst` and `tt` properties used to authenticate user
 * against GoodData backend.
 *
 * @param  {Object} options         Request options
 * @param  {Object/String} data     Request data
 * @return {Promise}
 */
var request = function(options, data) {
    options.headers = options.headers || {};
    options.headers.cookie = options.headers.cookie || '';

    if (options.sst) {
        options.headers.cookie += '; GDCAuthSST=' + options.sst;
    }

    if (options.tt) {
        options.headers.cookie += '; GDCAuthTT=' + options.tt;
    }

    options.headers.cookie = options.headers.cookie.replace(/^; /, '');

    if (data) {
        if (typeof(data) !== 'string') {
            data = JSON.stringify(data);
        }

        data = new Buffer(data, 'utf8');

        options.headers['content-length'] = data.length;
        options.headers['content-type'] = 'application/json; charset=UTF-8';
    } else {
        options.headers['content-length'] = 0;
    }

    options.rejectUnauthorized = false;
    options.headers.accept = 'application/json';

    var deferred = q.defer();
    var req = https.request(options, function(res) {
        var body = null;

        res.on('data', function(chunk) {
            if (!body) body = '';

            body += chunk;
        });

        res.on('end', function() {
            res.body = body;

            try {
                res.data = JSON.parse(res.body);
            } catch (ignore) {}

            deferred.resolve(res);
        });

        res.on('close', function() {
            throw new Error('Connection closed');
        });
    });

    req.on('error', deferred.reject);
    req.end(data);

    return deferred.promise;
};

module.exports = request;
