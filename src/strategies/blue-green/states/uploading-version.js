var Q = require('q'),
    _ = require('lodash'),
    fs = require('fs'),
	l = require('../../../lib/logger.js'),
    path = require('path'),
    helpers = require('../../../lib/helpers');

module.exports = function(config, services, args) {

    var s3      = new services.AWS.S3(),
        eb      = new services.AWS.ElasticBeanstalk(),
        region  = config.Region;

    function upload(bucket, key, stream) {
        var deferred = Q.defer();

        s3.upload({
            Bucket  : bucket,
            Key     : key,
            Body    : stream
        })
        .on('httpUploadProgress', function(e) {
            l.info("Uploading Part %d - %d of %d.", e.part, e.loaded, e.total);
        })
        .send(function(err, data) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(data);
            }
        });

        return deferred.promise;
    }

    function createVersion(applicationName, versionLabel, bucket, key) {
        l.info("Creating application version %s.", versionLabel);

        return Q.ninvoke(eb, "createApplicationVersion", {
            ApplicationName : applicationName,
            VersionLabel    : versionLabel, 
            AutoCreateApplication : true,
            SourceBundle : {
                S3Bucket : bucket,
                S3Key    : key
            }
        }).then(function(result) {
            l.success("Created application version %s.", versionLabel)
            return result;
        });
    }

    return {
        activate : function(fsm, data) {

            data.versionLabel = helpers.calculateVersionLabel(config, args);
            
            //add a trailing slash to bucketKeyPrefix if not present
            var bucketKeyPrefix = (config.BucketKeyPrefix || "");
            bucketKeyPrefix = (bucketKeyPrefix != "") ? bucketKeyPrefix.replace(/\/?$/, '/') : bucketKeyPrefix;

            data.sourceBundleKey = bucketKeyPrefix + data.versionLabel + ".zip";

            upload(data.bucket, data.sourceBundleKey, fs.createReadStream(path.join(process.cwd(), args.package)))
                .then(function(result) {
                    
                    l.success("Uploaded %s to %s.", args.package, result.Location);

                    data.sourceBundleUrl = result.Location; 

                    return createVersion(config.ApplicationName, data.versionLabel, data.bucket, data.sourceBundleKey); 
                })
                .then(function(result) {
                    fsm.doAction("next", data);
                })
                .fail(helpers.genericRollback(fsm, data));
        }
    }
}
