// A few polynomial-time primitives for the AI.

var Terrain = require('terrain-gen');
var terrain = new Terrain();

// The following buildings are built on a place.
var lookAtPlaces = Object.create(null);
lookAtPlaces[terrain.tileTypes.mine] = true;
lookAtPlaces[terrain.tileTypes.industry] = true;
lookAtPlaces[terrain.tileTypes.university] = true;

var lookAroundBuildings = Object.create(null);
lookAroundBuildings[terrain.tileTypes.industry] = [ terrain.tileTypes.mine ];
lookAroundBuildings[terrain.tileTypes.lumber] = [terrain.tileTypes.lumber];

// Given a tile position and something to build, find the nearest tile where it
// can be built, or null.
// options:
// - tiles: list of {q,r} tiles where we own buildings.
// - maxSearch: radius (in unit tiles) of the search.
// - valid: function taking a tile, returning false is the tile is inacceptable,
//   returning null if the search should be stopped.
// - forbiddenTiles: [{q,r}], see `dependencyBuilds()`.
function findConstructionLocation(humanity, tile, b, options) {
  var valid = options.valid;
  var maxSearch = (options.maxSearch|0) || null;
  var builtTiles = options.builtTiles;
  var isValid = function(tile) {
    var isTerrainValid = validConstructionLocation(humanity, tile, b);
    if (!isTerrainValid) { return false; }
    // Check that the build order succeeds.
    if (dependencyBuilds(humanity, b, tile, options.forbiddenTiles) != null) {
      if (valid != null) {
        return valid(tile);
      } else { return true; }
    } else { return false; }
  };
  // Tiles for which we should look around.
  var tilesWithThatBuilding = [];
  // Should we look up places first?
  if (lookAtPlaces[b] != null) {
    var places = humanity.getPlaces();
    for (var tileKey in places) {
      var tileWithBuilding = terrain.tileFromKey(tileKey);
      tilesWithThatBuilding.push(tileWithBuilding);
    }
  }
  // Should we look up around certain buildings first?
  if (lookAroundBuildings[b] != null) {
    var buildingTypes = lookAroundBuildings[b];
    // Find a tile holding a building of that type.
    for (var bti = 0; bti < buildingTypes.length; bti++) {
      var buildingType = buildingTypes[bti];
      for (var i = 0; i < builtTiles.length; i++) {
        var humanityTile = humanity.tile(builtTiles[i]);
        if (humanityTile && humanityTile.b === buildingType) {
          tilesWithThatBuilding.push(builtTiles[i]);
        }
      }
    }
  }
  var closestBuilding = null;
  var buildingDistance = MAX_INT;
  for (var i = 0; i < tilesWithThatBuilding.length; i++) {
    var tb = humanity.findNearest(tilesWithThatBuilding[i], isValid, 2);
    if (tb !== null) {
      var distance = distanceBetweenTiles(tile, tb);
      if (distance < buildingDistance) {
        closestBuilding = tb;
        buildingDistance = distance;
      }
    }
  }
  if (closestBuilding !== null) { return closestBuilding; }
  // Look around the given tile.
  return humanity.findNearest(tile, isValid, maxSearch);
}

