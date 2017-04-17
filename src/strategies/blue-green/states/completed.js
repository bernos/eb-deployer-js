module.exports = function (config, services, args) {
    return {
        activate: function (fsm, data) {
            process.exit(0);
        }
    }
};
