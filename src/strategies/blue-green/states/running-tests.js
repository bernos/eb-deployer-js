var request = require('request'),
    helpers = require('../../../lib/helpers')
	l = require('../../../lib/logger.js'),
    _ = require('lodash');

module.exports = function(config, args) {

    return {
        activate : function(fsm, data) {

            var test = config.test || function(url, callback) {
                l.info("requesting %s", url);

                var count = 0;

                function check(url, callback) {
                    request(url, function(error, response, body) {

                        if (!error && response.statusCode == 200) {
                            callback();
                        } else {

                            if (++count < 10) {
                                _.delay(function() {
                                    check(url, callback);
                                }, 5000)
                            } else {
                                callback(true);
                            }
                        }
                    });
                }

                check(url, callback);               
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
}
