var l = require('../../../lib/logger.js');

var RETRY_LIMIT = 9;

function shouldRetry(error, retryLimit, retryCount) {
    return error && error.retryable === true && retryLimit > 0 && retryCount <= retryLimit;
}

function fib(n) {
    if (n <= 2) {
        return n - 1;
    }

    return fib(n - 1) + fib(n - 2);
}

function delayForRetryWithCount(retryCount) {
    return fib(retryCount + 4);
}

function retry(fsm, rollBackFromState, data) {
    var retryDelay;

    if (data.currentRetryCount) {
        data.currentRetryCount += 1;
    } else {
        data.currentRetryCount = 1;
    }

    retryDelay = delayForRetryWithCount(data.currentRetryCount);

    l.info('Encountered retryable error "%s:%s" while executing step "%s"',
        data.error.code,
        data.error.message,
        rollBackFromState.name
    );

    l.info(JSON.stringify(data.error));

    l.info('Retrying step "%s" in %s seconds', rollBackFromState.name, retryDelay);

    setTimeout(function () {
        fsm.doAction(rollBackFromState.name, data);
    }, retryDelay * 1000);
}

module.exports = function (config, services, arg) {

    var rollbackFromState = null;

    return {
        enter: function (fsm, data) {
            rollbackFromState = fsm.getCurrentState();
        },

        activate: function (fsm, data) {
            if (shouldRetry(error, RETRY_LIMIT, data.currentRetryCount)) {
                retry(fsm, rollbackFromState, data);
            } else {
                l.info("Rolling back from %s.", rollbackFromState.name);
                l.info("Reason: %", data.error);
                process.exit(1);

                // TODO: inspect value of rollbackFromState and actually perform
                // and rollback steps necessary.
            }
        }
    }
};