// Thaddée Tyl. AGPLv3.
var World = require('./save-world.js');
var treasure = require('./treasure');
var AI = require('./ai/ai');
var ai;

// Lets you play as the opponent.
var cheatMode = false;

// Send and receive data from players.

var playerIdCount = 1;  // 0 is reserved for the AI.
function actWSStart(socket) {
  var playerId = playerIdCount++;
  console.log('Player', playerId, '[' + socket._socket.remoteAddress + ']',
              'entered the game.');
  socket.on('message', makeActWSRecv(playerId));
  socket.on('close', function() {
    delete humanity.lockedTiles[humanity.lockedTileFromPlayerId[playerId]];
  });
  socket.send(JSON.stringify(humanity.data()));
  var camp = campFromId(playerId);
  var playerCamp = humanity.campFromId(camp);
  socket.send(JSON.stringify({
    population: humanity.population(),
    camp: camp,
    goto: playerCamp.spawn,
    places: humanity.getPlaces(),
    centerTile: centerTile,
    campNames: humanity.campNames(),
    resources: humanity.getResources(),
    commodities: humanity.getCommodities(),
  }));
  socket.send(JSON.stringify({lockedTiles:humanity.lockedTiles}));
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

// Map from tileKey to a plan.
var planFromTile = {};

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
  if (playerId !== 0 && plan.to != null) {
    if (plan.at != null) {
      delete humanity.lockedTiles[plan.at];
    }
    humanity.lockedTiles[plan.to] = campFromIds[playerId];
    humanity.lockedTileFromPlayerId[playerId] = plan.to;
  }

  var travelPath;
  if (plan.do !== undefined && (typeof plan.at === 'string')) {
    // Check camp.
    var terrainTile = terrain.tileFromKey(plan.at);
    var humanityTile = humanity.tile(terrainTile);
    if (humanityTile !== undefined
        && (cheatMode? true: (humanityTile.c === campFromId(playerId)))
        && humanityTile.h > 0) {
      var camp = humanity.campFromId(humanityTile.c);
      // Check plan.
      if ((typeof plan.to === 'string') && (typeof plan.h === 'number')
       && plan.do === terrain.planTypes.move
       && (travelPath =
          terrain.humanTravelSpeedPath(terrainTile,
                         terrain.tileFromKey(plan.to))).length > 1
       && (plan.h > 0 || plan.h <= humanityTile.h)) {
        // Is the move valid?
        plan.travelPath = travelPath;
        planFromTile[plan.at] = plan;
        cb();
      } else if ((typeof plan.b === 'number' || plan.b === null)
             && plan.do === terrain.planTypes.build
             && terrain.validConstruction(plan.b, terrainTile,
               camp.resources)) {
        // Is the move valid?
        planFromTile[plan.at] = plan;
        cb();
      } else cb('Plan denied.');
    } else cb('Camp denied or no camp detected.');
  } else cb('Plan invalid.');
}

var updatedHumanity = {};
var warTiles = [];
var surrenderTiles = [];
// Map from "q:r" of sender to "q:r" of receiver.
var artilleryFire = {};

var humanCampTimeoutLimit = 5000;  // 5 minutes
var humanCampTimeout = [];
var campIdIsPlayedByHuman = [];  // Falsy: played by AI.
// Set camps as played by AI automatically.
function campPlayedByHuman(camp) {
  campIdIsPlayedByHuman[camp.id] = true;
  clearTimeout(humanCampTimeout[camp.id]);
  humanCampTimeout[camp.id] =
    setTimeout(campPlayedByAi, humanCampTimeoutLimit, camp);
}
function campPlayedByAi(camp) {
  campIdIsPlayedByHuman[camp.id] = false;
}
function campIsPlayedByHuman(camp) {
  return campIdIsPlayedByHuman[camp.id];
}

