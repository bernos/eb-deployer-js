var Q = require('q'),
    _ = require('lodash'),
    l = require('../../../lib/logger.js'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, args) {

    var s3      = new config.services.AWS.S3();

    function createBucketIfNotExists(bucket, region) {
        return listBuckets().then(function(result) {
            if (_.any(result.Buckets, { Name : bucket })) {
                l.info("Bucket %s already exists.", bucket);
                return waitForBucket(bucket);
            } 

            return createBucket(bucket, region);            
        });
    }

    function listBuckets() {
        return Q.ninvoke(s3, "listBuckets", {});
    }

    function createBucket(bucket, region) {
        
        l.info("Creating bucket %s in region %s.", bucket, region);

        return Q.ninvoke(s3, "createBucket", {
            Bucket : bucket,
            ACL    : 'private',
            CreateBucketConfiguration : {
                LocationConstraint : region
            }
        })
        .then(function(result) {
            l.success("Created bucket %s in region %s.", bucket, region);
            return waitForBucket(bucket);
        });
    }
    
    function waitForBucket(bucket) {
        
        l.info("Waiting for bucket %s to be ready.", bucket);

        return Q.ninvoke(s3, "waitFor", "bucketExists", {
            Bucket : bucket
        })
        .then(function(result) {
            l.info("Bucket %s is ready.", bucket);
            return result;
        });     
    }

    return {
        activate : function(fsm, data) {
            data.bucket = calculateBucketName(config);
            
			createBucketIfNotExists(data.bucket, config.Region)
                .then(helpers.genericContinue(fsm, data))
                .fail(helpers.genericRollback(fsm, data));
        }
    }
}

function calculateBucketName(config) {
	return config.Bucket ? 
		   config.Bucket : 
		   config.ApplicationName.replace(/\s/g, '-').toLowerCase() + "-packages";
}


