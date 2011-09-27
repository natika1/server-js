
exports.main = function(env)
{
	module.load({
		
	    "location": module.id.replace(/\/[^\/]*\/[^\/]*$/, "")
	    
	}, function(id)
	{
		env.programPathResolver = function(path)
		{
			return env.bootPackagePath + "/" + path;
		}

		require(id).main(env);
	});
}
