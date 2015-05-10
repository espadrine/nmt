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
  if (change.winners) {
    // The game is over.
    gameOver = {};
    gameOver.winners = change.winners;
    gameOver.winType = change.winType;
    if (gameOver.winners[0] === playerCamp) {
      // We won!
      if (!localStorage.getItem('gamesWon')) {
        localStorage.setItem('gamesWon', 0);
      }
      localStorage.setItem('gamesWon', (+localStorage.getItem('gamesWon'))+1);
    }
  } else {
    if (change.camp !== undefined) {
      playerCamp = change.camp;
      delete change.camp;
    }
    if (change.lockedTiles !== undefined) {
      lockedTiles = change.lockedTiles;
      delete change.lockedTiles;
    }
    if (change.resources !== undefined) {
      campResources = change.resources;
      resources = change.resources[playerCamp];
      delete change.resources;
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
    if (change.artilleryFire !== undefined) {
      // Artillery Fire. {"q:r":["q:r"]}
      addShells(movementAnimations, change.artilleryFire);
      delete change.artilleryFire;
    }
    if (change.goto !== undefined) {
      // goto is the spawn tile.
      gotoPlace(change.goto);
      delete change.goto;
    }
    if (change.centerTile !== undefined) {
      // Set the places.
      terrain.setCenterTile(change.centerTile);
      sendCenterTile(change.centerTile);
      delete change.centerTile;
    }
    if (change.places !== undefined) {
      // Set the places.
      insertPlaces(change.places);
      fillMapIndex(change.places);
      delete change.places;
    }
    if (change.campNames !== undefined) {
      // Set the spawn names.
      campNames = change.campNames;
      delete change.campNames;
    }
    if (humanityPopulation) {
      setResourcesTable();
    }
    addStarveMessages(change);
    changeHumanity(humanityData, change);
    paintPopulation();
    updateCurrentTileInformation();
    // Update paint cache for each building change.
    updateCachedPaint(gs, change);
  }
  paint(gs);
  paintHumans(gs, humanityData);
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

var registerMoves = Object.create(null);
var registerBuilds = Object.create(null);
function sendMove(from, to, humans) {
  if (!from || !to) { return; }
  var keyTo = terrain.keyFromTile(to);
  registerMoves[keyTo] = from;
  if (socket.readyState === 1) {
    var keyFrom = terrain.keyFromTile(from);
    var layType = layRoadBox.checked? terrain.tileTypes.road:
      terrain.tileTypes.wall;
    socket.send(JSON.stringify({
      at: keyFrom,
      do: planTypes.move,
      to: keyTo,
      h: humans,
      lay: layType
    }));
  } else { connectSocket(function(){sendMove(from, to, humans);}); }
}

function sendPos(at, to) {
  socket.send(JSON.stringify({
    at: at? terrain.keyFromTile(at): null,
    to: terrain.keyFromTile(to)
  }));
}

function sendBuild(at, building) {
  if (!at) { return; }
  var keyAt = terrain.keyFromTile(at);
  registerBuilds[keyAt] = building;
  if (socket.readyState === 1) {
    socket.send(JSON.stringify({
      at: keyAt,
      do: planTypes.build,
      b: building
    }));
  } else { connectSocket(function(){sendBuild(at, building);}); }
}

// Send the center tile to workers, etc.
var sendCenterTile = function(centerTile) {
  for (var i = 0; i < workerPool.length; i++) {
    workerPool[i].postMessage({centerTile: centerTile});
  }
};


// Places

// List of camp names, indexed by the camp ID.
var campNames;

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
    var tile = terrain.tileFromKey(place);
    aPlace.setAttribute('data-tilekey', place);
    aPlace.innerHTML = '<div style="position:absolute;">→</div> <br>' + places[place];
    aPlace.addEventListener('click', (function(t) {
      return function() {
        gotoPlace(t);
        paint(gs);
      };
    }(tile)));
    placesPanel.appendChild(aPlace);
  }
}


// Resources

var resourceFromName = {
  Folks:    campResourcePopulation,
  Wealth:   campResourceWealth,
  Stock:    campResourceStock,
  Metal:    campResourceMetal,
  Health:   campResourceHealth
};
function setResourcesTable() {
  // Make the header.
  var header = '<th></th>';
  for (var i = 0; i < numberOfCamps; i++) {
    header += '<th style="color:' + campHsl(i) +'">■</th>';
  }
  header = '<tr>' + header + '</tr>';
  // Make the body.
  var content = '';
  ['Folks', 'Wealth', 'Stock', 'Metal', 'Health'].forEach(function(resourceName) {
    var row = '';
    row += '<th>' + resourceName + '</th>';
    for (var i = 0; i < numberOfCamps; i++) {
      var resource = resourceFromName[resourceName](i);
      row += '<td>' + resource + '</td>';
    }
    row = '<tr class="' + resourceName + '">' + row + '</tr>';
    content += row;
  });
  var thead = '<thead>' + header + '<thead>';
  var tbody = '<tbody>' + content + '<tbody>';
  var table = '<table>' + thead + tbody + '</table>';
  resourcesPanel.innerHTML = table;
}


// Travel information.

function displayTravelInfo(currentTile, targetTile) {
  var ct = terrain.tile(currentTile);  // current terrain
  var tt = terrain.tile(targetTile);   // target terrain
  var ch = humanity.tile(currentTile); // current humans
  var th = humanity.tile(targetTile);  // target humans
  var traveling = travelingNumber(ch.h);
  var html = '';

  // War bonuses / maluses.
  if (th != null && th.c != null && th.c != ch.c) {
    var log = [];
    html += '<dl class="attack-info">';
    var ourForces = attackForce(traveling, ch, th, ct, tt, log);
    html += '<dt>Attack ' + ourForces + '</dt><dd>';
    for (var i = 0; i < log.length; i++) { html += log[i] + '<br>'; }
    log = [];
    var theirForces = defenseForce(th.h, ch, th, ct, tt, log);
    var imbalance = ourForces / theirForces;
    if (imbalance <= 1) { html += 'Lose all';
    } else { html += 'Lose ' + (((1/imbalance) * traveling)|0); }
    html += '</dd>';
    html += '<dt>Defense ' + theirForces + '</dt><dd>';
    for (var i = 0; i < log.length; i++) { html += log[i] + '<br>'; }
    if (imbalance > 1) {
      html += 'Lose all';
      var surrounded = surrender(targetTile, ch.c);
      var surrenderers = (((surrounded / 6) * th.h)|0);
      if (surrenderers > 0) { html += '<br>Surrender ' + surrenderers; }
    } else { html += 'Lose ' + ((imbalance * th.h)|0); }
    html += '</dd>';
    travelInfo.innerHTML = html;
  } else {
    travelInfo.innerHTML = '';
  }
}

// Forcepower bonuses.
function vehicleBonus(fromManufacture, toManufacture, steepness, log) {
  var bonus = 1;
  if ((fromManufacture & terrain.manufacture.gun) !== 0) {
    bonus *= 2; log.push('2x guns');
  }
  // Car
  if ((fromManufacture & terrain.manufacture.car) !== 0) {
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5; log.push('1.5x car vs. artillery');
    }
    if ((toManufacture & terrain.manufacture.plane) !== 0) {
      bonus *= 0.5; log.push('0.5x car vs. plane');
    }
    if (steepness === terrain.tileTypes.steppe) {
      bonus *= 1.5; log.push('1.5x flat terrain drive');
    }
  }
  // Boat
  if ((fromManufacture & terrain.manufacture.boat) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5; log.push('1.5x boat vs. car');
    }
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5; log.push('1.5x boat vs. artillery');
    }
    if ((toManufacture & terrain.manufacture.plane) !== 0) {
      bonus *= 0.5; log.push('0.5x boat vs. plane');
    }
    if (steepness === terrain.tileTypes.water) {
      bonus *= 1.5; log.push('1.5x battleship');
    }
  }
  // Artillery
  if ((fromManufacture & terrain.manufacture.artillery) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5; log.push('1.5x artillery vs. car');
    }
    if ((toManufacture & terrain.manufacture.boat) !== 0) {
      bonus *= 0.5; log.push('0.5x artillery vs. boat');
    }
    if (steepness === terrain.tileTypes.hill) {
      bonus *= 1.5; log.push('1.5x hill ballistics');
    }
  }
  // Plane
  if ((fromManufacture & terrain.manufacture.plane) !== 0) {
    if ((toManufacture & terrain.manufacture.car) !== 0) {
      bonus *= 1.5; log.push('1.5x plane vs. car');
    }
    if ((toManufacture & terrain.manufacture.artillery) !== 0) {
      bonus *= 1.5; log.push('1.5x plane vs. artillery');
    }
    if ((toManufacture & terrain.manufacture.boat) !== 0) {
      bonus *= 0.5; log.push('0.5x plane vs. boat');
    }
    if (steepness === terrain.tileTypes.mountain) {
      bonus *= 1.5; log.push('1.5x mountain air strike');
    }
  }
  return bonus;
}
function attackForce(force, attacker, defender,
    attackerTerrain, defenderTerrain, log) {
  force *= vehicleBonus(attacker.o, defender.o,
    attackerTerrain.steepness, log);
  if (attackerTerrain.steepness > defenderTerrain.steepness) {
    force *= 1.5; log.push('1.5x high ground');
  }
  return force;
}
function defenseForce(force, attacker, defender,
    attackerTerrain, defenderTerrain, log) {
  force *= vehicleBonus(defender.o, 0,
    defenderTerrain.steepness, log);
  if (defenderTerrain.vegetation) {
    force *= 1.5; log.push('1.5x vegetation cover');
  }
  return force;
}
function surrender(tile, campId) {
  // How many people around.
  var surrounded = 0;
  for (var i = 0; i < 6; i++) {
    var neighbor = humanity.tile(
        terrain.neighborFromTile(tile, i));
    if (neighbor && neighbor.c === campId) {
      surrounded++;
    }
  }
  return surrounded;
}



