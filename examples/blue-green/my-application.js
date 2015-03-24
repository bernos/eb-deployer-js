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
		TemplateFile : 'cf_template.json',
		Outputs : {
			InstanceProfile : {
				Namespace : 'aws:autoscaling:launchconfiguration',
				OptionName : 'IamInstanceProfile'
			}
		},
		Capabilities : [
			'CAPABILITY_IAM'
		]
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