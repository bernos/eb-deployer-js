var Q = require('q'),
    _ = require('lodash'),
	l = require('../../../lib/logger.js'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, services, args) {

    var eb  = new config.services.AWS.ElasticBeanstalk();

    function calculateCnamePrefix(applicationName, environmentName, isActive) {
        return [applicationName.replace(/\s/, '-').toLowerCase(), "-", environmentName, isActive ? "" : "-inactive"].join("");
    }

    function getEnvironments(applicationName) {
        return Q.ninvoke(eb, "describeEnvironments", {
            ApplicationName : applicationName,
            IncludeDeleted : false
        });
    }

    return {
        activate : function(fsm, data) {

            getEnvironments(config.ApplicationName)
                .then(function(result) {

                    var activeCname         = calculateCnamePrefix(config.ApplicationName, args.environment, true),
                        inactiveCname       = calculateCnamePrefix(config.ApplicationName, args.environment, false),
                        activeEnvironment   = _.find(result.Environments, { CNAME : activeCname + '.elasticbeanstalk.com' }),
                        inactiveEnvironment = _.find(result.Environments, { CNAME : inactiveCname + '.elasticbeanstalk.com'});
                    
                    if (activeEnvironment && inactiveEnvironment) {
                        return Q.ninvoke(eb, "swapEnvironmentCNAMEs", {
                            SourceEnvironmentId      : activeEnvironment.EnvironmentId,
                            DestinationEnvironmentId : inactiveEnvironment.EnvironmentId
                        });
                    } else if (activeEnvironment) {
						// If there is only an active environment, then we don't need to swap
						// cnames
						return true;
					}	
                    
                    throw "Could not swap cnames. Could not locate both active and inactive environments.";
                })
                .then(function() {
                    l.success("Successfully swapped CNAMEs.")
                    fsm.doAction("next", data);
                })
                .fail(helpers.genericRollback(fsm, data));      
        }
    }
}
