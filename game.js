// Thaddée Tyl. AGPLv3.
var terrain = require('./terrain');
var humanity = require('./humanity');
var treasure = require('./treasure');
var ai = require('./ai');

var cheatMode = false;

// Tiles that are in use by a user / a bot.
// Map from tileKey to camp values.
var lockedTiles = {};
// Map from playerId to tileKey.
var lockedTileFromPlayerId = {};

// Send and receive data from players.

var playerIdCount = 1;  // 0 is reserved for the AI.
function actWSStart(socket) {
  var playerId = playerIdCount++;
  console.log('Player', playerId, '[' + socket._socket.remoteAddress + ']',
              'entered the game.');
  socket.on('message', makeActWSRecv(playerId));
  socket.on('close', function() {
    delete lockedTiles[lockedTileFromPlayerId[playerId]];
  });
  socket.send(JSON.stringify(humanity.data()));
  var camp = campFromId(playerId);
  var playerCamp = humanity.campFromId(camp);
  socket.send(JSON.stringify({
    population: humanity.population(),
    camp: camp,
    goto: playerCamp.spawn,
    places: humanity.getPlaces(),
    resources: humanity.getResources(),
  }));
  socket.send(JSON.stringify({lockedTiles:lockedTiles}));
}

function makeActWSRecv(playerId) {
  return function actWSRecv(data) {
    var plan;
    try {
      plan = JSON.parse(data);
    } catch(e) { return; }
    judgePlan(playerId, plan, cheatMode);
  };
}

var switchCamp = 0;
var campFromIds = {};
function campFromId(playerId) {
  if (campFromIds[playerId] === undefined) {
    campFromIds[playerId] = switchCamp;
    switchCamp++;
    switchCamp %= humanity.numberOfCamps;
  }
  return campFromIds[playerId];
}

// The following should be constant. It is used for defaults.
var emptyFunction = function(){};

// Accept or reject a plan.
// A plan is {do, at, to, b}.
// do: see terrain.planTypes.
// at, to: tileKeys (see terrain.tileFromKey).
// b: building number. See terrain.tileTypes.
//
// The callback `cb` runs after the plan is applied, if it is.
// If the plan isn't applied, the callback has an `err` parameter to explain.
function judgePlan(playerId, plan, cheatMode, cb) {
  cb = cb || emptyFunction;
  //console.log('Suggested ' + (playerId === 0? 'AI ': '') + 'plan:', plan);
  if (playerId !== 0 && plan.to != null) {
    if (plan.at != null) {
      delete lockedTiles[plan.at];
    }
    lockedTiles[plan.to] = campFromIds[playerId];
    lockedTileFromPlayerId[playerId] = plan.to;
    actChannel.clients.forEach(function (client) {
      try {
        client.send(JSON.stringify({lockedTiles:lockedTiles}));
      } catch(e) {
        console.error('Tried to send data to nonexistent client.');
      }
    });
  }

  if (plan.do !== undefined && (typeof plan.at === 'string')) {
    // Check camp.
    var humanityTile = humanity(terrain.tileFromKey(plan.at));
    if (cheatMode ||
        (humanityTile !== undefined && humanityTile.c === campFromId(playerId)
         && humanityTile.h > 0)) {
      var camp = humanity.campFromId(humanityTile.c);
      // Check plan.
      if ((typeof plan.to === 'string') && (typeof plan.h === 'number')
       && plan.do === terrain.planTypes.move
       && terrain.travel(terrain.tileFromKey(plan.at),
                         terrain.tileFromKey(plan.to)).length > 1
       && (plan.h > 0 || plan.h <= humanityTile.h)) {
        // Is the move valid?
        process.nextTick(function() { applyPlan(plan); cb(); });
      } else if ((typeof plan.b === 'number' || plan.b === null)
             && plan.do === terrain.planTypes.build
             && terrain.validConstruction(plan.b, terrain.tileFromKey(plan.at),
               camp.resources)) {
        // Is the move valid?
        process.nextTick(function() { applyPlan(plan); cb(); });
      } else cb('Plan denied.');
    } else cb('Camp denied or no camp detected.');
  } else cb('Plan invalid.');
}

var updatedHumanity = {};
var warTiles = [];
var surrenderTiles = [];

