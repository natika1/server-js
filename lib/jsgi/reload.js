
var UTIL = require("modules/util"),
    LOADER = require("pinf/loader"),
    Q = require("modules/q");

var serverOptions = {};

exports.setOptions = function(options) {
    serverOptions = options;
}

exports.app = function app(app, options)
{
    options = options || {};
    options.reload = options.reload || serverOptions.reload;

    var appModule = false;

    return function(env)
    {
        var result = Q.defer();

        function callApp(app)
        {
            try {
                result.resolve(app(env));
            } catch(e) {
                result.reject(e);
            }
        }

        if (UTIL.isArrayLike(app))
        {
            if (!appModule || options.reload)
            {
                if (options.reload) {
                    var sandbox = new LOADER.Sandbox();
    
                    sandbox.load(app[0], function(id, require)
                    {
                        appModule = require(id).app.apply(null, app.slice(1));
                        callApp(appModule);
                    });
                } else {
                    module.load(app[0], function(id)
                    {
                        appModule = require(id).app.apply(null, app.slice(1));
                        callApp(appModule);
                    });
                }
            } else {
                callApp(appModule);
            }
        }
        else
        {
            callApp(app);
        }
        
        return result.promise;
    }
}
