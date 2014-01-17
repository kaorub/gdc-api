var q = require('q');
var https = require('https');

var request = function(options, data) {
    options.headers = options.headers || {};
    options.headers.cookie = options.headers.cookie || '';

    if (options.sst) {
        options.headers.cookie += '; GDCAuthSST=' + options.sst;
    }

    if (options.tt) {
        options.headers.cookie += '; GDCAuthSST=' + options.tt;
    }

    var deferred = q.defer();
    var req = https.request(options, function(res) {
        var body = null;

        res.on('data', function(chunk) {
            if (!body) body = '';

            body += chunk;
        });

        res.on('end', function() {
            res.body = body;

            deferred.resolve(res);
        });

        res.on('close', function() {
            deferred.reject({message: 'closed'});
        });
    });

    if (data) {
        if (typeof(data) !== 'string') {
            data = JSON.stringify(data);
        }

        req.write(data);
    }

    req.on('error', deferred.reject);
    req.end();

    return deferred.promise;
};

module.exports = request;