// Map

// Focus the screen on tile t = {q, r}.
// Changes `origin`.
function gotoPlace(t) {
  var placePixel = pixelFromTile(t, { x0:0, y0:0 }, gs.hexSize);
  gs.origin.x0 = placePixel.x - ((gs.width / 2)|0);
  gs.origin.y0 = placePixel.y - ((gs.height / 2)|0);
}

// Orient the arrows in the Places panel.
function orientPlacesArrow() {
  for (var i = 1; i < placesPanel.childNodes.length; i++) {
    var block = placesPanel.childNodes[i];
    if (block.getAttribute && block.getAttribute('data-tilekey') != null) {
      var screenCenter = {
        x: gs.origin.x0 + ((gs.width / 2)|0),
        y: gs.origin.y0 + ((gs.height / 2)|0)
      };
      var tileCenter = pixelFromTile(
          terrain.tileFromKey(block.getAttribute('data-tilekey')),
          {x0:0,y0:0}, gs.hexSize);
      var angle = -orientation(screenCenter, tileCenter);
      var arrow = block.firstChild;
      arrow.style.transform = 'rotate(' + angle + 'rad)';
      arrow.style.WebkitTransform = 'rotate(' + angle + 'rad)';
      arrow.nextSibling.textContent =
        kmDistance(screenCenter, tileCenter).toFixed(2) + 'km';
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

// Distance in pixels between two pixels {x, y}.
function pixelDistance(p1, p2) {
  var horiz = Math.abs(p1.x - p2.x);
  var vert = Math.abs(p1.y - p2.y);
  return Math.sqrt(horiz * horiz + vert * vert);
}

// Distance in kilometers between two pixels {x, y}.
// Each tile is about 50 meters from top to bottom.
function kmDistance(p1, p2) {
  return pixelDistance(p1, p2) / gs.hexSize * 0.025;
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
var resources = {
  wealth: 0,
  usedWealth: 0,
  stock: 0,
  usedStock: 0,
  metal: 0,
  usedMetal: 0
};
var campResources;
function campResourcePopulation(c) { return humanityPopulation[c]; }
function campResourceWealth(c) {
  var r = campResources[c]; return r.wealth - r.usedWealth; }
function campResourceStock(c) {
  var r = campResources[c]; return r.stock - r.usedStock; }
function campResourceMetal(c) {
  var r = campResources[c]; return r.metal - r.usedMetal; }
function campResourceHealth(c) {
  var r = campResources[c]; return r.health - r.usedHealth; }

var humanity = {
  // Takes a tile = {q, r}, returns the humanity information for that tile.
  // (See above for humanity information.)
  tile: function humanity(tile) {
    return humanityData[tile.q + ':' + tile.r];
  },
};

var terrain = new Terrain(humanity);

function changeHumanity(humanityData, change) {
  for (var tileKey in change) {
    humanityData[tileKey] = change[tileKey];
    delete registerMoves[tileKey];
    delete registerBuilds[tileKey];
  }
}



// User Interface Heads-Up Display functions.

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
buildPanel.firstElementChild.onclick = function() { showHelp('build'); };



// Graphic State functions.
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

// Random nudge to {x: 0, y:0}. The size of the nudge is given by `size`.
// `tile` {q,r} is given as input to the randomness.
// The result will be the same for each tile.
function noisyPixel(size, tile) {
  var t = terrain.tile(tile);
  var c = { x: 0, y: 0 };
  c.x += (tile.q ^ tile.r ^ ((t.rain*128)|0)) % size;
  c.y +=  (tile.q ^ tile.r ^ ((t.rain*256)|0)) % size;
  return c;
}

// Sprites.

function loadSprites(src) {
  var img = new Image();
  img.src = src;
  return img;
}
var sprites = loadSprites('sprites.png');
// Canvas with the sprites on it. Set when loaded.
var spritesLoaded = false;
sprites.onload = function loadingSprites() {
  spritesLoaded = true;
  paint(gs);
};


// Include all information pertaining to the state of the canvas.
// canvas: a DOM HTML canvas.
// sprites: a DOM Image of the sprites.
function makeGraphicState(canvas, sprites) {
  var ctx = canvas.getContext('2d');
  // Size of radius of the smallest disk containing the hexagon.
  var hexSize = 20;
  var spritesWidth = hexSize * 2;  // Each element of the sprite is 2x20px.
  return {
    hexSize: hexSize,
    // Pixel position of the top left screen pixel,
    // compared to the origin (pixel (0, 0)) of the map.
    origin: { x0: 0, y0: 0 },
    canvas: canvas,
    ctx: ctx,
    width: canvas.width,
    height: canvas.height,
    sprites: sprites,
    spritesWidth: sprites.width
  };
}

var canvas = document.getElementById('canvas');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
var gs = makeGraphicState(canvas, sprites);
var globalGs = gs;
// Blink and Webkit get the following wrong.
// Remove without worry
// when https://code.google.com/p/chromium/issues/detail?id=168840 is fixed.
document.styleSheets[0].insertRule('div.controlPanel { max-height:' +
  (gs.height - 16 - 58) + 'px; }', 0);

// Given a list of tile key "q:r" representing hexagon coordinates,
// construct the path along each hexagon's center.
// gs is the GraphicState.
function pathAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  if (tiles.length < 2) { return; }
  var penultimate;
  var cp = pixelFromTile(terrain.tileFromKey(tiles[0]), origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  ctx.moveTo(cp.x|0, cp.y|0);
  for (var i = 0; i < tiles.length - 1; i++) {
    cpNext = pixelFromTile(terrain.tileFromKey(tiles[i+1]), origin, size);
    var avgPoint = averagePoint(cp, cpNext);
    ctx.quadraticCurveTo(cp.x|0, cp.y|0, avgPoint.x|0, avgPoint.y|0);
    if (i === tiles.length - 2) { penultimate = cp; }
    cp = cpNext;
  }
  // Arrow at the end.
  cp = pixelFromTile(terrain.tileFromKey(tiles[tiles.length-1]), origin, size);
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
// gs is the GraphicState.
function paintAlongTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  pathAlongTiles(gs, tiles);
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
// gs is the GraphicState.
function straightPathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    var cx = cp.x;
    var cy = cp.y;
    var mask = 0|0;
    for (var f = 0; f < 6; f++) {
      // For each, face, set the mask.
      var neighbor = terrain.neighborFromTile(tile, f);
      mask |= (((tiles[terrain.keyFromTile(neighbor)] !== undefined)|0) << f);
    }
    partialPathFromHex(gs, cp, mask, hexHorizDistance, hexVertDistance);
  }
}

// Given a set of tiles {q, r} representing hexagon coordinates,
// construct the path around those hexagons.
// gs is the GraphicState.
function pathFromTiles(gs, tiles,
    hexHorizDistance, hexVertDistance, noisy, dashed) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = terrain.neighborFromTile(tile, f);
      if (tiles[terrain.keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  pathFromPolygons(gs,
      polygonFromVertices(gs, vertices, hexHorizDistance, noisy), !!dashed);
}

// Just like `pathFromTiles` above, but with polygonally-drawn paths.
// gs is the GraphicState.
function straightPolygonPathFromTiles(gs, tiles) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  ctx.beginPath();
  var vertices = [];
  for (var tileKey in tiles) {
    var tile = terrain.tileFromKey(tileKey);
    var cp = pixelFromTile(tile, origin, size);
    for (var f = 0; f < 6; f++) {
      // For each face, add the vertices.
      var neighbor = terrain.neighborFromTile(tile, f);
      if (tiles[terrain.keyFromTile(neighbor)] === undefined) {
        vertices = vertices.concat(vertexFromFace(tileKey, f));
      }
    }
  }
  var polygons = polygonFromVertices(gs, vertices, hexHorizDistance);
  for (var i = 0; i < polygons.length; i++) {
    partialPathFromPolygon(gs, polygons[i]);
  }
}

// Given a face 0…5 (0 = right, 1 = top right…), return the two vertices
// delimiting the segment for that face.
function vertexFromFace(tileKey, face) {
  var vertex1 = (face + 4) % 6;
  var vertex2 = (vertex1 + 1) % 6;
  return [
    vertexFromTileKey(tileKey, vertex1),
    vertexFromTileKey(tileKey, vertex2)
  ];
}

// Coordinate system for vertices.
// Takes a tileKey "q:r" and a vertex 0…5 (0 = top, 1 = top left…)
// Returns a vertex key "q:r:0" for the bottom right vertex of tile "q:r", and
// "q:r:1" for the top right vertex of tile "q:r".
function vertexFromTileKey(tileKey, vertex) {
  if (vertex === 0) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 2)) + ":0";
  } else if (vertex === 1) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 3)) + ":1";
  } else if (vertex === 2) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 3)) + ":0";
  } else if (vertex === 3) {
    return terrain.keyFromTile(terrain.neighborFromTile(
          terrain.tileFromKey(tileKey), 4)) + ":1";
  } else if (vertex === 4) {
    return tileKey + ":0";
  } else if (vertex === 5) {
    return tileKey + ":1";
  } else { return "invalid:vertex:key"; }
}

