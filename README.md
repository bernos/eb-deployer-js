[![Build Status](https://travis-ci.org/bernos/eb-deployer-js.svg?branch=master)](https://travis-ci.org/bernos/eb-deployer-js)

# eb-deployer-js

Easily deploy Elastic Beanstalk applications from the command line using nodejs. eb-deployer-js currently supports the 
blue/green deployment strategy, but provides an extensibility point to define custom deployment processes and tasks.

## Usage

`node eb-deployer-js.js --environment dev --package my-app.zip --config my-app.config.js`

Check out the examples in the examples folder for more detailed usage.

## Configuration

Configuration files are simply common js modules. Different strategies will expect different configuration formats, but for the currently supported blue/green strategy you can use the following as a starting point.

```javascript
module.exports = {
  
  // Name of the Elastic Beanstalk application. Will be created if it does
  // not already exist
  ApplicationName   : "My Application",
    
  // Elastic Beanstalk solution stack to use
  SolutionStackName : "64bit Amazon Linux 2014.09 v1.2.0 running Docker 1.3.3",
    
  // Region to launch the Elastic Beanstalk application in
  Region : "ap-southeast-2",

  // Name of the bucket to upload the source bundle to. If not set, the bucket name 
  // will be based on the application name suffixed with '-packages'
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

  // A map describing environment specific configuration overrides. Any core settings, Tags or
  // OptionSettings defined here will be added to the common settings above when
  // deploying/updating the Elastic Beanstalk environment
  Environments : {

    dev : {
      Description : "The development environment",
      Bucket: 'dev-bucket'
      Tags : [{
        Key   : "Environment",
        Value : "Development"
      }]
    },
    
    prod : {
      Bucket: 'prod-bucket',
      OptionSettings : [{
        Namespace  : 'aws:autoscaling:launchconfiguration',
        OptionName : 'InstanceType',
        Value      : 'm1.small'
      }]
    }
  }
}
```
## Blue Green deployment strategy

The currently supported blue/green deployment strategy effectively creates 2 Elastic Beanstalk environments for each of the application environments specified in your config. At any given time, one of these application will be "live", the other "inactive". When deploying your application with this strategy, the process goes as follows

1. Deploy the Cloud Formation resource stack, if one is configured
2. Establish the target Elastic Beanstalk environment, using the following logic
  1. If no Elastic Beanstalk envrionments currently exist, then create one, assign it the "active" cname prefix and deploy the application there
  2. If one Elastic Beanstalk environment currently exists, assert that it currently has the "active" cname prefix, then create a new environment, assign it the "inactive" cname prefix and deploy the application there
  3. If two Elastic Beanstalk environments currently exist, assert which one is currently assigned the "inactive" cname prefix, terminate it, create a new environment with the "inactive" cname prefix and deploy the application there
3. Run smoke tests against the target environment. SmokeTest is configured using the optional SmokeTest function and expects a method signature of function (url, callback). The url parameter will be populated with the url of the new environment prior to cname switching. The callback is used to notify the deployment strategy of any errors and halt the deployment. NOTE: blue/green strategy has a built-in default smoketest should you decide not to provide one. The strategy will test the root of the application for a standard http 200 response.

    ```javascript
      SmokeTest : function (url, callback){
        console.log("SmokeTest: smoke visible at %s", url);
        // ... do something to test the new version
        if (err) {
          // things have gone wrong, call the callback with useful error information
          callback(err);
        } else {
          callback();
        }
      }
    ```
4. Assuming the smoke tests pass, execute cname swap, using Elastic Beanstalk's out of the box functionality



## Custom deployment strategies

eb-deployer-js is effectively a finite state machine. Custom deployment strategies can easily be developed by writing a custom
state machine configuration, and implementing the necessary states.

TODO: Add detailed guide to building custom deployment strategy. For now, check out src/strategies/blue-green as a guide

## Contributions
All projects love some testing so please write some and
```
npm test
```
before commiting please.
