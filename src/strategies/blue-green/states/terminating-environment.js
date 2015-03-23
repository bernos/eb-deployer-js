var Q = require('q'),
	_ = require('lodash'),
	EventLogger = require('../../../lib/environment-event-logger'),
	helpers = require('../../../lib/helpers');

module.exports = function(config, args) {

	var l  = config.services.log,
		eb = new config.services.AWS.ElasticBeanstalk();		

	function terminateEnvironment(applicationName, environmentName) {
		return Q.ninvoke(eb, "terminateEnvironment", {
			EnvironmentName    : environmentName,
			TerminateResources : true
		}).then(function(result) {
			return waitForEnvironment(applicationName, environmentName);
		});
	}

	function waitForEnvironment(applicationName, environmentName) {
		l.info("Waiting for environment %s to finish terminating.", environmentName);

		var deferred 	= Q.defer(),
			eventLogger = new EventLogger(eb, applicationName, environmentName, l.info);

		function checkStatus(applicationName, environmentName, deferred) {
			eb.describeEnvironments({
				ApplicationName : applicationName,
				IncludeDeleted : false,
				EnvironmentNames : [environmentName]
			}, function(err, data) {
				if (err) {
					eventLogger.stop();
					deferred.reject(err);
				} else {
					var env = _.find(data.Environments, { EnvironmentName : environmentName });

					if (!env) {
						eventLogger.stop();
						deferred.resolve();
					} else {
						_.delay(checkStatus, 1000, applicationName, environmentName, deferred);
					}
				}
			})
		}

		eventLogger.start();
		checkStatus(applicationName, environmentName, deferred);

		return deferred.promise;
	}
	
	return {
		activate : function(fsm, data) {
			terminateEnvironment(config.ApplicationName, data.targetEnvironment.name)
				.then(function() {
					l.success("Environment %s terminated.", data.targetEnvironment.name);
					fsm.doAction("next", data);
				})
				.fail(helpers.genericRollback(fsm, data));
			
		}
	}
}