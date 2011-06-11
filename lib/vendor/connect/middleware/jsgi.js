
var UTIL = require("modules/util"),
    LOADER = require("pinf/loader");

var serverOptions = {};

exports.setOptions = function(options) {
    serverOptions = options;
}

// TODO: This could move to https://github.com/senchalabs/connect/blob/master/lib/middleware/jsgi.js
exports.jsgi = function jsgi(app, options)
{
    options = options || {};
    options.reload = options.reload || serverOptions.reload;

    var appModule = false;

    return function(req, res, next)
    {
        function handleResponse(data)
        {
            if (typeof data == "object")
            {
                if (typeof data.then == "function")
                {
                    function handle(data)
                    {
                        res.statusCode = data.status || 200;
                        if (typeof data.headers === "object")
                        {
                            for (var name in data.headers)
                            {
                                // TODO: Camelcase names
                                res.setHeader(name, data.headers[name]);
                            }
                        }
                        // TODO: Detect binary encoding better than with binaryBody
                        if (data.body.length === 1)
                            res.end(data.body[0], ((data.binaryBody)?"binary":void 0));
                        else
                            res.end(data.body.join(""), ((data.binaryBody)?"binary":void 0));
                    }
                    data.then(
                        handle,
                        function (error)
                        {
                            module.print("Error: " + error.stack);
                            handle({ status:500, headers:{}, body:[error.message] });
                        },
                        function (data)
                        {
                            throw new Error("NYI");
                            // @see https://github.com/kriszyp/jsgi-node/blob/v0.2.4/lib/jsgi-node.js#L128
                            // TODO: handle(data, true);
                        }
                    );
                    return;
                }
                else
                {
                    res.statusCode = data.status || 200;
                    if (typeof data.headers === "object")
                    {
                        for (var name in data.headers)
                        {
                            // TODO: Camelcase names
                            res.setHeader(name, data.headers[name]);
                        }
                    }
                    // TODO: Detect binary encoding better than with binaryBody
                    if (data.body.length === 1)
                        res.end(data.body[0], ((data.binaryBody)?"binary":void 0));
                    else
                        res.end(data.body.join(""), ((data.binaryBody)?"binary":void 0));
                }
            }
            else
                throw new Error("NYI");            
        }
        
        function callApp(app)
        {
            var env = {
                pathInfo: req.originalUrl,
                port: options.port
            };
            
            handleResponse(app(env));
        }
        
        if (UTIL.isArrayLike(app))
        {
            if (!appModule || options.reload)
            {
                var sandbox = new LOADER.Sandbox();

                var parts = app[0].split("@/");

                sandbox.declare([{
                    "app": {
                        "location": parts[0],
                        "module": parts[1]
                    }
                }], function(require)
                {
                    appModule = require(app[0]).app.apply(null, app.slice(1));
                    callApp(appModule);
                });
            } else {
                callApp(appModule);
            }
        }
        else
        {
            callApp(app);
        }
    }
}
