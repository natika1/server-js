
var counter;

exports.app = function(app, options)
{
    options = options || {};
    counter = options.counter || 0;

    return function(env)
    {
        counter++;

        console.log("... responding");        

        return {
            status: 200,
            headers: {
                "Content-Type": "text/plain"
            },
            body: [
                "Counter: " + counter
            ]
        }
    }
}
