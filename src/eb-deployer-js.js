#!/usr/bin/env node

var path = require('path'),
	deployer = require('./lib/deployer');

/**
 * Read args from the command line. Thes will be passed on as deployment 
 * options to the deployment steps.
 */
var args = require('nomnom')
    .option('environment', {
        abbr: 'e',
        required: true,
        help: 'Envrionment to deploy to'
    })
    .option('package', {
        abbr: 'p',
        required: true,
        help: 'Package to deploy'
    })
    .option('strategy', {
        abbr: 's',
        default: 'blue-green',
        help: 'Deployment strategy to use'
    })
    .option('config', {
        abbr: 'c',
        required: true,
        help: 'Configuration file'
    })
    .option('versionLabel', {
        abbr: 'v',
        full: 'version-label',
        required: false,
        help: 'Application version label'
    })
    .parse();

var config = require(path.join(process.cwd(), args.config));

deployer.deploy(config, args);
