var Q = require('q'),
	_ = require('lodash');

module.exports = function(config, args) {

	var l  	= config.services.log,
		eb  = new config.services.AWS.ElasticBeanstalk();

	function calculateCnamePrefix(applicationName, environmentName, isActive) {
		return [applicationName.replace(/\s/, '-').toLowerCase(), "-", environmentName, isActive ? "" : "-inactive"].join("");
	}

	function getEnvironments(applicationName) {
		return Q.ninvoke(eb, "describeEnvironments", {
			ApplicationName : applicationName,
			IncludeDeleted : false
		});
	}

	return function(fsm, currentstate, data) {

		getEnvironments(config.name)
			.then(function(result) {

				var activeCname 		= calculateCnamePrefix(config.name, args.environment, true),
					inactiveCname 		= calculateCnamePrefix(config.name, args.environment, false),
				 	activeEnvironment 	= _.find(result.Environments, { CNAME : activeCname + '.elasticbeanstalk.com' }),
				 	inactiveEnvironment = _.find(result.Environments, { CNAME : inactiveCname + '.elasticbeanstalk.com'});
				
				if (activeEnvironment && inactiveEnvironment) {
					return Q.ninvoke(eb, "swapEnvironmentCNAMEs", {
						SourceEnvironmentId 	 : activeEnvironment.EnvironmentId,
						DestinationEnvironmentId : inactiveEnvironment.EnvironmentId
					});
				} 
				
				throw "Could not swap cnames. Could not locate both active and inactive environments.";
			})
			.then(function() {
				l.succes("Successfully swapped CNAMEs.")
				fsm.doAction("next", data);
			})
			.fail(function(err) {
				// TODO: ROLLBACK
			});		
	}
}