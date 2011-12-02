
var hostname = "localhost:8080",
	listenIP = "127.0.0.1",
    listenPort = 8080;

var CONNECT = require("connect/connect"),
    LOADER = require("pinf/loader"),
    ARGS = require("modules/args"),
    SYSTEM = require("modules/system"),
    FILE = require("modules/file"),
    JSON = require("modules/json"),
    UTIL = require("modules/util");

exports.parseArgs = function(args, optParser)
{
    optParser = optParser || new ARGS.Parser();

	optParser.arg(".../[program.json]");
	optParser.help("Runs the PINF Application Server.");
	optParser.option("-v", "--verbose").bool().help("Enables progress messages");
	optParser.option("--ip").set().help("The IP to start the server on");
	optParser.option("-p", "--port").set().help("The port to listen to");
	optParser.option("--reloading").bool().help("Reload program with every request (vendor/connect/middleware/jsgi only for now)");
	// TODO: Some of the requirements met by the `--descriptor-overlay` could be better implemented via a `--profile` option
	//		 where the profile data does not make it into the descriptor. The `--profile` option will be the option of choice
	//		 to set runtime-specific options on a codebase that stays static across environments.
	optParser.option("--descriptor-overlay").set().help("Path to a program descriptor to overlay the program's program descriptor");
	optParser.option("-h", "--help").bool().help("Display usage information");
	
	cliOptions = optParser.parse(args);
	
	if (cliOptions.help === true)
	{
	    optParser.printHelp(cliOptions);
	    return false;
	}
	if (cliOptions.args.length === 0) {
	    optParser.print('\0red(\0bold(' + "Error: No program path specified!" + '\0)\0)\n');
	    optParser.printHelp(cliOptions);
	    return false;
	}
	
	return cliOptions;
}

exports.main = function(options)
{
    var optParser = new ARGS.Parser(),
    	cliOptions;

    if (!(cliOptions = exports.parseArgs(["./"].concat(options.args), optParser)))
    {
    	return;
    }

    var descriptorOverlay;
    if (cliOptions["descriptor-overlay"])
    {
    	if (!FILE.exists(cliOptions["descriptor-overlay"]))
    	{
	    	optParser.print("\0red(\0bold('--descriptor-overlay' does not point to a file that exists!\0)\0)\n");
	    	return;
    	}
    	try {
    		descriptorOverlay = JSON.decode(FILE.read(cliOptions["descriptor-overlay"]));
    	} catch(e) {
	    	optParser.print("\0red(\0bold(Error '" + e + "' parsing '--descriptor-overlay' at: " + cliOptions["descriptor-overlay"] + "\0)\0)\n");
	    	return;
    	}
    }

    var programURI = cliOptions.args[0];
    
    if (typeof options.programPathResolver === "function")
    {
    	programURI = options.programPathResolver(programURI);
    }
    
    // TODO: This should be done by LOADER.boot({program: ...});
    if (!/^\w*:\/\//.test(programURI))
    {
        if (!/program\.json$/.test(programURI)) {
            programURI += "/program.json";
        }
        if (!/^\//.test(programURI)) {
            programURI = SYSTEM.pwd + "/" + programURI;
        }
        programURI = FILE.realpath(programURI);
    }

    function bootProgram()
    {
        if (cliOptions.verbose)
        {
            module.print("\n\0cyan(\0bold(Booting program: " + programURI + "\0)\0)\n");
            if (cliOptions["descriptor-overlay"])
                module.print("\n\0cyan(\0bold(Descriptor overlay: " + cliOptions["descriptor-overlay"] + "\0)\0)\n");
        }

        new LOADER.Sandbox(
        {
            programPath: programURI,
            extendsProgramDescriptorPath: FILE.dirname(FILE.dirname(module.id)) + "/program.packages.json"
        },
        function done(sandbox, require)
        {
            var errorLogPath = false;

            var programDescriptor = UTIL.deepCopy(sandbox.program.descriptor.json);

            if (descriptorOverlay)
            {
            	UTIL.deepUpdate(programDescriptor, descriptorOverlay);
            }

            if (!programDescriptor["implements"] || !programDescriptor["implements"]["github.com/pinf/server-js/-meta/strawman/vhost/0.1"])
            {
                module.print('\0red(\0bold(' + "Error: Program descriptor for '" + programURI + "' does not implement 'github.com/pinf/server-js/-meta/strawman/vhost/0.1'!" + '\0)\0)\n');
            	return;
            }
            programDescriptor = programDescriptor["implements"]["github.com/pinf/server-js/-meta/strawman/vhost/0.1"] || {};
            
            // if `listen` is set we update the `listenPort` and the port on the `hostname`
            if (programDescriptor.listen) {
                listenPort = programDescriptor.listen || listenPort;
            	if (listenPort == 80) {
            		hostname = hostname.split(":")[0];
            	} else {
            		hostname = hostname.split(":")[0] + ":" + listenPort;
            	}
            }
            hostname = programDescriptor.hostname || hostname;
            errorLogPath = programDescriptor.errorLogPath || errorLogPath;

            if (cliOptions.port) {
                listenPort = cliOptions.port || listenPort;
            	if (listenPort == 80) {
            		hostname = hostname.split(":")[0];
            	} else {
            		hostname = hostname.split(":")[0] + ":" + listenPort;
            	}
            }

            // TODO: Print out updated `programDescriptor["implements"]["github.com/pinf/server-js/-meta/strawman/vhost/0.1"]` to show
            //		 exact config used. Could display diff via insight.

            if (cliOptions.ip) {
            	listenIP = cliOptions.ip || listenIP;
            }

            if (errorLogPath)
                LOADER.setErrorLogPath(errorLogPath);

            var hostnameParts = hostname.split(":"),
                host,
                port = void 0;
            host = hostnameParts[0];
            if (hostnameParts.length === 2) {
                port = hostnameParts[1];
            }

            var options = {
                reload: cliOptions.reloading,
                host: host,
                port: port
            };
            
            // NOTE: Using UID module ID here as we do not know the mapping alias used by program
            //       We set some default options here so the program does not have to when using these modules
            try {
            require("github.com/pinf/server-js/@/jsgi/reload").setOptions(options);
            require("github.com/pinf/server-js/@/vendor/connect/middleware/jsgi").setOptions(options);
            } catch(e) {}

            var started = false;

            sandbox.boot(function(main)
            {

                // server is running

            }, {    // these options are passed to the program's main module's main() export
                args: cliOptions.args.slice(1),
                verbose: cliOptions.verbose,
                reloading: cliOptions.reloading,
                host: host,
                port: port,
                helpers: {
                    restart: function()
                    {
                        // NOTE: This is not actually closing the server (thus we cannot restart it)
                        // TODO: Fix server closing
/*                        
                        started.on("close", function()
                        {
                            // TODO: Reload program sandbox
                        });
                        started.close();
                        started = false;
*/                        
                    }
                },
                stacks: {
                    connect: {
                        instance: CONNECT,
                        start: function(stack) {
                            if (started)
                                throw new Error("A stack has already been started!");
                            started = stack;

                            if (cliOptions.verbose)
                                module.print("\n\0cyan(\0bold(Starting PINF Application Server at: " + "http://" + listenIP + ":" + listenPort + "/" + " for " + "http://" + hostname + "/" + "\0)\0)\n");

                            stack.listen(listenPort, listenIP);
                        }
                    }
                }
            });
        });
    }
    
    bootProgram();
}
