#!/usr/bin/env node

var AWS  = require('aws-sdk'),
    FSM  = require('./lib/statemachine'),
    path = require('path'),
    l    = require('./lib/logger');

/**
 * Read args from the command line. Thes will be passed on as deployment options 
 * to the deployment steps.
 */
var args = require('nomnom')
    .option('environment', {
        abbr: 'e',
        required: true,
        help: 'The envrionment to deploy to'
    })
    .option('package', {
        abbr: 'p',
        required: true,
        help: 'The package to deploy'
    })
    .option('strategy', {
        abbr: 's',
        default: 'blue-green',
        help: 'The deployment strategy to use'
    })
    .option('config', {
        abbr: 'c',
        required: true,
        help: 'The configuration file'
    })
    .parse();

var config       = require(path.join(process.cwd(), args.config)),
	services     = configureServices(config),
	stateMachine = configureStateMachine(config, services, args);

stateMachine.run({});

/**
 * Global aws config stuff. Set up region and some basic tracing on all 
 * AWS service requests
 *
 * @param {object} config 
 */
function configureAWS(config) {
    AWS.config.update({
        region : config.Region
    });

    AWS.events = new AWS.SequentialExecutor();

    AWS.events
        .on('send', function(resp) {
            resp.startTime = new Date().getTime();
        })
        .on('complete', function(resp) {
            resp.endTime = new Date().getTime();

            if (resp.error) {
                l.error("Error calling %s on %s : %j", resp.request.operation, resp.request.service.endpoint.host, resp.error);
            } else {
                l.debug(resp.request.operation + " took " + ((resp.endTime - resp.startTime) / 1000) + " seconds %j", resp.request.service);
            }   
        }); 

	return AWS;
}

/**
 * Setup common 'services'. 
 * @param {object} config
 * @return {object}
 */
function configureServices(config) {
	return {
		AWS : configureAWS(config)
	};
}

/**
 * Sets up our finite state machine which will manage our deployment workflow. 
 * The specific strategy we use is determined by options.strategy. By 
 * convention, the options.strategy string value will be used to construct a 
 * path to a folder containing a config.js file which is simply a node js 
 * module that exports a valid state machine configuration
 *
 * @param {object} config The elastic beanstalk application config
 * @param {object} services Services to pass to each step
 * @param {object} options User provided deployment options
 *
 * @return {object} A configured state machine
 */
function configureStateMachine(config, services, options) {
    var states = require('./strategies/' + options.strategy + '/config.js'),
        stateHandlers = {};

    function stateMachineTransitionHandler(e) {
        return function(fsm, state, data) {

            l.debug("State machine event: %s\t State: %s", e, state.name);

            if (!stateHandlers[state.name]) {
                stateHandlers[state.name] = require(__dirname  + '/strategies/' + options.strategy + '/states/' + state.name)(config, services, options);
            }

            if (typeof stateHandlers[state.name][e] === "function") {
                l.banner("[%s] %s", e, state.name);
                l.trace("Data = %j", data);

                stateHandlers[state.name][e].apply(stateHandlers[state.name], [fsm, data]);
            } else {
                l.warn("State %s has no handler for the '%s' event.", state.name, e);
            }
        };
    }

    return new FSM(states)
                .bind(FSM.EXIT,     stateMachineTransitionHandler("exit"))
                .bind(FSM.ENTER,    stateMachineTransitionHandler("enter"))
                .bind(FSM.CHANGE,   stateMachineTransitionHandler("activate"));
}

