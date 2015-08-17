/**
 * Deploys related resources using cloudformation. A separate cloudformation
 * stack will be created for each elastic beanstalk environment. Subsequent
 * deployments will update the resource stack if it already exists. By default
 * resource stacks will be tagged with the same tags as the elastic beanstalk
 * application environment, but extra tags can be added by specifying them on
 * the Resources section of the deployment configuration
 */
var Q = require('q'),
    _ = require('lodash'),
    l = require('../../../lib/logger.js'),

    EventLogger = require('../../../lib/environment-event-logger'),
    helpers = require('../../../lib/helpers'),
    fmt = require('string-template'),
    fs = require('fs');

module.exports = function (config, services, args) {

    var cf = new services.AWS.CloudFormation();

    /**
     * Determines the name of the resource stack that will be created for a
     * given combination of application and environment
     *
     * @param {string} application
     * @param {string} environment
     * @return {string}
     */
    function calculateStackName(applicationName, environmentName) {
        // TODO: allow setting this in config
        return helpers.normalizeApplicationName(applicationName) + "-" + environmentName + "-resources";
    }

    /**
     * Gets a cloud formation stack by name. Only retrieves stacks that are
     * in either the CREATE_COMPLETE or UPDATE_COMPLETE state
     *
     * @param {string} name
     * @return {promise}
     */
    function getStack(name) {
        return Q.ninvoke(cf, "listStacks", {
            StackStatusFilter: [
                "CREATE_COMPLETE",
                "UPDATE_COMPLETE"
            ]
        }).then(function (result) {
            return _.find(result.StackSummaries, {StackName: name});
        });
    }

    /**
     * Set up params for a call to the cloudformation API UpdateStack method
     *
     * @param {string} stackName
     * @param {string} applicationName
     * @param {string} environmentName
     * @param {object} envrionment
     * @param {object} resource
     * @return {object}
     */
    function prepareUpdateStackParams(stackName, applicationName, environmentName, environment, resources) {
        var params = {
            StackName: stackName,
            Capabilities: [],
            Parameters: [],
            NotificationARNs: []
        };

        _.each(resources.Capabilities || [], function (c) {
            params.Capabilities.push(c);
        });
        _.each(resources.NotificationARNs || [], function (c) {
            params.NotificationARNs.push(c);
        });
        _.each(resources.Parameters || [], function (p) {
            params.Parameters.push({
                ParameterKey: p.ParameterKey,
                ParameterValue: fmt(p.ParameterValue, {
                    application: helpers.normalizeApplicationName(applicationName),
                    environment: environmentName
                }),
                UsePreviousValue: p.UsePreviousValue == undefined ? false : p.UsePreviousValue
            })
        });

        if (resources.TemplateFile) {
            params.TemplateBody = fs.readFileSync(resources.TemplateFile, 'utf8');
        }

        return params;
    }

    /**
     * Set up params for a call to the cloudformation API CreateStack method
     *
     * @param {string} stackName
     * @param {string} applicationName
     * @param {string} environmentName
     * @param {object} envrionment
     * @param {object} resource
     * @return {object}
     */
    function prepareCreateStackParams(stackName, applicationName, environmentName, environment, resources) {
        var params = prepareUpdateStackParams(stackName, applicationName, environmentName, environment, resources);
        params.DisableRollback = resources.DisableRollback == undefined ? false : resources.DisableRollback;
        params.Tags = [];

        _.each(environment.Tags || [], function (t) {
            params.Tags.push({
                Key: t.Key,
                Value: t.Value
            });
        });
        _.each(resources.Tags || [], function (t) {
            params.Tags.push({
                Key: t.Key,
                Value: t.Value
            });
        });

        return params;
    }

    /**
     * Waits for a particular stack to reach a particular status. Returns a
     * promise that will resolve once the stack is in the desired state.
     *
     * @param {string} stackName
     * @param {string} status
     * @return {promise}
     *
     * TODO: add stack event logging
     */
    function waitForStack(stackName, status) {

        l.info("Waiting for stack %s to reach status %s.", stackName, status);

        var deferred = Q.defer();
        //  eventLogger = new EventLogger(eb, applicationName, environmentName, l.info);

        function checkStatus(stackName, status, deferred) {
            cf.describeStacks({
                StackName: stackName
            }, function (err, data) {
                if (err) {
                    //  eventLogger.stop();
                    deferred.reject(err);
                } else {
                    var stack = _.find(data.Stacks, {StackName: stackName});

                    l.debug(stack);

                    if (!stack) {
                        //      eventLogger.stop();
                        deferred.reject({
                            message: "could not locate stack"
                        });
                    } else if (stack.StackStatus == status) {
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

    /**
     * Creates a cloud formation stack
     *
     * @param {string} stackName
     * @param {object} params
     * @return {promise}
     */
    function createStack(stackName, params) {
        l.info("Creating a new Cloud Formation resource stack '%s'.", stackName);

        return Q.ninvoke(cf, "createStack", params)
            .then(function (result) {
                return waitForStack(stackName, 'CREATE_COMPLETE');
            });
    }

    /**
     * Updates a cloud formation stack
     *
     * @param {string} stackName
     * @param {object} params
     * @return {promise}
     */
    function updateStack(stackName, params) {
        l.info("Updating existing Cloud Formation resource stack '%s'.", stackName);

        return Q.ninvoke(cf, "updateStack", params)
            .then(function (result) {
                return waitForStack(stackName, 'UPDATE_COMPLETE');
            })
            .fail(function (err) {
                if (err.message.indexOf("No updates") > -1) {
                    l.info("No updates to perform");
                    return getStack(stackName);
                } else {
                    throw err;
                }
            });
    }

    function mapStackOutputs(stackName, environment, template) {

        return Q.ninvoke(cf, "describeStacks", {
            StackName: stackName
        }).then(function (result) {
            var stack = _.find(result.Stacks, {StackName: stackName});

            if (stack && template.Outputs) {
                console.log("Mapping from ", stack, " to ", environment);

                _.each(template.Outputs, function (v, k) {
                    var output = _.find(stack.Outputs, {OutputKey: k});

                    if (output) {
                        environment.OptionSettings.push({
                            Namespace: v.Namespace,
                            OptionName: v.OptionName,
                            Value: output.OutputValue
                        });
                    }
                });
            }
        });
    }

    return {
        activate: function (fsm, data) {
            if (config.Resources) {

                var stackName = calculateStackName(config.ApplicationName, data.targetEnvironment.name),
                    resources = config.Resources,
                    applicationName = config.ApplicationName,
                    environmentName = args.environment,
                    environment = config.Environments[args.environment];

                getStack(stackName)
                    .then(function (stack) {
                        var fn = stack ? updateStack : createStack,
                            fp = stack ? prepareUpdateStackParams : prepareCreateStackParams;
                        p = fp(stackName, applicationName, environmentName, environment, resources);

                        return fn(stackName, p);
                    })
                    .then(function (result) {
                        return mapStackOutputs(result.StackName, environment, resources);
                    })
                    .then(helpers.genericContinue(fsm, data))
                    .fail(helpers.genericRollback(fsm, data));
            } else {
                l.info("No resource stack specified. Continuing.");
                fsm.doAction("next", data);
            }
        }
    }
};