function applyPlan(plan) {
  var tileFrom = terrain.tileFromKey(plan.at);
  var humanityFrom = humanity.copy(humanity(tileFrom));
  var currentCamp = humanity.campFromId(humanityFrom.c);
  currentCamp.nActions++;
  if (plan.do === terrain.planTypes.move) {
    //console.log('Plan: moving people from', plan.at, 'to', plan.to);
    var tileTo = terrain.tileFromKey(plan.to);
    var humanityTo = humanity.copy(humanity(tileTo));

    // Do we have enough food?
    if (humanityFrom.f <= 0) {
      if (terrain(tileFrom).type === terrain.tileTypes.water) {
        humanityFrom.h = 0;
      }
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
      var ourForces = plan.h;
      if ((humanityFrom.o & terrain.manufacture.gun) !== 0) {
        ourForces *= 2;
      }
      var theirForces = humanityTo.h;
      if ((humanityTo.o & terrain.manufacture.gun) !== 0) {
        theirForces *= 2;
      }
      if (tileTo.vegetation) {
        theirForces *= 1.5;
      }
      // Imbalance is > 1 if we win.
      var imbalance = ourForces / theirForces;
      //console.log('imbalance:', imbalance);
      if (imbalance <= 1) {
        // We lose.
        humanityTo.h -= (humanityTo.h * imbalance)|0;
        humanityFrom.h -= plan.h;
        updatedHumanity[plan.at] = humanityFrom;
        updatedHumanity[plan.to] = humanityTo;
        warTiles.push(plan.to);
        return;
      } else {
        // We win.
        if (surrender(plan.to, humanityFrom.c)) {
          if (plan.h + humanityTo.h > 20) { plan.h = 20 - humanityTo.h; }
          humanityTo.h += plan.h;
          surrenderTiles.push(plan.to);
        } else {
          humanityTo.h = plan.h - (plan.h * (1/imbalance))|0;
          warTiles.push(plan.to);
        }
        humanityFrom.h -= plan.h;
        humanityFrom.f -= (maxFood / 4)|0;
        emptyTarget = true;
      }
    } else {
      // Joining forces.
      if (plan.h + humanityTo.h > 20) { plan.h = 20 - humanityTo.h; }
      humanityTo.h += plan.h;
      humanityFrom.h -= plan.h;
    }
    // Camp
    humanityTo.c = humanityFrom.c;
    // Food.
    humanityTo.f = humanityFrom.f - (byPlane? 2: 1);
    if (humanityTo.f > 20) { humanityTo.f = 20; }
    // Ownership is the intersection of what each group owns.
    if (!emptyTarget) { humanityTo.o &= humanityFrom.o; }
    else { humanityTo.o = humanityFrom.o; }

    // Collecting from the land.
    collectFromTile(plan.to, humanityTo, emptyTarget);

    //console.log('After:');
    //console.log('humanityFrom =', humanityFrom);
    //console.log('humanityTo =', humanityTo);
    updatedHumanity[plan.at] = humanityFrom;
    updatedHumanity[plan.to] = humanityTo;

  } else if (plan.do === terrain.planTypes.build) {
    //console.log('Plan: building', plan.b, 'at', plan.at);
    if (plan.b === terrain.tileTypes.airport) {
      // It can be a treasure activation.
      if (humanityFrom.b === terrain.tileTypes.blackdeath) {
        treasure.blackDeath(terrain, humanity, updatedHumanity, humanityFrom.c);
      }
      humanity.moveTreasure(terrain.tileTypes.blackdeath, plan.at,
        findBlackDeath(awayFrom(tileFrom, generateRandomDistance())),
        updatedHumanity, 'Airport');
      // Send the new treasure.
      updatedHumanity.places = humanity.getPlaces();
    } else if (plan.b === terrain.tileTypes.mine) {
      // It can be a mine construction.
      humanity.moveTreasure(terrain.tileTypes.metal, plan.at,
        findBlackDeath(awayFrom(tileFrom, generateRandomDistance())),
        updatedHumanity, 'Mine');
      // Send the new treasure.
      updatedHumanity.places = humanity.getPlaces();
    }
    if (plan.b === terrain.tileTypes.dock
     || plan.b === terrain.tileTypes.airport
     || plan.b === terrain.tileTypes.mine) {
      // Lumber cost.
      currentCamp.usedLumber++;
    }
    if (plan.b === terrain.tileTypes.industry) {
      // Metal cost.
      currentCamp.usedMetal++;
    }
    humanityFrom.b = plan.b;
    updatedHumanity[plan.at] = humanityFrom;
    collectFromTile(plan.at, humanityFrom, true);
  }
  // Run ai.
  if (!plan.ai) {
    // Find out the gap between the camp that did most actions and the others.
    var maxActions = 0;
    var maxActionId = 0;
    for (var i = 0; i < humanity.numberOfCamps; i++) {
      var nActions = humanity.campFromId(i).nActions;
      if (maxActions < nActions) {
        maxActions = nActions;
        maxActionId = i;
      }
    }
    // Compute handicap = Σi (max - nAction[i]).
    var handicap = 0;
    for (var i = 0; i < humanity.numberOfCamps; i++) {
      if (i !== maxActionId) {
        handicap += maxActions - humanity.campFromId(i).nActions;
      }
    }
    // Exact half the handicap.
    //console.log('exacting handicap = ' + ((handicap / 2)|0));
    runAiNTimes((handicap / 2)|0);
  }
}

