var expect = require("chai").expect;
var FSM = require("../lib/statemachine.js");

function getStateMachine() {
  return new FSM({
    initial : "open",
    states : {
      open : {
        transitions : {
          close : "closed"
        }
      },
      closed : {
        transitions : {
          open : "open"
        }
      }
    }
  });
}
 
describe("StateMachine", function(){
  describe("constructor", function() {
    
    it("should throw when spec is not provided", function(){
      expect(function(){
        new FSM();
      }).to.throw("No spec provided");
    });

    it("should throw when spec does not contain an intial state", function(){
      expect(function(){
        new FSM({});
      }).to.throw("Spec does not include 'initial' state");
    });

    it("should throw when spec does not contain any states", function(){
      expect(function(){
        var fsm = new FiniteStateMachine({
          initial : "waiting"
        });
      }).to.throw();
    });

    it("should throw when initial state does not exist", function() {
      expect(function(){
        var fsm = new FiniteStateMachine({
          initial : "waiting",
          states : {
            one : {}
          }
        });
      }).to.throw();
    });

  });

  describe("when executing a transition", function() 
  {
    it("should trigger the generic events for state exit, entry and change", function(){
      var result = [];

      function logState(e) {
        return function(fsm, state)
        {
          result.push(e + "." + state.name);
        }
      }

      getStateMachine()       
        .bind(FSM.EXIT,    logState("exit"))
        .bind(FSM.ENTER,   logState("enter"))
        .bind(FSM.CHANGE,  logState("change"))
        .run()
        .doAction("close");


      expect(result[0]).to.equal("enter.open");
      expect(result[1]).to.equal("change.open");
      expect(result[2]).to.equal("exit.open");
      expect(result[3]).to.equal("enter.closed");
      expect(result[4]).to.equal("change.closed");
    });

    it("should trigger transition events for each state", function() 
    {
      var result = [];

      function logState(e) {
        return function(fsm, state) {
          result.push(e);
        }
      }

      getStateMachine()
        .bind("open.exit", logState("open.exit"))
        .bind("closed.enter", logState("closed.enter"))
        .bind("closed.change", logState("closed.change"))
        .run()
        .doAction("close");

      expect(result[0]).to.equal("open.exit");
      expect(result[1]).to.equal("closed.enter");
      expect(result[2]).to.equal("closed.change");
    });
  });

  it("should initialize with initial state from spec", function() {
    var initialState = "waiting";
    var fsm = new FSM({
      initial : initialState,
      states : {
        waiting : {}
      }
    }).run();
    expect(fsm.getCurrentState().name).to.equal(initialState);
  })

});