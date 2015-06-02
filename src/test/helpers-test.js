var expect = require("chai").expect,
	helpers = require("../lib/helpers");

describe("Helpers", function(){
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
