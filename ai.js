// Welcome to dumbai.

// List from campId to map from building to tileKeys where we perform the
// project.
var constructionProjects;
// List from campId to list of tileKeys.
var destinationProjects;

var buildingValue = {};
var totalValue = 1;


function clear(terrain, humanity) {
  constructionProjects = new Array(humanity.numberOfCamps);
  destinationProjects = new Array(humanity.numberOfCamps);
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    constructionProjects[i] = {};
    destinationProjects[i] = [];
  }
  // Building value.
  buildingValue[terrain.tileTypes.farm] = 2;
  buildingValue[terrain.tileTypes.residence] = 30;
  buildingValue[terrain.tileTypes.skyscraper] = 13;
  buildingValue[terrain.tileTypes.factory] = 7;
  buildingValue[terrain.tileTypes.dock] = 7;
  buildingValue[terrain.tileTypes.gunsmith] = 35;
  buildingValue[terrain.tileTypes.airland] = 4;
  buildingValue[terrain.tileTypes.airport] = 20;
  buildingValue[terrain.tileTypes.road] = 1;
  buildingValue[terrain.tileTypes.wall] = 0;
  totalValue = 0;
  for (var building in buildingValue) {
    totalValue += buildingValue[building];
  }
}

// Return a plan, or undefined (if unsuccessful).
function findBuildingPlan(terrain, humanity, humanityData,
    ourTiles, campId, building) {
  // Are there valid construction sites?
  for (var i = 0; i < ourTiles.length; i++) {
    var tile = terrain.tileFromKey(ourTiles[i]);
    var humanityTile = humanityData[ourTiles[i]];
    if (terrain.validConstruction(building, tile)) {
      if (constructionProjects[campId][building] === ourTiles[i]) {
        constructionProjects[campId][building] = null;
      }
      if (humanityTile.b != null?
          buildingValue[building] > buildingValue[humanityTile.b]: true) {
        return { at: ourTiles[i], do: terrain.planTypes.build, b: building };
      }
    }
  }
  // Did we work on something?
  if (constructionProjects[campId][building] == null
      || ((humanityTile = humanityData[constructionProjects[campId][building]])
          && humanityTile.c !== campId)
      || (!humanityTile) || (humanityTile.h <= 0)
      // Randomly remove projects (because they are sometimes impossible).
      || Math.random() < 0.05) {
    // Let's make a project!
    for (var i = 0; i < ourTiles.length; i++) {
      if (humanityData[ourTiles[i]].b == null &&
          terrain(ourTiles[i]).type !== terrain.tileTypes.water) {
        constructionProjects[campId][building] = ourTiles[i];
      }
    }
  }
  if (constructionProjects[campId][building] == null) { return; }
  // Find what we require to finish the project.
  var requiredDependencies = terrain.buildingDependencies[building];
  if (!requiredDependencies) { return; }
  var dependencies = new Array(requiredDependencies.length);
  var unoccupied = [];  // neighbors with no people on it.
  var unbuilt = [];  // neighbors with no buildings on it.
  for (var i = 0; i < dependencies.length; i++) { dependencies[i] = 0; }
  var tile = terrain.tileFromKey(constructionProjects[campId][building]);
  for (var i = 0; i < 6; i++) {
    var neighbor = terrain.neighborFromTile(tile, i);
    var humanityNeighbor = humanity(neighbor);
    var terrainNeighbor = terrain(neighbor);
    if (!humanityNeighbor || humanityNeighbor.c !== campId) {
      unoccupied.push(neighbor);
      continue;
    } else if (humanityNeighbor.b == null) {
      unbuilt.push(neighbor);
      continue;
    }
    for (var j = 0; j < requiredDependencies.length; j++) {
      if (humanityNeighbor.b === requiredDependencies[j][1] ||
          terrainNeighbor.type === requiredDependencies[j][1]) {
        dependencies[j]++;
      }
    }
  }
  for (var j = 0; j < dependencies.length; j++) {
    if (dependencies[j] < requiredDependencies[j][0]) {
      if (requiredDependencies[j][1] === 0) { continue; }
      // We know what to build.
      if (unbuilt.length > 0) {
        // Someone can do it.
        return {
          at: terrain.keyFromTile(unbuilt[0]),
          do: terrain.planTypes.build,
          b: requiredDependencies[j][1]
        };
      } else if (unoccupied.length > 0) {
        // We can put someone there.
        destinationProjects[campId].push(terrain.keyFromTile(unoccupied[0]));
        return;
      } else {
        constructionProjects[campId][building] = null;
      }
    }
  }
}

// a and b are tiles = {q,r}.
function distance(a, b) {
  return (Math.abs(a.q - b.q) +
          Math.abs(a.r - b.r) +
          Math.abs(a.q + a.r - b.q - b.r)) / 2;
}

