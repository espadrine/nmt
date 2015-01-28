var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));

// Parameter to how stretched the map is.
var factor = 50;

// The following are actually constants.
var tileTypes = {
  water:        0,
  steppe:       1,
  hill:         2,
  mountain:     3,
  swamp:        4,
  meadow:       5,
  forest:       6,
  taiga:        7,
  farm:         8,
  residence:    9,
  skyscraper:   10,
  factory:      11,
  dock:         12,
  airland:      13,
  airport:      14,
  gunsmith:     15,
  road:         16,
  wall:         17,
  blackdeath:   18,
  metal:        19,
  lumber:       20,
  mine:         21,
  industry:     22,
  citrus:       23,
  hospital:     24,
  beach:        25,
  arsenal:      26
};
var buildingTypes = [ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20, 21, 22, 24,
    26 ];

var resourceTypes = {
  lumber:   -1,
  metal:    -2,
  wealth:   -3
};
var listOfResourceTypes = [
  resourceTypes.lumber,
  resourceTypes.metal,
  resourceTypes.wealth
];

var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[tileTypes.water]    = tileTypes.swamp;
tileVegetationTypeFromSteepness[tileTypes.steppe]   = tileTypes.meadow;
tileVegetationTypeFromSteepness[tileTypes.hill]     = tileTypes.forest;
tileVegetationTypeFromSteepness[tileTypes.mountain] = tileTypes.taiga;

// Terrain generation

function tileType(steepness, vegetation) {
  if (vegetation) { return tileVegetationTypeFromSteepness[steepness]; }
  else { return steepness; }
}

function heatmap(x, y, simplex, size, harmonics) {
  var value = 0;
  var sum = 0;
  for (var i = 0; i < harmonics; i++) {
    var coeff = Math.pow(2, i);
    value += simplex.noise2D(x/size*coeff, y/size*coeff) / coeff;
    sum += 1 / coeff;
  }
  return value / sum;
}


// Movements.
var distances = [];
distances[tileTypes.water]    = 0xbad;
distances[tileTypes.steppe]   = 2;
distances[tileTypes.hill]     = 4;
distances[tileTypes.mountain] = 16;
distances[tileTypes.swamp]    = 8;
distances[tileTypes.meadow]   = 3;
distances[tileTypes.forest]   = 8;
distances[tileTypes.taiga]    = 24;
distances[tileTypes.road]     = 1;
distances[tileTypes.wall]     = 32;
var normalWater = distances[tileTypes.water];
var normalSwamp = distances[tileTypes.swamp];

var MAX_INT = 9007199254740992;


// Humanity

var manufacture = {
  boat: 1,
  car: 2,
  plane: 4,
  artillery: 8,
  gun: 16
};

// The index is the tileTypes id.
// It is a list of [number, tileType] requirements to build something.
// This is for tiles around the building.
var buildingDependencies = [,,,,,,,,
    ,
    [[2, tileTypes.farm]],      // residence [9].
    [[6, tileTypes.residence]],
    [[3, tileTypes.residence], [2, tileTypes.road]],
    [[1, tileTypes.residence], [1, tileTypes.water], [1, resourceTypes.lumber]],
    [[2, tileTypes.road]],
    [[1, tileTypes.gunsmith], [3, tileTypes.airland], [1, resourceTypes.lumber]],
    [[1, tileTypes.skyscraper], [1, tileTypes.factory]],
    ,
    ,
    ,
    ,
    [[1, tileTypes.residence]],
    [[1, resourceTypes.lumber], [1, tileTypes.factory]],
    [[10, resourceTypes.wealth], [1, tileTypes.mine], [5, tileTypes.road]],
    ,
    [[1, resourceTypes.metal], [20, resourceTypes.wealth], [2, tileTypes.wall]],
    ,
    [[1, tileTypes.gunsmith], [1, resourceTypes.metal]]
];

// What the current tile must hold to allow a building to be constructed.
var buildingTileDependency = [,,,,,,,, ,,,,,,,,,,,,
    [tileTypes.forest, tileTypes.taiga],         // Lumber [20]
    [tileTypes.metal],,,
    [tileTypes.citrus],
    [tileTypes.steppe]
];

