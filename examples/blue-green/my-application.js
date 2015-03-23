module.exports = {
	ApplicationName	  : "My Application",
	SolutionStackName : "64bit Amazon Linux 2014.09 v1.2.0 running Docker 1.3.3",
	Region 			  : "ap-southeast-2",

	Tags : [{
		Key   : "ApplicationName",
		Value : "My Application"
	}],

	OptionSettings : [{
		Namespace  : 'aws:autoscaling:launchconfiguration',
		OptionName : 'InstanceType',
		Value      : 'm1.small'
	}],

	Tier : {
		Name    : "WebServer",
		Type    : "Standard",
		Version : ""
	},

	Resources : {
		Capabilities : [
			'CAPABILITY_IAM'
		],
		TemplateFile : 'cf_template.json'
	},

	Environments : {

		dev : {
			Description : "The development environment",

			Tags : [{
				Key   : "Environment",
				Value : "Development"
			}],
		},
	}
}