// Return the closest tileKey we can go to from atTileKey
// in order to go to the target toTileKey.
function closestTowards(terrain, humanity, atTileKey, toTileKey) {
  var accessibleTiles = terrain.humanTravel(terrain.tileFromKey(atTileKey));
  var toTile = terrain.tileFromKey(toTileKey);
  var closest;
  var shortestDistanceYet = Infinity;
  for (var tileKey in accessibleTiles) {
    if (closest === undefined) { closest = tileKey; continue; }
    var tile = terrain.tileFromKey(tileKey);
    var thisDistance = distance(tile, toTile);
    if (thisDistance < shortestDistanceYet) {
      shortestDistanceYet = thisDistance;
      closest = tileKey;
    }
  }
  return closest;
}

// Return a plan to travel towards the enemy. Or a building in construction.
// Or nothing.
function findTravelPlan(terrain, humanity, humanityData, ourTiles, campId) {
  // Find someone to go somewhere.
  var fromTile, fromHumanityTile;
  if (destinationProjects[campId].length > 0) {
    var closest = Infinity;   // Will seek the closest humans.
    for (var i = 0; i < ourTiles.length; i++) {
      var humanityTile = humanityData[ourTiles[i]];
      var newDistance = distance(ourTiles[i], destinationProjects[campId][0]);
      if (newDistance < closest && humanityTile.h > 1) {
        closest = newDistance;
        fromTile = ourTiles[i];
        fromHumanityTile = humanityTile;
      }
    }
  }
  if (fromHumanityTile === undefined) {
    var nHumans = 0;   // Will seek the highest number of humans on a tile.
    for (var i = 0; i < ourTiles.length; i++) {
      var humanityTile = humanityData[ourTiles[i]];
      if (humanityTile.h > nHumans) {
        nHumans = humanityTile.h;
        fromTile = ourTiles[i];
        fromHumanityTile = humanityTile;
      }
    }
  }
  // Are we hungry there?
  if (fromHumanityTile.f < 2) {
    return {
      at: fromTile,
      do: terrain.planTypes.build,
      b: terrain.tileTypes.farm
    };
  }
  // Go somewhere.
  var directionTile;
  if (destinationProjects[campId].length > 0) {
    directionTile = destinationProjects[campId][0];
  } else {
    // Go towards the enemy!
    if ((fromHumanityTile.b === terrain.tileTypes.residence ||
         fromHumanityTile.b === terrain.tileTypes.farm ||
         fromHumanityTile.b === terrain.tileTypes.skyscraper) &&
        fromHumanityTile.h < 2) { return ; }
    var enemyPicked = ((Math.random() * humanity.numberOfCamps)|0);
    for (var tileKey in humanityData) {
      if (humanityData[tileKey].h > 0 && humanityData[tileKey].c === enemyPicked) {
        directionTile = tileKey;
        break;
      }
    }
  }
  var toTile = closestTowards(terrain, humanity, fromTile, directionTile);
  if (toTile === directionTile || Math.random() < 0.2) {
    destinationProjects[campId].shift();
  }
  return {
    at: fromTile,
    do: terrain.planTypes.move,
    to: toTile,
    h: ((fromHumanityTile.h > 1)? (fromHumanityTile.h - 1): fromHumanityTile.h)
  };
}

// Select the building we want to construct.
function selectBuilding() {
  var select = Math.random();
  var acc = 0;
  for (var building in buildingValue) {
    acc += buildingValue[building] / totalValue;
    if (select < acc) { return +building; }
  }
  return +building;
}

// Return a plan. Or undefined.
function run(terrain, humanity) {
  var leastCamp = humanity.campFromId(0);
  for (var i = 1; i < humanity.numberOfCamps; i++) {
    var camp = humanity.campFromId(i);
    if (camp.nActions < leastCamp.nActions) {
      leastCamp = camp;
    }
  }
  var ourTiles = [];
  var humanityData = humanity.data();
  for (var tileKey in humanityData) {
    var humanityTile = humanityData[tileKey];
    if (humanityTile.c === leastCamp.id) {
      // This is the nationality we seek to help.
      ourTiles.push(tileKey);
    }
  }
  if (ourTiles.length <= 0) { return; }
  // Now, pick what we do.
  if (Math.random() < 0.6) {
    // What building do we want to create?
    var building = selectBuilding();
    // Let's pick a location to build that.
    var buildingPlan = findBuildingPlan(terrain, humanity, humanityData,
        ourTiles, leastCamp.id, building);
    if (buildingPlan != null) {
      return buildingPlan;
    }
  }
  // We're going to travel.
  return findTravelPlan(terrain, humanity, humanityData, ourTiles, leastCamp.id);
}

module.exports = run;
module.exports.clear = clear;
