var terrain = require('./terrain.js');
var humanity = require('./humanity');
var ai = require('./ai');

var cheatMode = false;

// Send and receive data from players.

function actWSStart(socket) {
  var ip = socket._socket.remoteAddress;
  console.log('Player', ip, 'entered the game.');
  socket.on('message', makeActWSRecv(ip));
  socket.send(JSON.stringify(humanity.data()));
  var camp = campFromIP(ip);
  var playerCamp = humanity.campFromId(camp);
  socket.send(JSON.stringify({
    population: humanity.population(),
    camp: camp,
    goto: playerCamp.spawn,
  }));
}

function makeActWSRecv(ip) {
  return function actWSRecv(data) {
    var plan;
    try {
      plan = JSON.parse(data);
    } catch(e) { return; }
    judgePlan(ip, plan, cheatMode);
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
// A plan is {do, at, to, b}.
// do: see terrain.planTypes.
// at, to: tileKeys (see terrain.tileFromKey).
// b: building number. See terrain.tileTypes.
function judgePlan(ip, plan, cheatMode) {
  console.log('Suggested plan:', plan);

  if (plan.do !== undefined && (typeof plan.at === 'string')) {
    // Check camp.
    var humanityTile = humanity(terrain.tileFromKey(plan.at));
    if (cheatMode ||
        (humanityTile !== undefined && humanityTile.c === campFromIP(ip)
         && humanityTile.h > 0)) {
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
  humanity.campFromId(humanityFrom.c).nActions++;
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
        if (surrender(plan.to, humanityFrom.c)) {
          humanityTo.h += plan.h;
        } else {
          humanityTo.h = plan.h - (plan.h * (1/imbalance))|0;
        }
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
    if (humanityTo.f > 20) { humanityTo.f = 20; }
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
  // Run ai.
  if (Math.random() < 0.8) {
    setTimeout(function runAI() {
      var aiPlan = ai(terrain, humanity);
      if (aiPlan != null) { judgePlan(0, aiPlan, true); }
    }, gameTurnTime / 2);
  }
}
// Uncomment the following to make the AI play constantly.
//setInterval(function () {
//  var aiPlan = ai(terrain, humanity);
//  console.log('ai plan:', aiPlan);
//  if (aiPlan != null) { judgePlan(0, aiPlan, true); }
//}, 200);

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

// Are the people in tileKey = "q:r" surrounded by camp?
function surrender(tileKey, camp) {
  // How many people around.
  var surrounded = 0;
  for (var i = 0; i < 6; i++) {
    var neighbor =
      humanity(terrain.neighborFromTile(terrain.tileFromKey(tileKey), i));
    if (neighbor && neighbor.c === camp) {
      surrounded++;
    }
  }
  return surrounded >= 2;
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
  // The game ends if one of the camps is empty, or is too high.
  var gameOver = false;
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    var campPopulation = humanity.campFromId(i).population;
    if (campPopulation <= 0 || campPopulation > maxPopulation) {
      gameOver = true;
    }
  }
  if (gameOver) {
    actChannel.clients.forEach(function (client) {
      client.send(JSON.stringify({ winners: humanity.winners() }));
    });
    startGame();
  } else {
    setTimeout(gameTurn, gameTurnTime);
  }
}

// Birth. Add folks on home tiles.
function addPopulation(updatedHumanity) {
  var camp;
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    camp = humanity.campFromId(i);
    var newPopulation = camp.populationCap - camp.population;
    if (newPopulation > 0) {
      var farmHomes = Object.keys(camp.farm);
      var nFarmHomes = farmHomes.length > 0? humanity.homePerHouse.farm: 0;
      var residenceHomes = Object.keys(camp.residence);
      var nResidenceHomes = residenceHomes.length > 0?
        humanity.homePerHouse.residence: 0;
      var skyscraperHomes = Object.keys(camp.skyscraper);
      var nSkyscraperHomes = skyscraperHomes.length > 0?
        humanity.homePerHouse.skyscraper: 0;
      var total = nFarmHomes + nResidenceHomes + nSkyscraperHomes;
      var farmProb = nFarmHomes / total;
      var residenceProb = nResidenceHomes / total;
      var skyscraperProb = nSkyscraperHomes / total;
      for (var j = 0; j < newPopulation; j++) {
        var pickedHome = Math.random();
        var pickedIndex = Math.random();
        // More recent buildings should be more probable.
        pickedIndex = 1 - (pickedIndex * pickedIndex);
        if (pickedHome < farmProb) {
          addFolk(farmHomes, (farmHomes.length * pickedIndex)|0);
        } else if (pickedHome < farmProb + residenceProb) {
          addFolk(residenceHomes, (residenceHomes.length * pickedIndex)|0);
        } else {
          addFolk(skyscraperHomes, (skyscraperHomes.length * pickedIndex)|0);
        }
      }
      camp.population = camp.populationCap;
    }
  }
}

function addFolk(homes, index) {
  var randomHome = homes[index];
  var randomHomeTile = humanity(terrain.tileFromKey(randomHome));
  randomHomeTile.h++;
  updatedHumanity[randomHome] = randomHomeTile;
}

// Possible win: the maximum population authorized in a game.
var maxPopulation;

// Returns a list of spawn = {q,r}.
function findSpawn() {
  var spawns = new Array(humanity.numberOfCamps);
  // Increase the values to ((Math.random() * 500)|0) + 100 once we have cities
  var distanceBetweenPlayers = ((Math.random() * 100)|0) + 50;
  maxPopulation = distanceBetweenPlayers * distanceBetweenPlayers;
  var oneSpot = {
    q:(Math.random() * 10000)|0,
    r:(Math.random() * 10000)|0,
  };
  spawns[0] = findNearestSteppe(oneSpot);
  var angle, q, r;
  for (var i = 1; i < humanity.numberOfCamps; i++) {
    angle = Math.random() * 2 * Math.PI;
    oneSpot = {
      q: (oneSpot.q + distanceBetweenPlayers * Math.cos(angle))|0,
      r: (oneSpot.r + distanceBetweenPlayers * Math.sin(angle))|0,
    };
    spawns[i] = findNearestSteppe(oneSpot);
  }
  return spawns;
}

// tile = {q,r}
function findNearestSteppe(tile) {
  var k = 1;
  while (terrain(tile).type !== terrain.tileTypes.steppe) {
    // Take the bottom left tile.
    for (var i = 0; i < k; i++) {
      tile = terrain.neighborFromTile(tile, 4);
    }
    // Go round.
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < k; j++) {
        tile = terrain.neighborFromTile(tile, i);
        if (terrain(tile).type === terrain.tileTypes.steppe) {
          return tile;
        }
      }
    }
  }
  return tile;
}


// Starting the game.

function startGame() {
  humanity.setSpawn(findSpawn());
  ai.clear(terrain, humanity);
  setTimeout(gameTurn, gameTurnTime);
}

var actChannel;
function start(camp) {
  humanity.start(terrain, findSpawn);
  ai.clear(terrain, humanity);
  setTimeout(gameTurn, gameTurnTime);
  actChannel = camp.ws('act', actWSStart);
}


exports.start = start;
