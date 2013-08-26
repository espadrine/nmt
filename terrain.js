var SimplexNoise = require('simplex-noise');
var MersenneTwister = require('./mersenne-twister');

var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));

// Parameter to how stretched the map is.
var factor = 50;

// The following are actually constants.
var tileTypes = {
  water:        0,
  steppe:       1,
  hills:        2,
  mountain:     3,
  swamp:        4,
  meadow:       5,
  forest:       6,
  taiga:        7,
  farm:         8,
  residence:    9,
  skyscraper:   10,
  factory:      11,
  docks:        12,
  airland:      13,
  airport:      14,
  gunsmith:     15,
  road:         16,
  wall:         17
};

// For each altitude level, [plain name, vegetation name].
var nameFromTile = [];
(function attributeNameFromTile() {
  var i = 0;
  for (var name in tileTypes) {
    nameFromTile[i++] = name;
  }
});

// Input a tile, output the tile name.
function tileName(tile) {
  return nameFromTile[tile.type];
}


var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[tileTypes.water]    = tileTypes.swamp;
tileVegetationTypeFromSteepness[tileTypes.steppe]   = tileTypes.meadow;
tileVegetationTypeFromSteepness[tileTypes.hills]    = tileTypes.forest;
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
function tile(coord) {
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
        tileTypes.hills:
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

exports.tile = tile;
exports.tileType = tileType;
exports.tileName = tileName;

