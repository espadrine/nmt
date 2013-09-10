var terrain = require('./terrain.js');
var humanity = require('./humanity');

humanity.start(terrain);

// Send and receive data from players.

function actWSStart(socket) {
  console.log('A player entered the game.');
  socket.on('message', actWSRecv);
  socket.send(JSON.stringify(humanity.data()));
}

function actWSRecv(data) {
  var plan;
  try {
    plan = JSON.parse(data);
  } catch(e) { return; }

  if (plan.do !== undefined && (typeof plan.at === 'string')) {
    if ((typeof plan.to === 'string') && (typeof plan.h === 'number')
     && plan.do === terrain.planTypes.move) {
      // Is the move valid?
      if (terrain.travel(terrain.tileFromKey(plan.at),
                         terrain.tileFromKey(plan.to)).length > 1
       && (plan.h > 0 || plan.h <= terrain.tileFromKey(plan.to).h)) {
        terrain.addPlan(plan);
      }
    } else if ((typeof plan.b === 'number')
            && plan.do === terrain.planTypes.build) {
      // Is the move valid?
      if (terrain.validConstruction(plan.b, terrain.tileFromKey(plan.at))) {
        terrain.addPlan(plan);
      }
    }
  }
}

var updatedHumanity = {};

function applyPlan(plan) {
  var humanityFrom = humanity.copy(humanity(terrain.tileFromKey(plan.at)));
  if (plan.do === terrain.planTypes.move) {
    console.log('Plan: moving people from', plan.at, 'to', plan.to);
    var humanityTo = humanity.copy(humanity(terrain.tileFromKey(plan.to)));

    //console.log('Before:');
    //console.log('humanityFrom =', humanityFrom);
    //console.log('humanityTo =', humanityTo);
    var byPlane = (humanityFrom.o & terrain.manufacture.plane) !== 0;
    var emptyTarget = humanityTo.h === 0;
    var emptyingOrigin = (humanityFrom.h - plan.h) === 0;
    // Human movement.
    if (!emptyTarget && humanityTo.c !== humanityFrom.c) {
      // They're not us. This means war. Because culture difference.
      var ourForces = plan.h;
      if ((humanityFrom.o & terrain.manufacture.gun) !== 0) {
        ourForces *= 2;
      }
      var theirForces = humanityTo.h;
      if ((humanityTo.o & terrain.manufacture.gun) !== 0) {
        theirForces *= 2;
      }
      // Imbalance is > 1 if we win.
      var imbalance = ourForces / theirForces;
      if (imbalance <= 1) {
        // We lose.
        if (imbalance === 1) {
          removeHumanStuff(plan.at, humanityFrom);
          removeHumanStuff(plan.to, humanityTo);
        } else if (emptyingOrigin) {
          removeHumanStuff(plan.at, humanityFrom);
        } else {
          humanityTo.h -= (humanityTo.h * imbalance)|0;
          humanityFrom.h -= plan.h;
        }
        updatedHumanity[plan.at] = humanityFrom;
        updatedHumanity[plan.to] = humanityTo;
        return;
      } else {
        // We win.
        humanityTo.h = humanityFrom.h - (humanityFrom.h * (1/imbalance))|0;
        //humanityTo.h = plan.h - humanityTo.h;
        emptyTarget = true;
      }
    } else {
      // Joining forces.
      humanityTo.h += plan.h;
      humanityFrom.h -= plan.h;
    }
    // Camp
    humanityTo.c = humanityFrom.c;
    // Food.
    humanityTo.f += humanityFrom.f - (byPlane? 2: 1);
    if (emptyingOrigin) { humanityFrom.f = 0; }
    // Ownership is the intersection of what each group owns.
    if (!emptyTarget) { humanityTo.o &= humanityFrom.o; }
    else { humanityTo.o = humanityFrom.o; }
    if (emptyingOrigin) { humanityFrom.o = 0; }

    // Collecting from the land.
    if (emptyingOrigin) { removeHumanStuff(plan.at, humanityFrom); }
    collectFromTile(plan.to, humanityTo, emptyTarget);

    //console.log('After:');
    //console.log('humanityFrom =', humanityFrom);
    //console.log('humanityTo =', humanityTo);
    updatedHumanity[plan.at] = humanityFrom;
    updatedHumanity[plan.to] = humanityTo;

  } else if (plan.do === terrain.planTypes.build) {
    humanityFrom.b = plan.b;
    updatedHumanity[plan.at] = humanityFrom;
    collectFromTile(plan.at, humanityFrom, true);
  } else if (plan.do === terrain.planTypes.destroy) {
    humanityFrom.b = null;
    updatedHumanity[plan.at] = humanityFrom;
  }
}

// Collect from the humanity tile. If `addBuilding` is truthy,
// we add the building as a resource for a camp.
function collectFromTile(tileKey, humanityTile, addBuilding) {
  if (humanityTile.b === terrain.tileTypes.farm) {
    humanityTile.f = 20;
  } else if (humanityTile.b === terrain.tileTypes.factory) {
    humanityTile.o |= terrain.manufacture.car;
  } else if (humanityTile.b === terrain.tileTypes.dock) {
    humanityTile.o |= terrain.manufacture.boat;
  } else if (humanityTile.b === terrain.tileTypes.airport) {
    humanityTile.o |= terrain.manufacture.plane;
  } else if (humanityTile.b === terrain.tileTypes.gunsmith) {
    humanityTile.o |= terrain.manufacture.gun;
  }
}

function removeHumanStuff(tileKey, human) {
  human.h = 0;
  human.f = 0;
}



// Game turn.

var gameTurnTime = 100;     // Every 100ms.

function gameTurn() {
  // Run all accepted plans.
  terrain.eachPlan(applyPlan);
  // Send new humanity to all.
  if (Object.keys(updatedHumanity).length > 0) {
    humanity.change(updatedHumanity);
    addPopulation(updatedHumanity);
    actChannel.clients.forEach(function (client) {
      client.send(JSON.stringify(updatedHumanity));
    });
  }
  terrain.clearPlans();
  updatedHumanity = {};
  setTimeout(gameTurn, gameTurnTime);
}

function addPopulation(updatedHumanity) {
  var camp;
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    camp = humanity.campFromId(i);
    var newPopulation = camp.populationCap - camp.population;
    if (newPopulation > 0) {
      var homes = Object.keys(camp.homes);
      for (var j = 0; j < newPopulation; j++) {
        var randomHomeIndex = (homes.length * Math.random())|0;
        var randomHome = homes[randomHomeIndex];
        var randomHomeTile = humanity(terrain.tileFromKey(randomHome));
        randomHomeTile.h++;
        updatedHumanity[randomHome] = randomHomeTile;
      }
      camp.population = camp.populationCap;
    }
  }
}


// Starting the game.

var actChannel;
function start(camp) {
  actChannel = camp.ws('act', actWSStart);
  setTimeout(gameTurn, gameTurnTime);
}


exports.start = start;
