// Listen to server connection.

var gameOver;
var socket;
var retries = 0;
function connectSocket(cb) {
  cb = cb || function(){};
  socket = new WebSocket(
    // Trick: use the end of either http: or https:.
    'ws' + window.location.protocol.slice(4) + '//' +
      window.location.hostname +
      (window.location.port.length > 0? (':' + window.location.port): '') +
      '/$websocket:act');
  socket.onmessage = socketMessage;
  socket.onclose = socket.onerror = socketError;
  socket.onopen = function() { retries = 0; cb(); };
}
function socketMessage(e) {
  var change = JSON.parse(e.data);
  if (change.plans) {
    // FIXME: if you want to receive other players' plans.
  } else if (change.winners) {
    // The game is over.
    gameOver = change.winners[0];
    if (gameOver === playerCamp) {
      // We won!
      if (!localStorage.getItem('gamesWon')) {
        localStorage.setItem('gamesWon', 0);
      }
      localStorage.setItem('gamesWon', (+localStorage.getItem('gamesWon'))+1);
    }
    paint(ctx, hexaSize, origin);
  } else {
    if (change.camp !== undefined) {
      playerCamp = change.camp;
      delete change.camp;
    }
    if (change.population !== undefined) {
      humanityPopulation = change.population;
      delete change.population;
    }
    if (change.war !== undefined) {
      addHumanMessages(warTiles, change.war, warMessages);
      delete change.war;
    }
    if (change.surrender !== undefined) {
      addHumanMessages(surrenderTiles, change.surrender, surrenderMessages);
      delete change.surrender;
    }
    if (change.goto !== undefined) {
      // goto is the spawn tile.
      gotoPlace(change.goto);
      delete change.goto;
    }
    if (change.places !== undefined) {
      // Set the places.
      insertPlaces(change.places);
      delete change.places;
    }
    addStarveMessages(change);
    changeHumanity(humanityData, change);
    updateCurrentTileInformation();
    // Update paint cache for each building change.
    updateCachedPaint(hexaSize, origin, change);
    paint(ctx, hexaSize, origin);
    paintHumans(ctx, hexaSize, origin, humanityData);
  }
}
function socketError(e) {
  retries++;
  if (retries < 1) {
    setTimeout(connectSocket, 50);
  } else if (retries === 1) {
    alert('You are disconnected.\nPlease reload the page.');
  }
};
connectSocket();

function sendMove(from, to, humans) {
  if (!from || !to) { return; }
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      at: keyFromTile(from),
      do: planTypes.move,
      to: keyFromTile(to),
      h: humans
    }));
  } else { connectSocket(function(){sendMove(from, to, humans);}); }
}

function sendPos(at, to) {
  if (!at) { return; }
  socket.send(JSON.stringify({ at: keyFromTile(at), to: keyFromTile(to) }));
}

function sendBuild(at, building) {
  if (!at) { return; }
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      at: keyFromTile(at),
      do: planTypes.build,
      b: building
    }));
  } else { connectSocket(function(){sendBuild(at, building);}); }
}

var defaultPlacesPanelHTML = placesPanel.innerHTML;

// Insert places = {"tileKey": "Place name"} into the panel.
function insertPlaces(places) {
  placesPanel.innerHTML = defaultPlacesPanelHTML;
  for (var place in places) {
    var aPlace = document.createElement('p');
    aPlace.classList.add('buildSelection');
    aPlace.classList.add('validSelection');
    // Add a separator.
    var aSep = document.createElement('hr');
    aSep.classList.add('separator');
    placesPanel.appendChild(aSep);
    // Add the place block.
    var tile = tileFromKey(place);
    aPlace.setAttribute('data-tilekey', place);
    aPlace.innerHTML = '<div>→</div> ' + places[place];
    aPlace.addEventListener('click', (function(t) {
      return function() {
        gotoPlace(t);
        paint(ctx, hexaSize, origin);
      };
    }(tile)));
    placesPanel.appendChild(aPlace);
  }
}

// Focus the screen on tile t = {q, r}.
// Changes `origin`.
function gotoPlace(t) {
  var placePixel = pixelFromTile(t, { x0:0, y0:0 }, hexaSize);
  origin.x0 = placePixel.x - ((canvas.width / 2)|0);
  origin.y0 = placePixel.y - ((canvas.height / 2)|0);
}

// Orient the arrows in the Places panel.
function orientPlacesArrow() {
  for (var i = 1; i < placesPanel.childNodes.length; i++) {
    var block = placesPanel.childNodes[i];
    if (block.getAttribute && block.getAttribute('data-tilekey') != null) {
      var angle = -orientation({
          x: origin.x0 + ((canvas.width / 2)|0),
          y: origin.y0 + ((canvas.height / 2)|0)
        }, pixelFromTile(tileFromKey(block.getAttribute('data-tilekey')),
          {x0:0,y0:0}, hexaSize));
      block.firstChild.style.transform = 'rotate(' + angle + 'rad)';
      block.firstChild.style.WebkitTransform = 'rotate(' + angle + 'rad)';
    }
  }
}