// Take a vertex key "q:r:0", return the {x,y} point in the screen's coordinate.
// gs is the GraphicState.
function pointFromVertex(gs, vertex, hexHorizDistance, noisy) {
  var size = gs.hexSize; var origin = gs.origin;
  var vertexSide = +vertex.slice(-1);
  var tileKey = vertex.slice(0, -2);
  var tile = terrain.tileFromKey(tileKey);
  var cp = pixelFromTile(tile, origin, size);
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  var ncx = noisy? noisyPixel(size / 2, tile): {x:0, y:0};
  if (vertexSide === 0) {
    return { x: cx + halfHorizDistance + ncx.x, y: cy + halfSize + ncx.y };
  } else if (vertexSide === 1) {
    return {x: cx + halfHorizDistance, y: cy - halfSize};
  }
}

// Given a list of vertices "q:r:0" containing from / to line information,
// return a list of polygons [{x,y}] with no duplicate point.
// gs is the GraphicState.
function polygonFromVertices(gs, vertices, hexHorizDistance, noisy) {
  var size = gs.hexSize; var origin = gs.origin;
  var verticesLeft = new Array(vertices.length);
  for (var i = 0; i < vertices.length; i++) {
    verticesLeft[i] = vertices[i];
  }
  var polygons = [];
  while (verticesLeft.length > 0) {
    var startVertex = verticesLeft.shift();
    var currentVertex = verticesLeft.shift();
    var polygon = [
      pointFromVertex(gs, startVertex, hexHorizDistance, noisy),
      pointFromVertex(gs, currentVertex, hexHorizDistance, noisy)
    ];
    var infiniteLoopCut = 10000;
    while (currentVertex !== startVertex && (infiniteLoopCut--) > 0) {
      for (var i = 0; i < verticesLeft.length; i += 2) {
        if (verticesLeft[i] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i+1],
                hexHorizDistance, noisy));
          currentVertex = verticesLeft[i+1];
          verticesLeft.splice(i, 2);
          break;
        } else if (verticesLeft[i+1] === currentVertex) {
          polygon.push(pointFromVertex(gs, verticesLeft[i],
                hexHorizDistance, noisy));
          currentVertex = verticesLeft[i];
          verticesLeft.splice(i, 2);
          break;
        }
      }
    }
    polygon.pop();
    polygons.push(polygon);
  }
  return polygons;
}