// Check whether building `b` (see `terrain.tileTypes`) has all requirements
// met on `tile` {q,r} regarding generated terrain features on the current tile
// and on tiles surrounding it.
function validConstructionLocation(humanity, tile, b) {
  var dependencies = terrain.buildingDependencies[b];
  dependencies = dependencies || [];
  var sameTileDependency = terrain.buildingTileDependency[b];
  var terrainTile = terrain.tile(tile);
  var humanityTile = humanity.tile(tile);

  // This tile must not hold water.
  if (terrainTile.type === terrain.tileTypes.water) { return false; }

  // Check for the dependency on the current tile.
  if (sameTileDependency) {
    var areOk = [];
    for (var i = 0; i < sameTileDependency.length; i++) {
      if (isOneOf(sameTileDependency[i], terrain.buildingTypes)) {
        // We must build this on top of something we can build.
        areOk.push(validConstructionLocation(tile, sameTileDependency[i]));
      } else {
        // We must build this on top of something generated.
        if (terrainTile.type === sameTileDependency[i]
         || (humanityTile && humanityTile.b === sameTileDependency[i])) {
          areOk.push(true);
        }
      }
    }
    // If there isn't a single acceptable option, return.
    if (areOk.every(function(a) { return !a; })) { return false; }
  }

  // Check for dependencies on neighbor tiles.
  // List of [number, building type] for generated things.
  var terrainDependencies = dependencies.filter(function(dep) {
    return isGenerated(dep[1]);
  });
  // For each surrounding dependency, count the surroundings.
  for (var i = 0; i < terrainDependencies.length; i++) {
    var dependencyCount = terrainDependencies[i][0];
    var dependencyType = terrainDependencies[i][1];
    var count = 0;
    for (var j = 0; j < 6; j++) {
      var neighbor = terrain.neighborFromTile(tile, j);
      var humanityNeighbor = humanity.tile(neighbor);
      if (terrain.tile(neighbor).type === dependencyType
        || (humanityNeighbor && humanityNeighbor.b === dependencyType)) {
        count++;
      }
    }
    if (count < dependencyCount) {
      return false;
    }
  }
  return true;
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

// tile: {q,r}
// tiles: [{q,r}]
// Returns true if `tile` is one of the tiles in `tiles`.
function tileIsOneOf(tile, tiles) {
  for (var i = 0; i < tiles.length; i++) {
    if (sameTile(tile, tiles[i])) { return true; }
  }
  return false;
}

// FIXME: dynamically build a list of valuable buildings.
var valuableBuildings = [
  terrain.tileTypes.dock,
  terrain.tileTypes.airport,
  terrain.tileTypes.wall,
  terrain.tileTypes.lumber,
  terrain.tileTypes.mine,
  terrain.tileTypes.industry,
  terrain.tileTypes.university,
];
var constructFromValuable = Object.create(null);
constructFromValuable[terrain.tileTypes.blackdeath] = terrain.tileTypes.airport;
constructFromValuable[terrain.tileTypes.metal] = terrain.tileTypes.mine;
constructFromValuable[terrain.tileTypes.citrus] = terrain.tileTypes.university;

// Compute the set of buildings to build, in order, to be able to build
// something specific, on a tile.
// b: terrain.tileTypes
// tile: {q,r}
// forbiddenTiles: [{q,r}]
// override: map from "q:r" to building type, showing buildings that
//   will be built during the construction. (Internal use.)
// buildingPurpose: building type (see terrain.tileTypes). (Internal use.)
// Returns a list of {tile: {q,r}, building: type} that needs to be
// constructed, in the correct order (see terrain.tileTypes).
function dependencyBuilds(humanity, b, tile, forbiddenTiles,
    override, buildingPurpose) {
  forbiddenTiles = forbiddenTiles || [];
  var humanityTile = humanity.tile(tile);

  // Don't destroy buildings of the type we're creating.
  if (buildingPurpose == null) {
    buildingPurpose = b;
    // Don't destroy a building which type you're currently building.
    if (humanityTile && humanityTile.b === buildingPurpose) { return null; }
  }
  // Don't build manufactures on tiles which require their items to get to.
  var terrainTile = terrain.tile(tile);
  if (inaccessibleForManufactureBuilding(buildingPurpose,
      terrainTile, humanityTile)) {
    return null;
  }
  if (humanityTile) {
    // Don't destroy buildings which cost resources.
    if (isOneOf(humanityTile.b, valuableBuildings)) { return null; }
    // … unless they're improvements.
    if (constructFromValuable[humanityTile.b] !== undefined
      && constructFromValuable[humanityTile.b] !== b) { return null; }
  }

  // Keep track of what gets destroyed and created while building.
  override = override || Object.create(null);
  var buildingOnTile = function(tile) {
    var tileKey = terrain.keyFromTile(tile);
    if (override[tileKey] != null) {
      return override[tileKey];
    }
    var humanityTile = humanity.tile(tile);
    if (humanityTile == null) { return null; }
    return humanityTile.b;
  };

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

    // Is what we are looking for already built there?
    for (var j = 0; j < 6; j++) {
      var neighbor = terrain.neighborFromTile(tile, j);
      var neighborTerrain = terrain.tile(neighbor);
      if (buildingOnTile(neighbor) === buildingType
        || neighborTerrain.type === buildingType) {
        forbiddenTiles = forbiddenTiles.concat(neighbor);
        number -= 1;
        if (number <= 0) {
          // We have built everything of this type of building.
          dependencySatisfied = true;
          break;
        }
      }
    }
    if (number <= 0) { continue; }

    // Choose a random starting neighbor, check all neighbors.
    var startingNeighbor = (Math.random() * 6)|0;
    for (var j = 0; j < 6; j++) {
      var n = (j + startingNeighbor) % 6;
      var neighbor = terrain.neighborFromTile(tile, n);
      // Is this neighbor constructible?
      var neighborTerrain = terrain.tile(neighbor);
      if (!validConstructionLocation(humanity, neighbor, buildingType)) {
        continue;
      }
      var neighborHumanity = humanity.tile(neighbor);
      // Don't destroy a building which type you're currently building.
      if (neighborHumanity &&
          neighborHumanity.b === buildingPurpose) { continue; }
      // Is this neighbor authorized?
      if (tileIsOneOf(neighbor, forbiddenTiles)) { continue; }
      var neighborBuildings =
        dependencyBuilds(humanity, buildingType, neighbor,
            forbiddenTiles, override, buildingPurpose);
      if (neighborBuildings != null) {
        // We can build that.
        buildings = buildings.concat(neighborBuildings);
        var lastNeighborBuilding =
          neighborBuildings[neighborBuildings.length - 1];
        // We mustn't destroy this tile, it is needed to build `b`.
        forbiddenTiles = forbiddenTiles.concat(lastNeighborBuilding.tile);
        number -= 1;
        if (number <= 0) {
          // We have built everything of this type of building.
          dependencySatisfied = true;
          break;
        }
      }
    }
    if (!dependencySatisfied) { return null; }
  }
  // We have built all the dependencies, now we can build the final piece.
  buildings.push({ tile: tile, building: b });
  override[terrain.keyFromTile(tile)] = b;
  return buildings;
}

// Find nearest terrain where nothing is built.
// size: number of layers that must be empty around the tile.
function findNearestEmpty(humanity, tile, size) {
  // Check whether the tile contains buildings.
  var builtTerrain = function builtTerrain(tile) {
    var human = humanity.tile(tile);
    if (human === undefined) { return false; }
    if (human.b == null) { return false; }
    return true;
  };

  return humanity.findNearest(tile, function(tile) {
    // If it finds no built terrain, we're good to go.
    return !humanity.findNearest(tile, builtTerrain, size);
  });
}

