// Interface between game management and the AI entities.

var terrain = require('../terrain-gen');
var aiPrimitives = require('./primitives');

function AI(humanity) {
  this.strategy = [];
  this.numberOfCamps = humanity.numberOfCamps;
  for (var i = 0; i < this.numberOfCamps; i++) {
    this.strategy.push(
        new aiPrimitives.Strategy(humanity.campFromId(i), humanity));
  }
}

AI.prototype = {

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
    if (this.strategy[camp.id] === undefined) {
      this.strategy[camp.id]
        = new aiPrimitives.Strategy(camp, humanity);
    }
    try {
      return this.strategy[camp.id].runProject();
    } catch(e) {
      // Reset.
      delete this.strategy[camp.id];
      return this.runCamp(humanity, camp);
    }
  },

};

module.exports = AI;