// Continue the path of a polygon [{x,y}].
// gs is the GraphicState.
function partialPathFromPolygon(gs, polygon) {
  var ctx = gs.ctx;
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (var i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
}

// Construct the path of list of polygons [{x,y}].
// gs is the GraphicState.
function pathFromPolygons(gs, polygons, dashed) {
  var ctx = gs.ctx;
  ctx.beginPath();
  for (var i = 0; i < polygons.length; i++) {
    partialPathForSmoothPolygon(gs, polygons[i], !!dashed);
  }
}

// Average point {x,y} of two points {x,y}.
function averagePoint(a, b) {
  return { x:(a.x + b.x)>>1, y:(a.y + b.y)>>1 };
}
// Given a point b {x,y} and two points around it in a polygon,
// return a point which makes the three points further apart.
function extremizePoint(a, b, c) {
  var avgPoint = averagePoint(a1, c2);
  var avgPointLocal = averagePoint(a2, c1);
  return { x:b.x - ((avgPoint.x - b.x)/2)|0 + ((avgPointLocal.x - b.x)/2)|0, y:b.y - ((avgPoint.y - b.y)/2)|0 + ((avgPointLocal.y - b.y)/2)|0 };
}

// Given a canvas context and a polygon [{x,y}],
// construct the path that draws a smoother version of the polygon.
// gs is the GraphicState.
function partialPathForSmoothPolygon(gs, oldPolygon, dashed) {
  dashed = !!dashed;
  var ctx = gs.ctx;
  if (oldPolygon.length < 3) { return partialPathFromPolygon(gs, oldPolygon); }
  // This polygon's vertices are the middle of each edge.
  var polygon = new Array(oldPolygon.length);
  var avgPoint;
  for (var i = 0; i < oldPolygon.length; i++) {
    avgPoint = averagePoint(oldPolygon[i], oldPolygon[(i+1)%oldPolygon.length]);
    polygon[i] = avgPoint;
  }
  // Spline between the middle of each edge,
  // making each vertex the control point.
  var avgPoint = averagePoint(polygon[0], polygon[1]);
  ctx.moveTo(avgPoint.x, avgPoint.y);
  for (var i = 1; i < polygon.length; i++) {
    avgPoint = averagePoint(polygon[i], polygon[(i+1)%polygon.length]);
    if (dashed && ((i % 2) === 0)) {
      ctx.moveTo(avgPoint.x, avgPoint.y);
      continue;
    }
    ctx.quadraticCurveTo(polygon[i].x, polygon[i].y,
                         avgPoint.x, avgPoint.y);
  }
  if (dashed) { return; }
  avgPoint = averagePoint(polygon[0], polygon[1]);
  ctx.quadraticCurveTo(polygon[0].x, polygon[0].y,
                       avgPoint.x, avgPoint.y);
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// The mask is a sequence of six bits, each representing a hexagon edge,
// that are set to 1 in order to hide that edge.
// gs is the GraphicState.
// Returns a list of all points {x,y} gone through.
function partialPathFromHex(gs, cp, mask,
                            hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize;
  mask = mask|0;
  var cx = cp.x|0;
  var cy = cp.y|0;
  var halfHorizDistance = hexHorizDistance/2|0;
  var halfSize = size/2|0;
  ctx.moveTo(cx, cy - size);    // top
  // top left
  var x = cx - halfHorizDistance;
  var y = cy - halfSize;
  if ((mask & 4) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom left
  x = cx - halfHorizDistance;
  y = cy + halfSize;
  if ((mask & 8) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom
  x = cx;
  y = cy + size;
  if ((mask & 16) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // bottom right
  x = cx + halfHorizDistance;
  y = cy + halfSize;
  if ((mask & 32) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // top right
  x = cx + halfHorizDistance;
  y = cy - halfSize;
  if ((mask & 1) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
  // top
  x = cx;
  y = cy - size;
  if ((mask & 2) === 0) {
    ctx.lineTo(x, y);
  } else {
    ctx.moveTo(x, y);
  }
}

// Draw a hexagon of size given, from the center point cp = {x, y},
// on the canvas context ctx.
// gs is the GraphicState.
function pathFromHex(gs, cp,
                     hexHorizDistance, hexVertDistance) {
  var ctx = gs.ctx; var size = gs.hexSize;
  ctx.beginPath();
  partialPathFromHex(gs, cp, 0, hexHorizDistance, hexVertDistance);
}

// Paint a white line around `tiles`
// (a map from tile keys (see keyFromTile) representing the coordinates of a
// hexagon, to a truthy value).
// Requires a canvas context `ctx` and the size of a hexagon
// (ie, the radius of the smallest disk containing the hexagon).
// gs is the GraphicState.
function paintAroundTiles(gs, tiles, color) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  pathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance, /*noisy*/ true);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

// Same as above, with the straight line algorithm.
// gs is the GraphicState.
function paintStraightAroundTiles(gs, tiles, color) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  straightPathFromTiles(gs, tiles, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = color || 'white';
  ctx.stroke();
}

// gs is the GraphicState.
function paintTileHexagon(gs, tile, color, lineWidth) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;
  var cp = pixelFromTile(tile, origin, size);
  var radius = hexVertDistance;
  ctx.beginPath();
  ctx.arc(cp.x, cp.y, radius, 0, 2*Math.PI, true);
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth? lineWidth: 3;
  ctx.stroke();
  ctx.lineWidth = 1;
}

var mπd3 = - Math.PI / 3;   // Minus PI divided by 3.

// gs is the GraphicState.
// cx and cy are the hexagon's center pixel coordinates on the screen,
// rotation = {0…5} is the orientation where to orient the sprite.
// gs is the GraphicState.
function paintSprite(gs, cx, cy, sprite, rotation) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var spritesWidth = gs.spritesWidth;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation * mπd3);
  var factor = size / 20;
  var msize = - (spritesWidth * factor / 2)|0;
  var mwidth = (spritesWidth * factor)|0;
  ctx.drawImage(gs.sprites,
      0, (spritesWidth * sprite)|0, spritesWidth, spritesWidth,
      msize, msize, mwidth, mwidth);
  ctx.restore();
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// cx and cy are the hexagon's center pixel coordinates on the screen,
// building is a tileTypes.
// rotation = {0…5} is the orientation where to orient the building.
// gs is the GraphicState.
function paintBuilding(gs, cx, cy, tilePos, building, rotation) {
  if (building != null) {
    // Buildings with graphics for curves.
    if (building === tileTypes.road) {
      var curveTile = tileTypes.curvedRoad;
      var oriented = false;
      var neighbors = [
        humanity.tile(terrain.neighborFromTile(tilePos, 0)),
        humanity.tile(terrain.neighborFromTile(tilePos, 1)),
        humanity.tile(terrain.neighborFromTile(tilePos, 2)),
        humanity.tile(terrain.neighborFromTile(tilePos, 3)),
        humanity.tile(terrain.neighborFromTile(tilePos, 4)),
        humanity.tile(terrain.neighborFromTile(tilePos, 5)),
      ];
      for (var i = 0; i < 6; i++) {
        // Orient roads along other roads.
        if (neighbors[i] && neighbors[i].b === building) {
          var curved = neighbors[(i + 2) % 6];
          var curvedStart = neighbors[(i + 4) % 6];
          if (curved && curved.b === building) {
            paintSprite(gs, cx, cy, curveTile, i);
          } else if (curvedStart && curvedStart.b === building) {
            // It was already drawn.
          } else {
            paintSprite(gs, cx, cy, building, i);
          }
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(gs, cx, cy, building, 0); }
    } else if (building === tileTypes.wall || building === tileTypes.airland) {
      // Orient roads, walls and airlands.
      var oriented = false;
      for (var i = 0; i < 6; i++) {
        var neighbor = humanity.tile(terrain.neighborFromTile(tilePos, i));
        if (neighbor &&
            // Orient roads along other roads, walls against walls.
            (((building === tileTypes.road || building === tileTypes.wall)
              && neighbor.b === building)
            // Orient airlands towards airports.
          || (building === tileTypes.airland
              && neighbor.b === tileTypes.airport))) {
          paintSprite(gs, cx, cy, building, i);
          oriented = true;
        }
      }
      if (!oriented) { paintSprite(gs, cx, cy, building, 0); }
    } else if (building === tileTypes.airport || building === tileTypes.factory
        || building > tileTypes.wall) {
      paintSprite(gs, cx, cy, building, 0);
    } else {
      paintSprite(gs, cx, cy, building, rotation);
    }
  }
}

// tilePos = {q, r} is the tile's hexagonal coordinates,
// gs is the GraphicState.
function paintLoneBuilding(gs, tilePos, building) {
  var cp = pixelFromTile(tilePos, gs.origin, gs.hexSize);
  var t = terrain.tile(tilePos);
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintBuilding(gs, cp.x, cp.y, tilePos, building, rotation);
}

// gs is the GraphicState.
// Paint on a canvas with hexagonal tiles.
function paintBuildingsSprited(gs) {
  var width = gs.width;
  var height = gs.height;
  var ctx = gs.ctx; var origin = gs.origin; var size = gs.hexSize;
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
      tilePos = tileFromPixel({ x:cx, y:cy }, gs.origin, size);
      // Draw building.
      var t = terrain.tile(tilePos);
      var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
      var human = humanity.tile(tilePos);
      paintBuilding(gs, cx, cy, tilePos, (human? human.b: null), rotation);
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
// gs is the GraphicState.
function paintTerrain(gs, cx, cy, tilePos, t) {
  t = t || terrain.tile(tilePos);
  // Draw terrain.
  var rotation = (tilePos.q ^ tilePos.r ^ ((t.rain*128)|0)) % 6;
  paintSprite(gs, cx, cy, t.type, rotation);
}

// From 'size:x:y' to cached terrain, centered on the map origin.
var cachedTerrainPaint = {};

// gs is the GraphicState.
// Paint on a canvas with hexagonal tiles.
function paintTilesSprited(gs) {
  var width = gs.width;
  var height = gs.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // This is a jigsaw. We want the corner tiles of the screen.
  var tilePos = tileFromPixel({ x:0, y:0 }, origin, size);
  var centerPixel = pixelFromTile({ q: tilePos.q, r: tilePos.r-1 },
    origin, size);
  var cx = centerPixel.x;
  var cy = centerPixel.y;
  var hexHorizDistance = size * Math.sqrt(3);
  var hexVertDistance = size * 3/2;

  // Check the cache.
  var cachePos = size + ':' + origin.x0 + ':' + origin.y0;
  if (cachedTerrainPaint[cachePos] === undefined) {
    // Prepare cache.
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = gs.width;
    canvasBuffer.height = gs.height;
    var gsBuffer = makeGraphicState(canvasBuffer, sprites);
    gsBuffer.hexSize = gs.hexSize;
    gsBuffer.origin = gs.origin;

    for (var i = 0; i < 9; i++) {
      var offLeft = true;     // Each row is offset from the row above.
      var cx = centerPixel.x;
      var cy = centerPixel.y;
      while (cy - hexVertDistance < height) {
        while (cx - hexHorizDistance < width) {
          tilePos = tileFromPixel({ x:cx, y:cy }, origin, size);
          var t = terrain.tile(tilePos);
          var comm = terrain.commodity(tilePos, t);
          if (t.type === i) {
            // Draw tile.
            paintTerrain(gsBuffer, cx, cy, tilePos, t);
            if (comm >= 0) {
              gsBuffer.ctx.textAlign = 'center';
              gsBuffer.ctx.fillText(tileNames[comm], cx, cy);
            }
          } else if (i === 8 && t.type === tileTypes.water) {
            // Overlay sprites (beaches, …).
            for (var f = 0; f < 6; f++) {
              var neighbor = terrain.neighborFromTile(tilePos, f);
              var neighborTile = terrain.tile(neighbor);
              if (neighborTile.type !== tileTypes.water
                  && neighborTile.type !== tileTypes.swamp) {
                paintSprite(gsBuffer, cx, cy, tileTypes.beach, (f) % 6);
              }
            }
          }
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
        cx = cx|0;
        cy = cy|0;
      }
    }

    cachedTerrainPaint[cachePos] = canvasBuffer;

    // Prepare overlay, computed from worker.
    var renderWorker = getWorkerFromPool();
    renderWorker.addEventListener('message', function workerRecv(e) {
      if (e.data.origin.x0 === origin.x0 && e.data.origin.y0 === origin.y0
        && e.data.size === size) {
        workerCanvasBuffer.getContext('2d').putImageData(e.data.image, 0, 0);
        gsBuffer.ctx.drawImage(workerCanvasBuffer, 0, 0);
        renderWorker.removeEventListener('message', workerRecv);
        var cx = centerPixel.x + origin.x0 - size/2;
        var cy = centerPixel.y + origin.y0 - size/2;
        updateCachedRegion(cx, cy, width, height);
        updateCachedRegion(cx + width, cy, width, height);
        updateCachedRegion(cx, cy + height, width, height);
        updateCachedRegion(cx + width, cy + height, width, height);
        paint(globalGs);
        paintHumans(globalGs, humanityData);
      }
    });
    workerMessage.image = workerImageBuffer;
    workerMessage.size = size;
    workerMessage.origin = origin;
    workerMessage.type = 'rainfall';
    renderWorker.postMessage(workerMessage);
  }

  ctx.drawImage(cachedTerrainPaint[cachePos], 0, 0);
}


// Paint on a canvas with hexagonal tiles.
// gs is the GraphicState.
function paintTilesRaw(gs) {
  var width = ctx.canvas.width;
  var height = ctx.canvas.height;
  // The `origin` {x0, y0} is the position of the top left pixel on the screen,
  // compared to the pixel (0, 0) on the map.
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var imgdata = ctx.getImageData(0, 0, width, height);
  var data = imgdata.data;
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tilePos = tileFromPixel({ x:x, y:y }, origin, size);
      var t = terrain.tile(tilePos);
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

var workerCanvasBuffer = document.createElement('canvas');
workerCanvasBuffer.width = gs.width;
workerCanvasBuffer.height = gs.height;
var workerImageBuffer =
  workerCanvasBuffer.getContext('2d').getImageData(0, 0, gs.width, gs.height);
var workerMessage = { image: null, size: gs.hexSize, origin: gs.origin };
var workerPool = [
  new Worker('render-worker.js'),
  new Worker('render-worker.js'),
  new Worker('render-worker.js'),
  new Worker('render-worker.js')
];
var workerPoolRoundRobin = 0;
function getWorkerFromPool() {
  workerPoolRoundRobin++;
  workerPoolRoundRobin = workerPoolRoundRobin % workerPool.length;
  return workerPool[workerPoolRoundRobin];
}
// gs is the GraphicState.
function paintTiles(gs, cb) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (size < 5) {
    // Special case: we're from too far above, use direct pixel manipulation.
    var renderWorker = getWorkerFromPool();
    renderWorker.addEventListener('message', function workerRecv(e) {
      if (e.data.origin.x0 === origin.x0 && e.data.origin.y0 === origin.y0
        && e.data.size === size) {
        ctx.putImageData(e.data.image, 0, 0);
        renderWorker.removeEventListener('message', workerRecv);
        cb();
      }
    });
    workerMessage.image = workerImageBuffer;
    workerMessage.size = size;
    workerMessage.origin = origin;
    workerMessage.type = 'raw';
    renderWorker.postMessage(workerMessage);
  } else {
    paintTilesSprited(gs);
    paintBuildingsSprited(gs);
    cb();
  }
}

// Cached paint reference is centered on the map origin.
var cachedPaint = {};
var cachePending = {};  // map from 'x:y' to truthy values.
// gs is the GraphicState.
// cacheX, cacheY: pixel positions on the map.
// cb(canvas) returns a canvas with the correct paint on it.
// blackcb(canvas) returns a black canvas if this is the first access
// to that cache.
function getCachedPaint(gs, cacheX, cacheY, cb, blackcb) {
  var pos = cacheX + ':' + cacheY;
  var cache = cachedPaint[pos];
  if (cache == null) {
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = gs.width;
    canvasBuffer.height = gs.height;
    if ((cache === undefined) && (blackcb instanceof Function)) {
      // The cache was never there; it wasn't invalidated.
      // Paint it black immediately.
      var ctxBuffer = canvasBuffer.getContext('2d');
      ctxBuffer.fillStyle = 'black';
      ctxBuffer.fillRect(0, 0, gs.width, gs.height);
      blackcb(canvasBuffer);
    }
    // Deferred actual painting.
    if (cachePending[pos] === undefined) {
      cachePending[pos] = cb;
      var gsBuffer = makeGraphicState(canvasBuffer, sprites);
      gsBuffer.hexSize = gs.hexSize;
      gsBuffer.origin = { x0: cacheX, y0: cacheY };
      paintTiles(gsBuffer, function() {
        cache = cachedPaint[pos] = canvasBuffer;
        cachePending[pos](cache);
        delete cachePending[pos];
      });
    } else { cachePending[pos] = cb; }
  } else { cb(cache); }
}

// gs is the GraphicState
// cacheX, cacheY: 'x' and 'y' values for a cache index 'x:y'
// x, y: pixel position on the window screen.
function drawCachedPaint(gs, cacheX, cacheY, x, y) {
  var pos = cacheX + ':' + cacheY;
  var cache = cachedPaint[pos];
  if (cache != null) { gs.ctx.drawImage(cache, x, y); }
}

// Given a pixel relative to the center of the map, find the region index.
// Requires the cache's width and height.
function regionFromPixel(cx, cy, width, height) {
  var x, y;  // Coordinates related to the nearest rectangle cache.
  var x = (cx % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (cy % height);
  if (y < 0) { y += height; }
  var cacheX = cx - x;
  var cacheY = cy - y;
  return cacheX + ':' + cacheY;
}

// Force an update to the region paint (buildings and terrain).
// Note: this relies on you calling getCachedPaint().
function updateCachedRegion(cx, cy, width, height) {
  cachedPaint[regionFromPixel(cx, cy, width, height)] = null;
}

// gs is the GraphicState.
// Given tiles = {tileKey:something}, update the cache. Mainly, buildings.
function updateCachedPaint(gs, tiles) {
  var size = gs.hexSize;
  var origin = gs.origin;
  for (var changedTile in tiles) {
    var tile = terrain.tileFromKey(changedTile);
    var centerPixel = pixelFromTile(tile, origin, size);
    // We consider the size of the tile.
    // We can have up to 4 caches to draw.
    var width = gs.width;
    var height = gs.height;
    // Coordinates of corner of squared hexagon pixel in top left buffer,
    // related to the origin pixel of the map.
    var cx = centerPixel.x + origin.x0 - size/2;  // Top left pixel of hexagon.
    var cy = centerPixel.y + origin.y0 - size/2;
    // top left
    updateCachedRegion(cx, cy, width, height);
    // top right
    updateCachedRegion(cx + size, cy, width, height);
    // bottom left
    updateCachedRegion(cx, cy + size, width, height);
    // bottom right
    updateCachedRegion(cx + size, cy + size, width, height);
  }
}

// gs is the GraphicState.
function paintTilesFromCache(gs, cb) {
  var ctx = gs.ctx; var origin = gs.origin;
  // Double-buffering context.
  var doubleBufCanvas = document.createElement('canvas');
  doubleBufCanvas.width = gs.width;
  doubleBufCanvas.height = gs.height;
  var doubleBufContext = doubleBufCanvas.getContext('2d');
  // We assume that the window width does not change.
  // We can have up to 4 caches to draw.
  var width = gs.width;
  var height = gs.height;
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
  var makeDraw = function makeDraw(x, y, callcb) {
    return function draw(cache) {
      doubleBufContext.drawImage(cache, x, y);
      // We have four jobs to make in total.
      if (callcb) {
        countDone++;
        if (countDone === 4) {
          ctx.drawImage(doubleBufCanvas, 0, 0);
          cb();
        }
      } else {
        ctx.drawImage(doubleBufCanvas, 0, 0);
        paintTilesFromCurrentCache(gs);
      }
    }
  };
  var leftTopDraw = makeDraw(-x, -y, true);
  var rightTopDraw = makeDraw(width-x, -y, true);
  var leftBottomDraw = makeDraw(-x, height-y, true);
  var rightBottomDraw = makeDraw(width-x, height-y, true);
  var leftTopDrawBlack = makeDraw(-x, -y, false);
  var rightTopDrawBlack = makeDraw(width-x, -y, false);
  var leftBottomDrawBlack = makeDraw(-x, height-y, false);
  var rightBottomDrawBlack = makeDraw(width-x, height-y, false);
  getCachedPaint(gs, left, top, leftTopDraw, leftTopDrawBlack);
  getCachedPaint(gs, right, top, rightTopDraw, rightTopDrawBlack);
  getCachedPaint(gs, left, bottom, leftBottomDraw, leftBottomDrawBlack);
  getCachedPaint(gs, right, bottom, rightBottomDraw, rightBottomDrawBlack);
}

// Same as paintTilesFromCache, but won't update the cache.
function paintTilesFromCurrentCache(gs) {
  var ctx = gs.ctx; var origin = gs.origin;
  // We assume that the window width does not change.
  // We can have up to 4 caches to draw.
  var width = gs.width;
  var height = gs.height;
  // Coordinates of top left screen pixel in top left buffer.
  var x = (origin.x0 % width);
  if (x < 0) { x += width; }    // x must be the distance from the right.
  var y = (origin.y0 % height);
  if (y < 0) { y += height; }
  var left   = origin.x0 - x;
  var right  = origin.x0 + width - x;
  var top    = origin.y0 - y;
  var bottom = origin.y0 + height - y;

  drawCachedPaint(gs, left, top, -x, -y);
  drawCachedPaint(gs, right, top, width-x, -y);
  drawCachedPaint(gs, left, bottom, -x, height-y);
  drawCachedPaint(gs, right, bottom, width-x, height-y);
}

// Pixels currently on display. Useful for smooth animations.
var displayedPaint = document.createElement('canvas');
displayedPaint.width = gs.width;
displayedPaint.height = gs.height;
var displayedPaintContext = displayedPaint.getContext('2d');

var showTitleScreen = true;
setTimeout(function() { showTitleScreen = false; }, 2000);

// Paint on a canvas.
// gs is the GraphicState.
function paint(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (selectionMode === selectionModes.places) {
    // Show the direction of the places.
    orientPlacesArrow();
  }
  if (!spritesLoaded) { return; }
  paintTilesFromCache(gs, function() { paintIntermediateUI(gs); });
}

// Paint the UI for population, winner information, etc.
// gs is the GraphicState.
function paintIntermediateUI(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  // Paint unzoomed map information.
  if (size < 5) { drawMapPlaces(gs); }
  // Show tiles controlled by a player.
  for (var tileKey in lockedTiles) {
    paintTileHexagon(gs, terrain.tileFromKey(tileKey),
        campHsl(lockedTiles[tileKey]), 1);
  }
  if (currentTile != null && playerCamp != null) {
    paintTileHexagon(gs, currentTile, campHsl(playerCamp, 100, 40));
  }
  paintCamps(gs);
  // Paint the set of accessible tiles.
  ctx.lineWidth = 1.5;
  ctx.setLineDash([2, 7]);
  paintAroundTiles(gs, accessibleTiles);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  if (currentTile != null && targetTile != null &&
      (selectionMode === selectionModes.travel)) {
    // Paint the path that the selected folks would take.
    paintAlongTiles(gs, terrain.pathFromParents(
          terrain.keyFromTile(targetTile), accessibleTiles));
    // Show travel information.
    displayTravelInfo(currentTile, targetTile);
  }
  // Paint the path that folks will take.
  for (var keyTo in registerMoves) {
    var to = terrain.tileFromKey(keyTo);
    paintAlongTiles(gs, terrain.humanTravelSpeedPath(registerMoves[keyTo], to));
  }
  for (var keyAt in registerBuilds) {
    var at = terrain.tileFromKey(keyAt);
    paintLoneBuilding(gs, at, registerBuilds[keyAt]);
  }
  paintTileMessages(gs);
  if (gameOver !== undefined) {
    drawTitle(gs, [
        campNames[gameOver.winners[0]]
        + " won a " + gameOver.winType + " Victory.",
        (gameOver.winners[0] === playerCamp
         ? ("YOU WON! (" + nth(localStorage.getItem('gamesWon')) + " win!)")
         : ("YOU NEARLY WON! " +
            "(" + nth(gameOver.winners.indexOf(playerCamp) + 1) + " place!)")),
        "You can reload to engage in the next game!"],
        campHsl(gameOver.winners[0]));
  }
  if (showTitleScreen) {
    drawTitle(gs, ["Welcome to Thaddée Tyl's…", "NOT MY TERRITORY", "(YET)"]);
  }
  displayedPaintContext.drawImage(canvas, 0, 0);
}

// Return the string corresponding to a rank (eg, 1→1st, etc.).
function nth(n) {
  n = n|0;
  var strNum = ''+n;
  if (strNum.charCodeAt(strNum.length - 2) === 49) { return strNum + 'th'; }
  var mod = n % 10;
  if (mod === 1) { return strNum + 'st';
  } else if (mod === 2) { return strNum + 'nd';
  } else if (mod === 3) { return strNum + 'rd';
  } else { return strNum + 'th'; }
}

// Draw three lines of text from a list of strings on the screen.
// gs is the GraphicState.
function drawTitle(gs, lines, color) {
  var ctx = gs.ctx;
  var width = gs.width;
  var height = gs.height;
  var line1 = lines[0];
  var line2 = lines[1];
  var line3 = lines[2];
  ctx.fillStyle = color || 'black';
  if (color) { ctx.strokeStyle = 'black'; }
  ctx.textAlign = 'center';
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line1, width / 2, height * 1/3);
  if (color) { ctx.strokeText(line1, width / 2, height * 1/3); }
  ctx.font = (height / 8) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line2, width / 2, height * 13/24);
  if (color) { ctx.strokeText(line2, width / 2, height * 13/24); }
  ctx.font = (height / 16) + 'px "Linux Biolinum", sans-serif';
  ctx.fillText(line3, width / 2, height * 2/3);
  if (color) { ctx.strokeText(line3, width / 2, height * 2/3); }
  ctx.textAlign = 'start';
}

// Map from "size:q:r" places to textual information.
var mapIndex = Object.create(null);

// Insert places = {"tileKey": "Place name"} into mapIndex.
function fillMapIndex(places) {
  for (var tileKey in places) {
    mapIndex['2:' + tileKey] = places[tileKey];
  }
}

function drawMapPlaces(gs) {
  var ctx = gs.ctx;
  ctx.fillStyle = 'black';
  ctx.textAlign = 'center';
  for (var tileSizeKey in mapIndex) {
    var e = tileSizeKey.split(':');
    var size = +e[0];
    var tile = { q: e[1]|0, r: e[2]|0 };
    var pixel = pixelFromTile(tile, gs.origin, gs.hexSize);
    var text = mapIndex[tileSizeKey];
    ctx.font = 'italic '
      + (gs.hexSize*size*7) + 'px "Linux Biolinum", sans-serif';
    ctx.fillText(text, pixel.x, pixel.y - 15);
  }
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
// gs is the GraphicState.
function paintHumans(gs, humanityData) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  if (size < 20) { return; }
  ctx.drawImage(displayedPaint, 0, 0);
  for (var tileKey in humanityData) {
    var tileKeyCoord = tileKey.split(':');
    var q = +tileKeyCoord[0];
    var r = +tileKeyCoord[1];
    var human = humanityData[tileKey];
    var tile = terrain.tile(terrain.tileFromKey(tileKey));
    var centerPixel = pixelFromTile({ q:q, r:r }, origin, size);
    var cx = centerPixel.x;
    var cy = centerPixel.y;
    // Count different manufacture to show.
    var ownManufacture = [];
    var manufactures = [2,4,8,16,32,64];
    for (var mi = 0; mi < manufactures.length; mi++) {
      if ((human.o & manufactures[mi]) !== 0) {
        ownManufacture.push(manufactures[mi]);
      }
    }
    var onABoat = (tile.type === tileTypes.water
        || tile.type === tileTypes.swamp)
        && (human.o & manufacture.boat) !== 0;
    var flyingOverWater = (tile.type === tileTypes.water
        || tile.type === tileTypes.swamp)
        && (human.o & manufacture.plane) !== 0;
    var number = human.h;
    if (number > humanAnimation.length) { number = humanAnimation.length; }
    // Paint people.
    for (var i = 0; i < number; i++) {
      var animation = humanAnimation[
        Math.abs(i+q^r^human.f) % humanAnimation.length];
      var animx = (cx - size + animation.x * 2 * size)|0;
      var animy = (cy - size + animation.y * 2 * size)|0;
      var shownManufacture = -1;
      if (onABoat) {
        shownManufacture = manufacture.boat;
      } else if (flyingOverWater) {
        shownManufacture = manufacture.plane;
      } else if (ownManufacture.length > 0) {
        shownManufacture = ownManufacture[i % ownManufacture.length];
      }
      paintHuman(gs, shownManufacture, tile, animx, animy, size);
    }
  }
}

function paintHuman(gs, shownManufacture, tile, animx, animy) {
  var ctx = gs.ctx; var size = gs.hexSize;
  var pixel = size/20;
  if (shownManufacture < 0) {
    ctx.fillStyle = 'black';
    ctx.fillRect(animx, animy, pixel, 2*pixel);
  } else if (shownManufacture === manufacture.boat) {
    ctx.fillStyle = '#aaf';
    ctx.fillRect(animx - pixel, animy - pixel, pixel, pixel);
    ctx.fillRect(animx, animy, 7*pixel, pixel);
    ctx.fillRect(animx + 7*pixel, animy - pixel, pixel, pixel);
  } else if (shownManufacture === manufacture.car) {
    ctx.fillStyle = '#420';
    ctx.fillRect(animx, animy, 3*pixel, 2*pixel);
  } else if (shownManufacture === manufacture.plane) {
    ctx.fillStyle = '#edf';
    ctx.fillRect(animx - pixel, animy - pixel, 2*pixel, pixel);
    ctx.fillRect(animx, animy, 9*pixel, pixel);
    ctx.fillRect(animx + 5*pixel, animy - pixel, pixel, pixel);
    ctx.fillRect(animx + 3*pixel, animy + pixel, pixel, pixel);
  } else if (shownManufacture === manufacture.artillery) {
    ctx.fillStyle = '#425';
    ctx.fillRect(animx - 2*pixel, animy, 5*pixel, 2*pixel);
    ctx.fillRect(animx, animy - 1*pixel, 5*pixel, 1*pixel);
  } else if (shownManufacture === manufacture.gun) {
    ctx.fillStyle = '#440';
    ctx.fillRect(animx, animy, pixel, 2*pixel);
  }
}

function animateHumans() {
  paintHumans(gs, humanityData);
  updateHumans();
  paintMovementAnimations();
}
var humanAnimationTimeout = setInterval(animateHumans, 100);

// from:{x,y}, to:{x,y}, velocity, drawFunction: function(){}.
function InterpolationAnimation(gs, from, to, velocity, drawFunction) {
  this.gs = gs;
  this.from = from; this.to = to;
  this.pos = { x: this.from.x, y: this.from.y };
  this.velocity = velocity;
  this.deltaX = to.x - from.x;
  this.deltaY = to.y - from.y;
  this.length =
    Math.sqrt(this.deltaX * this.deltaX + this.deltaY * this.deltaY);
  this.portions = this.length / velocity;
  this.usedPortions = 0;
  this.dx = this.deltaX / this.portions;
  this.dy = this.deltaY / this.portions;
  this.normalizedDx = this.deltaX / this.length;
  this.normalizedDy = this.deltaY / this.length;
  this.drawFunction = drawFunction;
}
InterpolationAnimation.prototype = {
  draw: function() {
    this.drawFunction();
    this.pos.x += this.dx;
    this.pos.y += this.dy;
    this.usedPortions++;
    // If we're past our final location, we clear this up.
    if (this.usedPortions > this.portions) {
      var animationIndex = movementAnimations.indexOf(this);
      movementAnimations.splice(animationIndex, 1);
    }
  }
};

function paintMovementAnimations() {
  for (var i = 0; i < movementAnimations.length; i++) {
    movementAnimations[i].draw();
  }
}

// List of InterpolationAnimation instances.
var movementAnimations = [];
var animationVelocity = 32; // pixels

function drawShell() {
  var ctx = this.gs.ctx;
  ctx.lineWidth = 2;
  var segments = Math.min(this.usedPortions, 8);
  var x = this.pos.x;
  var y = this.pos.y;
  var segmentSize = 4; // pixels
  var incrx = segmentSize * this.normalizedDx;
  var incry = segmentSize * this.normalizedDy;
  for (var i = 9; i > (8 - segments); i--) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    x -= incrx;
    y -= incry;
    ctx.lineTo(x, y);
    ctx.strokeStyle = 'rgba(0,0,0,0.' + i + ')';
    ctx.stroke();
  }
}

// artilleryFire: map from a "q:r" target to a list of "q:r" artilleries.
function addShells(movementAnimations, artilleryFire) {
  var visibleHumans = listVisibleHumans(gs);
  for (var targetTileKey in artilleryFire) {
    var tileKeys = artilleryFire[targetTileKey];
    for (var i = 0; i < tileKeys.length; i++) {
      var tileKey = tileKeys[i];
      // Check that we can see it.
      if (visibleHumans.indexOf(tileKey) >= 0
       || visibleHumans.indexOf(targetTileKey) >= 0) {
        var fromTile = terrain.tileFromKey(tileKey);
        var toTile = terrain.tileFromKey(targetTileKey);
        var from = pixelFromTile(fromTile, gs.origin, gs.hexSize);
        var to = pixelFromTile(toTile, gs.origin, gs.hexSize);
        var shellAnimation = new InterpolationAnimation(
          gs, from, to, animationVelocity, drawShell
        );
        movementAnimations.push(shellAnimation);
      }
    }
  }
}




// Return a list of tileKeys for each tile with a visible human.
// gs is the GraphicState.
function listVisibleHumans(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var maxQ, minQ, maxR, minR, tilePos;
  // This is a jigsaw. We want the corner tiles of the screen.
  // bottom left pixel of the screen.
  tilePos = tileFromPixel({ x:0, y:gs.height }, origin, size);
  minQ = tilePos.q - 1;     // Adding 1 to include half-tiles.
  maxR = tilePos.r + 1;
  // top right pixel of the screen.
  tilePos = tileFromPixel({ x:gs.width, y:0 }, origin, size);
  maxQ = tilePos.q + 1;
  minR = tilePos.r - 1;
  // Go through all of humanity. Pick the ones we can see.
  var visibleHumans = [];
  for (var tileKey in humanityData) {
    tile = terrain.tileFromKey(tileKey);
    if (tile.q >= minQ && tile.q <= maxQ && tile.r >= minR && tile.r <= maxR
        && humanityData[tileKey].c != null) {
      visibleHumans.push(tileKey);
    }
  }
  return visibleHumans;
}

var numberOfCamps = 3;
// gs is the GraphicState.
function paintCamps(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  var visibleHumans = listVisibleHumans(gs);
  var visibleCamps = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) { visibleCamps[i] = {}; }
  for (var i = 0; i < visibleHumans.length; i++) {
    var humans = humanityData[visibleHumans[i]];
    visibleCamps[humans.c][visibleHumans[i]] = true;
  }
  var bold = gs.hexSize * 2/9;
  var hexHorizDistance = gs.hexSize * Math.sqrt(3);
  var hexVertDistance = gs.hexSize * 3/2;
  if (size < 5) {
    // We're too far above.
    ctx.fillStyle = 'black';
    var bSize = 2 * size;
    for (var i = 0; i < numberOfCamps; i++) {
      var visibleCamp = visibleCamps[i];
      for (var key in visibleCamp) {
        var px = pixelFromTile(terrain.tileFromKey(key), origin, size);
        ctx.fillRect(px.x - bSize, px.y - bSize, 2 * bSize, 2 * bSize);
      }
    }
    for (var i = 0; i < numberOfCamps; i++) {
      ctx.fillStyle = campHsl(i);
      var visibleCamp = visibleCamps[i];
      for (var key in visibleCamp) {
        var px = pixelFromTile(terrain.tileFromKey(key), origin, size);
        ctx.fillRect(px.x - size, px.y - size, 2 * size, 2 * size);
      }
    }
  } else {
    for (var i = 0; i < numberOfCamps; i++) {
      pathFromTiles(gs, visibleCamps[i],
          hexHorizDistance, hexVertDistance, /*noisy*/ true, /*dashed*/ false);
      // Background grey.
      ctx.lineWidth = bold * 2;
      ctx.strokeStyle = 'hsla(' + campHueCreator9000(i) + ',30%,40%,0.4)';
      ctx.stroke();
    }

    for (var i = 0; i < numberOfCamps; i++) {
      // Inside translucent border.
      pathFromTiles(gs, visibleCamps[i],
          hexHorizDistance, hexVertDistance, /*noisy*/ true, /*dashed*/ false);
      ctx.save();
      ctx.clip();
      // Inside border.
      ctx.lineWidth = bold;
      ctx.strokeStyle = campHsl(i, 70, 35);
      ctx.stroke();
      // Dashed border.
      pathFromTiles(gs, visibleCamps[i],
          hexHorizDistance, hexVertDistance, /*noisy*/ true, /*dashed*/ true);
      ctx.strokeStyle = campHsl(i, 80, 42);
      ctx.stroke();
      ctx.restore();
    }

    ctx.lineWidth = 1;
  }
}

// Return CSS hsl string.
// saturation: number from 0 to 100.
// lightness: number from 0 to 100.
function campHsl(camp, saturation, lightness) {
  if (saturation == null) { saturation = 100; }
  if (lightness == null) { lightness = 45; }
  return 'hsl(' + campHueCreator9000(camp)
      + ',' + saturation + '%,' + lightness + '%)';
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
function paintPopulation() {
  if (!humanityPopulation) { return; }
  var top = 55;
  var left = 7;
  var width = 187;
  var height = 10;
  var svg = '<svg id=populationMonitor>';
  // Paint the border.
  svg += '<rect stroke="hsl(0,0%,40%)" stroke-width="1" x="0" y="0" rx="3" ry="3" width="'
    + (width) + '" height="' + (height) + '" />';
  // Paint the population.
  var totalPopulation = 0;
  for (var i = 0; i < humanityPopulation.length; i++) {
    totalPopulation += humanityPopulation[i];
  }
  var start = 1;
  var innerWidth = width - 2;
  var popWidth;
  var allButLastWidth = 0;
  for (var i = 0; i < humanityPopulation.length - 1; i++) {
    popWidth = (innerWidth * humanityPopulation[i] / totalPopulation)|0;
    allButLastWidth += popWidth;
    svg += '<rect fill="' + campHsl(i) + '"'
        + ' x="' + (start) + '" y="1" width="' + (popWidth) + '"'
        + ' height="' + (height - 2) + '" />';
    start += popWidth;
  }
  popWidth = innerWidth - allButLastWidth;
  svg += '<rect fill="' + campHsl(i) + '"'
      + ' x="' + (start) + '" y="1" width="' + (popWidth) + '"'
      + ' height="' + (height - 2) + '" />'
      + '<linearGradient id="grad" y2="100%" x2="0">'
      + '<stop offset="0" stop-color="#fff" stop-opacity=".1"/>'
      + '<stop offset="1" stop-color="#000" stop-opacity=".2"/>'
      + '</linearGradient>'
      + '<rect fill="url(#grad)" x="1" y="1" '
      + 'width="' + (width - 2) + '" height="' + (height - 2) + '"/>'
      + '</svg>';
  // Using outerHTML to avoid this bug: <https://bugzilla.mozilla.org/show_bug.cgi?id=886390>
  populationMonitor.outerHTML = svg;
}

// Tile Messages.
var surrenderMessages = [
  "We surrender!",
  "I give up!",
  "Enemies captured!",
  "I, for one, welcome our new overlords."
];
var hungerMessages = [
  "Make a farm.",
  "Hungry!",
  "Is dinner ready?",
  "I can't feel my stomach!",
  "You're starving us!",
  "I could eat anything. Rats. Babies.",
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
  "There is wine on the floor…",
  "They're bleeding demised!",
  "Them ex-people make daisies happy.",
  "⬐ Acclimated to the being dead position",
  "So much for survival!",
  "Today I died.",
  "I dare you! I double-dare you!",
  "Mayday!",
  "Area pacified, over!",
  "Resistance is futile.",
  "All your base are belong to us.",
  "Nobody expects the Spanish Inquisition!",
  "Whoop-de-doo!",
  "You'll never take me alive!",
  "Told you he wasn't immortal!",
  "Tu quoque, fili mi!",
  "Do not disturb my circles!",
  "This is no time to be making enemies.",
  "I owe a cock to Asclepius.",
  "More light!",
  "Life's too short!",
  "What will you do, kill m—?!",
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
          paint(gs);
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
// gs is the GraphicState.
function paintMessage(gs, tileKey, msg) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  ctx.font = '14px "Linux Biolinum", sans-serif';
  var msgSize = ctx.measureText(msg).width;
  // Find the pixel to start from.
  var center = pixelFromTile(terrain.tileFromKey(tileKey), origin, size);
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
// gs is the GraphicState.
function paintTileMessages(gs) {
  var ctx = gs.ctx; var size = gs.hexSize; var origin = gs.origin;
  for (var tileKey in warTiles) {
    paintMessage(gs, tileKey, warTiles[tileKey].message);
  }
  for (var tileKey in surrenderTiles) {
    paintMessage(gs, tileKey, surrenderTiles[tileKey].message);
  }
  for (var tileKey in starvedTiles) {
    paintMessage(gs, tileKey, starvedTiles[tileKey].message);
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
var lockedTiles;    // Map from tileKey to camp index.
var accessibleTiles;
var currentTile;    // {q,r}.

// For a mouse event, give the information of the tile under the cursor.
function showTileInformation(tile) {
  var t = terrain.tile(tile);
  var info = 'a ' + tileNames[t.type];
  var h = humanity.tile(tile);
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
      if ((h.o & manufacture.artillery) !== 0) {
        ownership += 'with cannons ';
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
  for (var i = 0; i < buildSelectionButtons.length; i++) {
    var b = +buildSelectionButtons[i].dataset.b;
    if (terrain.validConstruction(b, currentTile, resources)) {
      buildSelectionButtons[i].classList.add('validSelection');
    } else {
      buildSelectionButtons[i].classList.remove('validSelection');
    }
  }
}
function hookBuildSelectionButtons() {
  for (var i = 0; i < buildSelectionButtons.length; i++) {
    var hook = (function(b) { return function hookBuildSelectionButton() {
        sendBuild(currentTile, b);
        enterMode(selectionModes.normal);
      };
    }(+buildSelectionButtons[i].dataset.b));
    buildSelectionButtons[i].addEventListener('click', hook);
  }
}
hookBuildSelectionButtons();

function updateCurrentTileInformation() {
  if (currentTile !== undefined) {
    // Tile information.
    showTileInformation(currentTile);
    // Accessible tiles.
    accessibleTiles = terrain.humanTravelFrom(currentTile);
    // Valid constructions.
    indicateValidConstructions(currentTile);
  }
}





// Initialization and event management.
//

var selectionModes = {
  normal:   1,
  settings: 2,
  travel:   3,
  build:    4,
  places:   5
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
  if (selectionMode === selectionModes.settings) {
    hidePanel(settingsPanel, settingsBut);
    settingsBut.removeEventListener('click', enterNormalMode);
    settingsBut.addEventListener('click', enterSettingsMode);
  } else if (selectionMode === selectionModes.travel) {
    hidePanel(travelPanel, travelBut);
    targetTile = null;
    travelBut.removeEventListener('click', enterNormalMode);
    travelBut.addEventListener('click', enterTravelMode);
  } else if (selectionMode === selectionModes.build) {
    hidePanel(buildPanel, buildBut);
    buildBut.removeEventListener('click', enterNormalMode);
    buildBut.addEventListener('click', enterBuildMode);
  } else if (selectionMode === selectionModes.places) {
    hidePanel(placesPanel, placesBut);
    placesBut.removeEventListener('click', enterNormalMode);
    placesBut.addEventListener('click', enterPlacesMode);
  }
  // Add things from the new mode.
  if (newMode === selectionModes.settings) {
    showPanel(settingsPanel, settingsBut);
    settingsBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.travel) {
    splitPanelSetMoveStay();
    showPanel(travelPanel, travelBut);
    travelBut.addEventListener('click', enterNormalMode);
  } else if (newMode === selectionModes.build) {
    showPanel(buildPanel, buildBut);
    buildBut.addEventListener('click', enterNormalMode);
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
    paint(gs);
  }
}


// Control buttons.

function enterNormalMode() { enterMode(selectionModes.normal); }
function enterSettingsMode() { enterMode(selectionModes.settings); }
function enterTravelMode() { enterMode(selectionModes.travel); }
function enterBuildMode() { enterMode(selectionModes.build); }
function enterPlacesMode() { enterMode(selectionModes.places); }
travelBut.addEventListener('click', enterTravelMode);
buildBut.addEventListener('click', enterBuildMode);
settingsBut.addEventListener('click', enterSettingsMode);
placesBut.addEventListener('click', enterPlacesMode);

splitInputWidget.addEventListener('input', function changeSplitPortion() {
  splitPanelPortion.textContent = '' + splitInputWidget.value;
  splitPanelSetMoveStay();
});

function splitPanelSlider(percent) {
  splitInputWidget.value = ''+percent;
  splitPanelPortion.textContent = ''+percent;
}

// Update the number of people who move and stay in the travel panel UI.
function splitPanelSetMoveStay() {
  var humanityTile = humanity.tile(currentTile);
  var humans = 0;
  if (humanityTile != null) {
    humans = humanityTile.h;
  }
  var move = ((humans * splitInputWidget.value / 100)|0);
  var stay = humans - move;
  splitPanelPortionMove.textContent = '' + move;
  splitPanelPortionStay.textContent = '' + stay;
}


// Keyboard events.

var buildHotKeys = {
  48: tileTypes.airport,    // "0"
//  49: tileTypes.wall,       // "1"
//  50: tileTypes.road,       // "2"
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
    gs.origin.x0 += (gs.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 38 || event.keyCode === 87) {    // ↑ W
    gs.origin.y0 -= (gs.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 37 || event.keyCode === 65) {    // ← A
    gs.origin.x0 -= (gs.width / 2)|0;
    redraw = true;
  } else if (event.keyCode === 40 || event.keyCode === 83) {    // ↓ S
    gs.origin.y0 += (gs.height / 2)|0;
    redraw = true;
  } else if (event.keyCode === 187 || event.keyCode === 61) {  // +=
    // Zoom.
    gs.hexSize *= 4;
    gs.origin.x0 = gs.origin.x0*4 + (gs.width*(3/2))|0;
    gs.origin.y0 = gs.origin.y0*4 + (gs.height*(3/2))|0;
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 173 || event.keyCode === 189
          || event.keyCode === 109 || event.keyCode === 219
          || event.keyCode === 169) {   // -
    // Unzoom.
    gs.hexSize /= 4;
    gs.origin.x0 = ((gs.origin.x0/4)|0) - ((gs.width*(3/8))|0);
    gs.origin.y0 = ((gs.origin.y0/4)|0) - ((gs.height*(3/8))|0);
    voidCache = true;
    redraw = true;
  } else if (event.keyCode === 84) {    // T
    splitPanelSlider(100);
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 70) {    // F
    splitPanelSlider(50);
    enterMode(selectionModes.travel);
  } else if (event.keyCode === 67) {    // C
    enterMode(selectionModes.build);
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
    paint(gs);
  }
};


// Tile selection.


function travelingNumber(total) {
  return (total * splitInputWidget.value / 100)|0;
}

function mouseSelection(event) {
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
  var posTile = tileFromPixel({ x: event.clientX, y: event.clientY },
        gs.origin, gs.hexSize);

  if ((selectionMode === selectionModes.travel)
    && currentTile !== undefined && humanity.tile(currentTile) !== undefined) {
    var humanityTile = humanity.tile(currentTile);
    var numberOfPeople = travelingNumber(humanityTile.h);

    // Send travel information.
    var targetTile = posTile;
    if (terrain.humanTravelSpeedPath(currentTile, targetTile).length > 1
        && humanityTile.c === playerCamp) {
      if (humanityTile.f <= 0) {
        var starveMessage = {};
        starveMessage[terrain.keyFromTile(currentTile)] = humanityTile;
        addStarveMessages(starveMessage);
      }
      sendMove(currentTile, targetTile, numberOfPeople);

    } else if (numberOfPeople > 0) {
      // Try to go as far in that direction as we can.
      var minDist = MAX_INT;
      var closestTargetTile;
      for (var tileKey in accessibleTiles) {
        var accessedTile = terrain.tileFromKey(tileKey);
        var dist = terrain.distanceBetweenTiles(accessedTile, targetTile);
        if (dist < minDist) {
          closestTargetTile = accessedTile;
          minDist = dist;
        }
      }
      if (closestTargetTile != null) {
        sendMove(currentTile, closestTargetTile, numberOfPeople);
        // Put the cursor there instead of where we clicked.
        posTile = closestTargetTile;
      }
    }

    enterMode(selectionModes.normal);

  } else { sendPos(currentTile, posTile); }

  // Move there.
  currentTile = posTile;
  updateCurrentTileInformation();
  paint(gs);
};

var mousePosition;
var targetTile;
function showPath(event) {
  mousePosition = { x: event.clientX, y: event.clientY };
  if (currentTile && (selectionMode === selectionModes.travel)) {
    targetTile = tileFromPixel(mousePosition, gs.origin, gs.hexSize);
    paint(gs);
    paintHumans(gs, humanityData);
  }
}
canvas.addEventListener('mousemove', showPath);


// Map dragging.

function mouseDrag(event) {
  gs.canvas.style.cursor = 'move';
  gs.canvas.removeEventListener('mousemove', mouseDrag);
  gs.canvas.removeEventListener('mouseup', mouseSelection);
  gs.canvas.addEventListener('mouseup', mouseEndDrag);
  gs.canvas.addEventListener('mousemove', dragMap);
  clearInterval(humanAnimationTimeout);
  currentlyDragging = true;
  resetDragVector();
  dragVelTo = setInterval(resetDragVector, dragVelInterval);
}

function mouseEndDrag(event) {
  gs.canvas.style.cursor = '';
  gs.canvas.removeEventListener('mousemove', dragMap);
  gs.canvas.removeEventListener('mouseup', mouseEndDrag);
  humanAnimationTimeout = setInterval(animateHumans, 100);
  currentlyDragging = false;
  paint(gs);
  clearInterval(dragVelTo);
  computeDragVelocity();
  inertiaDragMap();
}

gs.canvas.onmousedown = function mouseInputManagement(event) {
  if (event.button === 0) {
    gs.canvas.addEventListener('mouseup', mouseSelection);
    gs.canvas.addEventListener('mousemove', mouseDrag);
    lastMousePosition.clientX = event.clientX;
    lastMousePosition.clientY = event.clientY;
  } else if (event.button === 2) {  // Right click.
    enterTravelMode();
    splitPanelSlider(100);
    mouseSelection(event);
    enterNormalMode();
  }
};
gs.canvas.oncontextmenu = function(e) { e.preventDefault(); };

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
  gs.origin.x0 += velocityX;
  gs.origin.y0 += velocityY;
  // Save the last mouse position.
  lastMousePosition.clientX = event.clientX;
  lastMousePosition.clientY = event.clientY;
  paint(gs);
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
  dragVector[0] = gs.origin.x0;
  dragVector[1] = gs.origin.y0;
}

function computeDragVelocity() {
  dragTime = Date.now() - dragTime;
  dragVector[0] = gs.origin.x0 - dragVector[0];
  dragVector[1] = gs.origin.y0 - dragVector[1];
  var nbFrames = dragTime * 0.03;  // 0.03 frames/ms
  dragVelocity[0] = (dragVector[0] / nbFrames)|0;
  dragVelocity[1] = (dragVector[1] / nbFrames)|0;
}

function inertiaDragMap() {
  gs.origin.x0 += dragVelocity[0];
  gs.origin.y0 += dragVelocity[1];
  dragVelocity[0] = (dragVelocity[0] / 1.1)|0;
  dragVelocity[1] = (dragVelocity[1] / 1.1)|0;
  paint(gs);
  requestAnimationFrame(function() {
    if (dragVelocity[0] !== 0 || dragVelocity[1] !== 0) {
      inertiaDragMap();
    }
  });
}
