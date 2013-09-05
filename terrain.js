var SimplexNoise = require('simplex-noise');
var MersenneTwister = require('./mersenne-twister');
var humanity = require('./humanity');

var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));

// Parameter to how stretched the map is.
var factor = 50;

// The following are actually constants.
var tileTypes = {
  water:        0,
  steppe:       1,
  hill:        2,
  mountain:     3,
  swamp:        4,
  meadow:       5,
  forest:       6,
  taiga:        7,
  farm:         8,
  residence:    9,
  skyscraper:   10,
  factory:      11,
  dock:        12,
  airland:      13,
  airport:      14,
  gunsmith:     15,
  road:         16,
  wall:         17
};

var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[tileTypes.water]    = tileTypes.swamp;
tileVegetationTypeFromSteepness[tileTypes.steppe]   = tileTypes.meadow;
tileVegetationTypeFromSteepness[tileTypes.hill]    = tileTypes.forest;
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
  var heightNoise = Math.sin(
      - (size) * Math.abs(simplex1.noise2D(1/4*q/factor, 1/4*r/factor))
      + simplex1.noise2D(q/factor, r/factor)
      - 1/2 * Math.abs(simplex1.noise2D(2*q/factor, 2*r/factor))
      + 1/4 * Math.abs(simplex1.noise2D(4*q/factor, 4*r/factor))
      - 1/8 * Math.abs(simplex1.noise2D(8*q/factor, 8*r/factor))
      + 1/16 * Math.abs(simplex1.noise2D(16*q/factor, 16*r/factor)));
  var riverNoise = Math.sin(
      - 16 * Math.abs(simplex1.noise2D(q/16/factor, r/16/factor))
      + 8 * Math.abs(simplex1.noise2D(q/8/factor, r/8/factor))
      - 4 * Math.abs(simplex1.noise2D(q/4/factor, r/4/factor))
      + 2 * Math.abs(simplex1.noise2D(q/2/factor, r/2/factor))
      - 1/2 * Math.abs(simplex1.noise2D(2*q/factor, 2*r/factor))
      + 1/4 * Math.abs(simplex1.noise2D(4*q/factor, 4*r/factor))
      - 1/8 * Math.abs(simplex1.noise2D(8*q/factor, 8*r/factor)));
  var seaNoise = (size / 2) * simplex1.noise2D(r/factor/8, q/factor/8)
      + 1/2 * simplex1.noise2D(2*r/factor/8, 2*q/factor/8);
  var vegetationNoise = (size / 5) * simplex2.noise2D(q/factor, r/factor)
      + 1/2 * simplex2.noise2D(2*q/factor, 2*r/factor)
      + 1/4 * simplex2.noise2D(4*q/factor, 4*r/factor)
      + 1/8 * simplex2.noise2D(8*q/factor, 8*r/factor)
      + 1/16 * simplex2.noise2D(16*q/factor, 16*r/factor);
  var steepness =
    // Rivers are thinner in mountains.
    ((riverNoise < -0.99 - (heightNoise * 0.013)
    // Seas are smaller in mountains.
    || heightNoise + seaNoise < -1.3) ?
        tileTypes.water:
    (heightNoise < 0.1) ?
        tileTypes.steppe:
    // Mountains are cut off (by hills) to avoid circular mountain formations.
    (heightNoise < 1 - (riverNoise * 0.42)) ?
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
// `tpos` is a {q, r} tile position. (It's Dijkstra.)
// Returns a map from tile keys (see keyFromTile) to truthy values.
function travelFrom(tpos, speed) {
  var walkedTiles = {};     // Valid accessible tiles.
  var consideredTiles = {}; // Map from tile keys to distance walked.
  consideredTiles[keyFromTile(tpos)] = 0;
  var nConsideredTiles = 1; // Number of considered tiles.
  // Going through each considered tile.
  while (nConsideredTiles > 0) {
    for (var tileKey in consideredTiles) {
      for (var i = 0; i < 6; i++) {
        var neighbor = neighborFromTile(tileFromKey(tileKey), i);
        var newDistance = consideredTiles[tileKey] + distance(neighbor);
        if (newDistance <= speed) {
          var neighborKey = keyFromTile(neighbor);
          if (consideredTiles[neighborKey] !== undefined) {
            if (newDistance < consideredTiles[neighborKey]) {
              // We have a better path to this tile.
              consideredTiles[neighborKey] = newDistance;
            }
          } else if (walkedTiles[neighborKey] === undefined) {
            consideredTiles[neighborKey] = newDistance;
            nConsideredTiles++;
          }
        }
      }
      walkedTiles[tileKey] = true;
      delete consideredTiles[tileKey];
      nConsideredTiles--;
    }
  }
  return walkedTiles;
}

// Find the path from tstart = {q, r} to tend = {q, r}
// with a minimal distance, at a certain speed. (It's A*.)
// Returns a list of tiles = "q:r" through the trajectory.
function travelTo(tstart, tend, speed) {
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
    for (var i = 0; i < 6; i++) {
      var neighbor = neighborFromTile(tileFromKey(current), i);
      var newDistance = consideredTiles[current] + distance(neighbor);
      if (newDistance <= speed) {
        var neighborKey = keyFromTile(neighbor);
        if (consideredTiles[neighborKey] !== undefined) {
          if (newDistance < consideredTiles[neighborKey]) {
            // We have a better path to this tile.
            delete consideredTiles[neighborKey];
            delete heuristic[neighborKey];
          }
        } else if (walkedTiles[neighborKey] === undefined) {
          consideredTiles[neighborKey] = newDistance;
          var yEnd = - tend.q - tend.r;
          var yNeighbor = - neighbor.q - neighbor.r;
          heuristic[neighborKey] = newDistance + Math.sqrt(
            (tend.q - neighbor.q) * (tend.q - neighbor.q)
            + (tend.r - neighbor.r) * (tend.r - neighbor.r)
            + (yEnd - yNeighbor) * (yEnd - yNeighbor));
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
  console.log('humanTravelTo');
  if (!h || h.h <= 0) { return []; }
  console.log('humans there:', h);
  setDistancesForHuman(h);
  var tiles = travelTo(tpos, tend, speedFromHuman(h));
  unsetDistancesForHuman(h);
  console.log('tiles:', tiles);
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

// Remote connection.
//

var planTypes = {
  move: 1,
  build: 2,
  destroy: 3
};

var plans = [];
function addPlan(plan) { plans.push(plan); }
function eachPlan(f) {
  for (var i = 0; i < plans.length; i++) { f(plans[i]); }
}
function clearPlans() { plans = []; }

exports.terrain = terrain;
exports.travel = humanTravelTo;
exports.tileTypes = tileTypes;
exports.manufacture = manufacture;

exports.tileFromKey = tileFromKey;
exports.keyFromTile = keyFromTile;

exports.planTypes = planTypes;
exports.addPlan = addPlan;
exports.eachPlan = eachPlan;
exports.clearPlans = clearPlans;
