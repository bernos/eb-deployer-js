var expect = require("chai").expect;
var FSM = require("../lib/statemachine.js");
 
describe("StateMachine", function(){
  describe("Constructor", function() {
    it("should validate a spec was supplied", function(){
      expect(FSM).to.throw("No spec provided");
    });
  });
});