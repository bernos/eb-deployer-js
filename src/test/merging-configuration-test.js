var expect = require("chai").expect,
    mergingConfiguation = require("../strategies/blue-green/states/merging-configuration");

describe("MergingConfiguration", function() {

    describe("mergingConfiguation with config containing one property and a different environment specific property", function() {

        var mergeConfigurer;    
        var config;

        beforeEach("create mergeConfigurer with one config property and a different environment specific property",function() {
            config = {
                "propertyToBeOverriden" : "not overriden",
                Environments : {
                    dev : {
                        "propertyToBeOverriden" : "overriden",
                        "property2" : "2"
                    }
                }
            };
            var args = {
                "environment":"dev" 
            };
            mergeConfigurer = mergingConfiguation(config, null, args);
        });
        it("mergeConfigurer is not null", function() {
            expect(mergeConfigurer).to.not.be.null;
        });
        describe("activate", function() {
            var fsm;

            beforeEach("activate the state", function() {
                fsm = {
                    doAction:function(){

                    }
                }
                mergeConfigurer.activate(fsm, null);
            });

            it("config has the environment config property", function() {
                expect(config.property2).to.be.equals("2");
            });
            it("config has the overriden environment config property", function() {
                expect(config.propertyToBeOverriden).to.be.equals("overriden");
            });
        });
    });
});