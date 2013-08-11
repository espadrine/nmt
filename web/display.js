var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
var data = imgdata.data;

// Parameter to how stretched the map is.
var factor = 50;

// The following are actually constants.
var water = 0;
var steppe = 1;
var hills = 2;
var mountain = 3;
var swamp = 4;
var meadow = 5;
var forest = 6;
var taiga = 7;
var tileTypes = {
  water: water,
  steppe: steppe,
  hills: hills,
  mountain: mountain,
  swamp: swamp,
  meadow: meadow,
  forest: forest,
  taiga: taiga
};

// For each altitude level, [plain name, vegetation name].
var nameFromTile = [];
nameFromTile[water]    = "water";
nameFromTile[steppe]   = "steppe";
nameFromTile[hills]    = "hills";
nameFromTile[mountain] = "mountain";
nameFromTile[swamp]    = "swamp";
nameFromTile[meadow]   = "meadow";
nameFromTile[forest]   = "forest";
nameFromTile[taiga]    = "taiga";

// Input a tile, output the tile name.
function tileName(tile) {
  return nameFromTile[tile.type];
}

var tileVegetationTypeFromSteepness = [];
tileVegetationTypeFromSteepness[water] = swamp;
tileVegetationTypeFromSteepness[steppe] = meadow;
tileVegetationTypeFromSteepness[hills] = forest;
tileVegetationTypeFromSteepness[mountain] = taiga;

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
        water:
    (heightNoise < 0.1) ?
        steppe:
    // Mountains are cut off (by hills) to avoid circular mountain formations.
    (heightNoise < 1 - (riverNoise * 0.42)) ?
        hills:
        mountain);
  var vegetation = (vegetationNoise
      - (steepness === water? 2 * seaNoise: 0)   // Less vegetation on water.
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

// Given real hexagonal coordinates p = {q, r}, round to the nearest integer
// hexagonal coordinate.
function intPointFromReal(p) {
  var x = p.q;
  var z = p.r;
  var y = - x - z;
  var rx = Math.round(x);
  var ry = Math.round(y);
  var rz = Math.round(z);
  var x_err = Math.abs(rx - x);
  var y_err = Math.abs(ry - y);
  var z_err = Math.abs(rz - z);
  if (x_err > y_err && x_err > z_err) {
    rx = - ry - rz;
  } else if (y_err > z_err) {
    ry = - rx - rz;
  } else {
    rz = - rx - ry;
  }

  return {
    q: rx,
    r: rz
  };
}


// Given a point px = {x, y} representing a pixel position on the screen,
// and given a position px0 = {x0, y0} of the screen on the map,
// return a point {q, r} of the hexagon on the map.
// `size` is the radius of the smallest disk containing the hexagon.
function tileFromPixel(px, px0, size) {
  var xm = px.x + px0.x0;
  var ym = px.y + px0.y0;
  return intPointFromReal({
    q: (Math.sqrt(3) * xm - ym) / 3 / size,
    r: 2 * ym / 3 / size
  });
}

var accessibleTiles = [];

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintTiles(canvas, size, origin) {
  var width = canvas.width;
  var height = canvas.height;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tilePos = tileFromPixel({ x:x, y:y }, origin, size);
      var t = tile(tilePos);
      var color = [180, 0, 0];
      if (t.steepness == water) {
        color = [50, 50, 180];
      } else if (t.steepness == steppe) {
        color = [0, 180, 0];
      } else if (t.steepness == hills) {
        color = [180, 100, 0];
      }
      // Rainfall
      var rain = Math.min(Math.abs(color[0] - color[1]) / 2 * t.rain, 255);
      color[0] -= rain; // darker red
      color[1] -= rain; // darker green
      color[2] -= Math.min(t.rain * 50, 255);   // darker blue
      // Vegetation
      if (t.vegetation) {
        color[0] -= 100;
        color[1] -= 50;
        color[2] -= 100;
      }
      var travelable = 255;
      for (var i = 0; i < accessibleTiles.length; i++) {
        if (tilePos.q === accessibleTiles[i].q
            && tilePos.r === accessibleTiles[i].r) {
          travelable = 170;
        }
      }
      var position = (x + y * width) * 4;
      data[position + 0] = color[0];
      data[position + 1] = color[1];
      data[position + 2] = color[2];
      data[position + 3] = travelable;
    }
  }
  ctx.putImageData(imgdata, 0, 0);
}


// Movements.
var distances = {};
distances[water]  = 2;
distances[steppe] = 2;
distances[hills]  = 4;
distances[mountain] = 16;

function distance(tpos) {
  var t = tile(tpos);
  var d = distances[t.steepness];
  if (t.vegetation) { d *= 2; }
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

// Whether `tile` is in the list of tiles `tiles`.
// `tile` is {q, r}.
function tileInTiles(tile, tiles) {
  for (var i = 0; i < tiles.length; i++) {
    if (tile.q === tiles[i].q && tile.r === tiles[i].r) {
      return true;
    }
  }
  return false;
}

// Find the set of tiles one can move to, from a starter tile.
// `tpos` is a {q, r} tile position.
function travelFrom(tpos, speed) {
  var walkedTiles = [];
  var consideredTiles = [tpos]; // We consider the tile we're on.
  var walkedDistance = [0];     // On that tile, we haven't walked at all.
  // Going through each considered tile; `ti` means tile index.
  for (var ti = 0; ti < consideredTiles.length; ti++) {
    // Going through each neighbor.
    for (var i = 0; i < 6; i++) {
      var neighbor = neighborFromTile(consideredTiles[ti], i);
      var newDistance = walkedDistance[ti] + distance(neighbor);
      if (!tileInTiles(neighbor, walkedTiles)
          && !tileInTiles(neighbor, consideredTiles)
          && (newDistance <= speed)) {
        consideredTiles.push(neighbor);
        walkedDistance.push(newDistance);
      }
    }
    walkedTiles.push(consideredTiles[ti]);
  }
  return walkedTiles;
}




// Initialization and event management.
//

// Size of radius of the smallest disk containing the hexagon.
var hexaSize = 20;
// Pixel position of the top left screen pixel,
// compared to the origin of the map.
var origin = { x0: 0, y0: 0 };


paintTiles(canvas, hexaSize, origin);

window.onkeydown = function(event) {
  var redraw = false;
  if (event.keyCode === 39) {           // →
    origin.x0 += canvas.width / 2;
    redraw = true;
  } else if (event.keyCode === 38) {    // ↑
    origin.y0 -= canvas.height / 2;
    redraw = true;
  } else if (event.keyCode === 37) {    // ←
    origin.x0 -= canvas.width / 2;
    redraw = true;
  } else if (event.keyCode === 40) {    // ↓
    origin.y0 += canvas.height / 2;
    redraw = true;
  } else if (((event.keyCode === 61 || event.keyCode === 187) && event.shiftKey)
          || event.keyCode === 107) {  // +
    hexaSize *= 2;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109) {   // -
    hexaSize = Math.ceil(hexaSize / 2);
    redraw = true;
  }
  if (redraw) {
    paintTiles(canvas, hexaSize, origin);
  }
};

window.onclick = function(event) {
  var startTile = tileFromPixel({ x: event.clientX, y: event.clientY },
      origin, hexaSize);
  accessibleTiles = travelFrom(startTile, 8);
  paintTiles(canvas, hexaSize, origin);
};

