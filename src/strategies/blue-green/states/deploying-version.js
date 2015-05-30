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

    function waitForEnvironment(applicationName, environmentName) {

        l.info("Waiting for environment %s to be ready.", environmentName);

        var deferred = Q.defer();
            eventLogger = new EventLogger(eb, applicationName, environmentName, l.info);

        function checkStatus(applicationName, environmentName, deferred) {
            eb.describeEnvironments({
                ApplicationName : applicationName,
                EnvironmentNames : [environmentName]
            }, function(err, data) {
                if (err) {
                    eventLogger.stop();
                    deferred.reject(err);
                } else {
                    var env = _.find(data.Environments, { EnvironmentName : environmentName });

                    l.debug(env);

                    if (!env) {
                        eventLogger.stop();
                        deferred.reject({
                            message : "could not locate environment"
                        });
                    } else if (env.Status == 'Ready' && env.Health == 'Green') {
                        eventLogger.stop();
                        deferred.resolve(env);
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
                return waitForEnvironment(config.ApplicationName, result.EnvironmentName);
            }).then(function(result) {
                l.success("Created environment %s with version %s.", config.ApplicationName, data.versionLabel);
                fsm.doAction("next", data);             
            }).fail(helpers.genericRollback(fsm, data));
        }
    }
}