// Run the AI algorithm `n` times. May span multiple ticks.
function runAiNTimes(n) {
  if (n <= 0) { return; }
  var aiPlan = ai(terrain, humanity);
  if (aiPlan != null && lockedTiles[aiPlan.at] === undefined) {
    // The plan exists and doesn't bother users.
    aiPlan.ai = true;
    judgePlan(0, aiPlan, true, function() { runAiNTimes(n-1); });
  }
}

// Uncomment the following to make the AI play constantly.
//setInterval(function () {
//  var aiPlan = ai(terrain, humanity);
//  console.log('ai plan:', aiPlan);
//  if (aiPlan != null) { aiPlan.ai = true; judgePlan(0, aiPlan, true); }
//}, 1000);

var maxFood = 20;

// Collect from the humanity tile. If `addBuilding` is truthy,
// we add the building as a resource for a camp.
function collectFromTile(tileKey, humanityTile, addBuilding) {
  if (humanityTile.b === terrain.tileTypes.farm) {
    humanityTile.f = maxFood;
  } else if (humanityTile.b === terrain.tileTypes.factory) {
    getManufacture(humanityTile, terrain.manufacture.car);
  } else if (humanityTile.b === terrain.tileTypes.dock) {
    getManufacture(humanityTile, terrain.manufacture.boat);
  } else if (humanityTile.b === terrain.tileTypes.airport) {
    getManufacture(humanityTile, terrain.manufacture.plane);
  } else if (humanityTile.b === terrain.tileTypes.gunsmith) {
    getManufacture(humanityTile, terrain.manufacture.gun);
  }
}

function getManufacture(humanityTile, manufacture) {
  humanityTile.o |= manufacture;
  var binSum = binDigitSum(humanityTile.o);
  if (binSum > 2) {
    // We have to drop something.
    humanityTile.o = clearBit(humanityTile.o);
  }
}

