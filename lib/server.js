
var host = "localhost",
    port = 8080;

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
    optParser.option("-p", "--port").set().help("The port to use");
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


    port = cliOptions.port || port;
    
    var programURI = cliOptions.args[0];
    // TODO: This should be done by LOADER.boot({program: ...});
    if (!/program\.json$/.test(programURI)) {
        programURI += "/program.json";
    }
    if (!/^\//.test(programURI)) {
        programURI = SYSTEM.pwd + "/" + programURI;
    }
    programURI = FILE.realpath(programURI);



    function bootProgram()
    {
        if (cliOptions.verbose)
            module.print("\n\0cyan(\0bold(Booting program at: " + programURI + "\0)\0)\n");

        new LOADER.Sandbox(
        {
            programPath: programURI
        },
        function done(sandbox, require)
        {
            var options = {
                reload: cliOptions.reload,
                port: port
            };
            // NOTE: Using UID module ID here as we do not know the mapping alias used by program
            //       We set some default options here so the program does not have to when using these modules
            require("github.com/pinf/server-js/@/jsgi/reload").setOptions(options);
            require("github.com/pinf/server-js/@/vendor/connect/middleware/jsgi").setOptions(options);

            sandbox.boot(function(main)
            {

                // server is running

            }, {    // these options are passed to the program's main module's main() export
                verbose: cliOptions.verbose,
                servers: {
                    connect: {
                        instance: CONNECT,
                        start: function(stack) {

                            if (cliOptions.verbose)
                                module.print("\n\0cyan(\0bold(Starting PINF Application Server at: " + "http://" + host + ":" + port + "/" + "\0)\0)\n");

                            stack.listen(port);
                        }
                    }
                }
            });
        });
    }
    
    bootProgram();
}
