// A few polynomial-time primitives for the AI.

var terrain = require('terrain-gen');

// Given a tile position and something to build, find the nearest tile where it
// can be built, or null.
// valid: function taking a tile, returning false is the tile is inacceptable.
function findConstructionLocation(humanity, tile, b, valid) {
  var dependencies = terrain.buildingDependencies[b];
  dependencies = dependencies || [];
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
    // This tile must not hold water.
    var terrainTile = terrain(tile);
    if (terrainTile.type === terrain.tileTypes.water) { return false; }
    // Current tile requirement.
    if (sameTileTerrainDependency) {
      var humanityTile = humanity(tile);
      if (!isOneOf(terrainTile.type, sameTileTerrainDependency)) {
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
    // Check that the build order succeeds.
    if (dependencyBuilds(humanity, b, tile) != null) {
      if (valid != null) {
        return valid(tile);
      } else { return true; }
    } else { return false; }
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
  terrain.tileTypes.blackdeath,
  terrain.tileTypes.metal,
  terrain.tileTypes.lumber,
  terrain.tileTypes.mine,
  terrain.tileTypes.industry,
  terrain.tileTypes.citrus,
  terrain.tileTypes.university,
];

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
  var humanityTile = humanity(tile);

  // Don't destroy buildings of the type we're creating.
  if (buildingPurpose == null) {
    buildingPurpose = b;
    // Don't destroy a building which type you're currently building.
    if (humanityTile && humanityTile.b === buildingPurpose) { return null; }
  }
  // Don't build manufactures on tiles which require their items to get to.
  var terrainTile = terrain(tile);
  if (buildingPurpose === terrain.tileTypes.factory) {
    if (terrainTile.type === terrain.tileTypes.mountain) { return null; }
  }
  if (buildingPurpose === terrain.tileTypes.airport) {
    if (terrainTile.type === terrain.tileTypes.taiga ||
       humanityTile.b === terrain.tileTypes.wall) { return null; }
  }
  // Don't destroy buildings which cost resources.
  if (humanityTile && isOneOf(humanityTile.b, valuableBuildings)) {
    return null;
  }

  // Keep track of what gets destroyed and created while building.
  override = override || Object.create(null);
  var buildingOnTile = function(tile) {
    var tileKey = terrain.keyFromTile(tile);
    if (override[tileKey] != null) {
      return override[tileKey];
    }
    var humanityTile = humanity(tile);
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
      var neighborTerrain = terrain(neighbor);
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
      var neighborTerrain = terrain(neighbor);
      if (neighborTerrain.type === terrain.tileTypes.water) { continue; }
      var neighborHumanity = humanity(neighbor);
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
    var human = humanity(tile);
    if (human === undefined) { return false; }
    if (human.b == null) { return false; }
    return true;
  };

  return humanity.findNearest(tile, function(tile) {
    // If it finds no built terrain, we're good to go.
    return !humanity.findNearest(tile, builtTerrain, size);
  });
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
  closestManufacture: function(b, target) {
    var tiles = this.camp.tilesWith(function(humanityTile) {
      return humanityTile.b === b;
    });
    if (tiles.length === 0) { return null; }
    return closestTowardsAmong(this.tileListToMap(tiles), target);
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

  // Switch this group (and potentially the current project)
  // to ensure that either this group will eventually have
  // the manufacture corresponding to the `b` building
  // (see `terrain.tileTypes`).
  useManufacture: function(b, target) {
    // What is the code for the manufactured item obtained from that building?
    var item = terrain.manufactureFromBuilding(b);
    if (item == null) { return; }
    var building = this.closestManufacture(b, target);
    var owner = this.tileWithManufacture(item, target);
    // Ideally, we already have people that own the correct manufacture.
    if (owner != null) {
      if (building != null) {
        // Both exist.
        if (distanceBetweenTiles(owner, target)
          <= distanceBetweenTiles(building, target)) {
          // The owner is closer to the target.
          this.switchGroupTo(owner);
        } else {
          // The manufacture is closer to the target.
          // Find someone to go to the manufacture.
          this.moveFrom(building);
        }
      } else {
        // We only have an owner. We need to build a manufacture anyway.
        this.firstBuild(b, this.closestInhabited(target));
      }
    } else if (building != null) {
      // Find someone to go to the manufacture.
      this.moveFrom(building);
    } else {
      // We need to build a manufacture.
      this.firstBuild(b, this.closestInhabited(target));
    }
  },

  // Given a tile, change the group to the folks on that tile {q,r}.
  switchGroupTo: function(tile) {
    this.tile = tile;
  },

  // Given a tile {q,r}, make sure this group first moves there,
  // from any tile near that one.
  moveFrom: function(tile) {
    var tilesMap = this.tileListToMap(this.camp.inhabitedTiles);
    var newGroupLocation = closestTowardsAmong(tilesMap, tile);
    // When a group will be there, this group will be that group.
    this.switchGroupTo(tile);
    // Add a project to move there with a group at that location.
    this.strategy.warProject(tile, this.camp.id);
    // The strategy is at the end. Put it at the beginning.
    var project = this.strategy.projects.pop();
    this.strategy.projects.unshift(project);
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

  // Advance in the direction of target = {q,r}.
  // Returns a plan {at,do,b,to,h}.
  // FIXME: use A*.
  moveTowards: function(humanity, target) {
    var fromTile = this.tile;
    var fromHumanityTile = humanity(fromTile);
    var terrainType = terrain(fromTile);
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
      var humanityTile = humanity(filterTile);
      if (humanityTile == null) { return true; }
      if (humanityTile.h === 0) { return true; }
      var theirManufacture = humanityTile.o;
      if (ourManufacture === 0) { return true; }
      return ourManufacture === theirManufacture;
    }) || fromTile;
    // Are we cut off by something?
    if (sameTile(toTile, fromTile)) {
      // What by?
      // Construct tiles map directly around the current tile.
      var around = Object.create(null);
      around[terrain.keyFromTile(fromTile)] = true;
      for (var i = 0; i < 6; i++) {
        var neighbor = terrain.neighborFromTile(fromTile, i);
        around[terrain.keyFromTile(neighbor)] = true;
      }
      var blockingTile = closestTowardsAmong(around, target);
      var nextTerrain = terrain(blockingTile);
      var nextHumanityTile = humanity(blockingTile);
      // Based on what blocks us, switch group to one which can go through.
      if (nextTerrain.type === terrain.tileTypes.water) {
        // We need to go to a dock close by or we need to build one.
        console.log('need a dock');
        this.useManufacture(terrain.tileTypes.dock, fromTile);
      } else if (nextHumanityTile
        && nextHumanityTile.b === terrain.tileTypes.wall) {
        // We need to go to an airport or build one.
        console.log('need an airport');
        this.useManufacture(terrain.tileTypes.airport, fromTile);
      } else if (nextTerrain.steepness > terrain.tileTypes.hill) {
        // We need to go to a factory or build one.
        console.log('need a factory');
        this.useManufacture(terrain.tileTypes.factory, fromTile);
      } else if (nextHumanityTile && nextHumanityTile.h > 0) {
        // We are blocked by a silly group in front of us.
        // Tell them to get off our lawn!
        console.log('need to get them off my lawn');
        var awayFromLawn = closestTowards(blockingTile, {q:0,r:0},
          function(filterTile) {
            return !(sameTile(filterTile, fromTile)
              || sameTile(filterTile, blockingTile));
          });
        debugger;
        return {
          at: terrain.keyFromTile(blockingTile),
          do: terrain.planTypes.move,
          to: terrain.keyFromTile(awayFromLawn),
          h: nextHumanityTile.h
        };
      }
      return null;
    }
    // Go there.
    this.tile = toTile;
    return {
      at: terrain.keyFromTile(fromTile),
      do: terrain.planTypes.move,
      to: terrain.keyFromTile(toTile),
      h: fromHumanityTile.h
    };
  },

};


// camp: a camp object. See humanity.js.
function Strategy(camp, humanity) {
  this.camp = camp;
  this.humanity = humanity;
  // Active projects.
  // Each project is {type, groups, target, builds, camp}.
  this.projects = [];  // Ordered by priority.
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
  findConstructionLocation: function(tile, b, valid) {
    return findConstructionLocation(this.humanity, tile, b, valid);
  },
  dependencyBuilds: function(b, tile, forbiddenTiles) {
    return dependencyBuilds(this.humanity, b, tile, forbiddenTiles);
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

  // Find a group. If the tile = {q,r} is given,
  // find the group closest to that tile.
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
      if (!stealGroup) {
        // Skip groups we already control.
        if (groupFromKey[tileKey] !== undefined) { continue; }
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
    return group;
  },

  // Remove empty groups from a project.
  cleanGroups: function(project) {
    for (var i = 0; i < project.groups.length; i++) {
      if (project.groups[i] == null) { debugger; }
      var humanityTile = this.humanity(project.groups[i].tile);
      if (humanityTile == null || humanityTile.h <= 0) {
        project.groups.splice(i, 1);
      }
    }
  },

  // FIXME: add methods to improve the group for a particular project.

  // Project creation below.
  //

  // tile: {q,r}
  // Return a list of tileKey we step through, or null.
  trajectory: function(toTile) {
    // Find the closest inhabitant.
    var closestGroup = this.addGroup(toTile);
    var fromTile = closestGroup.tile;
    var humanityTile = this.humanity(fromTile);
    var distance = distanceBetweenTiles(fromTile, toTile);
    var list = [];
    do {
      var closestNeighbor;
      var closestNeighborDistance = distance;
      for (var i = 0; i < 6; i++) {
        var neighbor = terrain.neighborFromTile(fromTile, i);
        var neighborDistance = distanceBetweenTiles(neighbor, toTile);
        if (neighborDistance < closestNeighborDistance) {
          closestNeighborDistance = neighborDistance;
          closestNeighbor = neighbor;
        }
      }
      if (closestNeighbor == null) {
        debugger;
        return null;
      } else {
        list.push(closestNeighbor);
        fromTile = closestNeighbor;
      }
    } while (!sameTile(fromTile, toTile));
    console.log('trajectory:', list);
    debugger;
    return list;
  },

  // Create a building.
  // buildingType: see terrain.tileTypes.
  // tile: {q,r}
  // size: number of empty layers around the building spot.
  //   If that value is negative, you are desperate to build anywhere.
  // FIXME: notice lack of resources needed for building.
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
    console.log('loc1');
    // Don't build manufactures on tiles which require their items to get to.
    // Is there a trajectory from the closest humans to here?
    if (buildingType === terrain.tileTypes.factory
      || buildingType === terrain.tileTypes.dock
      || buildingType === terrain.tileTypes.airport) {
      var self = this;
      var valid = function(tile) { return !!self.trajectory(tile); };
    }
    console.log('loc2');
    // Find a tile where this can be constructed.
    tile = this.findConstructionLocation(tile, buildingType, valid);
    console.log('construction location:', tile);
    var builds = this.dependencyBuilds(buildingType, tile);
    console.log('builds:', builds);
    if (builds == null) { return; }
    // Find the nearest group around that tile.
    var groups = [];
    groups.push(this.addGroup(tile));
    this.projects.push({
      type: projectType.build,
      groups: groups,
      target: tile,
      builds: builds,
      ttl: 50,
    });
    console.log('build project');
  },

  // Obtain control over a type of tile.
  // Includes an optional camp from which to take it, if it has it.
  conquerProject: function(tileType, campId) {
    // Find a tile where this tile type is.
    var tile;
    var campTiles = this.humanity.campFromId(campId).builtTiles;
    for (var i = 0; i < campTiles.length; i++) {
      if (this.humanity(campTiles[i]).b === tileType) {
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
      ttl: 50,
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
      ttl: 50,
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
      // TODO: remove next line.
      buildingType = terrain.tileTypes.skyscraper;
      this.buildProject(buildingType);
    } else if (type === projectType.conquer) {
      // Random camp, find a tile type it owns.
      var campId = (this.humanity.numberOfCamps * Math.random())|0;
      if (campId === this.camp.id) {
        campId = (campId + 1) % this.humanity.numberOfCamps;
      }
      var campTiles = this.humanity.campFromId(campId).builtTiles;
      var tileType =
        this.humanity(campTiles[(campTiles.length*Math.random())|0]).b;
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
  // FIXME: add an incremental timeout to projects.
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
      var humanityTile = this.humanity(project.target);
      if (humanityTile == null) { return false; }
      return humanityTile.c === this.camp.id;
    } else if (project.type === projectType.war) {
      // We have arrived to the target
      // (potentially killing enemies along the way).
      var humanityTile = this.humanity(project.target);
      if (humanityTile == null) { return false; }
      return (humanityTile.c === this.camp.id)
        && (humanityTile.h > 0);
    }
  },

  // Return an atomic operation to send to the server.
  runProject: function() {
    // Are we still there?
    if (this.camp.population <= 0) { return null; }
    // Find a project to use.
    var notDesperateYet = 20;
    while (this.projects.length === 0 && notDesperateYet > 0) {
      // We need to create a project.
      this.randomProject();
    }
    if (this.projects.length === 0) { return null; }
    // Avoid infinite creation of new projects because of chicken-and-egg.
    if (this.projects.length > 20) {
      for (var i = 0; i < this.projects.length; i++) { this.removeProject(); }
      return this.runProject();
    }
    ///console.log('projects:', JSON.stringify(this.projects, null, 2));
    // Complete the first project we have.
    var project = this.projects[0];
    // Remove empty groups.
    this.cleanGroups(project);
    if (this.isProjectComplete(project)) {
      this.removeProject();
      return this.runProject();
    }
    // First, you need to perform all the builds.
    if (project.builds && project.builds.length > 0) {
      var build = project.builds[0];
      // If we're on the tile, build it and be done with it.
      var humanityTile = this.humanity(build.tile);
      if (humanityTile && humanityTile.c === this.camp.id
        && humanityTile.h > 0) {
        project.builds.shift();
        // Don't build something that is already there.
        if (humanityTile.b === build.building) {
          return this.runProject();
        }
        // Send the construction information.
        return {
          at: terrain.keyFromTile(build.tile),
          do: terrain.planTypes.build,
          b: build.building
        };
      }
      // We need to go towards this building tile.
      var group = project.groups[(project.groups.length * Math.random())|0];
      var plan = group.moveTowards(this.humanity, build.tile);
      if (plan == null) { debugger; return this.runProject(); }
      return plan;
    }
    // Go to the target.
    // FIXME: give availability to choose between groups to move forward.
    var group = project.groups[(project.groups.length * Math.random())|0];
    var plan = group.moveTowards(this.humanity, project.target);
    if (plan == null) { debugger; return this.runProject(); }
    return plan;
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
function closestTowards(atTile, toTile, filter) {
  var accessibleTiles = terrain.humanTravel(atTile);
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
function closestTowardsAmong(tiles, toTile) {
  var closest;
  var shortestDistanceYet = Infinity;
  for (var tileKey in tiles) {
    if (closest === undefined) { closest = tileKey; continue; }
    var tile = terrain.tileFromKey(tileKey);
    var thisDistance = distanceBetweenTiles(tile, toTile);
    if (thisDistance < shortestDistanceYet) {
      shortestDistanceYet = thisDistance;
      closest = tileKey;
    }
  }
  if (closest === undefined) { debugger; return null; }
  return terrain.tileFromKey(closest);
}


exports.findConstructionLocation = findConstructionLocation;
exports.dependencyBuilds = dependencyBuilds;
exports.Strategy = Strategy;
exports.projectType = projectType;
exports.projectTypeList = projectTypeList;
