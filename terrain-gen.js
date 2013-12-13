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
  lumber:       20
};
var buildingTypes = [ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 20 ];

var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[tileTypes.water]    = tileTypes.swamp;
tileVegetationTypeFromSteepness[tileTypes.steppe]   = tileTypes.meadow;
tileVegetationTypeFromSteepness[tileTypes.hill]     = tileTypes.forest;
tileVegetationTypeFromSteepness[tileTypes.mountain] = tileTypes.taiga;

function tileType(steepness, vegetation) {
  if (vegetation) { return tileVegetationTypeFromSteepness[steepness]; }
  else { return steepness; }
}

// (Sparse) Array of array of tiles.
var memoizedTiles = [];

// Get information about the tile at hexagonal coordinates `coord` {q, r}.
// Returns
//  - steepness: altitude level. See `tileTypes`.
//  - vegetation: boolean; whether there is vegetation.
//  - type: tile type. See `tileTypes`.
//  - rain: floating point number between -1 and 1, representing how heavy the
//  rainfall is.
function terrain(coord) {
  var q = coord.q;
  var r = coord.r;
  if (memoizedTiles[q] != null && memoizedTiles[q][r] != null) {
    return memoizedTiles[q][r];
  }
  var size = simplex2.noise2D(r/500, q/500) * 5;
  var riverNoise = 1-Math.abs((
      + 4 * (simplex1.noise2D(q/4/factor, r/4/factor))
      + 2 * (simplex1.noise2D(q/2/factor, r/2/factor))
      + 1 * (simplex1.noise2D(q/1/factor, r/1/factor))
      + 1/2 * (simplex1.noise2D(q*2/factor, r*2/factor))
      )/(1/2+1+2+4));
  var heightNoise = Math.sin(
      // Abs gives valleys.
      - (size) * Math.abs(simplex1.noise2D(1/4*q/factor, 1/4*r/factor))
      + simplex1.noise2D(q/factor, r/factor)
      - 1/2 * simplex1.noise2D(2*q/factor, 2*r/factor)
      + 1/4 * simplex1.noise2D(4*q/factor, 4*r/factor)
      - 1/8 * simplex1.noise2D(8*q/factor, 8*r/factor)
      + 1/16 * simplex1.noise2D(16*q/factor, 16*r/factor));
  var seaNoise = -simplex2.noise2D(r/factor/8, q/factor/8)
      + simplex2.noise2D(r/factor/4, q/factor/4)
      + heightNoise/2;
  var vegetationNoise = (size / 5) * simplex2.noise2D(q/factor, r/factor)
      + 1/2 * simplex2.noise2D(2*q/factor, 2*r/factor)
      + 1/4 * simplex2.noise2D(4*q/factor, 4*r/factor)
      + 1/8 * simplex2.noise2D(8*q/factor, 8*r/factor)
      + 1/16 * simplex2.noise2D(16*q/factor, 16*r/factor);
  var steepness = (
    // Rivers are thinner in mountains.
    (riverNoise - (heightNoise > 0? heightNoise/42: 0) > 0.98
    // Seas are smaller in mountains.
    || seaNoise < -0.7) ?
        tileTypes.water:
    (heightNoise - riverNoise/2 < 0.1) ?
        tileTypes.steppe:
    // Mountains are cut off (by hills) to avoid circular mountain formations.
    (heightNoise - riverNoise < 0.2) ?
        tileTypes.hill:
        tileTypes.mountain);
  var vegetation = (vegetationNoise
      // Less vegetation on water.
      - (steepness === tileTypes.water? 2 * seaNoise: 0)
      + Math.abs(heightNoise + 0.15)) < 0;

  var tile = {
    steepness: steepness,
    vegetation: vegetation,
    type: tileType(steepness, vegetation),
    rain: -vegetationNoise / 2
  };
  if (memoizedTiles[q] == null) {
    memoizedTiles[q] = [];
  }
  memoizedTiles[q][r] = tile;
  return tile;
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

function distance(tpos) {
  var t = terrain(tpos);
  var h = humanity(tpos);
  var d = distances[(h && h.b)? h.b: t.type];
  if (d === undefined) { d = distances[t.type]; }
  return d;
}

// Find a neighboring tile.
// `tile` is {q, r}.
// `orientation` is 0 for right, 1 for top right, and
// so on counter-clockwise until 5 for bottom right.
function neighborFromTile(tile, orientation) {
  if (orientation === 0) { return { q: tile.q + 1, r: tile.r };
  } else if (orientation === 1) { return { q: tile.q + 1, r: tile.r - 1 };
  } else if (orientation === 2) { return { q: tile.q, r: tile.r - 1};
  } else if (orientation === 3) { return { q: tile.q - 1, r: tile.r };
  } else if (orientation === 4) { return { q: tile.q - 1, r: tile.r + 1 };
  } else if (orientation === 5) { return { q: tile.q, r: tile.r + 1 };
  }
}

// Return a string key unique to the tile.
function keyFromTile(tile) { return tile.q + ':' + tile.r; }
function tileFromKey(key) {
  var values = key.split(':');
  return { q: +values[0], r: +values[1] };
}

// Find the set of tiles one can move to, from a starter tile.
// Requires humans to be on that tile.
// `tstart` is a {q, r} tile position. (It's Dijkstra.)
// Returns a map from tile keys (see keyFromTile) to truthy values.
function travelFrom(tstart, speed) {
  var camp = humanity(tstart).c;    // Camp which wants to travel.
  var walkedTiles = {};     // Valid accessible tiles.
  var current = keyFromTile(tstart);
  var consideredTiles = {}; // Map from tile keys to distance walked.
  consideredTiles[current] = 0;
  var fastest = [];         // List of tile keys from fastest to slowest.
  fastest.push(current);
  // Going through each considered tile.
  while (fastest.length > 0) {
    current = fastest.shift();
    walkedTiles[current] = true;
    // Check the camp. Is there a potential battle?
    var humanityNeighbor = humanity(tileFromKey(current));
    if (humanityNeighbor && humanityNeighbor.c != null
        && humanityNeighbor.c !== camp) {
      continue;
    }
    for (var i = 0; i < 6; i++) {
      var neighbor = neighborFromTile(tileFromKey(current), i);
      var newDistance = consideredTiles[current] + distance(neighbor);
      if (newDistance <= speed) {
        // Update data.
        var neighborKey = keyFromTile(neighbor);
        if (consideredTiles[neighborKey] !== undefined &&
            newDistance < consideredTiles[neighborKey]) {
          // We have a better path to this tile.
          delete consideredTiles[neighborKey];
        }
        if (consideredTiles[neighborKey] === undefined &&
            walkedTiles[neighborKey] === undefined) {
          consideredTiles[neighborKey] = newDistance;
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
}

// Find the path from tstart = {q, r} to tend = {q, r}
// with a minimal distance, at a certain speed. (It's A*.)
// Requires humans to be on that tile.
// Returns a list of tiles = "q:r" through the trajectory.
function travelTo(tstart, tend, speed) {
  var camp = humanity(tstart).c;    // Camp which wants to travel.
  var endKey = keyFromTile(tend);
  var walkedTiles = {};     // Valid accessed tiles.
  var consideredTiles = {}; // Map from tile keys to distance walked.
  var heuristic = {};       // Just like consideredTiles, with heuristic.
  var fastest = [];         // List of tile keys from fastest to slowest.
  var parents = {};         // Map from tile keys to parent tile keys.
  var current = keyFromTile(tstart);
  consideredTiles[current] = 0;
  fastest.push(current);
  // Going through each considered tile.
  while (fastest.length > 0 && endKey !== current) {
    current = fastest.shift();
    walkedTiles[current] = true;
    // Check the camp. Is there a potential battle?
    var humanityNeighbor = humanity(tileFromKey(current));
    if (humanityNeighbor && humanityNeighbor.c != null
        && humanityNeighbor.c !== camp) {
      continue;
    }
    for (var i = 0; i < 6; i++) {
      var neighbor = neighborFromTile(tileFromKey(current), i);
      var newDistance = consideredTiles[current] + distance(neighbor);
      if (newDistance <= speed) {
        var neighborKey = keyFromTile(neighbor);
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
  }
  var path = [];
  if (endKey !== current) { return path; }  // No dice. ☹
  while (parents[endKey] !== undefined) {
    path.push(endKey);
    endKey = parents[endKey];
  }
  path.push(keyFromTile(tstart));
  return path.reverse();
}

var normalWater = distances[tileTypes.water];
var normalSwamp = distances[tileTypes.swamp];
function setDistancesForHuman(h) {
  if ((h.o & manufacture.boat) !== 0) {
    distances[tileTypes.water] = 1;
    distances[tileTypes.swamp] = 1;
  } else if ((h.o & manufacture.plane) !== 0) {
    distances[tileTypes.water] = 2;
    distances[tileTypes.swamp] = 2;
  }
}
function unsetDistancesForHuman(h) {
  distances[tileTypes.water] = normalWater;
  distances[tileTypes.swamp] = normalSwamp;
}
function humanTravel(tpos) {
  var h = humanity(tpos);
  if (!h || h.h <= 0) { return {}; }
  setDistancesForHuman(h);
  var tiles = travelFrom(tpos, speedFromHuman(h));
  unsetDistancesForHuman(h);
  return tiles;
}

function humanTravelTo(tpos, tend) {
  var h = humanity(tpos);
  if (!h || h.h <= 0) { return []; }
  setDistancesForHuman(h);
  var tiles = travelTo(tpos, tend, speedFromHuman(h));
  unsetDistancesForHuman(h);
  return tiles;
}



// Humanity

var manufacture = {
  car: 1,
  plane: 2,
  boat: 4,
  gun: 8
};

function speedFromHuman(human) {
  if ((human.o & manufacture.plane) !== 0) {
    return 32;
  } else if ((human.o & manufacture.car) !== 0) {
    return 16;
  } else { return 8; }
}

// The index is the tileTypes id.
// It is a list of [number, tileType] requirements to build something.
var buildingDependencies = [,,,,,,,,
    ,
    [[2, tileTypes.farm]],
    [[6, tileTypes.residence]],
    [[3, tileTypes.residence], [1, tileTypes.road]],
    [[1, tileTypes.residence], [1, tileTypes.water]],
    [[2, tileTypes.road]],
    [[1, tileTypes.gunsmith], [3, tileTypes.airland]],
    [[1, tileTypes.skyscraper], [1, tileTypes.factory]],
    ,
    [[1, tileTypes.road]],
    ,
    ,
    [[1, tileTypes.residence]]
];

// Given a building (see tileTypes) and a tile = {q, r},
// check whether the building can be built there.
function validConstruction(building, tile) {
  if (building === null) { return true; }   // Destruction is always valid.
  var humanityTile = humanity(tile);
  var tileInfo = terrain(tile);
  if (!humanityTile || humanityTile.h <= 0) { return false; }
  if (tileInfo.type === tileTypes.water &&
      (building === tileTypes.farm || building === tileTypes.residence ||
       building === tileTypes.skyscraper || building === tileTypes.factory ||
       building === tileTypes.airland || building === tileTypes.airport ||
       building === tileTypes.gunsmith)) { return false; }
  if (buildingDependencies[building] !== undefined) {
    // There are dependency requirements.
    var requiredDependencies = buildingDependencies[building];
    var dependencies = new Array(requiredDependencies.length);
    for (var i = 0; i < dependencies.length; i++) { dependencies[i] = 0; }
    for (var i = 0; i < 6; i++) {
      // Check all neighbors for dependencies.
      var neighbor = neighborFromTile(tile, i);
      var humanityNeighbor = humanity(neighbor);
      var terrainNeighbor = terrain(neighbor);
      for (var j = 0; j < requiredDependencies.length; j++) {
        if ((humanityNeighbor
             && humanityNeighbor.b === requiredDependencies[j][1]) ||
            terrainNeighbor.type === requiredDependencies[j][1]) {
          dependencies[j]++;
        }
      }
    }
    // Check that we have the correct number of buildings around.
    for (var j = 0; j < dependencies.length; j++) {
      if (dependencies[j] < requiredDependencies[j][0]) {
        return false;
      }
    }
    // Lumber is on forests.
    if (building === tileTypes.lumber && tileInfo.type !== tileTypes.forest) {
      return false;
    }
    return true;
  } else { return true; }
  return false;
}


// Remote connection.
//

var planTypes = {
  move: 1,
  build: 2
};

var plans = {};
function addPlan(plan) { plans[plan.at] = plan; }
function eachPlan(f) {
  for (var tileKey in plans) { f(plans[tileKey]); }
}
function clearPlans() { plans = {}; }