// Note: any mutation of humanity must be done on a humanity.copy(), so  that
// humanity.change() can pick up the differences.
function applyPlan(plan) {
  var tileFrom = terrain.tileFromKey(plan.at);
  var humanityFrom = humanity.copy(humanity.tile(tileFrom));
  var currentCamp = humanity.campFromId(humanityFrom.c);
  currentCamp.nActions++;
  if (!plan.ai) { campPlayedByHuman(currentCamp); }

  if (plan.do === terrain.planTypes.move) {
    //console.log('Plan: moving people from', plan.at, 'to', plan.to);
    var tileTo = terrain.tileFromKey(plan.to);
    var humanityTo = humanity.copy(humanity.tile(tileTo));
    var terrainTileFrom = terrain.tile(tileFrom);
    var terrainTileTo = terrain.tile(tileTo);

    // Do we have enough food?
    if (humanityFrom.f <= 0) {
      // They're starving, they will lose people.
      humanityFrom.h = (humanityFrom.h / 2)|0;
      if (humanityFrom.h < 0) { humanityFrom.h = 0; }
      if (humanityFrom.f < 0) { humanityFrom.f = 0; }
    }
    if (plan.h > humanityFrom.h) { plan.h = humanityFrom.h; }

    //console.log('Before:');
    //console.log('humanityFrom =', humanityFrom);
    //console.log('humanityTo =', humanityTo);
    var byPlane = (humanityFrom.o & terrain.manufacture.plane) !== 0;
    var emptyTarget = humanityTo.h === 0;
    var emptyingOrigin = (humanityFrom.h - plan.h) === 0;
    // Human movement.
    if (humanityTo.c != null && humanityTo.c !== humanityFrom.c) {
      // They're not us. This means war. Because culture difference.
      var ourForces = attackForce(plan.h, humanityFrom, humanityTo,
        terrainTileFrom, terrainTileTo);
      var theirForces = defenseForce(humanityTo.h, humanityFrom, humanityTo,
        terrainTileFrom, terrainTileTo);

      // Imbalance is > 1 if we win.
      var imbalance = ourForces / theirForces;
      //console.log('imbalance:', imbalance);
      if (imbalance <= 1) {
        // We lose.
        humanityTo.h -= ((humanityTo.h * imbalance)|0);
        humanityFrom.h -= plan.h;
        updatedHumanity[plan.at] = humanityFrom;
        updatedHumanity[plan.to] = humanityTo;
        warTiles.push(plan.to);
        return;
      } else {
        // We win.
        var surrounded = surrender(plan.to, humanityFrom.c);
        var surrenderers = (((surrounded / 6) * humanityTo.h)|0);
        humanityTo.h = plan.h - ((plan.h * (1/imbalance))|0)
                              + surrenderers;
        if (surrenderers > 0) {
          surrenderTiles.push(plan.to);
        } else {
          warTiles.push(plan.to);
        }
        humanityFrom.h -= plan.h;
        humanityFrom.f -= 5;
        emptyTarget = true;
      }
      // If it is a university, we acquired it.
      if (humanityTo.b === terrain.tileTypes.university) {
        var universityConquests = currentCamp.acquiredUniversitiesMap[plan.to];
        universityConquests = universityConquests || 0;
        universityConquests++;
        currentCamp.acquiredUniversitiesMap[plan.to] = universityConquests;
      }
    } else {
      // Joining forces.
      if (plan.h + humanityTo.h > 20) { plan.h = 20 - humanityTo.h; }
      humanityTo.h += plan.h;
      humanityFrom.h -= plan.h;
    }
    // We survived there so far. Receive artillery fire.
    var artilleryFire = artilleryDamage(tileTo, humanityFrom.c);
    humanityTo.h -= artilleryFire;
    // Camp
    humanityTo.c = humanityFrom.c;
    // Food.
    humanityTo.f = humanityFrom.f - (byPlane? 2: 1);
    if (humanityTo.f > 20) { humanityTo.f = 20; }
    // Ownership is the intersection of what each group owns.
    if (!emptyTarget) { humanityTo.o &= humanityFrom.o; }
    else { humanityTo.o = humanityFrom.o; }
    // Lay roads or walls.
    if (plan.travelPath != null &&
        (plan.lay === terrain.tileTypes.road ||
         plan.lay === terrain.tileTypes.wall)) {
      lay(plan.lay, plan.travelPath, updatedHumanity, humanityTo, terrainTileTo);
    }

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
      var spot = humanity.findMountain(
        humanity.awayFrom(tileFrom, humanity.generateRandomDistance()));
      humanity.moveTreasure(terrain.tileTypes.blackdeath, plan.at,
        spot, updatedHumanity, 'Airport');
      // Send the new treasure.
      updatedHumanity.places = humanity.getPlaces();
    } else if (plan.b === terrain.tileTypes.mine) {
      // It can be a mine construction.
      var spot = humanity.findMountain(
        humanity.awayFrom(tileFrom, humanity.generateRandomDistance()));
      humanity.moveTreasure(terrain.tileTypes.metal, plan.at,
        spot, updatedHumanity, 'Mine');
      // Send the new treasure.
      updatedHumanity.places = humanity.getPlaces();
    } else if (plan.b === terrain.tileTypes.university) {
      // It can be a university construction. Shocker, I know.
      var spot = humanity.findMeadow(
        humanity.awayFrom(tileFrom, humanity.generateRandomDistance()));
      humanity.moveTreasure(terrain.tileTypes.citrus, plan.at,
        spot, updatedHumanity, 'University');
      // Send the new treasure.
      updatedHumanity.places = humanity.getPlaces();
    }
    if (plan.b === terrain.tileTypes.farm) {
      // Human cost.
      humanityFrom.h--;
    }
    // Costs.
    var costs = terrain.buildingDependencies[plan.b];
    if (costs != null) {
      for (var i = 0; i < costs.length; i++) {
        // Each cost is either a nearby building or a resource.
        // The first element of a cost is the quantity, second is type.
        // Resources have a negative type.
        if (costs[i][1] < 0) {
          if (costs[i][1] === terrain.resourceTypes.stock) {
            currentCamp.usedStock += costs[i][0];
          } else if (costs[i][1] === terrain.resourceTypes.production) {
            currentCamp.usedProduction += costs[i][0];
          } else if (costs[i][1] === terrain.resourceTypes.wealth) {
            currentCamp.usedWealth += costs[i][0];
          }
        }
      }
    }
    humanityFrom.b = plan.b;
    updatedHumanity[plan.at] = humanityFrom;
    collectFromTile(plan.at, humanityFrom, true);
  }
}

