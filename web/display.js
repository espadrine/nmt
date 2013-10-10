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
  wall:         17
};
var buildingTypes = [ 8, 9, 10, 11, 12, 13, 14, 15, 16, 17 ];

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

// Listen to server connection.

var gameOver;
var socket = new WebSocket(
  // Trick: use the end of either http: or https:.
  'ws' + window.location.protocol.slice(4) + '//' +
    window.location.hostname +
    (window.location.port.length > 0? (':' + window.location.port): '') +
    '/$websocket:act');
socket.onmessage = function(e) {
  var change = JSON.parse(e.data);
  if (change.plans) {
    // FIXME: if you want to receive other players' plans.
  } else if (change.winners) {
    // The game is over.
    gameOver = change.winners[0];
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
};
socket.onclose = socket.onerror = function(e) {
  alert('You are disconnected.\nPlease reload the page.');
};

function sendMove(from, to, humans) {
  if (!from || !to) { return; }
  socket.send(JSON.stringify({
    at: keyFromTile(from),
    do: planTypes.move,
    to: keyFromTile(to),
    h: humans
  }));
}

function sendPos(at, to) {
  if (!at) { return; }
  socket.send(JSON.stringify({ at: keyFromTile(at), to: keyFromTile(to) }));
}

function sendBuild(at, building) {
  if (!at) { return; }
  socket.send(JSON.stringify({
    at: keyFromTile(at),
    do: planTypes.build,
    b: building
  }));
}


// Insert places = {"Place name": "tileKey"} into the panel.
function insertPlaces(places) {
  for (var place in places) {
    var aPlace = document.createElement('p');
    aPlace.classList.add('buildSelection');
    aPlace.classList.add('validSelection');
    // Add a separator.
    var aSep = document.createElement('hr');
    aSep.classList.add('separator');
    placesPanel.appendChild(aSep);
    // Add the place block.
    var tile = tileFromKey(places[place]);
    aPlace.setAttribute('data-tilekey', places[place]);
    aPlace.innerHTML = '<div>→</div> ' + place;
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
  pathFromHex(ctx, size, cp, hexHorizDistance, hexVertDistance);
  ctx.strokeStyle = color;
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
    var canvasBuffer = document.createElement('canvas');
    canvasBuffer.width = canvas.width;
    canvasBuffer.height = canvas.height;
    var ctxBuffer = canvasBuffer.getContext('2d');
    paintTiles(ctxBuffer, size, { x0: cacheX, y0: cacheY });
    cache = cachedPaint[cacheX + ':' + cacheY] = canvasBuffer;
  }
  return cache;
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
function updateCachedPaint(size, origin, tiles) {
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
    updateCachedRegion(width, height, cx, cy);
    // top right
    updateCachedRegion(width, height, cx + size, cy);
    // bottom left
    updateCachedRegion(width, height, cx, cy + size);
    // bottom right
    updateCachedRegion(width, height, cx + size, cy + size);
  }
}

function paintTilesFromCache(ctx, size, origin) {
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
  ctx.drawImage(getCachedPaint(size, origin, left, top), -x, -y);
  ctx.drawImage(getCachedPaint(size, origin, right, top), width-x, -y);
  ctx.drawImage(getCachedPaint(size, origin, left, bottom), -x, height-y);
  ctx.drawImage(getCachedPaint(size, origin, right, bottom), width-x, height-y);
}

// Pixels currently on display. Useful for smooth animations.
var displayedPaint = document.createElement('canvas');
displayedPaint.width = canvas.width;
displayedPaint.height = canvas.height;
var displayedPaintContext = displayedPaint.getContext('2d');

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paint(ctx, size, origin) {
  if (selectionMode === selectionModes.places) {
    // Show the direction of the places.
    orientPlacesArrow();
  }
  if (spritesLoaded) { paintTilesFromCache(ctx, size, origin);
  } else {
    paintTiles(ctx, size, origin);
    drawTitle(ctx, [
        "Welcome to Thaddée Tyl's…", "NOT MY TERRITORY", "(YET)"]);
  }
  if (currentTile != null && playerCamp != null) {
    ctx.lineWidth = 4;
    paintTileHexagon(ctx, size, origin, currentTile, campHsl(playerCamp));
    ctx.lineWidth = 1;
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
        (gameOver === playerCamp? "YOU WON!": "YOU NEARLY WON!"),
        "You can reload to engage in the next game!"],
        campHsl(gameOver));
  }
  displayedPaintContext.drawImage(canvas, 0, 0);
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
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Paint the population.
  var totalPopulation = 0;
  for (var i = 0; i < humanityPopulation.length; i++) {
    totalPopulation += humanityPopulation[i];
  }
  var start = left;
  var popWidth;
  for (var i = 0; i < humanityPopulation.length - 1; i++) {
    popWidth = width * humanityPopulation[i] / totalPopulation;
    ctx.fillStyle = 'hsl(' + campHueCreator9000(i) + ',80%,50%)';
    ctx.fillRect(start|0, top, popWidth|0, height);
    start += popWidth;
  }
  popWidth = width * humanityPopulation[i] / totalPopulation;
  ctx.fillStyle = 'hsl(' + campHueCreator9000(i) + ',80%,50%)';
  ctx.fillRect(start|0, top, (popWidth|0)+1, height);
}

// Tile Messages.
// FIXME: do surrender messages.
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
  "I, for one, welcome our new overlords.",
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
  for (var b = tileTypes.farm, i = 0; b < tileTypes.wall + 1; b++, i++) {
    if (validConstruction(b, currentTile)) {
      buildSelectionButtons[i].classList.add('validSelection');
    } else {
      buildSelectionButtons[i].classList.remove('validSelection');
    }
  }
}
function hookBuildSelectionButtons() {
  for (var b = tileTypes.farm, i = 0; b < tileTypes.wall + 1; b++, i++) {
    var hook = (function(b) { return function hookBuildSelectionButton() {
        sendBuild(currentTile, b);
        enterMode(selectionModes.normal);
      };
    }(b));
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

var spritesLoaded = false;
sprites.onload = function loadingSprites() {
  paint(ctx, hexaSize, origin);
  spritesLoaded = true;
};

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
  57: tileTypes.airland,    // "9"
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
          || event.keyCode === 109 || event.keyCode === 219) {   // -
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
}

function mouseEndDrag(event) {
  canvas.style.cursor = '';
  canvas.removeEventListener('mousemove', dragMap);
  canvas.removeEventListener('mouseup', mouseEndDrag);
  humanAnimationTimeout = setInterval(animateHumans, 100);
  currentlyDragging = false;
  paint(ctx, hexaSize, origin);
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