// Given a camp and a buildingType (see `terrain.tileTypes`),
// return a list of [quantity, resourceType], which indicates
// the resource type we need (see `terrain.resourceTypes`).
function resourceBuildRequirement(buildingType, camp) {
  var buildingRequirements = terrain.buildingDependencies[buildingType];
  var requirements = [];
  if (buildingRequirements == null) { return []; }
  var left = [camp.leftLumber, camp.leftMetal, camp.leftFarm];
  var type = terrain.listOfResourceTypes;
  // Extract required resources.
  for (var i = 0; i < buildingRequirements.length; i++) {
    var resourceType = buildingRequirements[i][1];
    var quantity = buildingRequirements[i][0];
    // Check whether it is an actual resource.
    for (var j = 0; j < type.length; j++) {
      if (resourceType === type[j]) {
        if (left[j] < quantity) {
          requirements.push([quantity - left[j], resourceType]);
        }
      }
    }
    // If it is a building, what are its own requirements?
    if (isBuilding(resourceType)) {
      // list of [quantity, resourceType].
      var annexResources = resourceBuildRequirement(resourceType, camp);
      requirements = requirements.concat(annexResources);
    }
  }
  return requirements;
}

// Whether a tile is inaccessible to a group that doesn't own the manufactured
// items they can obtain from a building `b`.
// b: building (see `terrain.tileTypes`).
function inaccessibleForManufactureBuilding(b, terrainTile, humanityTile) {
  // `humanityTile` may be undefined.
  if (b === terrain.tileTypes.factory) {
    if (terrainTile.steepness >= terrain.tileTypes.mountain ||
       (humanityTile && humanityTile.b === terrain.tileTypes.wall)) {
      return true;
    }
  }
  if (b === terrain.tileTypes.airport) {
    if (terrainTile.type === terrain.tileTypes.taiga ||
       (humanityTile && humanityTile.b === terrain.tileTypes.wall)) {
      return true;
    }
  }
  return false;
}

// Take tiles `from` and `to` {q,r}, returns the list of all steps to go
// through as tiles "q:r", or null if it failed.
function trajectory(from, to, human, maxTiles) {
  maxTiles = maxTiles || 100000;  // 100 thousand tiles.
  var travel = terrain.humanTravelTo(from, to, maxTiles, human);
  if (travel == null) { return travel; }
  // Cut the path in walkable parts.
  var steps = [];
  var endKey = travel.endKey;
  var parents = travel.parents;
  var costs = travel.costs;
  var humanSpeed = terrain.speedFromHuman(human);
  var speed = humanSpeed;
  steps.push(endKey);
  while (parents[endKey] !== null) {
    var delta = costs[endKey] - costs[parents[endKey]];
    speed -= delta;
    endKey = parents[endKey];
    if (speed <= 0) {
      speed = humanSpeed;
      steps.push(endKey);
    }
  }
  // If the first jump does nothing, ignore it.
  if (steps[steps.length - 1] !== endKey) {
    steps.push(endKey);
  }
  return steps.reverse();
}




// Managing projects.
// Each plan corresponds to a group of folks that must accomplish it.

// A group corresponds to a camp. It is on a unique tile.
// tile: {q,r}
// camp: a camp object. See humanity.js.
function Group(tile, strategy) {
  this.tile = tile;
  this.strategy = strategy;
  this.camp = strategy.camp;
  // See trajectory().
  this.trajectory = [];
  // Whether we should start by forking the group on this location.
  this.fork = false;
  // Whether the group is getting some refreshing food.
  this.goingToAFarm = false;
}

