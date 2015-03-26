var Q = require('q'),
    _ = require('lodash')
    randtoken = require('rand-token'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, args) {

    var l       = config.services.log,
        eb      = new config.services.AWS.ElasticBeanstalk(),
        region  = config.Region;


    function calculateEnvironmentName(name, suffix) {
        return [name, suffix, randtoken.generate(8)].join('-');
    }

    function calculateCnamePrefix(applicationName, environmentName, isActive) {
        return [applicationName.replace(/\s/, '-').toLowerCase(), "-", environmentName, isActive ? "" : "-inactive"].join("");
    }

    function getSuffixFromEnvironmentName(name) {
        var tokens = name.split('-');
        return tokens[tokens.length - 2];
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
                    
                    l.info("Preparing environment to deploy version %s.", data.versionLabel);

                    var activeCname         = calculateCnamePrefix(config.ApplicationName, args.environment, true),
                        inactiveCname       = calculateCnamePrefix(config.ApplicationName, args.environment, false),
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
                            name     : calculateEnvironmentName(args.environment, 'a'),
                            cname    : activeCname,
                            isActive : true
                        }

                    } else if (activeEnvironment && !inactiveEnvironment) {

                        var activeSuffix    = getSuffixFromEnvironmentName(activeEnvironment.EnvironmentName),
                            inactiveSuffix  = activeSuffix == 'a' ? 'b' : 'a';

                        l.info("Active envrionment '%s' found. Deploying to inactive environment '%s'.", activeSuffix, inactiveSuffix);

                        // If data.targetEnvironment already exists, then it means we have just come
                        // from terminating an existing inactive environment. In this case will will
                        // use the same as the environment that was just terminated, otherwise create
                        // a new, unique environment name
                        var name = data.targetEnvironment ? data.targetEnvironment.name : calculateEnvironmentName(args.environment, inactiveSuffix);

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