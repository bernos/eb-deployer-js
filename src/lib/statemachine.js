function validateSpec(spec) {
  if (!spec) {
    throw "No spec provided";
  }

  if (!spec.initial) {
    throw "Spec does not include 'initial' state";
  }

  if (!spec.states) {
    throw "Spec does not contain any states";
  }

  if (!spec.states[spec.initial]) {
    throw "The specified initial state does not exist";
  }
}

var FSM = function(spec) {
  var currentState = null,
      cancelled = false,
      handlers = {},
      self = this;

  validateSpec(spec);

  // Normalize states
  spec.states = spec.states || {};

  for (var n in spec.states) {
    spec.states[n].name = n;
  }    

  function _getInitialState() {
    return _getState(spec.initial);
  }

  function _getState(name) {
    if (null === name || null === spec.states) {
      return null;
    }

    return spec.states[name];
  }

  function _transitionTo(state, data) {
    if (null === state) { return null; }
    
    cancelled = false;
          
    if (currentState) {
      self.trigger(currentState.name + ".exit", self, data);
    }  

    if (cancelled) {
      cancelled = false;
      return null;
    }

    if (currentState) {
      self.trigger(FSM.EXIT, self, currentState, data);
    }

    self.trigger(state.name + ".enter", self, data);

    if (cancelled) {
      cancelled = false;
      return null;
    }

    self.trigger(FSM.ENTER, self, state, data);

    currentState = state;

    self.trigger(FSM.CHANGE, self, state, data);
    self.trigger(currentState.name + ".change", self, data);    
  }

  function _getTargetStateForAction(action) {
    if (null === currentState) { return null; }
    if (null === currentState.transitions) { return null; }

    return _getState(currentState.transitions[action]);
  }

  this.bind = function(event, handler) {
    (handlers[event] || (handlers[event] = [])).push(handler);
    return self;
  };

  this.unbind = function(event, handler) {
    if (!event) {
      handlers = {};
    } else if (!handler) {
      handlers[event] = [];
    } else if (handlers[event]) {
      var l = handlers[event];
      for(var i = l.length - 1; i > -1; i--) {
        l.splice(i,1);
        return self;
      }
    }
    return self;
  };

  this.trigger = function(event) {
    var l;
    if (l = handlers[event]) {
      for (var i = 0, m = l.length; i < m; i++) {
        l[i].apply(self, Array.prototype.slice.call(arguments, 1));
      }
    }
    return self;
  };

  this.run = function(data) {
    if (_getInitialState()) {
      _transitionTo(_getInitialState(), data);
    }
    return self;
  };

  this.doAction = function(action, data) {
    var data = data || {};
    var newState = _getTargetStateForAction(action);
    
    if (newState) {
      _transitionTo(newState, data);
    }

    return self;
  };

  this.cancel = function() {
    cancelled = true;
    return self;
  };

  this.getCurrentState = function() {
    return currentState;
  };
};

FSM.VERSION = '0.0.1';
FSM.CHANGE  = "FiniteStateMachine:Change";
FSM.ENTER = "FiniteStateMachine:Enter";
FSM.EXIT = "FiniteStateMachine:Exit";

module.exports = FSM;

