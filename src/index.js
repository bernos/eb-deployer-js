var AWS = require('aws-sdk'),
	FSM = require('./lib/statemachine'),
	l 	= require('./lib/logger');

// TODO: These will be our command line args that we will ultimately read from the cli
var args = {
	environment 	: "dev",
	sourceBundle 	: __dirname + "../examples/blue-green/deploy/docker-sample-v3.zip",
	strategy 		: "blue-green",
	config 			: __dirname + "../examples/blue-green/my-application.js"
}

var config = require(args.config);

configureServices(config);
configureStateMachine(config, args.strategy).run({});

/**
 * Global aws config stuff. Set up region and some basic tracing on all 
 * AWS service requests
 *
 * 
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
}

/**
 * Setup common 'services'. Services will be provided to all deployment steps/states
 * via the common config obj
 */
function configureServices(config) {
	configureAWS(config);

	config.services = {
		AWS : AWS,
		log : l
	}
}

/**
 * Set up our finite state machine which will manage our deployment workflow. The specific
 * workflow we use is determined by the strategy param here. By convention, the strategy
 * argument will be used to construct a path to a folder containing a config.js file which
 * is simply a node js module which returns a valid state machine configuration
 */
function configureStateMachine(config, strategy) {
	var states = require('./strategies/' + strategy + '/config.js'),
		stateHandlers = {};

	function stateMachineTransitionHandler(e) {
		return function(fsm, state, data) {

			l.debug("State machine event: %s\t State: %s", e, state.name);

			if (!stateHandlers[state.name]) {
				stateHandlers[state.name] = require('./strategies/' + args.strategy + '/states/' + state.name)(config, args);
			}

			if (typeof stateHandlers[state.name][e] === "function") {
				l.banner("[%s] %s", e, state.name);
				l.trace("Data = %j", data);

				stateHandlers[state.name][e].apply(stateHandlers[state.name], [fsm, data]);
			} else {
				l.warn("State %s has no handler for the '%s' event.", state.name, e);
			}
		}
	}

	return new FSM(states)
				.bind(FSM.EXIT, 	stateMachineTransitionHandler("exit"))
				.bind(FSM.ENTER, 	stateMachineTransitionHandler("enter"))
				.bind(FSM.CHANGE, 	stateMachineTransitionHandler("activate"))
}

