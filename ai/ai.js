// Interface between game management and the AI entities.

var cp = require('child_process');

function makeStrategyReceiver(campId, receivePlans) {
  return function(msg) {
    if (msg.plans) {
      receivePlans(msg.plans);
    }
  };
}

function AI(humanity, receivePlans) {
  this.strategy = [];
  this.humanity = humanity;
  this.numberOfCamps = humanity.numberOfCamps;
  for (var i = 0; i < this.numberOfCamps; i++) {
    //this.strategy.push(
    //    new aiProc.Strategy(humanity.campFromId(i), humanity));
    this.strategy.push(cp.fork(__dirname + '/process.js'));
    this.strategy[i].on('message', makeStrategyReceiver(i, receivePlans));
    this.strategy[i].send({ humanityChange: { camp:i } });
  }
}

AI.prototype = {
  strategy: [],
  numberOfCamps: 0,
  humanity: null,

  updateHumanity: function(change) {
    for (var i = 0; i < this.humanity.numberOfCamps; i++) {
      this.strategy[i].send({ humanityChange: change });
    }
  },

  run: function(humanity) {
    // Choose the camp we will help.
    var leastCamp = humanity.campFromId(0);
    for (var i = 1; i < humanity.numberOfCamps; i++) {
      var camp = humanity.campFromId(i);
      if (camp.nActions < leastCamp.nActions) {
        leastCamp = camp;
      }
    }

    // Run the strategy for it.
    return this.runCamp(humanity, leastCamp);
  },

  // Given a Camp object (see humanity.js),
  // return a plan (see game.js).
  runCamp: function(humanity, camp) {
    // Run the strategy for it.
    //if (this.strategy[camp.id] === undefined) {
    //  this.strategy[camp.id]
    //    = new aiProc.Strategy(camp, humanity);
    //}
    try {
      this.strategy[camp.id].send({ run: true });
      //return this.strategy[camp.id].runProject();
    } catch(e) {
      // Reset.
      console.error(e);
      debugger;
      //delete this.strategy[camp.id];
      //return this.runCamp(humanity, camp);
    }
  },

};

module.exports = AI;
