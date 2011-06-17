
var hostname = "localhost:8080",
    listenPort = 8080;

var CONNECT = require("connect/connect"),
    LOADER = require("pinf/loader"),
    ARGS = require("modules/args"),
    SYSTEM = require("modules/system"),
    FILE = require("modules/file");

exports.main = function(options)
{
    var optParser = new ARGS.Parser(),
        cliOptions;

    optParser.arg(".../[program.json]");
    optParser.help("Runs the PINF Application Server.");
    optParser.option("-v", "--verbose").bool().help("Enables progress messages");
    optParser.option("-p", "--port").set().help("The port to listen to");
    optParser.option("--reload").bool().help("Reload program with every request (vendor/connect/middleware/jsgi only for now)");
    optParser.option("-h", "--help").bool().help("Display usage information");

    cliOptions = optParser.parse(["pinf-server"].concat(options.args));

    if (cliOptions.help === true)
    {
        optParser.printHelp(cliOptions);
        return;
    }
    if (cliOptions.args.length === 0) {
        optParser.print('\0red(\0bold(' + "Error: No program path specified!" + '\0)\0)');
        optParser.printHelp(cliOptions);
        return;
    }

    var programURI = cliOptions.args[0];
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
            module.print("\n\0cyan(\0bold(Booting program: " + programURI + "\0)\0)\n");

        new LOADER.Sandbox(
        {
            programPath: programURI,
            extendsProgramDescriptorPath: FILE.dirname(FILE.dirname(module.id)) + "/program.packages.json"
        },
        function done(sandbox, require)
        {
            var errorLogPath = false;

            var programDescriptor = sandbox.program.descriptor.json;
            if (programDescriptor["implements"] && programDescriptor["implements"]["github.com/pinf/server-js/-meta/vhost/0.1"]) {
                programDescriptor = programDescriptor["implements"]["github.com/pinf/server-js/-meta/vhost/0.1"];
                hostname = programDescriptor.hostname || hostname;
                listenPort = programDescriptor.listen || listenPort;
                errorLogPath = programDescriptor.errorLogPath || errorLogPath;
            }

            if (errorLogPath)
                LOADER.setErrorLogPath(errorLogPath);

            listenPort = cliOptions.port || listenPort;

            var hostnameParts = hostname.split(":"),
                host,
                port = void 0;
            host = hostnameParts[0];
            if (hostnameParts.length === 2) {
                port = hostnameParts[1];
            }

            var options = {
                reload: cliOptions.reload,
                host: host,
                port: port
            };
            // NOTE: Using UID module ID here as we do not know the mapping alias used by program
            //       We set some default options here so the program does not have to when using these modules
            require("github.com/pinf/server-js/@/jsgi/reload").setOptions(options);
            require("github.com/pinf/server-js/@/vendor/connect/middleware/jsgi").setOptions(options);
            
            var started = false;

            sandbox.boot(function(main)
            {

                // server is running

            }, {    // these options are passed to the program's main module's main() export
                args: cliOptions.args.slice(1),
                verbose: cliOptions.verbose,
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
                                module.print("\n\0cyan(\0bold(Starting PINF Application Server at: " + "http://localhost:" + listenPort + "/" + " for " + "http://" + hostname + "/" + "\0)\0)\n");

                            stack.listen(listenPort);
                        }
                    }
                }
            });
        });
    }
    
    bootProgram();
}