// Orientation of the second pixel related to the first,
// in radians, trigonometric direction. Both pixels are {x, y}.
function orientation(p1, p2) {
  var res = Math.atan((p1.y - p2.y) / Math.abs(p2.x - p1.x));
  if (p2.x < p1.x) { res = Math.PI - res; }
  return res;
}



// Data change in humanity information: {tileKey: humanTile}.
// tileKey = 'q:r'
// humanTile = {b, h, c, f, o}.
// b: building;
// h: number of humans;
// c: camp (territory to which it belongs);
// f: food (how much there is in the group);
// o: manufactured goods owned;
// Also a special key, population = [population of camp 0, etc.].
var humanityData = {};
var humanityPopulation;
var playerCamp;

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
    x: ((size * Math.sqrt(3) * (p.q + p.r / 2))|0) - px0.x0,
    y: (size * 3/2 * p.r) - px0.y0
  };
}

// Size of radius of the smallest disk containing the hexagon.
var hexaSize = 20;
// Pixel position of the top left screen pixel,
// compared to the origin of the map.
var origin = { x0: 0, y0: 0 };
// Canvas.
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
// Blink and Webkit get the following wrong.
// Remove without worry
// when https://code.google.com/p/chromium/issues/detail?id=168840 is fixed.
document.styleSheets[0].insertRule('div.controlPanel { max-height:' +
  (canvas.height - 16 - 58) + 'px; }', 0);

var helpPane = document.getElementById('helpPane');
addEventListener('load', function showIntro() {
  if (!localStorage.getItem('firstRun')) {
    localStorage.setItem('firstRun', 'no');
  } else if (Math.random() < 0.5 &&
    localStorage.getItem('paid') !== ''+(new Date()).getFullYear()) {
    showHelp('intro');
  }
});

// theme is a String.
function showHelp(theme) {
  helpPane.src = 'help/' + theme + '.html';
  helpPane.onload = function() {
    helpPane.style.display = 'block';
    helpPane.style.height =
      (helpPane.contentWindow.document.body.clientHeight + 40) + 'px';
    addEventListener('click', hideHelp);
  };
}

function hideHelp() {
  helpPane.style.display = 'none';
  removeEventListener('click', hideHelp);
}

// Some links to help.
travelPanel.onclick = function() { showHelp('welcome'); };
buildPanel.firstElementChild.onclick = function() { showHelp('build'); };