var planTypes = {
  move: 1,
  build: 2
};





function Terrain(humanity) {
  this.humanity = humanity;
  this.plans = {};
}

Terrain.prototype = {
  humanity: null,
  centerTile: { q: 0, r: 0 },
  centerPoint: { x: 0, y: 0 },

  tileTypes: tileTypes,
  buildingTypes: buildingTypes,
  resourceTypes: resourceTypes,
  listOfResourceTypes: listOfResourceTypes,
  tileType: tileType,
  heatmap: heatmap,

  setCenterTile: function setCenterTile(coord) {
    this.centerTile = coord;
    this.centerPoint.x = ((Math.sqrt(3) * (coord.q + coord.r / 2))|0);
    this.centerPoint.y = (3/2 * coord.r);
  },

  // Returns true if it is part of the continent.
  continent: function continent(x, y) {
    var size = 2500;
    var hm = heatmap(x, y, simplex1, 3/5*size, 8);
    var center = this.centerPoint;
    var squareDistanceFromCenter = (x - center.x) * (x - center.x)
                                 + (y - center.y) * (y - center.y);
    var innerSize = 300;
    hm = (hm + 1) / 2;
    hm = hm * Math.exp(-squareDistanceFromCenter / (size * size))
      // Keep the center above ocean level.
      + hm * Math.exp(-squareDistanceFromCenter / (innerSize * innerSize));
    hm = Math.min(1, hm);
    return hm;
  },

  continentLimit: 0.42,

  // Get information about the tile at hexagonal coordinates `coord` {q, r}.
  // Returns
  //  - steepness: altitude level. See `tileTypes`.
  //  - vegetation: boolean; whether there is vegetation.
  //  - type: tile type. See `tileTypes`.
  //  - rain: floating point number between -1 and 1, representing how heavy
  //  the rainfall is.
  tile: function tile(coord) {
    var x, y;
    if (coord.x === undefined) {
      x = ((Math.sqrt(3) * (coord.q + coord.r / 2))|0);
      y = (3/2 * coord.r);
    } else { x = coord.x; y = coord.y; }
    var size = simplex2.noise2D(y/500, x/500);
    var riverNoise = 1-Math.abs((
        + 4 * (simplex1.noise2D(x/4/factor, y/4/factor))
        + 2 * (simplex1.noise2D(x/2/factor, y/2/factor))
        + 1 * (simplex1.noise2D(x/1/factor, y/1/factor))
        + 1/2 * (simplex1.noise2D(x*2/factor, y*2/factor))
        )/(1/2+1+2+4));
    var heightNoise = Math.sin(
        // Abs gives valleys.
        - (size * 5) * Math.abs(simplex1.noise2D(1/4*x/factor, 1/4*y/factor))
        + simplex1.noise2D(x/factor, y/factor)
        - 1/2 * simplex1.noise2D(2*x/factor, 2*y/factor)
        + 1/4 * simplex1.noise2D(4*x/factor, 4*y/factor)
        - 1/8 * simplex1.noise2D(8*x/factor, 8*y/factor)
        + 1/16 * simplex1.noise2D(16*x/factor, 16*y/factor));
    var seaNoise = -simplex2.noise2D(y/factor/8, x/factor/8)
        + simplex2.noise2D(y/factor/4, x/factor/4)
        + heightNoise/2;
    var vegetationNoise = (size) * simplex2.noise2D(x/factor, y/factor)
        + 1/2 * simplex2.noise2D(2*x/factor, 2*y/factor)
        + 1/4 * simplex2.noise2D(4*x/factor, 4*y/factor)
        + 1/8 * simplex2.noise2D(8*x/factor, 8*y/factor)
        + 1/16 * simplex2.noise2D(16*x/factor, 16*y/factor);
    var height = heightNoise - riverNoise;
    var continentNoise = this.continent(x, y);

    if (continentNoise > this.continentLimit) {
      var seaHeight = -1.3, seaHeightX;
      var steepness = (
      // Rivers are thinner in mountains.
      (((heightNoise > 0.6)? false: (riverNoise > 0.98))
      // Seas are smaller in mountains.
      || seaNoise*3/4 + heightNoise/4 < -0.7) ?
          // Inverse of oceanHeight.
          // sea height = X * 1 + Y
          // limit height = X * continentLimit + Y
          // => X = sea height - Y
          //    limit height = X * continentLimit + sea height - X
          // => limit height = X * (continentLimit - 1) + sea height
          // => X = (limit height - sea height) / (continentLimit - 1)
          (seaHeightX = (-1.5 - seaHeight) / (this.continentLimit - 1),
           height = (continentNoise * seaHeightX) + seaHeight - seaHeightX,
           tileTypes.water):
      (vegetationNoise < -1.0)?
          tileTypes.hill:
      (height < -0.2) ?
          tileTypes.steppe:
      // Mountains are cut off (by river) to avoid circular mountain formations.
      (height < 0.2) ?
          tileTypes.hill:
          tileTypes.mountain);
      var vegetation = (vegetationNoise
          // Less vegetation on water.
          - (steepness === tileTypes.water? 2 * seaNoise: 0)
          + Math.abs(heightNoise + 0.15)) < 0;
    } else {
      var steepness = tileTypes.water;
      var vegetation = false;
      // When continentNoise is at maximum (continentLimit),
      // height must be at -1.5 (-continentLimit - 1.5).
      var oceanHeight = continentNoise - 1.92;
      height = oceanHeight;
    }

    var tile = {
      steepness: steepness,
      vegetation: vegetation,
      type: this.tileType(steepness, vegetation),
      height: height,
      rain: -vegetationNoise / 2
    };
    return tile;
  },

  // Movements.
  distances: distances,

  distance: function distance(tpos) {
    var t = this.tile(tpos);
    var h = this.humanity.tile(tpos);
    var d = distances[(h && h.b)? h.b: t.type];
    if (d === undefined) { d = distances[t.type]; }
    return d;
  },

  // a and b are tiles = {q,r}.
  distanceBetweenTiles: function distanceBetweenTiles(a, b) {
    return (Math.abs(a.q - b.q) +
            Math.abs(a.r - b.r) +
            Math.abs(a.q + a.r - b.q - b.r)) / 2;
  },


  // Find a neighboring tile.
  // `tile` is {q, r}.
  // `orientation` is 0 for right, 1 for top right, and
  // so on counter-clockwise until 5 for bottom right.
  neighborFromTile: function neighborFromTile(tile, orientation) {
    if (orientation === 0) { return { q: tile.q + 1, r: tile.r };
    } else if (orientation === 1) { return { q: tile.q + 1, r: tile.r - 1 };
    } else if (orientation === 2) { return { q: tile.q, r: tile.r - 1};
    } else if (orientation === 3) { return { q: tile.q - 1, r: tile.r };
    } else if (orientation === 4) { return { q: tile.q - 1, r: tile.r + 1 };
    } else if (orientation === 5) { return { q: tile.q, r: tile.r + 1 };
    }
  },

  // Return a string key unique to the tile.
  keyFromTile: function keyFromTile(tile) { return tile.q + ':' + tile.r; },
  tileFromKey: function tileFromKey(key) {
    var values = key.split(':');
    return { q: values[0]|0, r: values[1]|0 };
  },


  // Humanity.

  manufacture: manufacture,

  manufactureFromBuilding: function manufactureFromBuilding(b) {
    if (b === tileTypes.dock) { return manufacture.boat;
    } else if (b === tileTypes.factory) { return manufacture.car;
    } else if (b === tileTypes.airport) { return manufacture.plane;
    } else if (b === tileTypes.gunsmith) { return manufacture.gun;
    } else { return null; }
  },

  speedFromHuman: function speedFromHuman(human) {
    if ((human.o & manufacture.plane) !== 0) {
      return 32;
    } else if ((human.o & manufacture.car) !== 0) {
      return 16;
    } else { return 8; }
  },

  // Find the set of tiles one can move to, from a starter tile.
  // Requires humans to be on that tile.
  // `tstart` is a {q, r} tile position. (It's Dijkstra.)
  // Returns a map from tileKey (see keyFromTile) to the tile key whence we come.
  travelFrom: function travelFrom(tstart, speed) {
    var camp = this.humanity.tile(tstart).c;  // Camp which wants to travel.
    var walkedTiles = {};     // Valid accessible tiles mapped to parents.
    var current = this.keyFromTile(tstart);
    walkedTiles[current] = null;
    var consideredTiles = {}; // Map from tile keys to distance walked.
    consideredTiles[current] = 0;
    var fastest = [];         // List of tile keys from fastest to slowest.
    fastest.push(current);
    // Going through each considered tile.
    while (fastest.length > 0) {
      current = fastest.shift();
      // Check the camp. Is there a potential battle?
      var humanityNeighbor = this.humanity.tile(this.tileFromKey(current));
      if (humanityNeighbor && humanityNeighbor.c != null
          && humanityNeighbor.c !== camp) {
        continue;
      }
      for (var i = 0; i < 6; i++) {
        var neighbor = this.neighborFromTile(this.tileFromKey(current), i);
        var newDistance = consideredTiles[current] + this.distance(neighbor);
        if (newDistance <= speed) {
          // Update data.
          var neighborKey = this.keyFromTile(neighbor);
          if (consideredTiles[neighborKey] !== undefined &&
              newDistance < consideredTiles[neighborKey]) {
            // We have a better path to this tile.
            delete consideredTiles[neighborKey];
          }
          if (consideredTiles[neighborKey] === undefined &&
              walkedTiles[neighborKey] === undefined) {
            consideredTiles[neighborKey] = newDistance;
            walkedTiles[neighborKey] = current;
            // Where should we insert it in `fastest`?
            var insertionIndex = -1;
            for (var k = 0; k < fastest.length; k++) {
              if (consideredTiles[fastest[k]] === undefined) {
                fastest.splice(k, 1);  // Has been removed before.
                k--;
                continue;
              }
              if (consideredTiles[neighborKey] <= consideredTiles[fastest[k]]) {
                insertionIndex = k;
                break;
              }
            }
            if (insertionIndex === -1) { fastest.push(neighborKey); }
            else { fastest.splice(insertionIndex, 0, neighborKey); }
          }
        }
      }
    }
    return walkedTiles;
  },

  // Find the path from tstart = {q, r} to tend = {q, r}
  // with a minimal distance, at a certain speed. (It's A*.)
  // Requires humans to be on that tile.
  // Returns a list of tiles = "q:r" through the trajectory.
  // - endKey: the "q:r" tile of the target.
  // - parents: map from "q:r" tiles to the "q:r" tile you would walk from
  //   to get there.
  // - costs: map from "q:r" tiles to the speed cost to get there.
  travelTo: function travelTo(tstart, tend, speed,
                              limitToSpeed, maxTiles, human) {
    // Optional parameters.
    if (maxTiles == null) { maxTiles = MAX_INT; }
    if (human == null) { human = this.humanity.tile(tstart); }
    var camp = human.c;       // Camp which wants to travel.
    var endKey = this.keyFromTile(tend);
    var walkedTiles = {};     // Valid accessed tiles.
    var consideredTiles = {}; // Map from tile keys to distance walked.
    var heuristic = {};       // Just like consideredTiles, with heuristic.
    var fastest = [];         // List of tile keys from fastest to slowest.
    var parents = {};         // Map from tile keys to parent tile keys.
    var current = this.keyFromTile(tstart);
    parents[current] = null;
    consideredTiles[current] = 0;
    fastest.push(current);
    // Going through each considered tile.
    while (fastest.length > 0 && endKey !== current) {
      current = fastest.shift();
      walkedTiles[current] = true;
      // Check the camp. Is there a potential battle?
      var humanityNeighbor = this.humanity.tile(this.tileFromKey(current));
      if (humanityNeighbor && humanityNeighbor.c != null
          && humanityNeighbor.c !== camp) {
        continue;
      }
      for (var i = 0; i < 6; i++) {
        var neighbor = this.neighborFromTile(this.tileFromKey(current), i);
        var distanceCost = this.distance(neighbor);
        // Can we go there at that speed?
        if (speed < distanceCost) { continue; }
        if (maxTiles <= 0) { return null; }
        else { maxTiles--; }
        // Here, we can go there.
        var newDistance = consideredTiles[current] + distanceCost;
        if (!!limitToSpeed && speed < newDistance) { continue; }
        var neighborKey = this.keyFromTile(neighbor);
        if (consideredTiles[neighborKey] !== undefined &&
            newDistance < consideredTiles[neighborKey]) {
          // We have a better path to this tile.
          delete consideredTiles[neighborKey];
        }
        if (consideredTiles[neighborKey] === undefined &&
            walkedTiles[neighborKey] === undefined) {
          consideredTiles[neighborKey] = newDistance;
          heuristic[neighborKey] = newDistance + (
              Math.abs(tend.q - neighbor.q) +
              Math.abs(tend.r - neighbor.r) +
              Math.abs(tend.q + tend.r - neighbor.q - neighbor.r)) / 2;
          // Where should we insert it in `fastest`?
          var insertionIndex = -1;
          for (var k = 0; k < fastest.length; k++) {
            if (heuristic[fastest[k]] === undefined) {
              fastest.splice(k, 1);  // Has been removed before.
              k--;
              continue;
            }
            if (heuristic[neighborKey] <= heuristic[fastest[k]]) {
              insertionIndex = k;
              break;
            }
          }
          if (insertionIndex === -1) { fastest.push(neighborKey); }
          else { fastest.splice(insertionIndex, 0, neighborKey); }
          parents[neighborKey] = current;
        }
      }
    }
    if (endKey !== current) { return null; }  // No dice. ☹
    return {
      endKey: endKey,
      parents: parents,
      costs: consideredTiles,
    };
  },

  // Given a target tileKey `endKey`
  // and `parents`, a map from tileKey to the previous tileKey,
  // return a list from the start position to `endKey`, tile by tile.
  pathFromParents: function pathFromParents(endKey, parents) {
    var path = [];
    if (parents[endKey] == null) { return []; }
    while (parents[endKey] !== null) {
      path.push(endKey);
      endKey = parents[endKey];
    }
    path.push(endKey);
    return path.reverse();
  },

  setDistancesForHuman: function setDistancesForHuman(h) {
    if ((h.o & manufacture.boat) !== 0) {
      this.distances[tileTypes.water] = 1;
      this.distances[tileTypes.swamp] = 1;
    } else if ((h.o & manufacture.plane) !== 0) {
      this.distances[tileTypes.water] = 2;
      this.distances[tileTypes.swamp] = 2;
    }
  },
  unsetDistancesForHuman: function unsetDistancesForHuman(h) {
    this.distances[tileTypes.water] = normalWater;
    this.distances[tileTypes.swamp] = normalSwamp;
  },
  humanTravelFrom: function humanTravelFrom(tpos) {
    var h = this.humanity.tile(tpos);
    if (!h || h.h <= 0) { return {}; }
    this.setDistancesForHuman(h);
    var tiles = this.travelFrom(tpos, this.speedFromHuman(h));
    this.unsetDistancesForHuman(h);
    return tiles;
  },

  humanTravelTo: function humanTravelTo(tpos, tend, limitToSpeed, maxTiles, h) {
    if (h == null) { h = this.humanity.tile(tpos); }
    if (!h || h.h <= 0) { return null; }
    this.setDistancesForHuman(h);
    var tiles = this.travelTo(tpos, tend, this.speedFromHuman(h),
        limitToSpeed, maxTiles, h);
    this.unsetDistancesForHuman(h);
    return tiles;
  },

  humanTravelPath: function humanTravelPath(tpos, tend) {
    var travel = this.humanTravelTo(tpos, tend);
    if (travel == null) { return []; }
    return this.pathFromParents(travel.endKey, travel.parents);
  },

  humanTravelSpeedPath: function humanTravelPath(tpos, tend) {
    var travel = this.humanTravelTo(tpos, tend, true);
    if (travel == null) { return []; }
    return this.pathFromParents(travel.endKey, travel.parents);
  },


  // Buildings.

  buildingDependencies: buildingDependencies,
  buildingTileDependency: buildingTileDependency,

  // Given a building (see tileTypes) and a tile = {q, r},
  // check whether the building can be built there.
  // resources = {lumber, usedLumber, metal, usedMetal, wealth, usedWealth}
  // is the resources available for use in the current camp.
  validConstruction: function validConstruction(building, tile, resources) {
    if (building == null) { return true; }   // Destruction is always valid.
    var humanityTile = this.humanity.tile(tile);
    var tileInfo = this.tile(tile);
    var spareLumber = resources.lumber - resources.usedLumber;
    var spareMetal = resources.metal - resources.usedMetal;
    var spareFarm = resources.wealth - resources.usedWealth;
    if (!humanityTile || humanityTile.h <= 0) { return false; }
    // Requirements on the current tile.
    if (tileInfo.type === tileTypes.water &&
        (building === tileTypes.farm || building === tileTypes.residence ||
         building === tileTypes.skyscraper || building === tileTypes.factory ||
         building === tileTypes.airland || building === tileTypes.airport ||
         building === tileTypes.gunsmith)) { return false; }
    if (buildingTileDependency[building] !== undefined) {
      var validCurrentTile = false;
      for (var i = 0; i < buildingTileDependency[building].length; i++) {
        if (buildingTileDependency[building][i] === tileInfo.type ||
            buildingTileDependency[building][i] === humanityTile.b) {
              validCurrentTile = true;
            }
      }
      if (!validCurrentTile) { return false; }
    }
    // Requirements on the surrounding tiles.
    if (buildingDependencies[building] !== undefined) {
      // There are dependency requirements.
      var requiredDependencies = buildingDependencies[building];
      var dependencies = new Array(requiredDependencies.length);
      for (var i = 0; i < dependencies.length; i++) { dependencies[i] = 0; }
      for (var i = 0; i < 6; i++) {
        // Check all neighbors for dependencies.
        var neighbor = this.neighborFromTile(tile, i);
        var humanityNeighbor = this.humanity.tile(neighbor);
        var terrainNeighbor = this.tile(neighbor);
        for (var j = 0; j < requiredDependencies.length; j++) {
          if (requiredDependencies[j][1] >= 0 && (humanityNeighbor
                && humanityNeighbor.b === requiredDependencies[j][1]) ||
              terrainNeighbor.type === requiredDependencies[j][1]) {
            dependencies[j]++;
          } else if (requiredDependencies[j][1] < 0) {
            // Resources.
            if (requiredDependencies[j][1] === resourceTypes.lumber
                && spareLumber < requiredDependencies[j][0]) {
              return false;
            } else if (requiredDependencies[j][1] === resourceTypes.metal
                && spareMetal < requiredDependencies[j][0]) {
              return false;
            } else if (requiredDependencies[j][1] === resourceTypes.wealth
                && spareFarm < requiredDependencies[j][0]) {
              return false;
            }
            dependencies[j] = requiredDependencies[j][0];
          }
        }
      }
      // Check that we have the correct number of buildings around.
      for (var j = 0; j < dependencies.length; j++) {
        if (dependencies[j] < requiredDependencies[j][0]) {
          return false;
        }
      }
      return true;
    } else { return true; }
    return false;
  },


  // Remote connection.
  //

  planTypes: planTypes,
  plans: {},

  addPlan: function addPlan(plan) { plans[plan.at] = plan; },
  eachPlan: function eachPlan(f) {
    for (var tileKey in plans) { f(plans[tileKey]); }
  },
  clearPlans: function clearPlans() { plans = {}; },


};
