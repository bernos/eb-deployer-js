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

// TODO: Read config from file
var config = {
	name : "My Application",
	stack : "64bit Amazon Linux 2014.09 v1.2.0 running Docker 1.3.3",
	region : "ap-southeast-2",

	environments : {
		dev : {

		}
	}
}

var states = {
	"validating-configuration" : {
		transitions : {
			next : "preparing-bucket"
		}
	},
	"preparing-bucket" : {
		transitions : {
			next : "uploading-version"
		}
	},
	"uploading-version" : {
		transitions : {
			next 		 : "deploying-version"
		}
	},
	"deploying-version" : {
		transitions : {
			terminateEnvironment : "terminating-environment",
			createEnvironment 	 : "creating-environment",
			next 				 : "running-tests"
		}
	},
	"terminating-environment" : {
		transitions : {
			next : "deploying-version"
		}
	},
	"creating-environment" : {
		transitions : {
			next : "deploying-version"
		}
	},
	"running-tests" : {
		transitions : {
			next : "swapping-cnames"
		}
	},
	"swapping-cnames" : {
		transitions : {
			next : "completed"
		}
	},
	"completed" : {
		
	}
}	

config.services = {
	AWS : AWS,
	log : l
}

AWS.config.update({
	region : config.region
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

function logStateMachineEvent(e) {
	return function(fsm, state)
	{
		l.debug("State machine event: %s\t State: %s", e, state.name);
	}
}

function logStateChange(fsm, state) {
	l.banner(state.name);
}

var statemachine = new FSM({
	initial : "validating-configuration",
	states 	: states 
})
.bind(FSM.EXIT, 	logStateMachineEvent(FSM.EXIT))
.bind(FSM.ENTER, 	logStateMachineEvent(FSM.ENTER))
.bind(FSM.CHANGE, 	logStateMachineEvent(FSM.CHANGE))
.bind(FSM.CHANGE, 	logStateChange);

_.each(states, function(state, name) {
	statemachine.bind(name + ".change", require('./states/' + name)(config, args))
});

statemachine.run();




/*
AWS.config.update({
	region : config.region
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

var ec2 = new AWS.EC2(),
	elasticBeanstalk = new AWS.ElasticBeanstalk();


ebEnsureApplicationExists(config.name)
	.then(function(result) {
		return ebEnsureTargetEnvironment(environment, config)
	})
	.fail(function(err) {
		console.log(err)
		l.error("Deployment aborted! %j", err);
	});

function ebEnsureApplicationExists(name, description) {
	l.debug("Ensuring application %s exists", name);

	return Q.ninvoke(elasticBeanstalk, "describeApplications", {
		ApplicationNames : [name]
	}).then(function(result) {
		if (result.Applications.length) {
			l.info("Application %s already exists. Skipping createApplication step.", name);
			return result.Applications[0];
		}
		
		return createApplication(name, description);
	});
}

function ebCreateApplication(name, description) {
	l.info("Creating application %s.", name)
	return Q.ninvoke(elasticBeanstalk, "createApplication", {
		ApplicationName : name,
		Description : description
	}).then(function(response) {
		l.success("Created application");
		return response;
	});
}

function ebEnsureTargetEnvironment(name, config) {
	// If there are no existing environments, then create new "active" one
	if (true) {

		var cname = generateEbCnamePrefix(config.name, name, true);

		return ebCheckDNSAvailability(cname)
			.then(function(response) {
				return ebCreateEnvironment(config.name, name, cname, "a", config.stack);
			});

		
	}

	// If there is one environment, then create new "inactive" one

	// If there are two environments, identify the "inactive" one
}


function generateEbEnvironmentName(name, suffix) {
	return [name, suffix, randtoken.generate(8)].join('-');
}

function generateEbCnamePrefix(applicationName, environmentName, isActive) {
	return [applicationName.replace(/\s/, '-').toLowerCase(), "-", environmentName, isActive ? "" : "-inactive"].join("");
}

function ebCheckDNSAvailability(cnamePrefix) {

	l.debug("Checking DNS availability")

	var deferred = Q.defer();

	elasticBeanstalk.checkDNSAvailability({
		CNAMEPrefix : cnamePrefix
	}, function(err, data) {
		if (err) {			
			deferred.reject(err);
		} else if (!data.Available) {
			deferred.reject({
				message: "CNAME " + cnamePrefix + " is not available."
			});
		} else {
			deferred.resolve(data);
		}
	});

	return deferred.promise;
}

function ebCreateEnvironment(applicationName, environmentName, cname, suffix, stack) {
	l.info("Creating environment %s", environmentName)
	
	return Q.ninvoke(elasticBeanstalk, "createEnvironment", {
		ApplicationName : applicationName,
		EnvironmentName : generateEbEnvironmentName(environmentName, suffix),
		SolutionStackName : stack,
		CNAMEPrefix : cname
	}).then(function(data) {
		l.success("Created %s environment", environmentName);		
		return ebWaitForEnvironment(applicationName, data.EnvironmentId);
	});
}



function ebWaitForEnvironment(applicationName, environmentId) {

	l.info("Waiting for environment %s to be ready.", environmentId);

	var deferred = Q.defer();

	function checkStatus(applicationName, environmentId, deferred) {
		elasticBeanstalk.describeEnvironments({
			ApplicationName : applicationName,
			EnvironmentIds : [environmentId]
		}, function(err, data) {
			if (err) {
				deferred.reject(err);
			} else {
				var env = _.find(data.Environments, { EnvironmentId : environmentId });

				l.debug(env);

				if (!env) {
					deferred.reject({
						message : "could not locate environment"
					});
				} else if (env.Status == 'Ready') {
					deferred.resolve(env);
				} else {
					_.delay(checkStatus, 1000, applicationName, environmentId, deferred);
				}
			}
		})
	}

	checkStatus(applicationName, environmentId, deferred);

	return deferred.promise;
}

// */ 