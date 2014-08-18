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
  this.humanity = humanity;
  this.receivePlans = receivePlans;
  this.strategy = new Array(this.humanity.numberOfCamps);
}

AI.prototype = {
  strategy: [],
  humanity: null,
  receivePlans: function(){},
  realtimeAiTimeout: 500,

  makeStrategy: function(campId) {
    var child = cp.fork(__dirname + '/process.js');
    child.on('message', makeStrategyReceiver(campId, this.receivePlans));
    child.send({ humanityChange: JSON.stringify(this.humanity.data()) });
    child.send({ humanityChange: JSON.stringify({
      population: this.humanity.population(),
      camp: campId,
      places: this.humanity.getPlaces(),
      centerTile: this.humanity.centerTile,
      campNames: this.humanity.campNames(),
      resources: this.humanity.getResources(),
      lockedTiles: this.humanity.lockedTiles,
    })});
    this.strategy[campId] = child;
  },

  updateHumanity: function(change) {
    for (var i = 0; i < this.humanity.numberOfCamps; i++) {
      if (this.strategy[i] === undefined) { this.makeStrategy(i); }
      this.strategy[i].send({ humanityChange: change });
    }
  },

  run: function() {
    // Choose the camp we will help.
    var leastCamp = this.humanity.campFromId(0);
    for (var i = 1; i < this.humanity.numberOfCamps; i++) {
      var camp = this.humanity.campFromId(i);
      if (camp.nActions < leastCamp.nActions) {
        leastCamp = camp;
      }
    }

    // Run the strategy for it.
    return this.runCamp(leastCamp);
  },

  // Given a Camp object (see humanity.js),
  // return a plan (see game.js).
  runCamp: function(camp) {
    // Run the strategy for it.
    if (this.strategy[camp.id] === undefined) { this.makeStrategy(camp.id); }
    try {
      this.strategy[camp.id].send({ run: true });
    } catch(e) {
      // Reset.
      console.error(e);
      debugger;
      this.strategy[camp.id].kill();
      delete this.strategy[camp.id];
    }
  },

  kill: function() {
    for (var i = 0; i < this.strategy.length; i++) {
      if (this.strategy[i] != null) {
        this.strategy[i].kill();
        delete this.strategy[i];
      }
    }
  },

  realtime: function() {
    setTimeout(function() {
      for (var i = 0; i < this.strategy.length; i++) {
        this.runCamp(this.humanity.campFromId(i));
      }
      this.realtime();
    }.bind(this), this.realtimeAiTimeout);
  },

};

module.exports = AI;
