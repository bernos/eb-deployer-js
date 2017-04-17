var _ = require('lodash'),
    Q = require('q');

module.exports = function (eb, applicationName, environmentName, logFunction) {

    var _stopped = true,
        _since = new Date();

    function tick() {

        Q.ninvoke(eb, "describeEvents", {
            ApplicationName: applicationName,
            EnvironmentName: environmentName,
            Severity: 'TRACE',
            StartTime: _since
        })
            .then(function (result) {

                if (!_stopped) {
                    result.Events.reverse();

                    _.each(result.Events, function (e) {
                        logFunction(e.Message);
                        _since = new Date(e.EventDate.getTime() + 1000);
                    });

                    _.delay(tick, 10000);
                }
            });
    }

    this.start = function () {
        _stopped = false;
        tick();
    };

    this.stop = function () {
        _stopped = true;
    }
};