function loadSprites() {
  var img = new Image();
  img.src = 'sprites.png';
  return img;
}
var sprites = loadSprites();
// Canvas with the sprites on it. Set when loaded.
var spritesWidth = hexaSize * 2;  // Each element of the sprite is 2x20px.
var spritesLoaded = false;
sprites.onload = function loadingSprites() {
  spritesLoaded = true;
  paint(ctx, hexaSize, origin);
};


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
  var halfHorizDistance = hexHorizDistance/2;
  var halfSize = size/2;
  ctx.moveTo(cx, cy - size);    // top
  if ((mask & 4) === 0) {
    ctx.lineTo(cx - halfHorizDistance, cy - halfSize); // top left
  } else {
    ctx.moveTo(cx - halfHorizDistance, cy - halfSize); // top left
  }
  if ((mask & 8) === 0) {
    ctx.lineTo(cx - halfHorizDistance, cy + halfSize); // bottom left
  } else {
    ctx.moveTo(cx - halfHorizDistance, cy + halfSize); // bottom left
  }
  if ((mask & 16) === 0) {
    ctx.lineTo(cx, cy + size);    // bottom
  } else {
    ctx.moveTo(cx, cy + size);    // bottom
  }
  if ((mask & 32) === 0) {
    ctx.lineTo(cx + halfHorizDistance, cy + halfSize); // bottom right
  } else {
    ctx.moveTo(cx + halfHorizDistance, cy + halfSize); // bottom right
  }
  if ((mask & 1) === 0) {
    ctx.lineTo(cx + halfHorizDistance, cy - halfSize); // top right
  } else {
    ctx.moveTo(cx + halfHorizDistance, cy - halfSize); // top right
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
function paintAroundTiles(ctx, size, origin, tiles, color) {
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  pathFromTiles(ctx, size, origin, tiles, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

function paintTileHexagon(ctx, size, origin, tile, color) {
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  var cp = pixelFromTile(tile, origin, size);
  var radius = hexVertDistance;
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, radius, 0, 2*Math.PI, true);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.lineWidth = 1;
}

var mπd3 = - Math.PI / 3;   // Minus PI divided by 3.

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the sprite.
function paintSprite(ctx, size, cx, cy, sprite, rotation) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * mπd3);
  ctx.drawImage(sprites,
      0, (spritesWidth * sprite)|0, spritesWidth, spritesWidth,
      (-size)|0, (-size)|0, (size * 2)|0, (size * 2)|0);
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
      // Orient roads, walls and airlands.
      var oriented = false;
      for (var i = 0; i < 6; i++) {
        var neighbor = humanity(neighborFromTile(tilePos, i));
        if (neighbor &&
            // Orient roads along other roads, walls against walls.
            (((human.b === tileTypes.road || human.b === tileTypes.wall)
              && neighbor.b === human.b)
            // Orient airlands towards airports.
          || (human.b === tileTypes.airland
              && neighbor.b === tileTypes.airport))) {
          paintSprite(ctx, size, cx, cy, human.b, i);
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(ctx, size, cx, cy, human.b, 0); }
    } else if (human.b === tileTypes.airport || human.b === tileTypes.factory
        || human.b > tileTypes.wall) {
      paintSprite(ctx, size, cx, cy, human.b, 0);
    } else {
      paintSprite(ctx, size, cx, cy, human.b, rotation);
    }
  }
}

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintBuildingsSprited(ctx, size, origin) {
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
      // Draw building.
      var t = terrain(tilePos);
      var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
      paintBuilding(ctx, size, cx, cy, tilePos, rotation);
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

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen.
function paintTerrain(ctx, size, cx, cy,
    hexHorizDistance, hexVertDistance, tilePos) {
  var t = terrain(tilePos);
  // Draw terrain.
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintSprite(ctx, size, cx, cy, t.type, rotation);
  // Heavy rain makes it darker.
  pathFromHex(ctx, size, { x:cx, y:cy }, hexHorizDistance, hexVertDistance);
  var grey = Math.floor((1 - t.rain) / 2 * 127);
  if (t.type === tileTypes.water) {
    grey = (grey)|0;
    // If it's next to something, make a beach.
    var border = false;
    for (var i = 0; i < 6; i++) {
      if (terrain(neighborFromTile(tilePos, i)).type !== tileTypes.water) {
        border = true;
      }
    }
    if (border) { grey += 15; }
    ctx.fillStyle = 'rgba(' + grey + ',' + grey + ',' + grey + ',0.3)';
  } else {
    var delta = (Math.abs(grey - 127/2) / 1)|0;
    var red = grey;
    var green = grey;
    if (grey < 127/2) { red -= delta; green += delta; }
    else if (grey > 127/2) { red += 2*delta; green += delta; }
    if (t.type === tileTypes.steppe) {
      // If it's next to water, make a beach.
      var leftTile = neighborFromTile(tilePos, 0);
      var rightTile = neighborFromTile(tilePos, 3);
      if (terrain(leftTile).type === tileTypes.water
       || terrain(rightTile).type === tileTypes.water) {
        red += ((127-grey)/2)|0; green += ((127-grey)/4)|0;
      }
    }
    ctx.fillStyle = 'rgba(' + red + ',' + green + ',' + grey + ',0.3)';
  }
  ctx.fill();
}

// From 'size:x:y' to cached terrain, centered on the map origin.
var cachedTerrainPaint = {};

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

  // Check the cache.
  var cachePos = size + ':' + cx + ':' + cy;
  if (cachedTerrainPaint[cachePos] === undefined) {
    // Prepare cache.
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = canvas.width;
    canvasBuffer.height = canvas.height;
    var ctxBuffer = canvasBuffer.getContext('2d');

    var offLeft = true;     // Each row is offset from the row above.
    while (cy - hexVertDistance < height) {
      while (cx - hexHorizDistance < width) {
        tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
        // Draw terrain.
        paintTerrain(ctxBuffer, size, cx, cy,
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

    cachedTerrainPaint[cachePos] = canvasBuffer;
  }

  ctx.drawImage(cachedTerrainPaint[cachePos], 0, 0);
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

var canvasBuffer = document.createElement('canvas');
canvasBuffer.width = canvas.width;
canvasBuffer.height = canvas.height;
var imageBuffer =
  canvasBuffer.getContext('2d').getImageData(0,0,canvas.width,canvas.height);
var workerMessage = { image: null, size: hexaSize, origin: origin };
var renderWorker = new Worker('render-worker.js');
function paintTiles(ctx, size, origin, cb) {
  if (size < 5) {
    // Special case: we're from too far above, use direct pixel manipulation.
    renderWorker.addEventListener('message', function workerRecv(e) {
      if (e.data.origin.x0 === origin.x0 && e.data.origin.y0 === origin.y0
        && e.data.size === size) {
        ctx.putImageData(e.data.image, 0, 0);
        renderWorker.removeEventListener('message', workerRecv);
        cb();
      }
    });
    workerMessage.image = imageBuffer;
    workerMessage.size = size;
    workerMessage.origin = origin;
    renderWorker.postMessage(workerMessage);
  } else {
    paintTilesSprited(ctx, size, origin);
    paintBuildingsSprited(ctx, size, origin);
    cb();
  }
}

// Cached paint reference is centered on the map origin.
var cachedPaint = {};
var cachePending = {};  // map from 'x:y' to truthy values.
function getCachedPaint(size, origin, cacheX, cacheY, cb) {
  var pos = cacheX + ':' + cacheY;
  var cache = cachedPaint[pos];
  if (cache === undefined) {
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = canvas.width;
    canvasBuffer.height = canvas.height;
    var ctxBuffer = canvasBuffer.getContext('2d');
    if (cachePending[pos] === undefined) {
      cachePending[pos] = cb;
      paintTiles(ctxBuffer, size, { x0: cacheX, y0: cacheY }, function() {
        cache = cachedPaint[cacheX + ':' + cacheY] = canvasBuffer;
        cachePending[pos](cache);
        delete cachePending[pos];
      });
    } else { cachePending[pos] = cb; }
  } else { cb(cache); }
}

// Given a pixel relative to the center of the map, find the cache.
// Requires the cache's width and height.
// Note: this relies on you calling getCachedPaint().
function updateCachedRegion(width, height, cx, cy) {
  var x, y;  // Coordinates related to the nearest rectangle cache.
  var x = (cx % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (cy % height);
  if (y < 0) { y += height; }
  var cacheX = cx - x;
  var cacheY = cy - y;
  delete cachedPaint[cacheX + ':' + cacheY];
}

// Given tiles = {tileKey:something}, update the cache. Mainly, buildings.
function updateCachedPaint(size, origin, tiles, cb) {
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  for (var changedTile in tiles) {
    var tile = tileFromKey(changedTile);
    var centerPixel = pixelFromTile(tile, origin, size);
    // We consider the size of the tile.
    // We can have up to 4 caches to draw.
    var width = canvas.width;
    var height = canvas.height;
    // Coordinates of corner of squared hexagon pixel in top left buffer,
    // related to the origin pixel of the map.
    var cx = centerPixel.x + origin.x0 - size/2;  // Top left pixel of hexagon.
    var cy = centerPixel.y + origin.y0 - size/2;
    // top left
    updateCachedRegion(width, height, cx, cy, cb);
    // top right
    updateCachedRegion(width, height, cx + size, cy, cb);
    // bottom left
    updateCachedRegion(width, height, cx, cy + size, cb);
    // bottom right
    updateCachedRegion(width, height, cx + size, cy + size, cb);
  }
}

function paintTilesFromCache(ctx, size, origin, cb) {
  // We assume that the window width does not change.
  // We can have up to 4 caches to draw.
  var width = canvas.width;
  var height = canvas.height;
  // Coordinates of top left screen pixel in top left buffer.
  var x = (origin.x0 % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (origin.y0 % height);
  if (y < 0) { y += height; }
  var left   = origin.x0 - x;
  var right  = origin.x0 + width - x;
  var top    = origin.y0 - y;
  var bottom = origin.y0 + height - y;
  var countDone = 0;
  function makeDraw(x, y) {
    return function draw(cache) {
      ctx.drawImage(cache, x, y);
      // We have four jobs to make in total.
      countDone++;
      if (countDone >= 4) { cb(); }
    }
  }
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, width, height);
  getCachedPaint(size, origin, left, top, makeDraw(-x, -y));
  getCachedPaint(size, origin, right, top, makeDraw(width-x, -y));
  getCachedPaint(size, origin, left, bottom, makeDraw(-x, height-y));
  getCachedPaint(size, origin, right, bottom, makeDraw(width-x, height-y));
}

// Pixels currently on display. Useful for smooth animations.
var displayedPaint = document.createElement('canvas');
displayedPaint.width = canvas.width;
displayedPaint.height = canvas.height;
var displayedPaintContext = displayedPaint.getContext('2d');

var showTitleScreen = true;
setTimeout(function() { showTitleScreen = false; }, 2000);

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paint(ctx, size, origin) {
  if (selectionMode === selectionModes.places) {
    // Show the direction of the places.
    orientPlacesArrow();
  }
  if (!spritesLoaded) { return; }
  paintTilesFromCache(ctx, size, origin, function() { paintIntermediateUI(ctx, size, origin); });
  paintIntermediateUI(ctx, size, origin);
}

// Paint the UI for population, winner information, etc.
function paintIntermediateUI(ctx, size, origin) {
  if (currentTile != null && playerCamp != null) {
    paintTileHexagon(ctx, size, origin, currentTile, campHsl(playerCamp));
  }
  paintCamps(ctx, size, origin);
  paintAroundTiles(ctx, size, origin, accessibleTiles);
  if (currentTile != null && targetTile != null &&
      (selectionMode === selectionModes.travel ||
       selectionMode === selectionModes.split)) {
    paintAlongTiles(ctx, size, origin, humanTravelTo(currentTile,targetTile));
  }
  paintTileMessages(ctx, size, origin);
  paintPopulation(ctx);
  if (gameOver !== undefined) {
    drawTitle(ctx, [
        "The winner is #" + gameOver + ".",
        (gameOver === playerCamp
         ? ("YOU WON! (" + nth(localStorage.getItem('gamesWon')) + " win!)")
         : "YOU NEARLY WON!"),
        "You can reload to engage in the next game!"],
        campHsl(gameOver));
  }
  if (showTitleScreen) {
    drawTitle(ctx, ["Welcome to Thaddée Tyl's…", "NOT MY TERRITORY", "(YET)"]);
  }
  displayedPaintContext.drawImage(canvas, 0, 0);
}

// Return the string corresponding to a rank (eg, 1→1st, etc.).
function nth(n) {
  var mod = n % 10;
  if (mod === 1) { return n + 'th';
  } else if (mod === 2) { return n + 'nd';
  } else if (mod === 3) { return n + 'rd';
  } else { return n + 'th'; }
}

// Draw three lines of text from a list of strings on the screen.
function drawTitle(ctx, lines, color) {
  var width = canvas.width;
  var height = canvas.height;
  var line1 = lines[0];
  var line2 = lines[1];
  var line3 = lines[2];
  var measure;
  ctx.fillStyle = color || 'black';
  ctx.strokeStyle = 'black';
  ctx.textAlign = 'center';
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  measure = ctx.measureText(line1).width;
  ctx.fillText(line1, width / 2, height * 1/3);
  ctx.strokeText(line1, width / 2, height * 1/3);
  ctx.font = (height / 8) + 'px "Linux Biolinum", sans-serif';
  measure = ctx.measureText(line2).width;
  ctx.fillText(line2, width / 2, height * 13/24);
  ctx.strokeText(line2, width / 2, height * 13/24);
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  measure = ctx.measureText(line3).width;
  ctx.fillText(line3, width / 2, height * 2/3);
  ctx.strokeText(line3, width / 2, height * 2/3);
  ctx.textAlign = 'start';
}


// Animations.

var numberOfHumanAnimations = 20;
var humanAnimation = new Array(numberOfHumanAnimations);
function initHumans() {
  for (var i = 0; i < numberOfHumanAnimations; i++) {
    // Position is in a square of width 1.
    humanAnimation[i] = {
      x: Math.random(),
      y: Math.random(),
      targetx: Math.random(),
      targety: Math.random(),
      period: (Math.random() * 20 + 3)|0,
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
  if (size < 20) { return; }
  ctx.drawImage(displayedPaint, 0, 0);
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
      var animation = humanAnimation[Math.abs(i+q^r^human.f) % humanAnimation.length];
      ctx.fillStyle = 'black';
      ctx.fillRect(cx - size + animation.x * 2 * size,
          cy - size + animation.y * 2 * size,
          size/20, size/10);
    }
  }
}

function animateHumans() {
  paintHumans(ctx, hexaSize, origin, humanityData);
  updateHumans();
}
var humanAnimationTimeout = setInterval(animateHumans, 100);


// Return a list of tileKeys for each tile with a visible human.
function listVisibleHumans(ctx, size, origin) {
  var maxQ, minQ, maxR, minR, tilePos;
  // This is a jigsaw. We want the corner tiles of the screen.
  // bottom left pixel of the screen.
  tilePos = tileFromPixel({ x:0, y:ctx.canvas.height }, origin, size);
  minQ = tilePos.q - 1;     // Adding 1 to include half-tiles.
  maxR = tilePos.r + 1;
  // top right pixel of the screen.
  tilePos = tileFromPixel({ x:ctx.canvas.width, y:0 }, origin, size);
  maxQ = tilePos.q + 1;
  minR = tilePos.r - 1;
  // Go through all of humanity. Pick the ones we can see.
  var visibleHumans = [];
  for (var tileKey in humanityData) {
    tile = tileFromKey(tileKey);
    if (tile.q >= minQ && tile.q <= maxQ && tile.r >= minR && tile.r <= maxR
        && humanityData[tileKey].h > 0) {
      visibleHumans.push(tileKey);
    }
  }
  return visibleHumans;
}

var numberOfCamps = 3;
function paintCamps(ctx, size, origin) {
  var visibleHumans = listVisibleHumans(ctx, size, origin);
  var visibleCamps = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) { visibleCamps[i] = {}; }
  for (var i = 0; i < visibleHumans.length; i++) {
    var humans = humanityData[visibleHumans[i]];
    visibleCamps[humans.c][visibleHumans[i]] = true;
  }
  for (var i = 0; i < numberOfCamps; i++) {
    ctx.lineWidth = 1.5;
    paintAroundTiles(ctx, size, origin, visibleCamps[i], campHsl(i));
    ctx.lineWidth = 1;
  }
}

// Return CSS hsl string.
function campHsl(camp) {
  return 'hsl(' + campHueCreator9000(camp) + ',100%,50%)';
}

var campHue = [];
// The name is not a joke.
function campHueCreator9000(camp) {
  if (campHue[camp] !== undefined) { return campColors[camp];
  } else if (camp === 0) { return 270;
  } else { return (campHueCreator9000(camp - 1) + 60) % 360;
  }
}

// Paint the relative population of each camp.
function paintPopulation(ctx) {
  if (!humanityPopulation) { return; }
  var top = 55;
  var left = 8;
  var width = 185;
  var height = 10;
  // Paint the border.
  ctx.beginPath();
  ctx.moveTo(left, top - 0.5);
  ctx.lineTo(width + left, top - 0.5);
  ctx.moveTo(width + left + 0.5, top);
  ctx.lineTo(width + left + 0.5, top + height);
  ctx.moveTo(width + left, top + height + 0.5);
  ctx.lineTo(left, top + height + 0.5);
  ctx.moveTo(left - 0.5, top + height);
  ctx.lineTo(left - 0.5, top);
  ctx.strokeStyle = '#345';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Paint the population.
  var totalPopulation = 0;
  for (var i = 0; i < humanityPopulation.length; i++) {
    totalPopulation += humanityPopulation[i];
  }
  var start = left;
  var popWidth;
  var allButLastWidth = 0;
  for (var i = 0; i < humanityPopulation.length - 1; i++) {
    popWidth = (width * humanityPopulation[i] / totalPopulation)|0;
    allButLastWidth += popWidth;
    ctx.fillStyle = 'hsl(' + campHueCreator9000(i) + ',80%,50%)';
    ctx.fillRect(start|0, top, popWidth|0, height);
    start += popWidth;
  }
  popWidth = width - allButLastWidth - 1;
  ctx.fillStyle = 'hsl(' + campHueCreator9000(i) + ',80%,50%)';
  ctx.fillRect(start|0, top, (popWidth|0)+1, height);
}

// Tile Messages.
var surrenderMessages = [
  "We surrender!",
  "I, for one, welcome our new overlords."
];
var hungerMessages = [
  "Hungry!",
  "Is dinner ready?",
  "I can't feel my stomach!",
  "You're starving us!",
  "I could eat anything now. Rats. Babies.",
  "You look like a sandwich to me."
];
var warMessages = [
  "You've got red on you.",
  "Silence will fall!",
  "Silence! I kill you!",
  "Boy, that escalated quickly.",
  "Sorry Mommy!",
  "New legs, please!",
  "Have you seen my head?",
  "That wine tastes good. Wait—",
  "Tell my wife I loved her… meals…",
  "I do!",
  "Resistance is futile.",
  "I didn't expect the Spanish Inquisition!",
  "Whoop-de-doo!",
  "You'll never take me alive!",
  "Told you he wasn't immortal!",
  "Tu quoque, fili mi!",
  "Do not disturb my circles!",
  "This is no time to be making enemies.",
  "I owe a cock to Asclepius.",
  "More light!",
  "Life's too short!",
  "They couldn't hit an elephant at this dist…",
  "Drink to me!"
];

// Map from tile = "q:r" to {message, timeout} (including timeout IDs).
var warTiles = {};
var surrenderTiles = {};
var starvedTiles = {};

// Add textual bubble set in tileMessages
// (a map from tile = "q:r" to {message, timeout})
// to tiles in tileKeys = ["q:r"]
// from messages = [message]
function addHumanMessages(tileMessages, tileKeys, messages) {
  var timeout;
  for (var i = 0; i < tileKeys.length; i++) {
    var tileKey = tileKeys[i];
    if (tileMessages[tileKey]) {
      clearTimeout(tileMessages[tileKey].timeout);
    }
    // Pick message.
    var msg = messages[(messages.length * Math.random())|0];
    // Set timeout.
    tileMessages[tileKey] = {
      message: msg,
      timeout: setTimeout((function (tileKey) {
        return function removeTimeout() {
          delete tileMessages[tileKey];
          paint(ctx, hexaSize, origin);
        };
      }(tileKey)), 2000)
    };
  }
}

// change = map from tileKey to humanity information.
function addStarveMessages(change) {
  var starved = [];
  for (var tileKey in change) {
    if (change[tileKey].h > 0 && change[tileKey].f < 4) {
      // They're starving.
      starved.push(tileKey);
    }
  }
  addHumanMessages(starvedTiles, starved, hungerMessages);
}

// Given a tileKey = "q:r" and a message, show a textual bubble.
function paintMessage(ctx, size, origin, tileKey, msg) {
  ctx.font = '14px "Linux Biolinum", sans-serif';
  var msgSize = ctx.measureText(msg).width;
  // Find the pixel to start from.
  var center = pixelFromTile(tileFromKey(tileKey), origin, size);
  var x = center.x + size/4;
  var y = center.y - size/4;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 2, y - 10);
  ctx.lineTo(x - 12, y - 10);
  ctx.lineTo(x - 10, y - 40);
  ctx.lineTo(x + msgSize + 10, y - 35);
  ctx.lineTo(x + msgSize, y - 10);
  ctx.lineTo(x + 12, y - 10);
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.fill();
  ctx.strokeStyle = 'white';
  ctx.strokeText(msg, x - 4, y - 20);
}

// Paints messages from warTiles and starvedTiles.
function paintTileMessages(ctx, size, origin) {
  for (var tileKey in warTiles) {
    paintMessage(ctx, size, origin, tileKey, warTiles[tileKey].message);
  }
  for (var tileKey in surrenderTiles) {
    paintMessage(ctx, size, origin, tileKey, surrenderTiles[tileKey].message);
  }
  for (var tileKey in starvedTiles) {
    paintMessage(ctx, size, origin, tileKey, starvedTiles[tileKey].message);
  }
}


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
      var usedLocomotion = false;
      if ((h.o & manufacture.plane) !== 0) {
        ownership += 'on a plane ';
        usedLocomotion = true;
      }
      if ((h.o & manufacture.boat) !== 0) {
        ownership += ((t.type === tileTypes.water && !usedLocomotion)?
            (usedLocomotion = true, 'in'): 'with')
          + ' a boat ';
      }
      if ((h.o & manufacture.car) !== 0) {
        ownership += (usedLocomotion? 'with': 'in') + ' a car ';
      }
      info = h.h + ((h.o & manufacture.gun) !== 0? ' armed': '') + ' folk'
        + (h.h === 1? '': 's') + ' '
        + ownership + 'in ' + info;
    }
  }
  tileInfo.value = info;
}

