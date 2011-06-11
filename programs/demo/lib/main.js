
var PATH = require("nodejs/path"),
    JSGI = require("server/vendor/connect/middleware/jsgi");

exports.main = function(options)
{
    /*
     * Start a connect server with various routes
     * 
     * @see http://senchalabs.github.com/connect/
     */

    var CONNECT = options.servers.connect.instance;

    options.servers.connect.start(
        
        CONNECT()
        
            // a cached jsgi route

            .use('/jsgi-cached', JSGI.jsgi(require("./jsgi").app()))

            // a reloading jsgi route

            .use('/jsgi-reloading', JSGI.jsgi([
                require.id("./jsgi", true),
                null,   // next app for ./jsgi
                {       // options for ./jsgi
                    counter: 3
                }
            ], {
                reload: true    // if omitted will look to --reload in server args
            }))

            // a static connect route

            .use('/', CONNECT.static(PATH.dirname(PATH.dirname(module.id)) + "/www", {
                maxAge: 0
            }))
    );
}