function binDigitSum(a) {
  a = a|0;
  var sum = 0;
  while (a !== 0) {
    sum += (a & 1);
    a >>= 1;
  }
  return sum;
}
function clearBit(a) {
  a = a|0;
  var b = a|0;
  for (var i = 1; i < 32; i++) {
    a &= ~i;
    if (b !== a) { return a; }
  }
  return a;
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

var gameTurnTime = 50;     // Every 50ms.

function gameTurn() {
  // Send new humanity to all.
  if (Object.keys(updatedHumanity).length > 0) {
    humanity.change(updatedHumanity);
    addPopulation(updatedHumanity);
    updatedHumanity.population = humanity.population();
    updatedHumanity.war = warTiles;
    updatedHumanity.surrender = surrenderTiles;
    updatedHumanity.resources = humanity.getResources();
    actChannel.clients.forEach(function (client) {
      try {
        client.send(JSON.stringify(updatedHumanity));
      } catch(e) {
        console.error('Tried to send data to nonexistent client.');
      }
    });
  }
  terrain.clearPlans();
  updatedHumanity = {};
  warTiles = [];
  surrenderTiles = [];
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
    // Check for industry limit of population support.
    if (camp.population >= camp.populationLimit) { continue; }
    // Check for future increase of population.
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

function generateRandomDistance() {
  return ((Math.random() * 100)|0) + 50;
}

// Returns a list of spawn = {q,r}.
function findSpawn() {
  var spawns = new Array(humanity.numberOfCamps);
  var distanceBetweenPlayers = generateRandomDistance();
  maxPopulation = distanceBetweenPlayers * distanceBetweenPlayers;
  var oneSpot = {
    q:(Math.random() * 10000)|0,
    r:(Math.random() * 10000)|0,
  };
  spawns[0] = findNearestTerrain(oneSpot, terrain.tileTypes.steppe);
  var angle;
  for (var i = 1; i < humanity.numberOfCamps; i++) {
    angle = Math.random() * 2 * Math.PI;
    oneSpot = {
      q: (oneSpot.q + distanceBetweenPlayers * Math.cos(angle))|0,
      r: (oneSpot.r + distanceBetweenPlayers * Math.sin(angle))|0,
    };
    spawns[i] = findNearestTerrain(oneSpot, terrain.tileTypes.steppe);
  }
  return spawns;
}

var metallicFormation = [
  'Orebody',
  'Cavern',
  'Lore',
  'Pit',
  'Vein',
  'Reef'
];

// Return a map from tilekeys "q:r" to {type, name}
// type: treasure type, see terrain.tileTypes
// name: treasure name.
function findTreasures(spawn) {
  var treasures = {};
  var firstSpawn = spawn[0];
  var lastSpawn = spawn[spawn.length - 1];
  midSpot.q = (((firstSpawn.q + lastSpawn.q) / 2)|0);
  midSpot.r = (((firstSpawn.r + lastSpawn.r) / 2)|0);
  // Black Death.
  treasures[findBlackDeath(awayFrom(midSpot, generateRandomDistance()))] =
    new treasure.Treasure(terrain.tileTypes.blackdeath, 'Black Death');
  // Metal.
  var metalFormStart = (metallicFormation.length * Math.random())|0;
  for (var i = 0; i < 3; i++) {
    var name = metallicFormation[(metalFormStart+i) % metallicFormation.length];
    treasures[findBlackDeath(awayFrom(midSpot, generateRandomDistance()))] =
      new treasure.Treasure(terrain.tileTypes.metal,
                            'Metal ' + name);
  }
  return treasures;
}

var midSpot = {q:0, r:0};

// Return a tile position away from the mid point `midSpot`
function awayFrom(midSpot, distance) {
  var angle = Math.random() * 2 * Math.PI;
  return {
    q: (midSpot.q + distance * Math.cos(angle))|0,
    r: (midSpot.r + distance * Math.sin(angle))|0,
  };
}

// Return a tileKey of the position of the black death.
function findBlackDeath(oneSpot) {
  return terrain.keyFromTile(findNearestTerrain(oneSpot,
        terrain.tileTypes.mountain));
}
// Return a tileKey of the position of the medicine.
function findMedicine(oneSpot) {
  return terrain.keyFromTile(findNearestTerrain(oneSpot,
        terrain.tileTypes.forest));
}

// tile = {q,r}
// type: see terrain.tileTypes.
function findNearestTerrain(tile, type) {
  var k = 1;
  while (terrain(tile).type !== type) {
    // Take the bottom left tile.
    tile = terrain.neighborFromTile(tile, 4);
    // Go round.
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < k; j++) {
        tile = terrain.neighborFromTile(tile, i);
        if (terrain(tile).type === type) {
          return tile;
        }
      }
    }
    k++;
  }
  return tile;
}


// Starting the game.

function startGame() {
  humanity.setSpawn(findSpawn, findTreasures);
  startGameLoop();
}

function startGameLoop() {
  ai.clear(terrain, humanity);
  setTimeout(gameTurn, gameTurnTime);
}

var actChannel;
function start(camp) {
  humanity.start(terrain, findSpawn, findTreasures);
  startGameLoop();
  actChannel = camp.ws('act', actWSStart);
}


exports.start = start;