var buildSelectionButtons = document.querySelectorAll('p.buildSelection');
function indicateValidConstructions(currentTile) {
  var valid;
  for (var i = 0; i < buildingTypes.length; i++) {
    if (validConstruction(buildingTypes[i], currentTile)) {
      buildSelectionButtons[i].classList.add('validSelection');
    } else {
      buildSelectionButtons[i].classList.remove('validSelection');
    }
  }
}
function hookBuildSelectionButtons() {
  for (var i = 0; i < buildingTypes.length; i++) {
    var hook = (function(b) { return function hookBuildSelectionButton() {
        sendBuild(currentTile, b);
        enterMode(selectionModes.normal);
      };
    }(buildingTypes[i]));
    buildSelectionButtons[i].addEventListener('click', hook);
  }
}
hookBuildSelectionButtons();

function updateCurrentTileInformation() {
  if (currentTile !== undefined) {
    // Tile information.
    showTileInformation(currentTile);
    // Accessible tiles.
    accessibleTiles = humanTravel(currentTile);
    // Valid constructions.
    indicateValidConstructions(currentTile);
  }
}





// Initialization and event management.
//

var selectionModes = {
  normal: 1,
  travel: 2,
  build:  3,
  split:  4,
  places: 5
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
    targetTile = null;
    travelBut.removeEventListener('click', enterNormalMode);
    travelBut.addEventListener('click', enterTravelMode);
  } else if (selectionMode === selectionModes.build) {
    hidePanel(buildPanel, buildBut);
    buildBut.removeEventListener('click', enterNormalMode);
    buildBut.addEventListener('click', enterBuildMode);
  } else if (selectionMode === selectionModes.split) {
    hidePanel(splitPanel, splitBut);
    splitBut.removeEventListener('click', enterNormalMode);
    splitBut.addEventListener('click', enterSplitMode);
  } else if (selectionMode === selectionModes.places) {
    hidePanel(placesPanel, placesBut);
    placesBut.removeEventListener('click', enterNormalMode);
    placesBut.addEventListener('click', enterPlacesMode);
  }
  // Add things from the new mode.
  if (newMode === selectionModes.travel) {
    showPanel(travelPanel, travelBut);
    travelBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.build) {
    showPanel(buildPanel, buildBut);
    buildBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.split) {
    showPanel(splitPanel, splitBut);
    splitBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.places) {
    orientPlacesArrow();
    showPanel(placesPanel, placesBut);
    placesBut.addEventListener('click', enterNormalMode);
  }
  // Update shared mode variable.
  selectionMode = newMode;
  if (mousePosition) {
    showPath({ clientX: mousePosition.x, clientY: mousePosition.y });
  }
  if (newMode === selectionModes.normal) {
    paint(ctx, hexaSize, origin);
  }
}


