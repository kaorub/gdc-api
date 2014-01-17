var auth = require('./lib/auth');


auth.getTokens('jan.nanista+1@gooddata.com', 'JeziskoveHuslicky!', 'localhost', 8443).then(function(tokens) {
    console.log('tokens', tokens);
});
