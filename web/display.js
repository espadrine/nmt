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

// Given a point p = {q, r} representing a hexagonal coordinate,
// and given a position px0 = {x0, y0} of the screen on the map,
// return a pixel {x, y} of the hexagon's center.
// `size` is the radius of the smallest disk containing the hexagon.
function pixelFromTile(p, px0, size) {
  return {
    x: (size * Math.sqrt(3) * (p.q + p.r / 2)) - px0.x0,
    y: (size * 3/2 * p.r) - px0.y0
  };
}

// Movements.
var distances = [];
distances[tileTypes.water]    = 2;
distances[tileTypes.steppe]   = 2;
distances[tileTypes.hills]    = 4;
distances[tileTypes.mountain] = 16;
distances[tileTypes.swamp]    = 3;
distances[tileTypes.meadow]   = 3;
distances[tileTypes.forest]   = 8;
distances[tileTypes.taiga]    = 24;

function distance(tpos) {
  var t = tile(tpos);
  var d = distances[t.type];
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




// Remote connection.
//

var manufacture = {
  car: 1,
  boat: 2,
  plane: 4,
  gun: 8
};

// Data change in humanity information.
// {q, r}: tile coordinates;
// {b}: building;
// {h}: number of humans;
// {c}: camp (territory to which it belongs);
// {f}: food (how much there is in the group);
// {o}: manufactured goods owned;
var humanityChange = [
  { q:24, r:15, b:null, h:5, c:1, f:20, o: 0 },
  { q:0, r:0, b:tileTypes.farm, h:3, c:1, f:20, o: 0 },
  { q:1, r:5, b:tileTypes.residence, h:1, c:2, f:20, o: 0 },
  { q:3, r:4, b:tileTypes.residence, h:1, c:1, f:20, o: 0 },
  { q:3, r:5, b:tileTypes.skyscraper, h:0, c:2, f:20, o: 0 },
  { q:4, r:5, b:tileTypes.factory, h:0, c:2, f:20, o: 0 },
  { q:25, r:17, b:tileTypes.docks, h:0, c:2, f:20, o: 0 },
  { q:6, r:3, b:tileTypes.airland, h:0, c:2, f:20, o: 0 },
  { q:6, r:4, b:tileTypes.airland, h:0, c:2, f:20, o: 0 },
  { q:5, r:4, b:tileTypes.airland, h:0, c:2, f:20, o: 0 },
  { q:5, r:3, b:tileTypes.airport, h:0, c:2, f:20, o: 0 },
  { q:5, r:10, b:tileTypes.gunsmith, h:0, c:2, f:20, o: 0 },
  { q:4, r:6, b:tileTypes.road, h:0, c:2, f:20, o: 0 },
  { q:5, r:5, b:tileTypes.road, h:0, c:2, f:20, o: 0 },
  { q:6, r:5, b:tileTypes.road, h:0, c:2, f:20, o: 0 },
  { q:7, r:5, b:tileTypes.road, h:0, c:2, f:20, o: 0 },
  { q:8, r:8, b:tileTypes.wall, h:0, c:2, f:20, o: 0 },
  { q:8, r:9, b:tileTypes.wall, h:0, c:2, f:20, o: 0 },
  { q:9, r:7, b:tileTypes.wall, h:0, c:2, f:20, o: 0 },
];

var humanityData = [];

// Takes a tile = {q, r}, returns the humanity information for that tile.
// (See above for humanity information.)
function humanity(tile) {
  if (humanityData[tile.q]) { return humanityData[tile.q][tile.r]; }
}

function changeHumanity(humanity, change) {
  for (var i = 0; i < change.length; i++) {
    var q = change[i].q;
    var r = change[i].r;
    if (!humanity[q]) { humanity[q] = []; }
    if (!humanity[q][r]) { humanity[q][r] = []; }
    humanity[q][r] = {
      b: change[i].b,
      h: change[i].h,
      c: change[i].c,
      f: change[i].f,
      o: change[i].o
    };
  }
}

// For the purpose of testing…
changeHumanity(humanityData, humanityChange);


// Painting primitives.
//

// Size of radius of the smallest disk containing the hexagon.
var hexaSize = 20;
// Pixel position of the top left screen pixel,
// compared to the origin of the map.
var origin = { x0: 0, y0: 0 };
// Canvas.
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;

function loadSprites() {
  var img = new Image();
  img.src = 'sprites.png';
  return img;
}
var sprites = loadSprites();
var spritesWidth = hexaSize * 2;  // Each element of the sprite is 20px squared.

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
function pathFromTiles(ctx, size, origin, tiles,
                       hexHorizDistance, hexVertDistance) {
  ctx.beginPath();
  for (var i = 0; i < tiles.length; i++) {
    var cp = pixelFromTile(tiles[i], origin, size);
    var cx = cp.x;
    var cy = cp.y;
    var mask = 0|0;
    for (var f = 0; f < 6; f++) {
      // For each, face, set the mask.
      mask |= ((tileInTiles(neighborFromTile(tiles[i], f), tiles)|0) << f);
    }
    partialPathFromHex(ctx, size, cp, mask, hexHorizDistance, hexVertDistance);
  }
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// The mask is a sequence of six bits, each representing a hexagon edge,
// that are set to 1 in order to hide that edge.
function partialPathFromHex(ctx, size, cp, mask,
                            hexHorizDistance, hexVertDistance) {
  mask = mask|0;
  var cx = cp.x|0;
  var cy = cp.y|0;
  ctx.moveTo(cx, cy - size);    // top
  if ((mask & 4) === 0) {
    ctx.lineTo(cx - hexHorizDistance/2, cy - size/2); // top left
  } else {
    ctx.moveTo(cx - hexHorizDistance/2, cy - size/2); // top left
  }
  if ((mask & 8) === 0) {
    ctx.lineTo(cx - hexHorizDistance/2, cy + size/2); // bottom left
  } else {
    ctx.moveTo(cx - hexHorizDistance/2, cy + size/2); // bottom left
  }
  if ((mask & 16) === 0) {
    ctx.lineTo(cx, cy + size);    // bottom
  } else {
    ctx.moveTo(cx, cy + size);    // bottom
  }
  if ((mask & 32) === 0) {
    ctx.lineTo(cx + hexHorizDistance/2, cy + size/2); // bottom right
  } else {
    ctx.moveTo(cx + hexHorizDistance/2, cy + size/2); // bottom right
  }
  if ((mask & 1) === 0) {
    ctx.lineTo(cx + hexHorizDistance/2, cy - size/2); // top right
  } else {
    ctx.moveTo(cx + hexHorizDistance/2, cy - size/2); // top right
  }
  if ((mask & 2) === 0) {
    ctx.lineTo(cx, cy - size);    // top
  } else {
    ctx.moveTo(cx, cy - size);    // top
  }
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
function pathFromHex(ctx, size, cp,
                     hexHorizDistance, hexVertDistance) {
  ctx.beginPath();
  partialPathFromHex(ctx, size, cp, 0, hexHorizDistance, hexVertDistance);
}

// Paint a white line around `tiles`
// (a list of {q, r} representing the coordinates of a hexagon).
// Requires a canvas context `ctx` and the size of a hexagon
// (ie, the radius of the smallest disk containing the hexagon).
function paintAroundTiles(ctx, size, origin, tiles) {
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  pathFromTiles(ctx, size, origin, tiles, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = 'white';
  ctx.stroke();
}

function paintCurrentTile(ctx, size, origin, tile) {
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  var cp = pixelFromTile(tile, origin, size);
  pathFromHex(ctx, size, cp, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = '#99f';
  ctx.stroke();
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the sprite.
function paintSprite(ctx, size, cx, cy, sprite, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-rotation * Math.PI / 3);
  ctx.drawImage(sprites,
      0, spritesWidth * sprite, spritesWidth, spritesWidth,
      (-size)|0, (-size)|0, size * 2, size * 2);
  ctx.restore();
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the building.
function paintBuilding(ctx, size, cx, cy, tilePos, rotation) {
  var human = humanity(tilePos);
  if (human != null && human.b != null) {
    if (human.b === tileTypes.road || human.b === tileTypes.wall) {
      // Orient roads along other roads, walls against walls.
      var oriented = false;
      for (var i = 0; i < 6; i++) {
        var neighbor = humanity(neighborFromTile(tilePos, i));
        if (neighbor && neighbor.b === human.b) {
          paintSprite(ctx, size, cx, cy, human.b, i);
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(ctx, size, cx, cy, human.b, 0); }
    } else {
      paintSprite(ctx, size, cx, cy, human.b, rotation);
    }
  }
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen.
function paintTerrain(ctx, size, cx, cy,
    hexHorizDistance, hexVertDistance, tilePos) {
  var t = tile(tilePos);
  // Draw terrain.
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintSprite(ctx, size, cx, cy, t.type, rotation);
  // Draw building.
  paintBuilding(ctx, size, cx, cy, tilePos, rotation);
  // Heavy rain makes it darker.
  pathFromHex(ctx, size, { x:cx, y:cy }, hexHorizDistance, hexVertDistance);
  var grey = Math.floor((-t.rain + 1) / 2 * 127);
  var transparency = (t.rain + 1) / 3;
  if (t.type === tileTypes.water) {
    ctx.fillStyle = 'rgba(' + grey + ',' + grey + ',' + (grey-42) + ','
        + transparency + ')';
  } else {
    ctx.fillStyle = 'rgba(' + grey + ',' + (grey+50) + ',' + grey + ','
        + transparency + ')';
  }
  ctx.fill();
}

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintTilesSprited(ctx, size, origin) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  // This is a jigsaw. We want the corner tiles of the screen.
  var tilePos = tileFromPixel({ x:0, y:0 }, origin, size);
  var centerPixel = pixelFromTile({ q: tilePos.q, r: tilePos.r-1 },
    origin, size);
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  var offLeft = true;     // Each row is offset from the row above.
  while (cy - hexVertDistance < height) {
    while (cx - hexHorizDistance < width) {
      tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
      // Draw terrain.
      paintTerrain(ctx, size, cx, cy,
          hexHorizDistance, hexVertDistance, tilePos);
      cx += hexHorizDistance;
    }
    cy += hexVertDistance;
    cx = centerPixel.x;
    if (offLeft) {
      cx -= hexHorizDistance / 2;   // This row is offset.
      offLeft = false;
    } else {
      offLeft = true;
    }
    cx = Math.floor(cx);
    cy = Math.floor(cy);
  }
}


// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintTilesRaw(ctx, size, origin) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  var imgdata = ctx.getImageData(0, 0, width, height);
  var data = imgdata.data;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tilePos = tileFromPixel({ x:x, y:y }, origin, size);
      var t = tile(tilePos);
      var color = [180, 0, 0];
      if (t.steepness == tileTypes.water) {
        color = [50, 50, 180];
      } else if (t.steepness == tileTypes.steppe) {
        color = [0, 180, 0];
      } else if (t.steepness == tileTypes.hills) {
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
      var position = (x + y * width) * 4;
      data[position + 0] = color[0];
      data[position + 1] = color[1];
      data[position + 2] = color[2];
      data[position + 3] = 255;
    }
  }
  ctx.putImageData(imgdata, 0, 0);
}

var cachedPaint;

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paint(ctx, size, origin) {
  if (size < 5) {
    // Special case: we're from too far above, use direct pixel manipulation.
    paintTilesRaw(ctx, size, origin);
  } else {
    paintTilesSprited(ctx, size, origin);
    paintAroundTiles(ctx, size, origin, accessibleTiles);
    if (currentTile !== undefined) {
      paintCurrentTile(ctx, size, origin, currentTile);
    }
  }
  cachedPaint = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
}

var numberOfHumanAnimations = 10;
var humanAnimation = new Array(numberOfHumanAnimations);
(function initHumans() {
  for (var i = 0; i < numberOfHumanAnimations; i++) {
    // Position is in a square of width 1.
    humanAnimation[i] = {
      x: Math.random(),
      y: Math.random(),
      targetx: Math.random(),
      targety: Math.random(),
      period: (Math.random() * 10 + 3)|0,
      tick: 0
    };
  }
}());

function updateHumans() {
  for (var i = 0; i < humanAnimation.length; i++) {
    var human = humanAnimation[i];
    human.x += (human.targetx - human.x) / human.period;
    human.y += (human.targety - human.y) / human.period;
    human.tick++;
    if (human.tick > human.period) {
      // New target.
      human.targetx = Math.random();
      human.targety = Math.random();
      human.tick = 0;
    }
  }
}

// Paint the animation of people moving around.
function paintHumans(ctx, size, origin, humanity) {
  ctx.putImageData(cachedPaint, 0, 0);
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  for (var q in humanity) {
    q = +q;
    for (var r in humanity[q]) {
      r = +r;
      var human = humanity[q][r];
      var tilePos = { q:+q, r:+r };
      var centerPixel = pixelFromTile(tilePos, origin, size);
      var cx = centerPixel.x;
      var cy = centerPixel.y;
      // Paint people.
      var number = human.h;
      if (number > humanAnimation.length) { number = humanAnimation.length; }
      for (var i = 0; i < number; i++) {
        var animation = humanAnimation[(i+q+r) % humanAnimation.length];
        ctx.fillStyle = 'black';
        ctx.fillRect(cx - size/2 + animation.x * size,
            cy - size/2 + animation.y * size,
            size/20, size/10);
      }
    }
  }
  updateHumans();
}

setInterval(function animateHumans() {
  paintHumans(ctx, hexaSize, origin, humanityData);
}, 100);




// Initialization and event management.
//

sprites.onload = function loadingSprites() {
  paint(ctx, hexaSize, origin);
};

window.onkeydown = function keyInputManagement(event) {
  var redraw = false;
  if (event.keyCode === 39) {           // →
    origin.x0 += (canvas.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 38) {    // ↑
    origin.y0 -= (canvas.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 37) {    // ←
    origin.x0 -= (canvas.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 40) {    // ↓
    origin.y0 += (canvas.height / 2)|0;
    redraw = true;
  } else if (((event.keyCode === 61 || event.keyCode === 187) && event.shiftKey)
           || event.keyCode === 187 || event.keyCode === 61) {  // +=
    hexaSize *= 2;
    origin.x0 = origin.x0 * 2 + (canvas.width / 2)|0;
    origin.y0 = origin.y0 * 2 + (canvas.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109) {   // -
    hexaSize = (hexaSize / 2)|0;
    if (hexaSize === 0) { hexaSize++; }
    origin.x0 = (origin.x0 / 2 - canvas.width / 4)|0;
    origin.y0 = (origin.y0 / 2 - canvas.height / 4)|0;
    redraw = true;
  }
  if (redraw) {
    paint(ctx, hexaSize, origin);
  }
};

var accessibleTiles = [];
var currentTile;

function mouseSelection(event) {
  var startTile = tileFromPixel({ x: event.clientX, y: event.clientY },
      origin, hexaSize);
  currentTile = startTile;
  accessibleTiles = travelFrom(startTile, 8);
  paint(ctx, hexaSize, origin);
  canvas.removeEventListener('mousemove', mouseDrag);
  canvas.removeEventListener('mouseup', mouseSelection);
};

function mouseDrag(event) {
  canvas.removeEventListener('mousemove', mouseDrag);
  canvas.removeEventListener('mouseup', mouseSelection);
  canvas.addEventListener('mouseup', mouseEndDrag);
  canvas.addEventListener('mousemove', dragMap);
}

function mouseEndDrag(event) {
  canvas.removeEventListener('mousemove', dragMap);
  canvas.removeEventListener('mouseup', mouseEndDrag);
}

window.onmousedown = function mouseInputManagement(event) {
  canvas.addEventListener('mouseup', mouseSelection);
  canvas.addEventListener('mousemove', mouseDrag);
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
};

var lastMousePosition = { clientX: 0, clientY: 0 };
function dragMap(event) {
  origin.x0 += (lastMousePosition.clientX - event.clientX);
  origin.y0 += (lastMousePosition.clientY - event.clientY);
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
  paint(ctx, hexaSize, origin);
}
