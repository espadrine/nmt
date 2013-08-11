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
var altitude = {
  water: water,
  steppe: steppe,
  hills: hills,
  mountain: mountain,
};


// (Sparse) Array of array of tiles.
var memoizedTiles = [];

// Get information about the tile at coordinates `coord`.
// Returns
//  - height: altitude level. See `altitude`.
//  - vegetation: boolean; whether there is vegetation.
function tile(coord) {
  var x = coord.x;
  var y = coord.y;
  if (memoizedTiles[x] != null && memoizedTiles[x][y] != null) {
    return memoizedTiles[x][y];
  }
  var size = simplex2.noise2D(y/500, x/500) * 5;
  var heightNoise = Math.sin(
      - (size) * Math.abs(simplex1.noise2D(1/4*x/factor, 1/4*y/factor))
      + simplex1.noise2D(x/factor, y/factor)
      - 1/2 * Math.abs(simplex1.noise2D(2*x/factor, 2*y/factor))
      + 1/4 * Math.abs(simplex1.noise2D(4*x/factor, 4*y/factor))
      - 1/8 * Math.abs(simplex1.noise2D(8*x/factor, 8*y/factor))
      + 1/16 * Math.abs(simplex1.noise2D(16*x/factor, 16*y/factor)));
  var riverNoise = Math.sin(
      - 16 * Math.abs(simplex1.noise2D(x/16/factor, y/16/factor))
      + 8 * Math.abs(simplex1.noise2D(x/8/factor, y/8/factor))
      - 4 * Math.abs(simplex1.noise2D(x/4/factor, y/4/factor))
      + 2 * Math.abs(simplex1.noise2D(x/2/factor, y/2/factor))
      - 1/2 * Math.abs(simplex1.noise2D(2*x/factor, 2*y/factor))
      + 1/4 * Math.abs(simplex1.noise2D(4*x/factor, 4*y/factor))
      - 1/8 * Math.abs(simplex1.noise2D(8*x/factor, 8*y/factor)));
  var seaNoise = (size / 2) * simplex1.noise2D(y/factor/8, x/factor/8)
      + 1/2 * simplex1.noise2D(2*y/factor/8, 2*x/factor/8);
  var vegetationNoise = (size / 5) * simplex2.noise2D(x/factor, y/factor)
      + 1/2 * simplex2.noise2D(2*x/factor, 2*y/factor)
      + 1/4 * simplex2.noise2D(4*x/factor, 4*y/factor)
      + 1/8 * simplex2.noise2D(8*x/factor, 8*y/factor)
      + 1/16 * simplex2.noise2D(16*x/factor, 16*y/factor);
  var height =
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
      - (height === water? 2 * seaNoise: 0)   // Less vegetation on water.
      + Math.abs(heightNoise + 0.15)) < 0;

  var tile = {
    height: height,
    vegetation: vegetation,
    rain: -vegetationNoise / 2
  };
  if (memoizedTiles[x] == null) {
    memoizedTiles[x] = [];
  }
  memoizedTiles[x][y] = tile;
  return tile;
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


// Given real hexagonal coordinates p = {x, y}, round to the nearest integer
// hexagonal coordinate.
function intPointFromReal(p) {
  var x = p.x;
  var z = p.y;
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
    x: rx,
    y: rz
  };
}


// Given a point ps = {xs, ys} representing a pixel position on the screen,
// and given a position ps0 = {xs0, ys0} of the screen on the map,
// return a point {x, y} of the hexagon on the map.
// `size` is the radius of the smallest disk containing the hexagon.
function tileFromPixel(ps, ps0, size) {
  var xm = ps.xs + ps0.xs0;
  var ym = ps.ys + ps0.ys0;
  return intPointFromReal({
    x: (Math.sqrt(3) * xm - ym) / 3 / size,
    y: 2 * ym / 3 / size
  });
}

var accessibleTiles = [];

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {xs0, ys0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintTiles(canvas, size, origin) {
  var width = canvas.width;
  var height = canvas.height;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tilePos = tileFromPixel({ xs: x, ys: y }, origin, size);
      var t = tile(tilePos);
      var color = [180, 0, 0];
      if (t.height == water) {
        color = [50, 50, 180];
      } else if (t.height == steppe) {
        color = [0, 180, 0];
      } else if (t.height == hills) {
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
        if (tilePos.x === accessibleTiles[i].x
            && tilePos.y === accessibleTiles[i].y) {
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
  var d = distances[t.height];
  if (t.vegetation) { d *= 2; }
  return d;
}

// Find a neighboring tile. `orientation` is 0 for right, 1 for top right, and
// so on counter-clockwise until 5 for bottom right.
function neighborFromTile(tile, orientation) {
  if (orientation === 0) { return { x: tile.x + 1, y: tile.y };
  } else if (orientation === 1) { return { x: tile.x + 1, y: tile.y - 1 };
  } else if (orientation === 2) { return { x: tile.x, y: tile.y - 1};
  } else if (orientation === 3) { return { x: tile.x - 1, y: tile.y };
  } else if (orientation === 4) { return { x: tile.x - 1, y: tile.y + 1 };
  } else if (orientation === 5) { return { x: tile.x, y: tile.y + 1 };
  }
}

// Whether `tile` is in the list of tiles `tiles`.
function tileInTiles(tile, tiles) {
  for (var i = 0; i < tiles.length; i++) {
    if (tile.x === tiles[i].x && tile.y === tiles[i].y) {
      return true;
    }
  }
  return false;
}

// Find the set of tiles one can move to, from a starter tile.
// `tpos` is an {x, y} tile position.
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
var origin = { xs0: 0, ys0: 0 };


paintTiles(canvas, hexaSize, origin);

window.onkeydown = function(event) {
  var redraw = false;
  if (event.keyCode === 39) {           // →
    origin.xs0 += canvas.width / 2;
    redraw = true;
  } else if (event.keyCode === 38) {    // ↑
    origin.ys0 -= canvas.height / 2;
    redraw = true;
  } else if (event.keyCode === 37) {    // ←
    origin.xs0 -= canvas.width / 2;
    redraw = true;
  } else if (event.keyCode === 40) {    // ↓
    origin.ys0 += canvas.height / 2;
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
  var startTile = tileFromPixel({ xs: event.clientX, ys: event.clientY }, origin, hexaSize);
  accessibleTiles = travelFrom(startTile, 8);
  paintTiles(canvas, hexaSize, origin);
};

