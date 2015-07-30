var _ = require('lodash');

module.exports = function(config, services, args) {
    
    function cloneMap(map) {
        var clone = {};

        for (var n in map) {
            clone[n] = map[n];
        }

        return clone;
    }

	function cloneList(list) {
		return _.map(list, function(t) {
			return cloneMap(t);
		});
	}

	function cloneAndMerge(l1, l2) {
		var c1 = cloneList(l1 || []),
			c2 = cloneList(l2 || []);

		_.each(c2, function(t) {
			c1.push(t);
		});

		return c1;
	}

    function mergeEnvironmentConfigurations(config) {
        if (config.Environments) {
            _.each(config.Environments, function(environment) {
                environment.Tags = cloneAndMerge(config.Tags, environment.Tags);
                environment.OptionSettings = cloneAndMerge(config.OptionSettings, environment.OptionSettings);
            });
        }
    }

    return {
        activate : function(fsm, data) {
            var environmentName = args.environment;
            if (config.Environments[environmentName].Bucket) {
                config.Bucket = config.Environments[environmentName].Bucket
            }
            mergeEnvironmentConfigurations(config);

            fsm.doAction("next", data);
        }
    }
}
