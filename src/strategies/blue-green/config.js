module.exports = {
	initial : "validating-configuration",

	states : {

		"validating-configuration" : {
			transitions : {
				next : "preparing-bucket",
				rollback : "rolling-back"
			}
		},
		"preparing-bucket" : {
			transitions : {
				next : "uploading-version",
				rollback : "rolling-back"
			}
		},
		"uploading-version" : {
			transitions : {
				next : "preparing-target-environment",
				rollback : "rolling-back"
			}
		},	
		"preparing-target-environment" : {
			transitions : {
				next 		 		 : "deploying-resources",
				terminateEnvironment : "terminating-environment",
				rollback : "rolling-back"
			}
		},
		"deploying-resources" : {
			transitions : {
				next : "deploying-version",
				rollback : "rolling-back"
			}
		},
		"deploying-version" : {
			transitions : {			
				next : "running-tests"
			}
		},
		"terminating-environment" : {
			transitions : {
				next : "preparing-target-environment",
				rollback : "rolling-back"
			}
		},
		"running-tests" : {
			transitions : {
				next : "swapping-cnames",
				rollback : "rolling-back"
			}
		},
		"swapping-cnames" : {
			transitions : {
				next : "completed",
				rollback : "rolling-back"
			}
		},
		"rolling-back" : {

		},
		"completed" : {
			
		}
	}
}