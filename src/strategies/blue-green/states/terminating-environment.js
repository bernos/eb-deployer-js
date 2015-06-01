var Q = require('q'),
    _ = require('lodash'),
    EventLogger = require('../../../lib/environment-event-logger'),
	l = require('../../../lib/logger.js'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, services, args) {

    var eb = new services.AWS.ElasticBeanstalk();        

    function terminateEnvironment(applicationName, environmentName) {
        return Q.ninvoke(eb, "terminateEnvironment", {
            EnvironmentName    : environmentName,
            TerminateResources : true
        }).then(function(result) {
            return helpers.waitForEnvironment(eb, applicationName, environmentName, function(env) {
				return env.Status == 'Terminated';
			});
        });
    }
    
    return {
        activate : function(fsm, data) {
            terminateEnvironment(config.ApplicationName, data.targetEnvironment.name)
                .then(function(env) {
                    l.success("Environment %s terminated.", data.targetEnvironment.name);
                    fsm.doAction("next", data);
                })
                .fail(helpers.genericRollback(fsm, data));
            
        }
    }
}
