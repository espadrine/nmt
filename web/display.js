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
// `tstart` is a {q, r} tile position. (It's Dijkstra.)
// Returns a map from tile keys (see keyFromTile) to truthy values.
function travelFrom(tstart, speed) {
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

// Listen to server connection.

var socket = new WebSocket(
  // Trick: use the end of either http: or https:.
  'ws' + window.location.protocol.slice(4) + '//' +
    window.location.hostname +
    (window.location.port.length > 0? (':' + window.location.port): '') +
    '/$websocket:act');
socket.onmessage = function(e) {
  var change = JSON.parse(e.data);
  if (change.plans) {
    // FIXME
  } else {
    changeHumanity(humanityData, change);
    updateCurrentTileInformation();
    paint(ctx, hexaSize, origin);
  }
};

function sendMove(from, to, humans) {
  socket.send(JSON.stringify({
    at: keyFromTile(from),
    do: planTypes.move,
    to: keyFromTile(to),
    h: humans,
    c: 1    // FIXME: put our current camp.
  }));
}



// Data change in humanity information.
// tileKey (string 'q:r'): tile coordinates;
// {b}: building;
// {h}: number of humans;
// {c}: camp (territory to which it belongs);
// {f}: food (how much there is in the group);
// {o}: manufactured goods owned;
var humanityData = {};

// Takes a tile = {q, r}, returns the humanity information for that tile.
// (See above for humanity information.)
function humanity(tile) {
  return humanityData[tile.q + ':' + tile.r];
}

function changeHumanity(humanityData, change) {
  for (var tileKey in change) { humanityData[tileKey] = change[tileKey]; }
}


// Painting primitives.
//


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
var canvasBuffer = document.getElementById('cbuffer');
var ctxBuffer = canvasBuffer.getContext('2d');
canvasBuffer.width = document.documentElement.clientWidth;
canvasBuffer.height = document.documentElement.clientHeight;

function loadSprites() {
  var img = new Image();
  img.src = 'sprites.png';
  return img;
}
var sprites = loadSprites();
var spritesWidth = hexaSize * 2;  // Each element of the sprite is 2x20px.

// Given a list of tile key "q:r" representing hexagon coordinates,
// construct the path along each hexagon's center.
function pathAlongTiles(ctx, size, origin, tiles,
                       hexHorizDistance, hexVertDistance) {
  ctx.beginPath();
  if (tiles.length < 2) { return; }
  var penultimate;
  var cp = pixelFromTile(tileFromKey(tiles[0]), origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  ctx.moveTo(cp.x|0, cp.y|0);
  for (var i = 0; i < tiles.length - 1; i++) {
    cp = pixelFromTile(tileFromKey(tiles[i]), origin, size);
    ctx.lineTo(cp.x|0, cp.y|0);
    if (i === tiles.length - 2) { penultimate = cp; }
  }
  // Arrow at the end.
  cp = pixelFromTile(tileFromKey(tiles[tiles.length-1]), origin, size);
  var arrowOffsetX = (penultimate.x - cp.x) / 10;
  var arrowOffsetY = (penultimate.y - cp.y) / 10;
  ctx.lineTo(cp.x + arrowOffsetX, cp.y + arrowOffsetY);
  ctx.lineTo((cp.x + arrowOffsetX - arrowOffsetY*2/3),
             (cp.y + arrowOffsetY + arrowOffsetX*2/3));
  ctx.lineTo(cp.x, cp.y);
  ctx.lineTo((cp.x + arrowOffsetX + arrowOffsetY*2/3),
             (cp.y + arrowOffsetY - arrowOffsetX*2/3));
  ctx.lineTo(cp.x + arrowOffsetX, cp.y + arrowOffsetY);
}

// Given a list of tile key "q:r" representing hexagon coordinates,
// draw the path along each hexagon's center.
function paintAlongTiles(ctx, size, origin, tiles) {
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  pathAlongTiles(ctx, size, origin, tiles, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = '#ccf';
  ctx.lineWidth = '5';
  ctx.stroke();
  ctx.strokeStyle = 'red';
  ctx.lineWidth = '3';
  ctx.stroke();
  // Reset lineWidth.
  ctx.lineWidth = '1';
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
function pathFromTiles(ctx, size, origin, tiles,
                       hexHorizDistance, hexVertDistance) {
  ctx.beginPath();
  for (var tileKey in tiles) {
    var tile = tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    var cx = cp.x;
    var cy = cp.y;
    var mask = 0|0;
    for (var f = 0; f < 6; f++) {
      // For each, face, set the mask.
      var neighbor = neighborFromTile(tile, f);
      mask |= (((tiles[keyFromTile(neighbor)] !== undefined)|0) << f);
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
// (a map from tile keys (see keyFromTile) representing the coordinates of a
// hexagon, to a truthy value).
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
    if (human.b === tileTypes.road || human.b === tileTypes.wall
        || human.b === tileTypes.airland) {
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
    } else if (human.b === tileTypes.airport) {
      paintSprite(ctx, size, cx, cy, human.b, 0);
    } else {
      paintSprite(ctx, size, cx, cy, human.b, rotation);
    }
  }
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen.
function paintTerrain(ctx, size, cx, cy,
    hexHorizDistance, hexVertDistance, tilePos) {
  var t = terrain(tilePos);
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
      var t = terrain(tilePos);
      var color = [180, 0, 0];
      if (t.steepness == tileTypes.water) {
        color = [50, 50, 180];
      } else if (t.steepness == tileTypes.steppe) {
        color = [0, 180, 0];
      } else if (t.steepness == tileTypes.hill) {
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

function paintTiles(ctx, size, origin) {
  if (size < 5) {
    // Special case: we're from too far above, use direct pixel manipulation.
    paintTilesRaw(ctx, size, origin);
  } else {
    paintTilesSprited(ctx, size, origin);
  }
}

// Cached paint reference is centered on the map origin.
var cachedPaint = {};
function getCachedPaint(size, origin, cacheX, cacheY) {
  var cache = cachedPaint[cacheX + ':' + cacheY];
  if (cache === undefined) {
    paintTiles(ctxBuffer, size, { x0: cacheX, y0: cacheY });
    cache = cachedPaint[cacheX + ':' + cacheY]
          = ctxBuffer.getImageData(0, 0,
              ctxBuffer.canvas.width, ctxBuffer.canvas.height);
  }
  return cache;
}

function paintTilesFromCache(ctx, size, origin) {
  // We assume that the window width does not change.
  // We can have up to 4 caches to draw.
  var width = canvas.width;
  var height = canvas.height;
  // Coordinates of top left screen pixel in top left buffer.
  var x = (origin.x0 % width);
  if (x < 0) { x =  width + x; }    // x must be the distance from the right.
  var y = (origin.y0 % height);
  if (y < 0) { y =  height + y; }
  var left   = origin.x0 - x;
  var right  = origin.x0 + width - x;
  var top    = origin.y0 - y;
  var bottom = origin.y0 + height - y;
  ctx.putImageData(getCachedPaint(size, origin, left, top), -x, -y,
      x, y, width - x, height - y);
  ctx.putImageData(getCachedPaint(size, origin, right, top), width - x, -y,
      0, y, x, height - y);
  ctx.putImageData(getCachedPaint(size, origin, left, bottom), -x, height - y,
      x, 0, width - x, y);
  ctx.putImageData(getCachedPaint(size, origin, right, bottom), width - x, height - y,
      0, 0, x, y);
}

// Pixels currently on display. Useful for smooth animations.
var displayedPaint;

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paint(ctx, size, origin) {
  if (spritesLoaded) { paintTilesFromCache(ctx, size, origin);
  } else {             paintTiles(ctx, size, origin);
  }
  if (!currentlyDragging) {
    paintAroundTiles(ctx, size, origin, accessibleTiles);
    if (currentTile !== undefined) {
      paintCurrentTile(ctx, size, origin, currentTile);
    }
    displayedPaint = ctx.getImageData(0, 0,
        ctx.canvas.width, ctx.canvas.height);
  }
}


// Animations.

var numberOfHumanAnimations = 10;
var humanAnimation = new Array(numberOfHumanAnimations);
function initHumans() {
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
}
initHumans();

// Update animations related to humans. See humanAnimation.
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
// ctx is the canvas context, size is the hexagon's outer radius,
// origin = {x0, y0} is the top left screen pixel position to the map's origin,
// humanityData is a map from 'q:r' hexagonal coordinates to humanity data.
function paintHumans(ctx, size, origin, humanityData) {
  ctx.putImageData(displayedPaint, 0, 0);
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  for (var tileKey in humanityData) {
    var tileKeyCoord = tileKey.split(':');
    var q = +tileKeyCoord[0];
    var r = +tileKeyCoord[1];
    var human = humanityData[tileKey];
    var centerPixel = pixelFromTile({ q:q, r:r }, origin, size);
    var cx = centerPixel.x;
    var cy = centerPixel.y;
    // Paint people.
    var number = human.h;
    if (number > humanAnimation.length) { number = humanAnimation.length; }
    for (var i = 0; i < number; i++) {
      var animation = humanAnimation[Math.abs(i+q+r) % humanAnimation.length];
      ctx.fillStyle = 'black';
      ctx.fillRect(cx - size/2 + animation.x * size,
          cy - size/2 + animation.y * size,
          size/20, size/10);
    }
  }
}

function animateHumans() {
  paintHumans(ctx, hexaSize, origin, humanityData);
  updateHumans();
}
var humanAnimationTimeout = setInterval(animateHumans, 100);


// Tile information.

function attributeNameFromTile() {
  var nameFromTile = [];
  var i = 0;
  for (var name in tileTypes) {
    nameFromTile[i++] = name;
  }
  return nameFromTile;
}
// A map from tile type to their names.
var tileNames = attributeNameFromTile();

var tileInfo = document.getElementById('info');
var accessibleTiles;
var currentTile;

// For a mouse event, give the information of the tile under the cursor.
function showTileInformation(tile) {
  var t = terrain(tile);
  var info = 'a ' + tileNames[t.type];
  var h = humanity(tile);
  if (h != null) {
    if (h.b != null) {
      info = (tileNames[h.b][0] === 'a'? 'an ': 'a ') + tileNames[h.b]
        + ' built in ' + info;
    }
    if (h.h > 0) {
      var ownership = '';
      if ((h.o & manufacture.gun) !== 0) {
        ownership += 'with guns ';
      }
      var usedLocomotion = false;
      if ((h.o & manufacture.plane) !== 0) {
        ownership = 'on a plane ';
        usedLocomotion = true;
      }
      if ((h.o & manufacture.boat) !== 0) {
        ownership += ((t.type === tileTypes.water && !usedLocomotion)?
            (usedLocomotion = true, 'in'): 'with')
          + ' a boat ';
      }
      if ((h.o & manufacture.car) !== 0) {
        ownership = (usedLocomotion? 'with': 'in') + ' a car ';
      }
      info = h.h + ' person' + (h.h === 1? '': 's') + ' '
        + ownership + 'in ' + info;
    }
  }
  tileInfo.value = info;
}

function updateCurrentTileInformation() {
  if (currentTile !== undefined) {
    // Tile information.
    showTileInformation(currentTile);
    // Accessible tiles.
    accessibleTiles = humanTravel(currentTile);
  }
}





// Initialization and event management.
//

var spritesLoaded = false;
sprites.onload = function loadingSprites() {
  paint(ctx, hexaSize, origin);
  spritesLoaded = true;
};

var selectionModes = {
  normal: 1,
  travel: 2,
  build: 3,
  split: 4
};
var selectionMode = selectionModes.normal;

function hidePanel(panel, button) {
  panel.style.display = 'none';
  button.style.fill = 'black';
  button.firstElementChild.style.display = 'block';
  button.firstElementChild.nextElementSibling.style.display = 'none';
}
function showPanel(panel, button) {
  panel.style.display = 'block';
  button.style.fill = '#800080';
  button.firstElementChild.style.display = 'none';
  button.firstElementChild.nextElementSibling.style.display = 'block';
}

function enterMode(newMode) {
  if (selectionMode === newMode) { return; }
  // Remove things from the previous mode.
  if (selectionMode === selectionModes.travel) {
    hidePanel(travelPanel, travelBut);
    canvas.removeEventListener('mousemove', showPath);
  } else if (selectionMode === selectionModes.build) {
    hidePanel(buildPanel, buildBut);
  } else if (selectionMode === selectionModes.split) {
    hidePanel(splitPanel, splitBut);
  }
  // Add things from the new mode.
  if (newMode === selectionModes.travel) {
    showPanel(travelPanel, travelBut);
    canvas.addEventListener('mousemove', showPath);
  } else if (newMode === selectionModes.build) {
    showPanel(buildPanel, buildBut);
  } else if (newMode === selectionModes.split) {
    showPanel(splitPanel, splitBut);
  }
  // Update shared mode variable.
  selectionMode = newMode;
  paint(ctx, hexaSize, origin);
}


// Control buttons.

document.getElementById('travelBut').addEventListener('click', function() {
  enterMode(selectionModes.travel);
});


// Keyboard events.

window.onkeydown = function keyInputManagement(event) {
  var voidCache = false;
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
    // Zoom.
    hexaSize *= 2;
    origin.x0 = origin.x0 * 2 + (canvas.width / 2)|0;
    origin.y0 = origin.y0 * 2 + (canvas.height / 2)|0;
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109) {   // -
    // Unzoom.
    hexaSize = (hexaSize / 2)|0;
    if (hexaSize === 0) { hexaSize++; }
    origin.x0 = (origin.x0 / 2 - canvas.width / 4)|0;
    origin.y0 = (origin.y0 / 2 - canvas.height / 4)|0;
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 84) {    // T
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 66) {    // B
    enterMode(selectionModes.build);
  } else if (event.keyCode === 83) {    // S
    enterMode(selectionModes.split);
  } else if (event.keyCode === 68) {    // D
  } else if (event.keyCode === 27) {    // ESC
    enterMode(selectionModes.normal);
  }
  if (voidCache) {
    cachedPaint = {};
  }
  if (redraw) {
    paint(ctx, hexaSize, origin);
  }
};


// Tile selection.


function mouseSelection(event) {
  canvas.removeEventListener('mousemove', mouseDrag);
  canvas.removeEventListener('mouseup', mouseSelection);

  if (selectionMode === selectionModes.normal) {
    currentTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        origin, hexaSize);
    updateCurrentTileInformation();
    paint(ctx, hexaSize, origin);

  } else if (selectionMode === selectionModes.travel) {
    // Send travel information.
    var startTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        origin, hexaSize);
    if (travelTo(currentTile, startTile).length > 0) {
      sendMove(currentTile, startTile, humanity(currentTile).h);
    }
    enterMode(selectionModes.normal);
  }
};

function showPath(event) {
  if (currentTile) {
    paint(ctx, hexaSize, origin);
    var endTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        origin, hexaSize);
    paintAlongTiles(ctx, hexaSize, origin, humanTravelTo(currentTile, endTile));
    displayedPaint = ctx.getImageData(0, 0,
        ctx.canvas.width, ctx.canvas.height);
    paintHumans(ctx, hexaSize, origin, humanityData);
  }
}


// Map dragging.

function mouseDrag(event) {
  canvas.style.cursor = 'move';
  canvas.removeEventListener('mousemove', mouseDrag);
  canvas.removeEventListener('mouseup', mouseSelection);
  if (selectionMode === selectionModes.travel) {
    canvas.removeEventListener('mousemove', showPath);
  }
  canvas.addEventListener('mouseup', mouseEndDrag);
  canvas.addEventListener('mousemove', dragMap);
  clearInterval(humanAnimationTimeout);
  currentlyDragging = true;
}

function mouseEndDrag(event) {
  canvas.style.cursor = '';
  canvas.removeEventListener('mousemove', dragMap);
  canvas.removeEventListener('mouseup', mouseEndDrag);
  if (selectionMode === selectionModes.travel) {
    canvas.addEventListener('mousemove', showPath);
  }
  humanAnimationTimeout = setInterval(animateHumans, 100);
  currentlyDragging = false;
  paint(ctx, hexaSize, origin);
}

canvas.onmousedown = function mouseInputManagement(event) {
  canvas.addEventListener('mouseup', mouseSelection);
  canvas.addEventListener('mousemove', mouseDrag);
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
};

(function() {
  var requestAnimationFrame = window.requestAnimationFrame ||
  window.mozRequestAnimationFrame || window.webkitRequestAnimationFrame ||
  window.msRequestAnimationFrame || function(f) { setTimeout(f, 0) };
  window.requestAnimationFrame = requestAnimationFrame;
}());

var lastMousePosition = { clientX: 0, clientY: 0 };
var drawingWhileDragging = false;
var currentlyDragging = false;
function dragMap(event) {
  if (drawingWhileDragging) { return; }
  drawingWhileDragging = true;
  origin.x0 += (lastMousePosition.clientX - event.clientX);
  origin.y0 += (lastMousePosition.clientY - event.clientY);
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
  paint(ctx, hexaSize, origin);
  requestAnimationFrame(function() {
    drawingWhileDragging = false;
  });
}

// Prevents Chrome from displaying a silly text cursor
// while dragging on the canvas.
canvas.onselectstart = function() { return false; }
