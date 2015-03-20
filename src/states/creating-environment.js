module.exports = function(config, args) {
	return function(fsm, currentstate, data) {
		fsm.doAction("next", data);
	}
}