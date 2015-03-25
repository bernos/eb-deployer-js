# eb-deployer-js

Easily deploy Elastic Beanstalk applications from the command line using nodejs. eb-deployer-js currently supports the 
blue/green deployment strategy, but provides an extensibility point to define custom deployment processes and tasks.

## Usage

`node eb-deployer-js.js --environment dev --package my-app.zip --config my-app.config.js`

Check out the examples in the examples folder for more detailed usage.

## Configuration

Different strategies will use different configuration formats, but for the currently supported blue/green strategy, see
the config in the examples folder

## Custom deployment strategies

eb-deployer-js is effectively a finite state machine. Custom deployment strategies can easily be developed by writing a custom
state machine configuration, and implementing the necessary states.
