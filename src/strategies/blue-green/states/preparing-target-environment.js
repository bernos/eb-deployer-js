var Q = require('q'),
    _ = require('lodash')
    l = require('../../../lib/logger.js'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, services, args) {

    var eb      = new services.AWS.ElasticBeanstalk(),
        region  = config.Region;

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
                    l.info("Preparing environment to deploy version %s.", data.versionLabel);

                    var activeCname         = helpers.calculateCnamePrefix(config.ApplicationName, args.environment, true),
                        inactiveCname       = helpers.calculateCnamePrefix(config.ApplicationName, args.environment, false),
                        activeEnvironment   = _.find(result.Environments, { CNAME : activeCname + '.elasticbeanstalk.com' }),
                        inactiveEnvironment = _.find(result.Environments, { CNAME : inactiveCname + '.elasticbeanstalk.com'}),
                        action              = "next";


                    if (activeEnvironment && inactiveEnvironment) {

                        l.info("Both active and inactive environments were found. Terminating inactive environment before deployment");

                        data.targetEnvironment = {
                            name     : inactiveEnvironment.EnvironmentName,
                            cname    : inactiveCname,
                            isActive : false
                        };

                        action = "terminateEnvironment";                    

                    } else if (!activeEnvironment && !inactiveEnvironment) {

                        l.info("No known environments found. Using active environment 'A'");

                        data.targetEnvironment = {
                            name     : helpers.calculateEnvironmentName(args.environment, 'a'),
                            cname    : activeCname,
                            isActive : true
                        }

                    } else if (activeEnvironment && !inactiveEnvironment) {

                        var activeSuffix    = helpers.getSuffixFromEnvironmentName(activeEnvironment.EnvironmentName),
                            inactiveSuffix  = activeSuffix == 'a' ? 'b' : 'a';

                        l.info("Active envrionment '%s' found. Deploying to inactive environment '%s'.", activeSuffix, inactiveSuffix);

                        // If data.targetEnvironment already exists, then it means we have just come
                        // from terminating an existing inactive environment. In this case will will
                        // use the same as the environment that was just terminated, otherwise create
                        // a new, unique environment name
                        var name = data.targetEnvironment ? data.targetEnvironment.name : helpers.calculateEnvironmentName(args.environment, inactiveSuffix);

                        data.targetEnvironment = {
                            name     : name,
                            cname    : inactiveCname,
                            isActive : false
                        }
                        
                    } else {
                        throw "Current envrionment state is unregonised. Please ensure that either no environments or one active envrionment exist."
                    }

                    data.targetEnvironment.url = [
                        "http://",
                        data.targetEnvironment.cname,
                        ".elasticbeanstalk.com"].join("");

                    fsm.doAction(action, data);
                })
                .fail(helpers.genericRollback(fsm, data));      
        }
    }
}
