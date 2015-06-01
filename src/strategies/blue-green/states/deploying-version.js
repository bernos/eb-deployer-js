var Q = require('q'),
    _ = require('lodash')
    randtoken = require('rand-token'),
    l = require('../../../lib/logger.js'),
    EventLogger = require('../../../lib/environment-event-logger'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, services, args) {

    var eb = new services.AWS.ElasticBeanstalk();

    function createEnvironment(params) {
        return Q.ninvoke(eb, "createEnvironment", params);
    }

    return {
        activate : function(fsm, data) {

            l.info("Deploying version %s to environment %s at %s.elasticbeanstalk.com.", data.versionLabel, data.targetEnvironment.name, data.targetEnvironment.cname);

            createEnvironment({
                ApplicationName     : config.ApplicationName,
                EnvironmentName     : data.targetEnvironment.name,
                CNAMEPrefix         : data.targetEnvironment.cname,
                SolutionStackName   : config.SolutionStackName,
                VersionLabel        : data.versionLabel,
                Tags                : config.Environments[args.environment].Tags,
                OptionSettings      : config.Environments[args.environment].OptionSettings
            }).then(function(result) {
                return helpers.waitForEnvironment(eb, config.ApplicationName, result.EnvironmentName, function(env) {
					return env.Status == 'Ready' && env.Health == 'Green';
				});
            }).then(function(result) {
                l.success("Created environment %s with version %s.", config.ApplicationName, data.versionLabel);
                fsm.doAction("next", data);             
            }).fail(helpers.genericRollback(fsm, data));
        }
    }
}
