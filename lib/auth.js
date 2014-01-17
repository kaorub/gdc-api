var request = require('./request');

var SST_REGEX = /GDCAuthSST=(.+?)(;| |$)/;
var TT_REGEX = /GDCAuthTT=(.+?)(;| |$)/;

var getSST = function(username, password, hostname, port) {
    var host = hostname + ':' + port;
    var data = {
        postUserLogin: {
            captcha: '',
            login: username,
            password: password,
            remember: '0',
            verifyCaptcha: ''
        }
    };

    var payload = JSON.stringify(data);
    return request({
        hostname: hostname,
        port: port,
        method: 'POST',
        path: '/gdc/account/login',
        rejectUnauthorized: false,
        headers: {
            'host': host,
            'accept': 'application/json',
            'content-type': 'application/json',
            'content-length': payload.length
        }
    }, payload).then(function(response) {
        if (response.statusCode !== 200) throw { message: 'Invalid login' };

        var headers = response.headers || {};
        var cookies = headers['set-cookie'] || [];
        var sst = (function() {
            for (var i = 0, n = cookies.length; i < n; i++) {
                var match = cookies[i].match(SST_REGEX);

                if (match) return match[1];
            }
        })();

        if (!sst) throw { message: 'Invalid login' };

        return sst;
    });
};

var getTT = function(sst, hostname, port) {
    var host = hostname + ':' + port;

    return request({
        hostname: hostname,
        port: port,
        method: 'GET',
        path: '/gdc/account/token',
        rejectUnauthorized: false,
        headers: {
            'host': host,
            'accept': 'application/json',
            'content-type': 'application/json',
            'cookie': 'GDCAuthSST=' + sst
        }
    }).then(function(response) {
        if (response.statusCode !== 200) throw { message: 'Invalid SST' };

        var headers = response.headers || {};
        var cookies = headers['set-cookie'] || [];
        var tt = (function() {
            for (var i = 0, n = cookies.length; i < n; i++) {
                var match = cookies[i].match(TT_REGEX);

                if (match) return match[1];
            }
        })();

        if (!tt) throw { message: 'Invalid SST' };

        return tt;
    });
};

var deleteSST = function(sst, tt, hostname, port) {
    var host = hostname + ':' + port;

    return request({
        hostname: hostname,
        port: port,
        method: 'GET',
        path: '/gdc/app/account/bootstrap',
        rejectUnauthorized: false,
        headers: {
            'host': host,
            'accept': 'application/json',
            'content-type': 'application/json',
            'cookie': 'GDCAuthTT=' + tt
        }
    }).then(function(response) {
        if (response.statusCode === 401) {
            return getTT(sst, hostname, port).then(function(tt) {
                return deleteSST(sst, tt, hostname, port);
            });
        }

        var bootstrap = JSON.parse(response.body);
        var profileUrl = bootstrap.bootstrapResource.accountSetting.links.self;
        var logoutUrl = profileUrl.replace('/profile', '/login');

        return request({
            hostname: hostname,
            port: port,
            method: 'DELETE',
            path: logoutUrl,
            rejectUnauthorized: false,
            headers: {
                'host': host,
                'accept': 'application/json',
                'content-type': 'application/json',
                'content-length': 0,
                'cookie': 'GDCAuthSST=' + sst + '; GDCAuthTT=' + tt
            }
        });
    });
};

exports.getSST = getSST;
exports.getTT = getTT;
exports.deleteSST = deleteSST;
