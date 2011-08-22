Welcome
=======

Welcome to the PINF Application Server.

The server supports/provides the following:

  * [Connect](https://github.com/senchalabs/connect) middleware layer
  * *jsgi* handler for *Connect*
  * Reloading *jsgi* app

Usage
=====

    Usage: pinf-server [OPTIONS] .../[PROGRAM.JSON]
    Runs the PINF Application Server.
     -v --verbose: Enables progress messages
     -p --port PORT: The port to use
     --reload: Reload program with every request (vendor/connect/middleware/jsgi only for now)
     -h --help: Display usage information

Demo
====

Start the server and load the included demo program.

    commonjs -v ./ -v ./examples/demo
    
    open http://localhost:8081/
