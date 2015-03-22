var AWS = require('aws-sdk'),
	FSM = require('./lib/statemachine'),
	Q = require('q'),
	l = require('./lib/logger'),
	_ = require('lodash'),
	randtoken = require('rand-token');

// TODO: Read args from command line
var args = {
	environment 	: "dev",
	sourceBundle 	: __dirname + "/deploy/docker-sample-v3.zip" 
}

// TODO: Read config from file specified in args
var config = {
	ApplicationName	  : "My Application",
	SolutionStackName : "64bit Amazon Linux 2014.09 v1.2.0 running Docker 1.3.3",
	Region 			  : "ap-southeast-2",

	Tags : [{
		Key   : "ApplicationName",
		Value : "My Application"
	}],

	OptionSettings : [{
		Namespace  : 'aws:autoscaling:launchconfiguration',
		OptionName : 'InstanceType',
		Value      : 'm1.small'
	}],

	Tier : {
		Name    : "WebServer",
		Type    : "Standard",
		Version : ""
	},

	Resources : {
		Capabilities : [
			'CAPABILITY_IAM'
		],
		TemplateFile : 'cf_template.json'
	},

	Environments : {

		dev : {
			Description : "The development environment",

			Tags : [{
				Key   : "Environment",
				Value : "Development"
			}],
		},
	}
}

var states = {
	"validating-configuration" : {
		transitions : {
			next : "preparing-bucket",
			rollback : "rolling-back"
		}
	},
	"preparing-bucket" : {
		transitions : {
			next : "uploading-version",
			rollback : "rolling-back"
		}
	},
	"uploading-version" : {
		transitions : {
			next : "preparing-target-environment",
			rollback : "rolling-back"
		}
	},	
	"preparing-target-environment" : {
		transitions : {
			next 		 		 : "deploying-resources",
			terminateEnvironment : "terminating-environment",
			rollback : "rolling-back"
		}
	},
	"deploying-resources" : {
		transitions : {
			next : "deploying-version",
			rollback : "rolling-back"
		}
	},
	"deploying-version" : {
		transitions : {			
			next : "running-tests"
		}
	},
	"terminating-environment" : {
		transitions : {
			next : "preparing-target-environment",
			rollback : "rolling-back"
		}
	},
	"running-tests" : {
		transitions : {
			next : "swapping-cnames",
			rollback : "rolling-back"
		}
	},
	"swapping-cnames" : {
		transitions : {
			next : "completed",
			rollback : "rolling-back"
		}
	},
	"rolling-back" : {

	},
	"completed" : {
		
	}
}	

config.services = {
	AWS : AWS,
	log : l
}

AWS.config.update({
	region : config.Region
});

AWS.events = new AWS.SequentialExecutor();
AWS.events.on('send', function(resp) {
	resp.startTime = new Date().getTime();
}).on('complete', function(resp) {
	resp.endTime = new Date().getTime();

	if (resp.error) {
		l.error("Error calling %s on %s : %j", resp.request.operation, resp.request.service.endpoint.host, resp.error);
	} else {
		l.debug(resp.request.operation + " took " + ((resp.endTime - resp.startTime) / 1000) + " seconds %j", resp.request.service);
	}	
});


var stateHandlers = {};

function stateMachineTransitionHandler(e) {
	return function(fsm, state, data) {

		l.debug("State machine event: %s\t State: %s", e, state.name);

		if (!stateHandlers[state.name]) {
			stateHandlers[state.name] = require('./states/' + state.name)(config, args);
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

var statemachine = new FSM({
	initial : "validating-configuration",
	states 	: states 
})
.bind(FSM.EXIT, 	stateMachineTransitionHandler("exit"))
.bind(FSM.ENTER, 	stateMachineTransitionHandler("enter"))
.bind(FSM.CHANGE, 	stateMachineTransitionHandler("activate"))

statemachine.run({});