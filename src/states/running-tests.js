var request = require('request');

module.exports = function(config, args) {

	var l  = config.services.log;

	return function(fsm, data) {

		var test = config.test || function(url, callback) {
			request(url, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					callback();
				} else {
					callback(true);
				}
			});
		};

		test(data.targetEnvironment.url, function(err) {
			if (err) {
				l.error("Smoke test failed.")
				// TODO: ROLLBACK
			} else {
				l.success("Smoke test passed.")
				fsm.doAction("next", data);
			}
		}); 
	}
}