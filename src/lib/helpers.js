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
