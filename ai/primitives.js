// A few polynomial-time primitives for the AI.

var terrain = require('terrain-gen');

var humanity;
function init(humans) {
  humanity = humans;
}

// Given a tile position and something to build, find the nearest tile where it
// can be built, or null.
function findConstructionLocation(tile, b) {
  var dependencies = terrain.buildingDependencies[b];
  var sameTileDependency = terrain.buildingTileDependency[b];
  // Aggregate all terrain-based requirements.
  // That includes terrain and things which cannot be built.
  if (isGenerated(sameTileDependency)) {
    var sameTileTerrainDependency = sameTileDependency;
  }
  // List of [number, building type].
  var terrainDependencies = dependencies.filter(function(dep) {
    return isGenerated(dep[1]);
  });
  return humanity.findNearest(tile, function(tile) {
    // Current tile requirement.
    if (sameTileTerrainDependency) {
      var humanityTile = humanity(tile);
      if (!isOneOf(terrain(tile).type, sameTileTerrainDependency)) {
        if (humanityTile == null) { return false; }
        if (!isOneOf(humanityTile.b, sameTileTerrainDependency)) {
          return false;
        }
      }
    }
    // For each surrounding dependency, count the surroundings.
    for (var i = 0; i < terrainDependencies.length; i++) {
      var dependencyCount = terrainDependencies[i][0];
      var dependencyType = terrainDependencies[i][1];
      var count = 0;
      for (var j = 0; j < 6; j++) {
        var neighbor = terrain.neighborFromTile(tile, j);
        var humanityNeighbor = humanity(neighbor);
        if (terrain(neighbor).type === dependencyType
          || (humanityNeighbor && humanityNeighbor.b === dependencyType)) {
          count++;
        }
      }
      if (count < dependencyCount) {
        return false;
      }
    }
    return true;
  });
}

// Given a building type (number), returns true if it can be built.
function isBuilding(b) {
  return terrain.buildingTypes.indexOf(b) >= 0;
}

// Given a dependency item (building, terrain, resource), returns true if that
// dependency was generated by the world.
function isGenerated(b) {
  // b can be negative if it is a resource.
  return  b >= 0 && !isBuilding(b);
}

// buildings: list of building types (as numbers).
// b: building.
// Returns true if b is either one of the buildings in the list.
function isOneOf(b, buildings) {
  return buildings.indexOf(b) >= 0;
}

// Compute the set of buildings to build, in order, to be able to build
// something specific, on a tile.
// b: terrain.tileTypes
// tile: {q,r}
// forbiddenTiles: [{q,r}]
// Returns a list of {tile: {q,r}, building: type} that needs to be
// constructed, in the correct order (see terrain.tileTypes).
function dependencyBuilds(b, tile, forbiddenTiles) {
  forbiddenTiles = forbiddenTiles || [];
  // List of {tile: {q,r}, building: type}.
  var buildings = [];
  var dependencies = terrain.buildingDependencies[b];
  dependencies = dependencies || [];
  for (var i = 0; i < dependencies.length; i++) {
    var number = dependencies[i][0];
    var buildingType = dependencies[i][1];
    // Ignore resource requirements…
    if (buildingType < 0) { continue; }
    // Ignore terrain requirements…
    if (!isBuilding(buildingType)) { continue; }
    var dependencySatisfied = false;
    // Choose a random starting neighbor, check all neighbors.
    var startingNeighbor = (Math.random() * 6)|0;
    for (var j = 0; j < 6; j++) {
      var n = (j + startingNeighbor) % 6;
      var neighbor = terrain.neighborFromTile(tile, n);
      // Is this neighbor authorized?
      if (isOneOf(neighbor, forbiddenTiles)) { continue; }
      var neighborBuildings =
        dependencyBuilds(buildingType, neighbor, forbiddenTiles);
      if (neighborBuildings != null) {
        // We can build that.
        buildings = buildings.concat(neighborBuildings);
        // We mustn't destroy this tile, it is needed to build `b`.
        forbiddenTiles = forbiddenTiles.concat(tile);
        number -= 1;
        if (number <= 0) {
          // We have build everything of this type of building.
          dependencySatisfied = true;
          break;
        }
      }
    }
    if (!dependencySatisfied) { return null; }
  }
  // We have built all the dependencies, now we can build the final piece.
  buildings.push({ tile: tile, building: b });
  return buildings;
}



exports.init = init;
exports.findConstructionLocation = findConstructionLocation;
exports.dependencyBuilds = dependencyBuilds;