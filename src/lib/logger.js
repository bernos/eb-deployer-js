var colors = require('colors');

module.exports = (function() {

	var br = "--------------------------------------------------------------------------------";

	function head(l) {
		return Array.prototype.slice.apply(l)[0];
	}

	function tail(l) {
		return Array.prototype.slice.apply(l, [1]);
	}

	function logger(color) {
		return function() {
			console.log.apply(console, [color(head(arguments))].concat(tail(arguments)));
		};
	}

	function banner(color) {
		return function() {
			console.log.apply(console, [color(br + "\n" + head(arguments) + "\n" + br)].concat(tail(arguments)));
		};
	}

	return {
		info  	: logger(colors.white),
		error 	: logger(colors.red),
		debug 	: logger(colors.grey),
		success : logger(colors.green),
		trace   : logger(colors.yellow),
		banner  : banner(colors.cyan),
		warn    : logger(colors.yellow)
	};
})();
