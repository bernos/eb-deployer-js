module.exports = function(config, args) {
	return {
		activate : function(fsm, data) {
			process.exit(0);
		}
	}
}