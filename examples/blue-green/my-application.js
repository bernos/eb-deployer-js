module.exports = {
  
  // Name of the Elastic Beanstalk application. Will be created if it does
  // not already exist
  ApplicationName   : "My Application",
    
  // Elastic Beanstalk solution stack to use
  SolutionStackName : "64bit Amazon Linux 2014.09 v1.2.0 running Docker 1.3.3",
    
  // Region to launch the Elastic Beanstalk application in
  Region : "ap-southeast-2",

  Bucket : "bernos-app-test-bucket",

  // Common tags that will be applied to all resources across all of your environments
  // Environment specific tags can be specified later in this config
  Tags : [{
    Key   : "ApplicationName",
    Value : "My Application"
  }],

  // Common Elastic Beanstalk option settings that will be applied to all environments
  // Environment specific option settings can be specified later in this config.
  // See http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options.html
  // for a list of all supported option settings
  OptionSettings : [{
    Namespace  : 'aws:autoscaling:launchconfiguration',
    OptionName : 'InstanceType',
    Value      : 't1.micro'
  }],

  // Elastic Beanstalk application tier. Currently 'WebServer' and 'Worker' are supported
  // See http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/using-features-managing-env-tiers.html
  // for dox about Elastic Beanstalk tiers
  Tier : {
    Name    : "WebServer",
    Type    : "Standard",
    Version : ""
  },

  // Optionally specify a Cloud Formation template to deploy related resources along with your
  // Elastic Beanstalk app. This template will be used to create a separate Cloud Formation stack
  // for each Elastic Beanstalk environment. Common and environment specific tags will also be
  // applied to your Cloud Formation resource stack, and stack outputs can be mapped to 
  // Elastic Beanstalk option settings. In the example below our resource template creates an
  // IAM Instance Profile which is mapped to the IAMInstanceProfile option of the EC2 instances
  // in our Elastic Beanstalk app
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

  // A map describing environment specific configuration overrides. Any Tags or OptionSettings
  // defined here will be added to the common settings above when deploying/updating the 
  // Elastic Beanstalk environment
  Environments : {

    dev : {
      Description : "The development environment",

      Tags : [{
        Key   : "Environment",
        Value : "Development"
      }]
    },
    
    prod : {
      OptionSettings : [{
        Namespace  : 'aws:autoscaling:launchconfiguration',
        OptionName : 'InstanceType',
        Value      : 'm1.small'
      }]
    }
  }
}