module.exports = function(config, args) {
	return function(fsm, currentstate, data) {
		// TODO: Implement this state
		fsm.doAction("next", {
			bucket : config.name.replace(/\s/, '-').toLowerCase() + "-packages"
		});
	}
}