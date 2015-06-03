var expect = require("chai").expect,
	helpers = require("../lib/helpers");

describe("Helpers", function(){
	describe("calculateBucketName", function() {
		it("should throw if config is null", function() {
			expect(function() {
				helpers.calculateBucketName(null);
			}).to.throw(Error);
		});

		it("should throw if neither bucket nor application name are present in config", function() {
			expect(function() {
				helpers.calculateBucketName({})
			}).to.throw(Error);
		});

		it("should use bucket name from config", function() {
			expect(helpers.calculateBucketName({
				Bucket : "my-bucket"
			})).to.equal("my-bucket");
		});

		it("should use application name from config if no bucket name provided", function() {
			expect(helpers.calculateBucketName({
				ApplicationName : "My application"
			})).to.equal("my-application-packages")
		})
	});

	describe("calculateCnamePrefix", function() {
		it("should normalise application name", function() {
			expect(helpers.calculateCnamePrefix("My application", "staging", true)).to.equal("my-application-staging");
		});

		it("should append inactive", function() {
			expect(helpers.calculateCnamePrefix("app", "staging")).to.equal("app-staging-inactive");
		});

		it("should throw if application name is null", function() {
			expect(function() {
				helpers.calculateCnamePrefix();
			}).to.throw(Error);
		});

		it("should throw if application name is empty", function() {
			expect(function() {
				helpers.calculateCnamePrefix("");
			}).to.throw(Error);
		});

		it("should throw if environment name is null", function() {
			expect(function() {
				helpers.calculateCnamePrefix("a");
			}).to.throw(Error);
		});

		it("should throw if environment name is empty", function() {
			expect(function() {
				helpers.calculateCnamePrefix("a","");
			}).to.throw(Error);
		});
	});

	describe("getSuffixFromEnvironmentName", function() {
		it("should throw if environment name is null", function() {
			expect(function() {
				helpers.getSuffixFromEnvironmentName();
			}).to.throw(Error);
		});

		it("should throw if environment name is empty", function() {
			expect(function() {
				helpers.getSuffixFromEnvironmentName("");
			}).to.throw(Error);
		});

		it("should throw if environment name is not correctly formatted", function() {
			expect(function() {
				helpers.getSuffixFromEnvironmentName("asdfasdf-afds");
			}).to.throw(Error);
			
			expect(function() {
				helpers.getSuffixFromEnvironmentName("asdfasdf-afds-asdf");
			}).to.throw(Error);
		});

		it("should retrieve suffix from correctly formed name", function() {
			expect(helpers.getSuffixFromEnvironmentName("app-stag-a-asdf")).to.equal("a");
			expect(helpers.getSuffixFromEnvironmentName("app-stag-b-asdf")).to.equal("b");
		});
	});

	describe("normalizeApplicationName", function() {
		it("should throw if name is null", function() {
			expect(function() { 
				helpers.normalizeApplicationName();
			}).to.throw(Error);
		});

		it("should throw if name is empty", function() {
			expect(function() {
				helpers.normalizeApplicationName("");
			}).to.throw(Error);
		});

		it("should normalize application name", function() {
			expect(helpers.normalizeApplicationName("My Application")).to.equal("my-application");
		});

	});

	describe("calculateVersionLabel", function() {
		it("should return random string when no label provided", function(){
			var label = helpers.calculateVersionLabel();
  
			expect(label.length).to.equal(16);
		});

		it("should use string from config when provided", function() {
			var config = {
				VersionLabel : "1.0.0"
			}

			expect(helpers.calculateVersionLabel(config)).to.equal("1.0.0");
		});

		it("should use function from config when provided", function() {
			var config = {
				VersionLabel : function() { return "1.0.0"; }
			}

			expect(helpers.calculateVersionLabel(config)).to.equal("1.0.0");
		});

		it("should use string from cli options", function() {
			var options = {
				versionLabel : "1.0.0"
			}

			expect(helpers.calculateVersionLabel(null, options)).to.equal("1.0.0");
		});

		it("should prefer value from cli options over config", function() {
			var config = {
				VersionLabel : "1.0.0"
			};

			var options = {
				versionLabel : "2.0.0"
			};

			expect(helpers.calculateVersionLabel(config, options)).to.equal("2.0.0");
		});

		it("should include version prefix string from config", function() {
			var config = {
				VersionLabel : "1.0.0",
				VersionPrefix : "v-"
			}

			expect(helpers.calculateVersionLabel(config)).to.equal("v-1.0.0");
		});

		it("should include version prefix function from config", function() {
			var config = {
				VersionLabel : "1.0.0",
				VersionPrefix : function() { return "v-"; }
			}

			expect(helpers.calculateVersionLabel(config)).to.equal("v-1.0.0");
		});

		it("should include version prefix from options", function() {
			var options = {
				versionLabel : "1.0.0",
				versionPrefix : "v-"
			}

			expect(helpers.calculateVersionLabel(null, options)).to.equal("v-1.0.0");
		});
	});
});
