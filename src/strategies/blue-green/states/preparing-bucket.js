var Q = require('q'),
    _ = require('lodash'),
    l = require('../../../lib/logger.js'),
    helpers = require('../../../lib/helpers');

module.exports = function (config, services, args) {
    var s3 = new services.AWS.S3();

    return {
        activate: function (fsm, data) {
            data.bucket = helpers.calculateBucketName(config);

            createBucketIfNotExists(s3, data.bucket, config.Region)
                .then(helpers.genericContinue(fsm, data))
                .fail(helpers.genericRollback(fsm, data));
        }
    }
};

function createBucketIfNotExists(s3, bucket, region) {
    return listBuckets(s3)
        .then(function (result) {
            if (_.any(result.Buckets, {Name: bucket})) {
                l.info("Bucket %s already exists.", bucket);
                return waitForBucket(s3, bucket);
            }
            return createBucket(s3, bucket, region);
        });
}

function listBuckets(s3) {
    return Q.ninvoke(s3, "listBuckets", {});
}

function createBucket(s3, bucket, region) {
    l.info("Creating bucket %s in region %s.", bucket, region);

    return Q.ninvoke(s3, "createBucket", {
        Bucket: bucket,
        ACL: 'private',
        CreateBucketConfiguration: {
            LocationConstraint: region
        }
    }).then(function (result) {
        l.success("Created bucket %s in region %s.", bucket, region);
        return waitForBucket(s3, bucket);
    });
}

function waitForBucket(s3, bucket) {
    l.info("Waiting for bucket %s to be ready.", bucket);

    return Q.ninvoke(s3, "waitFor", "bucketExists", {
        Bucket: bucket
    }).then(function (result) {
        l.info("Bucket %s is ready.", bucket);
        return result;
    });
}

