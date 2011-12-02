
var Q = require("modules/q"),
    INCOMING_FORM = require("formidable/incoming_form");

var serverOptions = {};

exports.setOptions = function(options) {
    serverOptions = options;
}

// TODO: This could move to https://github.com/senchalabs/connect/blob/master/lib/middleware/jsgi.js
exports.jsgi = function jsgi(app, options)
{
    options = options || {};

    function handle(res, data)
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
        if (typeof data.body !== "undefined")
        {
            if (data.body.length === 1)
            {
                res.end(data.body[0], ((data.binaryBody)?"binary":void 0));
            }
            else
            {
            	res.end(data.body.join(""), ((data.binaryBody)?"binary":void 0));
            }
        } else {
        	res.end("");
        }
    }

    function processRequest(req, res, env)
    {
        var data = app(env);

        if (typeof data == "object")
        {
            if (typeof data.promiseSend === "function")
            {
                Q.when(data, function(data)
                {
                    handle(res, data);
                }, function(error)
                {
                    console.error(""+error, error, error.stack);
                    handle(res, { status:500, headers:{}, body:[error.message] });
                });
            }
            else
            if (typeof data.then == "function")
            {
                data.then(
                    function (response)
                    {
                        handle(res, response);
                    },
                    function (error)
                    {
                        console.error(""+error, error, error.stack);
                        handle(res, { status:500, headers:{}, body:[error.message] });
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
                handle(res, data);
            }
            else
                throw new Error("JSGI response data object does not have one of 'promiseSend', 'then', 'body' as key");
        }
        else
            throw new Error("JSGI response data not an object!");        
    }

    return function(req, res, next)
    {
        var env = {
            pathInfo: req.originalUrl,
            host: options.host || serverOptions.host,
            port: options.port || serverOptions.port,
            headers: req.headers
        };

        var m = env.pathInfo.match(/\?(.*)$/)
        if (m) {
        	env.getArgs = {};
        	m[1].split("&").forEach(function(pair)
        	{
        		pair = pair.split("=");
        		env.getArgs[pair[0]] = pair[1];
        	});
        }

        if (req.method.toLowerCase() === "post")
        {
            var form = new INCOMING_FORM.IncomingForm();
            form.parse(req, function(err, fields, files) {
                if (err) {
                    console.error("Error parsing incoming form", ""+err, err);
                    handle(res, {status: 400, headers: {"Content-Type": "text/plain"}, body: [ "Bad Request!" ]});
                } else {
                    env.postData = {
                        fields: fields,
                        files: files
                    };
                    processRequest(req, res, env);
                }
            });
        }
        else
        {
            processRequest(req, res, env);
        }
    }
}
