
module.exports = function(config, arg) {

	var l = config.services.log,
		rollbackFromState = null;

	return {
		enter : function(fsm, data) {
			rollbackFromState = fsm.getCurrentState();
		},

		activate : function(fsm, data) {
			l.info("Rolling back from %s.", rollbackFromState.name);
			l.info("Reason: %", data.error)
		}
	}
}