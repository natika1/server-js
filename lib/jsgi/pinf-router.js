
var UTIL = require("modules/util");

var pinf;

exports.app = function(app, options) {

    pinf = options.pinf;
    
    if (typeof app === "object")
    {
    	UTIL.forEach(app, function(info)
    	{
        	pinf.registerRoute(info[0], info[1]);
    	});
    }

    return function(env) {

        if(pinf && pinf.routes && pinf.routes.length>0) {
            var m;
            for( var i=0,c=pinf.routes.length ; i<c ; i++ ) {
                if(m = env.pathInfo.match(pinf.routes[i].expr)) {
                    return handleRoute(app, env, pinf.routes[i], m);
                }
            }
        }

        if (typeof app !== "function")
        	throw new Error("No matching route found for URI: " + env.pathInfo);

        return app(env);
    }
}

function handleRoute(app, env, route, match)
{
	var instructions = {},
		handler,
    	args = {};
	
	if (typeof route.handler === "function")
	{
		handler = route.handler;
	}
	else
	{
	    instructions = route.inst(env) || {};
	    
	    handler = pinf.getHandlerForId(route["package"] + ":" + route.module + ":" + instructions.handler);

	    if(instructions.arguments) {
	        UTIL.forEach(instructions.arguments, function(arg) {
	            if(arg[1].substring(0,1)=="$") {
	                args[arg[0]] = match[arg[1].substring(1)*10/10];
	            } else {
	                args[arg[0]] = arg[1];
	            }
	        });
	    }
	}
    
    env.pinf.route = {
        "args": args
    };
    
    var response;

    try {

        response = handler(env);

    } catch(e) {
        console.error("Error: " + e.stack);
        return {
            "status": "500",
            "headers": {
                "content-type": "text/html"
            },
            "body": [
                "Internal Server Error"
            ]
        }
    }

    if(response===true) {
        // adjust route if applicable
        if(instructions.route) {
            env.pathInfo = instructions.route;
        }
        return app(env);
    } else
    if(response===false) {
        // TODO: Stop execution, we had an internal error
    }
    return response;
}