// Forcepower bonuses.
function vehicleBonus(fromManufacture, toManufacture, steepness) {
  var bonus = 1;
  if ((fromManufacture & terrain.manufacture.gun) !== 0) {
    bonus *= 2;
  }
  // Car
  if ((fromManufacture & terrain.manufacture.car) !== 0) {
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5;
    }
    if ((toManufacture & terrain.manufacture.plane) !== 0) {
      bonus *= 0.5;
    }
    if (steepness === terrain.tileTypes.steppe) {
      bonus *= 1.5;
    }
  }
  // Boat
  if ((fromManufacture & terrain.manufacture.boat) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5;
    }
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5;
    }
    if ((toManufacture & terrain.manufacture.plane) !== 0) {
      bonus *= 0.5;
    }
    if (steepness === terrain.tileTypes.water) {
      bonus *= 1.5;
    }
  }
  // Artillery
  if ((fromManufacture & terrain.manufacture.artillery) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5;
    }
    if ((toManufacture & terrain.manufacture.boat) !== 0) {
      bonus *= 0.5;
    }
    if (steepness === terrain.tileTypes.hill) {
      bonus *= 1.5;
    }
  }
  // Plane
  if ((fromManufacture & terrain.manufacture.plane) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5;
    }
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5;
    }
    if ((toManufacture & terrain.manufacture.boat) !== 0) {
      bonus *= 0.5;
    }
    if (steepness === terrain.tileTypes.mountain) {
      bonus *= 1.5;
    }
  }
  return bonus;
}
function attackForce(force, attacker, defender,
    attackerTerrain, defenderTerrain) {
  force *= vehicleBonus(attacker.o, defender.o,
    attackerTerrain.steepness);
  if (attackerTerrain.steepness > defenderTerrain.steepness) {
    force *= 1.5;
  }
  return force;
}
function defenseForce(force, attacker, defender,
    attackerTerrain, defenderTerrain) {
  force *= vehicleBonus(defender.o, 0,
    defenderTerrain.steepness);
  if (defenderTerrain.vegetation) {
    force *= 1.5;
  }
  return force;
}