Group.prototype = {

  // Convert a list of tiles {q,r} to a map from tile keys to truth values.
  tileListToMap: function(tiles) {
    var tilesMap = Object.create(null);
    for (var i = 0; i < tiles.length; i++) {
      tilesMap[terrain.keyFromTile(tiles[i])] = true;
    }
    return tilesMap;
  },

  // Return the closest tile to `target` {q,r}
  // that owns a certain manufactured item.
  tileWithManufacture: function(manufacture, target) {
    var tiles = this.camp.tilesWith(function(humanityTile) {
      return (humanityTile.h > 0) && ((humanityTile.o & manufacture) !== 0);
    });
    if (tiles.length === 0) { return null; }
    return closestTowardsAmong(this.tileListToMap(tiles), target);
  },

  // Return the closest manufacture {q,r} of a particular type `b`
  // to the tile `target` {q,r}.
  // filter: function(tile = {q,r}), true if the tile is authorized.
  closestManufacture: function(b, target, filter) {
    var tiles = this.camp.tilesWith(function(humanityTile) {
      return humanityTile.b === b;
    });
    if (tiles.length === 0) { return null; }
    return closestTowardsAmong(this.tileListToMap(tiles), target, filter);
  },

  // Return the closest tile {q,r} owned by this camp.
  closestOwned: function(target) {
    var tiles = this.camp.tiles;
    if (tiles.length === 0) { return null; }
    return closestTowardsAmong(this.tileListToMap(tiles), target);
  },

  // Return the closest tile {q,r} inhabited by this camp.
  closestInhabited: function(target) {
    var tiles = this.camp.inhabitedTiles;
    if (tiles.length === 0) { return null; }
    return closestTowardsAmong(this.tileListToMap(tiles), target);
  },

  // Return a valid plan that either moves people from "q:r" to "q:r" tiles,
  // or builds a farm, if they're out of food.
  moveOrFood: function(from, to, humanityTile) {
    var humansMoving = humanityTile.h;
    // Should we fork the current group?
    if (!!this.fork) {
      humansMoving = (humansMoving / 2)|0;
      if (humansMoving <= 0) { humansMoving = 1; }
      this.fork = false;
    }

    var fromTile = terrain.tileFromKey(from);
    if (to == null) { debugger; }
    var toTile = terrain.tileFromKey(to);
    // If foodless, make farms.
    if (humanityTile.f <= 0) {
      // If we are on water and need food, we're dead meat anyway.
      var isNotOnWater =
        terrain.tile(fromTile).type !== terrain.tileTypes.water;
      if (isNotOnWater) {
        return {
          at: from,
          do: terrain.planTypes.build,
          b: terrain.tileTypes.farm
        };
      }
    }
    // When low on food, go to nearest farm around.
    else if (humanityTile.f <= 4 && !this.goingToAFarm) {
      var humanity = this.strategy.humanity;
      var nearestFarm = humanity.findNearest(toTile, function(tile){
        var humanityTile = humanity.tile(tile);
        return humanityTile && (humanityTile.b === terrain.tileTypes.farm);
      }, 20);
      if (nearestFarm != null) {
        var pathToFarm = trajectory(fromTile, nearestFarm, humanityTile, 10000);
        if (pathToFarm != null) {
          this.goingToAFarm = true;
          this.trajectory = pathToFarm.slice(1);
          return {
            at: from,
            do: terrain.planTypes.move,
            to: pathToFarm[1],
            h: humansMoving
          };
        }
      }
    } else if (humanityTile.f > 4) {
      this.goingToAFarm = false;
    }
    return {
      at: from,
      do: terrain.planTypes.move,
      to: to,
      h: humansMoving
    };
  },

  // Switch this group (and potentially the current project)
  // to ensure that either this group will eventually have
  // the manufacture corresponding to the `b` building
  // (see `terrain.tileTypes`).
  useManufacture: function(b, target) {
    // What is the code for the manufactured item obtained from that building?
    var item = terrain.manufactureFromBuilding(b);
    if (item == null) { return; }
    var owner = this.tileWithManufacture(item, target);
    var self = this;
    var building = this.closestManufacture(b, target, function(tile) {
      // If the building is on a tile needed to get to it, don't do it.
      return !inaccessibleForManufactureBuilding(b,
          terrain.tile(tile), self.strategy.humanity.tile(tile));
    });
    // Can we get to `target` from that spot?
    if (owner != null) {
      var humanityOwner = this.strategy.humanity.tile(owner);
      var pathFromOwner = trajectory(owner, target, humanityOwner);
      if (!pathFromOwner
          || pathFromOwner.length >= (humanityOwner.f * humanityOwner.h)) {
        owner = null;
      }
    }
    if (building != null) {
      // Can we get from that building to where we want to go?
      var pathFromBuilding = trajectory(building, target,
          { h:1, c:this.camp.id, o:item });
      if (!pathFromBuilding || pathFromBuilding.length >= 20) {
        building = null;
      }
    }
    //debugger;
    // Ideally, we already have people that own the correct manufacture.
    if (owner != null) {
      if (building != null) {
        // Both exist.
        if (distanceBetweenTiles(owner, target)
          <= distanceBetweenTiles(building, target)) {
          // The owner is closer to the target.
          this.switchGroupTo(owner, pathFromOwner);
        } else {
          // The manufacture is closer to the target.
          // Find someone to go to the manufacture.
          this.moveFrom(building, pathFromBuilding);
        }
      } else {
        // We only have an owner. We need to build a manufacture anyway.
        this.firstBuild(b, this.closestInhabited(target));
      }
    } else if (building != null) {
      // Find someone to go to the manufacture.
      this.moveFrom(building, pathFromBuilding);
    } else {
      // We need to build a manufacture.
      this.firstBuild(b, this.closestInhabited(target));
    }
  },

  // Given a tile, change the group to the folks on that tile {q,r}.
  // path (optional): output of trajectory(), going from the intended
  // tile to move from, to the ultimate tile to get to.
  switchGroupTo: function(tile, path) {
    this.tile = tile;
    this.trajectory = path;
  },

  // Given a tile {q,r}, make sure this group first moves there,
  // from any tile near that one.
  // path (optional): output of trajectory(), going from the intended
  // tile to move from, to the ultimate tile to get to.
  moveFrom: function(tile, path) {
    // Add a project to move there from our group's tile.
    this.strategy.warProject(this.tile, this.camp.id);
    // The strategy is at the end. Put it at the beginning.
    var project = this.strategy.projects.pop();
    project.target = tile;  // from `this.tile` to `tile`.
    this.strategy.projects.unshift(project);
    // Try to compute the trajectory. (Note: group.tile === this.tile.)
    var group = project.groups[0];
    var humanityTile = this.strategy.humanity.tile(group.tile);
    var traj = trajectory(group.tile, project.target, humanityTile);
    if (traj != null) { group.trajectory = traj; }
    // When the group will be at `tile`, this group will be that group.
    this.switchGroupTo(tile);
    this.trajectory = path;
  },

  // Create a project to build something (see terrain.tileTypes),
  // somewhat close to `tile` {q,r},
  // so that it has priority over the current project.
  firstBuild: function(b, tile) {
    // Add a project to build that there.
    this.strategy.buildProject(b, tile, -1);
    // The strategy is at the end. Put it at the beginning.
    var project = this.strategy.projects.pop();
    this.strategy.projects.unshift(project);
  },

  // Move people of our own camp from a `blockingTile` {q,r} on a path where
  // we have a group currently residing at `fromTile` {q,r}, anywhere away.
  // humanityTile (optional): the humanity information about the group
  //    we want to put away.
  putOwnPeopleAway: function(blockingTile, fromTile, humanityTile) {
    if (humanityTile == null) {
      humanityTile = this.strategy.humanity.tile(blockingTile);
    }
    var accessibleTiles = terrain.humanTravelFrom(blockingTile);
    // Remove blockingTile and fromTile.
    for (var tileKey in accessibleTiles) {
      var filterTile = terrain.tileFromKey(tileKey);
      if (sameTile(filterTile, fromTile)
            || sameTile(filterTile, blockingTile)) {
        delete accessibleTiles[tileKey];
      }
    }
    var accessibles = Object.keys(accessibleTiles);
    var awayFromLawn = accessibles[(Math.random() * accessibles.length)|0];
    return this.moveOrFood(terrain.keyFromTile(blockingTile), awayFromLawn,
        humanityTile);
  },

  // Return next plan along `this.trajectory`.
  moveAlongTrajectory: function() {
    // If there is nothing, or only a starting location, we can't use it.
    if (this.trajectory.length <= 1) { return null; }
    var fromTileKey = this.trajectory[0];
    var fromTile = terrain.tileFromKey(fromTileKey);
    if (!sameTile(fromTile, this.tile)) {
      this.trajectory = [];
      return null;
    }
    var toTileKey = this.trajectory[1];
    // If there is a group there, move it.
    var toTile = terrain.tileFromKey(toTileKey);
    var nextHumanityTile = this.strategy.humanity.tile(toTile);
    if (nextHumanityTile && nextHumanityTile.c === this.camp.id
        && nextHumanityTile.h > 0) {
      // We are blocked by a silly group in front of us.
      // Tell them to get off our lawn!
      console.log('need to get them off my path near', fromTile);
      return this.putOwnPeopleAway(toTile, fromTile, nextHumanityTile);
    }
    // Remove current tile, going to the next tile.
    this.trajectory.shift();
    var fromHumanityTile = this.strategy.humanity.tile(fromTile);
    var plan = this.moveOrFood(fromTileKey, toTileKey, fromHumanityTile);
    // If this move changes our tile, register our group's new tile.
    if (plan.to == null && plan.b != null) {
      // They are building a farm or something.
      return plan;
    }
    this.tile = terrain.tileFromKey(plan.to);
    return plan;
  },

  // Advance in the direction of target = {q,r}.
  // Returns a plan {at,do,b,to,h}.
  moveTowards: function(humanity, target) {
    // Implementation reminder: change this.tile when moving group.
    // Do we have a computed trajectory?
    var computedTrajectory = this.moveAlongTrajectory();
    if (computedTrajectory != null) { return computedTrajectory; }
    // No known trajectory.
    var fromTile = this.tile;
    var fromHumanityTile = humanity.tile(fromTile);
    var terrainType = terrain.tile(fromTile);
    // Are we too hungry to go forward?
    if (fromHumanityTile.f <= 0
        // If we're on water, we can die.
        && terrainType.type !== terrain.tileTypes.water) {
      return {
        at: terrain.keyFromTile(fromTile),
        do: terrain.planTypes.build,
        b: terrain.tileTypes.farm,
      };
    }
    // Filter out tiles where there are folks with manufactured items
    // which would make us lose ours.
    var ourManufacture = fromHumanityTile.o;
    var toTile = closestTowards(fromTile, target, function(filterTile) {
      var humanityTile = humanity.tile(filterTile);
      if (humanityTile == null) { return true; }
      if (humanityTile.h === 0) { return true; }
      var theirManufacture = humanityTile.o;
      if (ourManufacture === 0) { return true; }
      return ourManufacture === theirManufacture;
    }) || fromTile;
    // Are we cut off by something?
    if (sameTile(toTile, fromTile)) {
      // Is there a more intelligent path we could see?
      var path = trajectory(fromTile, target, fromHumanityTile);
      if (path != null) {
        this.trajectory = path; return this.moveAlongTrajectory();
      }
      // What are we cut off by?
      // Construct tiles map directly around the current tile.
      var around = Object.create(null);
      around[terrain.keyFromTile(fromTile)] = true;
      for (var i = 0; i < 6; i++) {
        var neighbor = terrain.neighborFromTile(fromTile, i);
        around[terrain.keyFromTile(neighbor)] = true;
      }
      var blockingTile = closestTowardsAmong(around, target);
      var nextTerrain = terrain.tile(blockingTile);
      var nextHumanityTile = humanity.tile(blockingTile);
      // Based on what blocks us, switch group to one which can go through.
      if (nextTerrain.type === terrain.tileTypes.water) {
        // We need to go to a dock close by or we need to build one.
        console.log('need a dock near', fromTile);
        this.useManufacture(terrain.tileTypes.dock, fromTile);
      } else if ((nextHumanityTile
        && nextHumanityTile.b === terrain.tileTypes.wall)
        || nextTerrain.type === terrain.tileTypes.taiga) {
        // We need to go to an airport or build one.
        console.log('need an airport near', fromTile);
        this.useManufacture(terrain.tileTypes.airport, fromTile);
      } else if (nextTerrain.type === terrain.tileTypes.mountain) {
        // We need to go to a factory or build one.
        console.log('need a factory near', fromTile);
        this.useManufacture(terrain.tileTypes.factory, fromTile);
      } else if (nextHumanityTile && nextHumanityTile.h > 0) {
        // We are blocked by a silly group in front of us.
        // Tell them to get off our lawn!
        console.log('need to get them off my lawn near', fromTile);
        return this.putOwnPeopleAway(blockingTile, fromTile, nextHumanityTile);
      }
      return null;
    }
    // Go there.
    var plan = this.moveOrFood(terrain.keyFromTile(fromTile),
        terrain.keyFromTile(toTile), fromHumanityTile);
    if (plan.to != null) {
      this.tile = terrain.tileFromKey(plan.to);
    }
    return plan;
  },

};