// Control buttons.

function enterNormalMode() { enterMode(selectionModes.normal); }
function enterTravelMode() { enterMode(selectionModes.travel); }
function enterBuildMode() { enterMode(selectionModes.build); }
function enterSplitMode() { enterMode(selectionModes.split); }
function enterPlacesMode() { enterMode(selectionModes.places); }
travelBut.addEventListener('click', enterTravelMode);
buildBut.addEventListener('click', enterBuildMode);
splitBut.addEventListener('click', enterSplitMode);
placesBut.addEventListener('click', enterPlacesMode);

splitInputWidget.addEventListener('input', function changeSplitPortion() {
  splitPanelPortion.textContent = '' + splitInputWidget.value;
});


// Keyboard events.

var buildHotKeys = {
  48: tileTypes.airport,    // "0"
  49: tileTypes.wall,       // "1"
  50: tileTypes.road,       // "2"
  51: tileTypes.farm,       // "3"
  52: tileTypes.residence,  // "4"
  53: tileTypes.skyscraper, // "5"
  54: tileTypes.factory,    // "6"
  55: tileTypes.dock,       // "7"
  56: tileTypes.gunsmith,   // "8"
  57: tileTypes.airland     // "9"
};

window.onkeydown = function keyInputManagement(event) {
  var voidCache = false;
  var redraw = false;
  if (event.keyCode === 39 || event.keyCode === 68) {           // → D
    origin.x0 += (canvas.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 38 || event.keyCode === 87) {    // ↑ W
    origin.y0 -= (canvas.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 37 || event.keyCode === 65) {    // ← A
    origin.x0 -= (canvas.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 40 || event.keyCode === 83) {    // ↓ S
    origin.y0 += (canvas.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 187 || event.keyCode === 61) {  // +=
    // Zoom.
    hexaSize *= 2;
    origin.x0 = origin.x0 * 2 + (canvas.width / 2)|0;
    origin.y0 = origin.y0 * 2 + (canvas.height / 2)|0;
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109 || event.keyCode === 219
          || event.keyCode === 169) {   // -
    // Unzoom.
    if (hexaSize > 2) {
      hexaSize = hexaSize / 2;
      origin.x0 = (origin.x0 / 2 - canvas.width / 4)|0;
      origin.y0 = (origin.y0 / 2 - canvas.height / 4)|0;
      voidCache = true;
      redraw = true;
    }
  } else if (event.keyCode === 84) {    // T
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 67) {    // C
    enterMode(selectionModes.build);
  } else if (event.keyCode === 70) {    // F
    enterMode(selectionModes.split);
  } else if (event.keyCode === 192) {   // `
    sendBuild(currentTile, null);   // Destroy building.
  } else if (event.keyCode === 27) {    // ESC
    // Close all UI panes.
    enterMode(selectionModes.normal);
    helpPane.style.display = 'none';
  } else if (48 <= event.keyCode && event.keyCode <= 57) {
    sendBuild(currentTile, buildHotKeys[event.keyCode]);
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
  var posTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        origin, hexaSize);

  if ((selectionMode === selectionModes.travel
    || selectionMode === selectionModes.split)
    && currentTile !== undefined && humanity(currentTile) !== undefined) {
    var numberOfPeople = humanity(currentTile).h;
    if (selectionMode === selectionModes.split) {
      numberOfPeople = (numberOfPeople * splitInputWidget.value / 100)|0;
    }
    // Send travel information.
    var startTile = posTile;
    if (humanTravelTo(currentTile, startTile).length > 1) {
      sendMove(currentTile, startTile, numberOfPeople);
    }
    enterMode(selectionModes.normal);
  } else { sendPos(currentTile, posTile); }

  // Move there.
  currentTile = posTile;
  updateCurrentTileInformation();
  paint(ctx, hexaSize, origin);
};

var mousePosition;
var targetTile;
function showPath(event) {
  mousePosition = { x: event.clientX, y: event.clientY };
  if (currentTile &&
      (selectionMode === selectionModes.travel ||
       selectionMode === selectionModes.split)) {
    targetTile = tileFromPixel(mousePosition, origin, hexaSize);
    paint(ctx, hexaSize, origin);
    paintHumans(ctx, hexaSize, origin, humanityData);
  }
}
canvas.addEventListener('mousemove', showPath);


// Map dragging.

function mouseDrag(event) {
  canvas.style.cursor = 'move';
  canvas.removeEventListener('mousemove', mouseDrag);
  canvas.removeEventListener('mouseup', mouseSelection);
  canvas.addEventListener('mouseup', mouseEndDrag);
  canvas.addEventListener('mousemove', dragMap);
  clearInterval(humanAnimationTimeout);
  currentlyDragging = true;
  resetDragVector();
  dragVelTo = setInterval(resetDragVector, dragVelInterval);
}

function mouseEndDrag(event) {
  canvas.style.cursor = '';
  canvas.removeEventListener('mousemove', dragMap);
  canvas.removeEventListener('mouseup', mouseEndDrag);
  humanAnimationTimeout = setInterval(animateHumans, 100);
  currentlyDragging = false;
  paint(ctx, hexaSize, origin);
  clearInterval(dragVelTo);
  computeDragVelocity();
  inertiaDragMap();
}

canvas.onmousedown = function mouseInputManagement(event) {
  if (event.button === 0) {
    canvas.addEventListener('mouseup', mouseSelection);
    canvas.addEventListener('mousemove', mouseDrag);
    lastMousePosition.clientX = event.clientX;
    lastMousePosition.clientY = event.clientY;
  } else if (event.button === 2) {
    enterTravelMode();
    mouseSelection(event);
    enterNormalMode();
  }
};
canvas.oncontextmenu = function(e) { e.preventDefault(); };

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
  var velocityX = (lastMousePosition.clientX - event.clientX);
  var velocityY = (lastMousePosition.clientY - event.clientY);
  origin.x0 += velocityX;
  origin.y0 += velocityY;
  // Save the last mouse position.
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

// Inertial map dragging.

var dragVelocity = [0, 0];
var dragVector = [0, 0];
var dragTime = 0;
var dragVelTo; // drag timeout.
var dragVelInterval = 200; // 200ms.

function resetDragVector() {
  dragTime = Date.now();
  dragVector[0] = origin.x0;
  dragVector[1] = origin.y0;
}

function computeDragVelocity() {
  dragTime = Date.now() - dragTime;
  dragVector[0] = origin.x0 - dragVector[0];
  dragVector[1] = origin.y0 - dragVector[1];
  var nbFrames = dragTime * 0.03;  // 0.03 frames/ms
  dragVelocity[0] = (dragVector[0] / nbFrames)|0;
  dragVelocity[1] = (dragVector[1] / nbFrames)|0;
}

function inertiaDragMap() {
  origin.x0 += dragVelocity[0];
  origin.y0 += dragVelocity[1];
  dragVelocity[0] = (dragVelocity[0] / 1.1)|0;
  dragVelocity[1] = (dragVelocity[1] / 1.1)|0;
  paint(ctx, hexaSize, origin);
  requestAnimationFrame(function() {
    if (dragVelocity[0] !== 0 || dragVelocity[1] !== 0) {
      inertiaDragMap();
    }
  });
}