// Build roads along the `travelPath` [{q,r}], and on `humanityFrom`.
// Mutates `updatedHumanity`.
// If `terrainTileTo` (output of `terrain.tile()`) is water,
// don't build the road.
function lay(type, travelPath, updatedHumanity, humanityTo, terrainTileTo) {
  var terrainTileFrom = terrain.tile(terrain.tileFromKey(travelPath[0]));
  // Don't build roads over water.
  if (terrainTileFrom.type === terrain.tileTypes.water
   || terrainTileTo.type === terrain.tileTypes.water) { return; }
  for (var i = 0; i < travelPath.length; i++) {
    var tileKey = travelPath[i];
    var tile = terrain.tileFromKey(tileKey);
    var humanityTile = humanity.tile(tile);
    if (humanityTile == null || humanityTile.b == null) {
      var newHumanityTile = humanity.copy(humanityTile);
      newHumanityTile.b = type;
      updatedHumanity[tileKey] = newHumanityTile;
    }
  }
  if (humanityTo.b == null) {
    humanityTo.b = type;
  }
}

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
  } else if (humanityTile.b === terrain.tileTypes.arsenal) {
    getManufacture(humanityTile, terrain.manufacture.artillery);
  }
}

function getManufacture(humanityTile, manufacture) {
  // We already have that manufacture.
  if ((humanityTile.o & manufacture) !== 0) { return; }
  if (!zeroOrOneManufacture(humanityTile.o)) {  // we have 2 manufactures
    // We have to drop something.
    humanityTile.o = clearBit(humanityTile.o);
  }
  humanityTile.o |= manufacture;
}

function zeroOrOneManufacture(a) {
  a = a|0;
  // It is a power of two or zero.
  return (a & -a) === a;
}
function clearBit(a) {
  a = a|0;
  return a & ~smallestBit(a);
}
function smallestBit(a) {
  a = a|0;
  // 5 manufacture items, so limit = 2^5 = 32.
  for (var i = 1; i < 32; i <<= 1) {
    if ((a & i) > 0) { return i; }
  }
  return 0;
}

// Are the people in tileKey = "q:r" surrounded by camp?
function surrender(tileKey, campId) {
  // How many people around.
  var surrounded = 0;
  for (var i = 0; i < 6; i++) {
    var neighbor = humanity.tile(
        terrain.neighborFromTile(terrain.tileFromKey(tileKey), i));
    if (neighbor && neighbor.c === campId) {
      surrounded++;
    }
  }
  return surrounded;
}

var artilleryRange = 5;

// Take damage for nearby artillery.
// tile: {q,r}
// campId: number, index of camp.
function artilleryDamage(tile, campId) {
  var tileKey = terrain.keyFromTile(tile);
  if (artilleryFire[tileKey] === undefined) {
    artilleryFire[tileKey] = [];
  }
  // Find all artillery in range.
  var totalArtillery = 0;
  humanity.findNearest(tile, function(aTile) {
    var humanityTile = humanity.tile(aTile);
    if (humanityTile && humanityTile.c !== campId
      && (humanityTile.o & terrain.manufacture.artillery) !== 0) {
      totalArtillery += humanityTile.h;
      artilleryFire[tileKey].push(terrain.keyFromTile(aTile));
    }
    return false;  // We want to explore all the circle.
  }, artilleryRange);
  return (totalArtillery/4)|0;
}



