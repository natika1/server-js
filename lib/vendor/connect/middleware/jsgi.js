
var Q = require("modules/q");

var serverOptions = {};

exports.setOptions = function(options) {
    serverOptions = options;
}

// TODO: This could move to https://github.com/senchalabs/connect/blob/master/lib/middleware/jsgi.js
exports.jsgi = function jsgi(app, options)
{
    options = options || {};

    return function(req, res, next)
    {
        var env = {
            pathInfo: req.originalUrl,
            host: options.host || serverOptions.host,
            port: options.port || serverOptions.port
        };

        var data = app(env);

        if (typeof data == "object")
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

            if (typeof data.promiseSend === "function")
            {
                Q.when(data, function(data)
                {
                    handle(data);
                }, function(error)
                {
                    console.error(error);
                    handle({ status:500, headers:{}, body:[error.message] });
                });
            }
            else
            if (typeof data.then == "function")
            {
                data.then(
                    handle,
                    function (error)
                    {
                        console.error(e);
                        handle({ status:500, headers:{}, body:[error.message] });
                    },
                    function (data) // not sure what this is for
                    {
                        throw new Error("NYI");
                        // @see https://github.com/kriszyp/jsgi-node/blob/v0.2.4/lib/jsgi-node.js#L128
                        // TODO: handle(data, true);
                    }
                );
                return;
            }
            else
            if (typeof data.body !== "undefined")
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
            } else
                throw new Error("JSGI response data object does not have one of 'promiseSend', 'then', 'body' as key");
        }
        else
            throw new Error("JSGI response data not an object!");        
    }
}