// camp: a camp object. See humanity.js.
function Strategy(camp, humanity) {
  this.camp = camp;
  this.humanity = humanity;
  terrain.humanity = humanity;
  terrain.setCenterTile(humanity.getCenterTile());
  // Active projects.
  // Each project is {type, groups, target, builds, camp}.
  this.projects = [];  // Ordered by priority.
  this.recursionLimit = 0;
}

// Strategy gives primitives for elementary projects
// that an AI can choose to do.

// Projects are {type, groups, target, builds, camp}.
// - type: see `projectType`.
// - groups: a list of `Group`.
// - target: tile {q,r} around which that project takes place.
// - builds: list of {tile:{q,r}, building:tileTypes} to make
//   before completing the project.
// - camp: campId towards which the project is targeted.

var projectType = {
  build: 0,
  conquer: 1,
  war: 2,
};
var projectTypeList = Object.keys(projectType);

Strategy.prototype = {

  // A few functions to simplify input parameters.
  findNearestEmpty: function(tile, size) {
    return findNearestEmpty(this.humanity, tile, size);
  },
  findConstructionLocation: function(tile, b, options) {
    return findConstructionLocation(this.humanity, tile, b, options);
  },
  dependencyBuilds: function(b, tile, forbiddenTiles) {
    return dependencyBuilds(this.humanity, b, tile, forbiddenTiles);
  },

  // Return all tiles [{q,r}] from current build projects.
  tilesFromBuildProjects: function() {
    var tiles = [];
    for (var i = 0; i < this.projects.length; i++) {
      var project = this.projects[i];
      if (project.type === projectType.build && project.builds != null) {
        for (var j = 0; j < project.builds.length; j++) {
          var build = project.builds[j];
          tiles.push(build.tile);
        }
      }
    }
    return tiles;
  },


  // Group creation below.
  //

  // Return a map from "q:r" tiles where we own groups,
  // based on current projects.
  controlledGroups: function() {
    var groupFromKey = Object.create(null);
    for (var i = 0; i < this.projects.length; i++) {
      var project = this.projects[i];
      for (var j = 0; j < project.groups.length; j++) {
        var group = project.groups[j];
        groupFromKey[terrain.keyFromTile(group.tile)] = group;
      }
    }
    return groupFromKey;
  },

  // Find a group closest to the tile = {q,r}.
  // It may return a group we already occupy if we can fork it,
  // or if the `stealGroup` flag is true.
  // Returns the group.
  addGroup: function(tile, stealGroup) {
    if (stealGroup == null) { stealGroup = false; }
    // It needs to be a group we don't currently count.
    var tiles = this.camp.inhabitedTiles;
    var chosenTile;
    var groupFromKey = this.controlledGroups();
    var closest = MAX_INT;
    for (var i = 0; i < tiles.length; i++) {
      var tileKey = terrain.keyFromTile(tiles[i]);
      // Groups we already control.
      if (groupFromKey[tileKey] !== undefined) {
        // If there is more than one, we can we can fork them.
        var humanityTile = this.humanity.tile(terrain.tileFromKey(tileKey));
        if (!stealGroup && humanityTile.h < 2) { continue; }
      }
      // FIXME: don't include tiles controlled by players.
      // Locate the closest group to the target tile.
      var distance = distanceBetweenTiles(tile, tiles[i]);
      if (distance < closest) {
        closest = distance;
        chosenTile = tiles[i];
      }
    }
    if (chosenTile == null) { debugger; return this.addGroup(tile, true); }
    var group = new Group(chosenTile, this);
    // If we own that
    if (groupFromKey[tileKey] !== undefined) { group.fork = true; }
    return group;
  },

  // Remove empty groups from a project.
  cleanGroups: function(project) {
    for (var i = 0; i < project.groups.length; i++) {
      var humanityTile = this.humanity.tile(project.groups[i].tile);
      if (humanityTile == null || humanityTile.h <= 0
          || humanityTile.c !== this.camp.id) {
        project.groups.splice(i, 1);
      }
    }
  },

  // FIXME: add methods to improve the group for a particular project.

  // Project creation below.
  //

  // Create a building.
  // buildingType: see terrain.tileTypes.
  // tile: {q,r}
  // size: number of empty layers around the building spot.
  //   If that value is negative, you are desperate to build anywhere.
  buildProject: function(buildingType, tile, size) {
    if (tile == null) {
      // List of tileKeys
      var tiles = this.camp.inhabitedTiles;
      // Pick a random tile we occupy.
      tile = tiles[(tiles.length * Math.random())|0];
    }
    console.log('build project:', buildingType);
    // FIXME: choose a size depending on the building type.
    if (size == null) { size = 0; }
    if (size >= 0) {
      // Find an unoccupied tile close by.
      tile = this.findNearestEmpty(tile, size);
      console.log('nearest empty:', tile);
    }
    var maxSearch = 500;
    // Don't build manufactures on tiles which require their items to get to.
    // Is there a trajectory from the closest humans to here?
    var isManufacture = (buildingType === terrain.tileTypes.factory
      || buildingType === terrain.tileTypes.dock
      || buildingType === terrain.tileTypes.airport);
    // Avoid searching too far away if it's not worth it.
    if (isManufacture) { maxSearch = 20; }
    // Find a tile where this can be constructed.
    var forbiddenTiles = this.tilesFromBuildProjects();
    tile = this.findConstructionLocation(tile, buildingType,
      { builtTiles: this.camp.builtTiles, maxSearch: maxSearch,
        forbiddenTiles: forbiddenTiles });
    if (isManufacture) {
      // We must only allow it if we know for certain we can get there.
      var traj, group;
      group = this.addGroup(tile);
      var fromTile = group.tile;
      var humanityTile = this.humanity.tile(fromTile);
      traj = trajectory(fromTile, tile, humanityTile);
      // We could not find an accessible construction spot → we lack people.
      if (!traj) { return this.warProject(tile, this.camp.id); }
    }
    console.log('construction location:', tile);
    if (tile == null) { return; }
    var builds = this.dependencyBuilds(buildingType, tile, forbiddenTiles);
    console.log('builds:', builds);
    if (builds == null) { return; }
    // Find the nearest group around that tile.
    if (group === undefined) {
      var group = this.addGroup(tile);
    }
    if (traj !== undefined) {
      group.trajectory = traj;
    }
    var groups = [group];
    this.projects.push({
      type: projectType.build,
      groups: groups,
      target: tile,
      builds: builds,
      ttl: 100,
    });
    // Check for the lack of resources needed to build this.
    this.resourceProject(resourceBuildRequirement(buildingType, this.camp));
    console.log('build project');
  },

  // resources: list of [quantity, resourceType] (see terrain.resourceTypes).
  resourceProject: function(resources) {
    console.log('resources:', resources);
    for (var i = 0; i < resources.length; i++) {
      var quantity = resources[i][0];
      var resource = resources[i][1];
      var buildingType;
      var size;
      if (resource === terrain.resourceTypes.lumber) {
        buildingType = terrain.tileTypes.lumber;
        size = -1;
      } else if (resource === terrain.resourceTypes.metal) {
        buildingType = terrain.tileTypes.industry;
        size = -1;
      } else if (resource === terrain.resourceTypes.farm) {
        buildingType = terrain.tileTypes.farm;
      } else { continue; }
      if (buildingType == null) { debugger; continue; }
      for (var j = 0; j < quantity; j++) {
        this.buildProject(buildingType, null, size);
        // The strategy is at the end. Put it at the beginning.
        var project = this.projects.pop();
        this.projects.unshift(project);
      }
    }
  },

  // Obtain control over a type of tile.
  // Includes an optional camp from which to take it, if it has it.
  conquerProject: function(tileType, campId) {
    // Find a tile where this tile type is.
    var tile;
    var campTiles = this.humanity.campFromId(campId).builtTiles;
    for (var i = 0; i < campTiles.length; i++) {
      if (this.humanity.tile(campTiles[i]).b === tileType) {
        tile = campTiles[i];
        break;
      }
    }
    if (tile === undefined) { return; }
    // Find the nearest group around that tile.
    var groups = [];
    groups.push(this.addGroup(tile));
    this.projects.push({
      type: projectType.conquer,
      groups: groups,
      target: tile,
      camp: campId,
      ttl: 100,
    });
    console.log('conquer project');
  },

  // Harm a specific adversary.
  // Targets residential buildings and buildings around them.
  // Can also be used to put humans on a specific tile.
  warProject: function(tile, campId) {
    // Find the nearest group around that tile.
    var groups = [];
    groups.push(this.addGroup(tile));
    this.projects.push({
      type: projectType.war,
      groups: groups,
      target: tile,
      camp: campId,
      ttl: 100,
    });
    console.log('war project');
  },

  // Remove the main project.
  removeProject: function() {
    if (this.projects.length <= 0) { return; }
    this.projects.shift();
  },

  // Add a random project.
  randomProject: function() {
    var projectTypes = Object.keys(projectType);
    var type = (projectTypeList.length * Math.random())|0;
    /// TODO: remove the next line.
    type = projectType.build;
    if (type === projectType.build) {
      // Random building.
      var buildingType = terrain.buildingTypes[
        (terrain.buildingTypes.length * Math.random())|0];
      // TODO: remove next lines.
      if (this.camp.population < 50) {
        buildingType = terrain.tileTypes.skyscraper;
      } else { buildingType = terrain.tileTypes.industry; }
      this.buildProject(buildingType);
    } else if (type === projectType.conquer) {
      // Random camp, find a tile type it owns.
      var campId = (this.humanity.numberOfCamps * Math.random())|0;
      if (campId === this.camp.id) {
        campId = (campId + 1) % this.humanity.numberOfCamps;
      }
      var campTiles = this.humanity.campFromId(campId).builtTiles;
      var tileType =
        this.humanity.tile(campTiles[(campTiles.length*Math.random())|0]).b;
      this.conquerProject(tileType, campId);
    } else if (type === projectType.war) {
      // Random camp, find a tile it owns.
      var campId = (this.humanity.numberOfCamps * Math.random())|0;
      if (campId === this.camp.id) {
        campId = (campId + 1) % this.humanity.numberOfCamps;
      }
      var campTiles = this.humanity.campFromId(campId).tiles;
      var tile = campTiles[(campTiles.length * Math.random())|0];
      this.warProject(tile, campId);
    }
  },

  // Return true if the project is done.
  isProjectComplete: function(project) {
    project.ttl--;
    // If the project's time to live has sunk to 0, kill it.
    if (project.ttl <= 0) { return true; }
    console.log('TTL:', project.ttl);
    // If there is nobody left for the job, find new ones.
    if (project.groups.length <= 0) {
      project.groups.push(this.addGroup(project.target));
    }
    // There are people left on the job.
    if (project.type === projectType.build) {
      return project.builds.length === 0;
    } else if (project.type === projectType.conquer) {
      // We own the target.
      var humanityTile = this.humanity.tile(project.target);
      if (humanityTile == null) { return false; }
      return humanityTile.c === this.camp.id;
    } else if (project.type === projectType.war) {
      // We have arrived to the target
      // (potentially killing enemies along the way).
      var humanityTile = this.humanity.tile(project.target);
      if (humanityTile == null) { return false; }
      return (humanityTile.c === this.camp.id)
        && (humanityTile.h > 0);
    }
  },

  // Use these in `runProject` only.
  runProjectAgain: function() {
    this.recursionLimit++;
    return this.runProject();
  },
  returnPlan: function(plan) {
    this.recursionLimit = 0;
    return plan;
  },

  // Return an atomic operation to send to the server.
  runProject: function() {
    // Implementation note: when returning from this function,
    // use `this.runProjectAgain` to recurse over this function,
    // or `this.returnPlan` if you return an actual plan.

    // Are we still there?
    if (this.camp.population <= 0) { return null; }
    // Find a project to use.
    while (this.projects.length === 0) {
      // We need to create a project.
      this.randomProject();
    }
    if (this.projects.length === 0) { return null; }
    // Avoid infinite creation of new projects because of chicken-and-egg.
    if (this.projects.length > 20 || this.recursionLimit > 7) {
      console.log('Projects reset.');
      for (var i = 0; i < this.projects.length; i++) { this.removeProject(); }
      // This is the only exception to the rule at the head of this function.
      this.recursionLimit = 0;
      return this.runProject();
    }
    ///console.log('projects:', JSON.stringify(this.projects, null, 2));
    // Complete the first project we have.
    var project = this.projects[0];
    // Remove empty groups.
    this.cleanGroups(project);
    if (this.isProjectComplete(project)) {
      this.removeProject();
      return this.runProjectAgain();
    }
    // First, you need to perform all the builds.
    if (project.builds && project.builds.length > 0) {
      var build = project.builds[0];
      // If we're on the tile, build it and be done with it.
      var humanityTile = this.humanity.tile(build.tile);
      if (humanityTile && humanityTile.c === this.camp.id
        && humanityTile.h > 0) {
        project.builds.shift();
        // Don't build something that is already there.
        if (humanityTile.b === build.building) {
          return this.runProjectAgain();
        }
        // Send the construction information.
        return this.returnPlan({
          at: terrain.keyFromTile(build.tile),
          do: terrain.planTypes.build,
          b: build.building
        });
      }
      // We need to go towards this building tile.
      var group = project.groups[(project.groups.length * Math.random())|0];
      var plan = group.moveTowards(this.humanity, build.tile);
      if (plan == null) { debugger; this.recursionLimit++; return this.runProject(); }
      return this.returnPlan(plan);
    }
    // Go to the target.
    // FIXME: give availability to choose between groups to move forward.
    var group = project.groups[(project.groups.length * Math.random())|0];
    var plan = group.moveTowards(this.humanity, project.target);
    if (plan == null) { debugger; this.recursionLimit++; return this.runProject(); }
    return this.returnPlan(plan);
  },

};


