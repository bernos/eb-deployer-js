var Q = require('q'),
    _ = require('lodash')
    randtoken = require('rand-token'),
    EventLogger = require('../../../lib/environment-event-logger'),
    helpers = require('../../../lib/helpers'),
    fmt = require('string-template')
    fs = require('fs');

module.exports = function(config, args) {

    var l  = config.services.log,
        cf = new config.services.AWS.CloudFormation();

    function normalizeApplicationName(applicationName) {
        return applicationName.replace(/\s/, '-').toLowerCase();
    }

    function calculateStackName(application, environment) {
        // TODO: allow setting this in config

        // Strip random string from the end of the environment name, otherwise
        // we will create new resource stack on every deployment, as environment
        // names are unique due to the random suffix.
        var tokens = environment.split("-");
        tokens.pop();

        return normalizeApplicationName(application) + "-" + tokens.join("-") + "-resources";
    }

    function getStack(name) {
        return Q.ninvoke(cf, "listStacks", {
            StackStatusFilter : [
                "CREATE_COMPLETE",
                "UPDATE_COMPLETE"
            ]
        }).then(function(result) {
            return _.find(result.StackSummaries, { StackName : name });
        });
    }

    function prepareUpdateStackParams(stackName, applicationName, environmentName, environment, resources) {
        var params = {
            StackName        : stackName,
            Capabilities     : [],
            Parameters       : [],
            NotificationARNs : []
        };

        _.each(resources.Capabilities || [], function(c) { params.Capabilities.push(c); });
        _.each(resources.NotificationARNs || [], function(c) { params.NotificationARNs.push(c); });
        _.each(resources.Parameters || [], function(p) {
            params.Parameters.push({
                ParameterKey   : p.ParameterKey,
                ParameterValue : fmt(p.ParameterValue, {
                    application : normalizeApplicationName(applicationName),
                    environment : environmentName
                }),
                UsePreviousValue : p.UsePreviousValue == undefined ? false : p.UsePreviousValue
            })
        });

        if (resources.TemplateFile) {
            params.TemplateBody = fs.readFileSync(resources.TemplateFile, 'utf8');
        }   

        return params;
    }

    function prepareCreateStackParams(stackName, applicationName, environmentName, environment, resources) {
        var params = prepareUpdateStackParams(stackName, applicationName, environmentName, environment, resources);
            params.DisableRollback = resources.DisableRollback == undefined ? false : resources.DisableRollback;
            params.Tags = []

        _.each(environment.Tags || [], function(t) { 
            params.Tags.push({
                Key   : t.Key,
                Value : t.Value
            }); 
        });
        _.each(resources.Tags || [], function(t) { 
            params.Tags.push({
                Key   : t.Key,
                Value : t.Value
            }); 
        });

        return params;
    }



    function waitForStack(stackName, status) {

        l.info("Waiting for stack %s to reach status %s.", stackName, status);

        var deferred = Q.defer();
        //  eventLogger = new EventLogger(eb, applicationName, environmentName, l.info);

        function checkStatus(stackName, status, deferred) {
            cf.describeStacks ({
                StackName : stackName
            }, function(err, data) {
                if (err) {
                //  eventLogger.stop();
                    deferred.reject(err);
                } else {
                    var stack = _.find(data.Stacks , { StackName  : stackName });

                    l.debug(stack);

                    if (!stack) {
                //      eventLogger.stop();
                        deferred.reject({
                            message : "could not locate stack"
                        });
                    } else if (stack.StackStatus  == status) {
                //      eventLogger.stop();
                        deferred.resolve(stack);
                    } else {
                        _.delay(checkStatus, 1000, stackName, status, deferred);
                    }
                }
            })
        }

        //eventLogger.start();
        checkStatus(stackName, status, deferred);

        return deferred.promise;
    }

    function createStack(stackName, params) {
        l.info("Creating a new Cloud Formation resource stack '%s'.", stackName)

        return Q.ninvoke(cf, "createStack", params)
            .then(function(result) {
                return waitForStack(stackName, 'CREATE_COMPLETE');
            });     
    }

    function updateStack(stack, params) {
        l.info("Updating existing Cloud Formation resource stack '%s'.", stack.StackName)

        
        return Q.ninvoke(cf, "updateStack", params)
            .then(function(result) {
                return waitForStack(stack.StackName, 'UPDATE_COMPLETE');
            })
            .fail(function(err) {
                if (err.message.indexOf("No updates") > -1) {
                    l.info("No updates to perform");
                    return stack;
                } else {
                    throw err;
                }
                
            });
    }

    return {
        activate : function(fsm, data) {
            if (config.Resources) {
                
                var stackName = calculateStackName(config.ApplicationName, data.targetEnvironment.name);

                getStack(stackName)
                    .then(function(stack) {
                        if (stack) {
                            return updateStack(stack, prepareUpdateStackParams(stackName, config.ApplicationName, args.environment, config.Environments[args.environment], config.Resources));
                        } else {
                            return createStack(stackName, prepareCreateStackParams(stackName, config.ApplicationName, args.environment, config.Environments[args.environment], config.Resources));
                        }
                    })
                    .then(function(result) {
                        fsm.doAction("next", data);
                    })
                    .fail(helpers.genericRollback(fsm, data));
            } else {
                l.info("No resource stack specified. Continuing.")
                fsm.doAction("next", data);
            }
        }
    }
}