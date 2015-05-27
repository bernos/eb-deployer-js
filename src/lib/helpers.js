var l = require('./logger.js');

module.exports.genericRollback = function(fsm, data) {
    return function(err) {
        //l.error("ROLLBACK FROM %j", fsm.getCurrentState());
        //data.rollbackFromState = fsm.getCurrentState();
        data.error = err;
        fsm.doAction("rollback", data);
    }
}

module.exports.genericContinue = function(fsm, data) {
	return function() {
		fsm.doAction("next", data);
	}
}    

/**
 * Creates a normalized version of the application name usable in a URL or
 * as an ID etc..
 *
 * @param {string} applicationName
 * @return {string}
 * TODO: refactor to common lib
 */
module.exports.normalizeApplicationName = function(applicationName) {
	return applicationName.replace(/\s/, '-').toLowerCase();
}


