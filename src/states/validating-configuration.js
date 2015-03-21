// TODO: Rename this state to initializing
var _ = require('lodash'),
	util = require('util'),
	helpers = require('../lib/helpers');

module.exports = function(config, args) {
	
	function cloneMap(map) {
		var clone = {};

		for (var n in map) {
			clone[n] = map[n];
		}

		return clone;
	}

	function mergeEnvironmentConfigurations(config) {

		if (config.Environments) {
			_.each(config.Environments, function(environment) {
				var tags = _.map(config.Tags || [], function(t) {
					return cloneMap(t);
				});

				var optionSettings = _.map(config.OptionSettings || [], function(t) {
					return cloneMap(t)
				});

				_.each(environment.Tags || [], function(t) {
					tags.push(cloneMap(t));
				});

				_.each(environment.OptionSettings || [], function(t) {
					optionSettings.push(cloneMap(t));
				});

				environment.Tags = tags;
				environment.OptionSettings = optionSettings;
			});
		}
	}

	return {
		activate : function(fsm, data) {
			mergeEnvironmentConfigurations(config);

			fsm.doAction("next", {
				bucket : config.ApplicationName.replace(/\s/, '-').toLowerCase() + "-packages"
			});
		}
	}
}