// Game turn.

var gameTurnTime = 50;     // Every 50ms.
var maxProduction = 13;  // Winning amount of production for an Industrial Victory.
var maxAcquiredUniversities = 3;

function gameTurn() {
  var includeHumanMove = false;
  // Apply all plans.
  for (var tileKey in planFromTile) {
    var plan = planFromTile[tileKey];
    applyPlan(plan);
    if (!plan.ai) { includeHumanMove = true; }
  }
  planFromTile = {};
  // Send new humanity to all.
  if (Object.keys(updatedHumanity).length > 0) {
    addPopulation(updatedHumanity);
    humanity.change(updatedHumanity);
    updatedHumanity.population = humanity.population();
    updatedHumanity.war = warTiles;
    updatedHumanity.surrender = surrenderTiles;
    updatedHumanity.artilleryFire = artilleryFire;
    updatedHumanity.resources = humanity.getResources();
    updatedHumanity.lockedTiles = humanity.lockedTiles;
    if (humanity.commoditiesChanged) {
      updatedHumanity.commodities = humanity.getCommodities();
      humanity.commoditiesChanged = false;
    }
    var jsonUpdatedHumanity = JSON.stringify(updatedHumanity);
    actChannel.clients.forEach(function (client) {
      try {
        client.send(jsonUpdatedHumanity);
      } catch(e) {
        console.error('Tried to send data to nonexistent client.');
      }
    });
    // Also send this information to the AI.
    ai.updateHumanity(jsonUpdatedHumanity);
    if (includeHumanMove) {
      runAi();
    }
  }
  terrain.clearPlans();
  updatedHumanity = {};
  warTiles = [];
  surrenderTiles = [];
  artilleryFire = {};
  // The game ends if one of the camps is empty, or is too high.
  var gameOver = false;
  var winType;
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    var currentCamp = humanity.campFromId(i);
    var campPopulation = currentCamp.population;
    if ((currentCamp.production - currentCamp.usedProduction) >=
        maxProduction) {
      winType = 'Industrial';
      var winners = humanity.winners(function(camp) {
        return camp.production - camp.usedProduction;
      });
      gameOver = true;
    } else if (currentCamp.acquiredUniversities >= maxAcquiredUniversities) {
      winType = 'Intellectual';
      var winners = humanity.winners(function(camp) {
        return camp.acquiredUniversities;
      });
      gameOver = true;
    }
  }
  if (gameOver) {
    actChannel.clients.forEach(function (client) {
      client.send(JSON.stringify({ winners: winners, winType: winType }));
    });
    startGame();
  } else {
    setTimeout(gameTurn, gameTurnTime);
  }
}

function runAi() {
  //ai.runCamp(humanity.campFromId(0));
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    var camp = humanity.campFromId(i);
    if (!campIsPlayedByHuman(camp)) {
      ai.runCamp(camp);
    }
  }
}

