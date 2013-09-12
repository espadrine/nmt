var terrain = require('./terrain.js');
var humanity = require('./humanity');

humanity.start(terrain);

// Send and receive data from players.

function actWSStart(socket) {
  var ip = socket._socket.remoteAddress;
  console.log('Player', ip, 'entered the game.');
  socket.on('message', makeActWSRecv(ip));
  socket.send(JSON.stringify(humanity.data()));
  socket.send(JSON.stringify({
    population: humanity.population(),
    camp: campFromIP(ip),
  }));
}

function makeActWSRecv(ip) {
  return function actWSRecv(data) {
    var plan;
    try {
      plan = JSON.parse(data);
    } catch(e) { return; }
    judgePlan(ip, plan);
  };
}

var switchCamp = 0;
var campFromIPs = {};
function campFromIP(ip) {
  if (campFromIPs[ip] === undefined) {
    campFromIPs[ip] = switchCamp;
    switchCamp++;
    switchCamp %= humanity.numberOfCamps;
  }
  return campFromIPs[ip];
}

// Accept or reject a plan.
function judgePlan(ip, plan) {
  console.log('Suggested plan:', plan);

  if (plan.do !== undefined && (typeof plan.at === 'string')) {
    // Check camp.
    var humanityTile = humanity(terrain.tileFromKey(plan.at));
    if (humanityTile !== undefined && humanityTile.c === campFromIP(ip)
        && humanityTile.h > 0) {
      // Check plan.
      if ((typeof plan.to === 'string') && (typeof plan.h === 'number')
       && plan.do === terrain.planTypes.move
       && terrain.travel(terrain.tileFromKey(plan.at),
                         terrain.tileFromKey(plan.to)).length > 1
       && (plan.h > 0 || plan.h <= humanityTile.h)) {
        // Is the move valid?
        terrain.addPlan(plan);
      } else if ((typeof plan.b === 'number' || plan.b === null)
             && plan.do === terrain.planTypes.build
             && terrain.validConstruction(plan.b, terrain.tileFromKey(plan.at))) {
        // Is the move valid?
        terrain.addPlan(plan);
      } else console.log('Plan denied.');
    } else console.log('Camp denied or no camp detected.');
  } else console.log('Plan invalid.');
}

var updatedHumanity = {};
var warTiles = [];

function applyPlan(plan) {
  var humanityFrom = humanity.copy(humanity(terrain.tileFromKey(plan.at)));
  if (plan.do === terrain.planTypes.move) {
    console.log('Plan: moving people from', plan.at, 'to', plan.to);
    var humanityTo = humanity.copy(humanity(terrain.tileFromKey(plan.to)));

    // Do we have enough food?
    if (humanityFrom.f <= 0) {
      updatedHumanity[plan.at] = humanityFrom;
      return;
    }

    //console.log('Before:');
    //console.log('humanityFrom =', humanityFrom);
    //console.log('humanityTo =', humanityTo);
    var byPlane = (humanityFrom.o & terrain.manufacture.plane) !== 0;
    var emptyTarget = humanityTo.h === 0;
    var emptyingOrigin = (humanityFrom.h - plan.h) === 0;
    // Human movement.
    if (!emptyTarget && humanityTo.c !== humanityFrom.c) {
      // They're not us. This means war. Because culture difference.
      warTiles.push(plan.to);
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
      console.log('imbalance:', imbalance);
      if (imbalance <= 1) {
        // We lose.
        humanityTo.h -= (humanityTo.h * imbalance)|0;
        humanityFrom.h -= plan.h;
        updatedHumanity[plan.at] = humanityFrom;
        updatedHumanity[plan.to] = humanityTo;
        return;
      } else {
        // We win.
        humanityTo.h = plan.h - (plan.h * (1/imbalance))|0;
        humanityFrom.h -= plan.h;
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
    collectFromTile(plan.to, humanityTo, emptyTarget);

    //console.log('After:');
    //console.log('humanityFrom =', humanityFrom);
    //console.log('humanityTo =', humanityTo);
    updatedHumanity[plan.at] = humanityFrom;
    updatedHumanity[plan.to] = humanityTo;

  } else if (plan.do === terrain.planTypes.build) {
    console.log('Plan: building', plan.b, 'at', plan.at);
    humanityFrom.b = plan.b;
    updatedHumanity[plan.at] = humanityFrom;
    collectFromTile(plan.at, humanityFrom, true);
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



// Game turn.

var gameTurnTime = 100;     // Every 100ms.

function gameTurn() {
  // Run all accepted plans.
  terrain.eachPlan(applyPlan);
  // Send new humanity to all.
  if (Object.keys(updatedHumanity).length > 0) {
    humanity.change(updatedHumanity);
    addPopulation(updatedHumanity);
    updatedHumanity.population = humanity.population();
    updatedHumanity.war = warTiles;
    actChannel.clients.forEach(function (client) {
      client.send(JSON.stringify(updatedHumanity));
    });
  }
  terrain.clearPlans();
  updatedHumanity = {};
  warTiles = [];
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
