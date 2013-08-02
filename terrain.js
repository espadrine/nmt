var SimplexNoise = require('simplex-noise');

var simplex1 = new SimplexNoise();
var simplex2 = new SimplexNoise();

// Parameter to how stretched the map is.
var factor = 50;

// The following are actually constants.
var water = 0;
var steppe = 1;
var hills = 2;
var mountain = 3;
var altitude = {
  water: water,
  steppe: steppe,
  hills: hills,
  mountain: mountain,
};

// Get information about the tile at coordinates `coord`.
// Returns
//  - height: altitude level. See `altitude`.
//  - vegetation: boolean; whether there is vegetation.
function tile(coord) {
  var x = coord.x;
  var y = coord.y;
  var heightNoise = Math.sin(
      - 4 * Math.abs(simplex1.noise2D(1/4*x/factor, 1/4*y/factor))
      + simplex1.noise2D(x/factor, y/factor)
      - 1/2 * Math.abs(simplex1.noise2D(2*x/factor, 2*y/factor))
      + 1/4 * Math.abs(simplex1.noise2D(4*x/factor, 4*y/factor))
      - 1/8 * Math.abs(simplex1.noise2D(8*x/factor, 8*y/factor))
      + 1/16 * Math.abs(simplex1.noise2D(16*x/factor, 16*y/factor)));
  var seaNoise = 2*simplex2.noise2D(x/factor/2, y/factor/2);
  var vegetationNoise = simplex2.noise2D(x/factor, y/factor)
      + 1/2 * simplex2.noise2D(2*x/factor, 2*y/factor)
      + 1/4 * simplex2.noise2D(4*x/factor, 4*y/factor)
      + 1/8 * simplex2.noise2D(8*x/factor, 8*y/factor)
      + 1/16 * simplex2.noise2D(16*x/factor, 16*y/factor);
  var height = ((heightNoise < -0.99 || heightNoise + seaNoise < -1.7) ?
                water:
               (heightNoise < -0.5) ?
                steppe:
               (heightNoise < 0.4) ?
                hills:
                mountain);
  var vegetation = vegetationNoise-seaNoise/18+Math.abs(heightNoise+0.15) < 0;

  return {
    height: height,
    vegetation: vegetation
  };
}

// For each altitude level, [plain name, vegetation name].
var nameFromTile = {};
nameFromTile[water]    = ["water", "swamp"];
nameFromTile[steppe]   = ["steppe", "meadow"];
nameFromTile[hills]    = ["hills", "forest"];
nameFromTile[mountain] = ["mountain", "taiga"];

// Input a tile, output the tile name.
function tilename(tile) {
  return nameFromTile[tile.height][+tile.vegetation];
}

exports.tile = tile;
exports.altitude = altitude;
exports.tilename = tilename;

