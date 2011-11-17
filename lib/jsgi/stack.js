
var Q = require("modules/q");

exports.app = function(app, options)
{
	var nextApp = false;
	var nextAppResolver = chainApps([].concat(app), options);
	Q.when(nextAppResolver, function(app) {
		nextApp = app;
	});
	return function(env)
    {
		if (typeof options.onRequest === "function") {
			options.onRequest(env);
		}
		if (nextApp === false) {
			var result = Q.defer();
			Q.when(nextAppResolver, function(app) {
				try {
					result.resolve(app(env));
				} catch(e) {
					result.reject(e);
				}
			});
			return result.promise;
		} else {
			return nextApp(env);
		}
    };
}

function chainApps(apps, options)
{
	var result = Q.defer();
	var nextApp = null;
	function chainNextApp()
	{
		if (apps.length === 0)
			throw new Error("No apps defined for stack!");
		module.load(apps.pop(), function(id)
		{
			nextApp = require(id).app(nextApp, options);
			if (apps.length > 0) {
				chainNextApp();
			} else {
				result.resolve(nextApp);
			}
	    });
	}
	chainNextApp();
	return result.promise;
}