// Movement primitives.

var MAX_INT = 9007199254740992;

// Tiles a and b = {q,r} correspond to the same tile.
function sameTile(a, b) {
  return a.q === b.q && a.r === b.r;
}

// a and b are tiles = {q,r}.
function distanceBetweenTiles(a, b) {
  return (Math.abs(a.q - b.q) +
          Math.abs(a.r - b.r) +
          Math.abs(a.q + a.r - b.q - b.r)) / 2;
}

// Return the closest tile we can go to from atTile {q,r}
// in order to go to the target toTile {q,r}.
// filter: function(tile = {q,r}), true if the tile is authorized.
function closestTowards(atTile, toTile, filter) {
  var accessibleTiles = terrain.humanTravelFrom(atTile);
  if (filter != null) {
    // Filter those tiles.
    for (var tileKey in accessibleTiles) {
      if (!filter(terrain.tileFromKey(tileKey))) {
        delete accessibleTiles[tileKey];
      }
    }
  }
  var closest = closestTowardsAmong(accessibleTiles, toTile);
  // Current distance from atTile to toTile.
  var currentDistance = distanceBetweenTiles(atTile, toTile);
  // Distance between supposedly closest and toTile.
  var futureDistance = distanceBetweenTiles(closest, toTile);
  if (futureDistance >= currentDistance) {
    return atTile;
  }
  return closest;
}

// Given a target location {q,r}, and a map from "q:r" to truthy values,
// return the closest tile {q,r} to the target.
// filter: function(tile = {q,r}), true if the tile is authorized.
function closestTowardsAmong(tiles, toTile, filter) {
  var closest;
  var shortestDistanceYet = Infinity;
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    if (filter != null && !filter(tile)) { continue; }
    if (closest === undefined) { closest = tile; continue; }
    var thisDistance = distanceBetweenTiles(tile, toTile);
    if (thisDistance < shortestDistanceYet) {
      shortestDistanceYet = thisDistance;
      closest = tile;
    }
  }
  if (closest === undefined) { debugger; return null; }
  return closest;
}


exports.findConstructionLocation = findConstructionLocation;
exports.dependencyBuilds = dependencyBuilds;
exports.trajectory = trajectory;
exports.Strategy = Strategy;
exports.projectType = projectType;
exports.projectTypeList = projectTypeList;