// Birth. Add folks on home tiles.
function addPopulation(updatedHumanity) {
  var camp;
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    camp = humanity.campFromId(i);
    // Check for university limit of population support.
    if (camp.population >= camp.populationLimit) {
      secession(camp, updatedHumanity);  // Revolution!
    }
    // Check for future increase of population.
    var targetPopulation = Math.min(camp.populationCap, camp.populationLimit);
    var newPopulation = targetPopulation - camp.population;
    if (newPopulation > 0) {
      var residenceHomes = Object.keys(camp.residence);
      var skyscraperHomes = Object.keys(camp.skyscraper);
      var nResidenceHomes = humanity.homePerHouse.residence;
      var nSkyscraperHomes = humanity.homePerHouse.skyscraper;
      // Start with the most recent homes.
      for (var i = skyscraperHomes.length - 1; i >= 0; i--) {
        var humanityTile = humanity.tile(
            terrain.tileFromKey(skyscraperHomes[i]));
        if (humanityTile == null) { debugger; continue; }
        var freeHomes = nSkyscraperHomes - humanityTile.h;
        if (freeHomes > 0) {
          var nFolks = Math.min(freeHomes, newPopulation);
          addFolk(skyscraperHomes, i, nFolks);
          newPopulation -= nFolks;
          if (newPopulation <= 0) { break; }
        }
      }
      for (var i = residenceHomes.length - 1; i >= 0; i--) {
        var humanityTile = humanity.tile(
            terrain.tileFromKey(residenceHomes[i]));
        if (humanityTile == null) { debugger; continue; }
        var freeHomes = nResidenceHomes - humanityTile.h;
        if (freeHomes > 0) {
          var nFolks = Math.min(freeHomes, newPopulation);
          addFolk(residenceHomes, i, nFolks);
          newPopulation -= nFolks;
          if (newPopulation <= 0) { break; }
        }
      }
      camp.population = targetPopulation;
    }
  }
}

function addFolk(homes, index, number) {
  var randomHome = homes[index];
  var tile = terrain.tileFromKey(randomHome);
  var randomHomeTile = humanity.tile(tile);
  randomHomeTile.h += number;
  randomHomeTile.f = maxFood;
  var terrainTile = terrain.tile(tile);
  if (terrainTile.type === terrain.tileTypes.mountain) {
    getManufacture(randomHomeTile, terrain.manufacture.car);
  } else if (terrainTile.type === terrain.tileTypes.taiga) {
    getManufacture(randomHomeTile, terrain.manufacture.plane);
  }
  updatedHumanity[randomHome] = randomHomeTile;
}

// c is a Camp
function secession(camp, updatedHumanity) {
  var tile = humanity.tileWith(function(humanityTile) {
    return humanityTile.c === camp.id && humanityTile.b != null
      && humanityTile.h > 0;
  });
  var excessPopulation = camp.population - camp.populationLimit;
  // Create a new camp, or join an existing <50 folks camp.
  var newCamp = humanity.addOrReuseCamp(50);
  humanity.findNearest(tile, function(tile) {
    var revoltedTile = humanity.copy(humanity.tile(tile));
    if (revoltedTile !== undefined && revoltedTile.c != null) {
      revoltedTile.c = newCamp.id;
      updatedHumanity[terrain.keyFromTile(tile)] = revoltedTile;
      excessPopulation -= revoltedTile.h;
    }
    return excessPopulation <= -40;
  }, 8);
}

// Starting the game.

function startGame() {
  centerTile = humanity.setSpawn();
  console.log('center:', centerTile);
  startGameLoop();
}

function startGameLoop() {
  if (ai !== undefined) { ai.kill(); }
  ai = new AI(humanity, function checkAiPlans(plans) {
    for (var i = 0; i < plans.length; i++) {
      var aiPlan = plans[i];
      if (aiPlan != null) {
        console.log('AI plan:', plans[i]);
        aiPlan.ai = true;
        judgePlan(0, aiPlan, true, function(msg) {
          if (msg != null) { console.log(msg); }
        });
      }
    }
  });
  // Uncomment the following to make the AI play constantly.
  //ai.realtime();
  setTimeout(gameTurn, gameTurnTime);
}

var worldFile = process.argv[3] || './world.json';

var actChannel;
var world;
var terrain;
var humanity;
var centerTile;

function start(camp) {
  world = new World(worldFile);
  terrain = world.terrain;
  humanity = world.humanity;
  centerTile = humanity.centerTile;
  console.log('center:', centerTile);
  startGameLoop();
  actChannel = camp.ws('act', actWSStart);
}


exports.start = start;
