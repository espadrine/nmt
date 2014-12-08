var terrain = new Terrain();

(function(exports) {

var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));
var simplex3 = new SimplexNoise(prng.random.bind(prng));

var spreadfactor = 120;
var factor = 5;
var t = 0;
var tfactor = 500000;

function heatmap1(x, y) {
  var size = simplex1.noise2D(x/spreadfactor/5, y/spreadfactor/5);
  var heightNoise = Math.sin(
      + simplex1.noise2D(x/spreadfactor, y/spreadfactor)
      + 1/2 * simplex1.noise2D(x/spreadfactor/2, y/spreadfactor/2)
      ) / 2 + Math.sin(
      + simplex1.noise2D(x/spreadfactor/4, y/spreadfactor/4)
      ) / 2;
  var heightNoise = Math.sin(
      + simplex1.noise2D(x/spreadfactor, y/spreadfactor)
      + 1/2 * simplex1.noise2D(x/spreadfactor*2, y/spreadfactor*2)
      + 1/4 * simplex1.noise2D(x/spreadfactor*4, y/spreadfactor*4)
      + 1/8 * simplex1.noise2D(x/spreadfactor*8, y/spreadfactor*8)
      );
  return heightNoise;
}
function heatmap2(x, y) {
  var size = simplex2.noise2D(x/spreadfactor/5, y/spreadfactor/5);
  var heightNoise = Math.sin(
      + simplex2.noise2D(x/spreadfactor, y/spreadfactor)
      + 1/2 * simplex2.noise2D(x/spreadfactor/2, y/spreadfactor/2)
      ) / 2 + Math.sin(
      + simplex2.noise2D(x/spreadfactor/4, y/spreadfactor/4)
      ) / 2;
  return heightNoise;
}

// heat is between -1 and 1.
function toRange(heat, min, max) {
  return (heat/2+1)*(max-min)+min;
}

exports.texture =
function texture(image) {
  var imbuf = image.data;
  var nbSlots = (image.width * image.height * 4)|0;
  var x = 0, y = 0;
  for (var i = 0; i < nbSlots; i += 4) {
    var hm1 = heatmap1(x, y);
    var hm2 = heatmap2(x, y);
    var red = toRange(hm1, 120, 150);
    var green = toRange(hm2, 70, red+25);
    var blue = 10*Math.random()|0;
    imbuf[i + 0] = (red + 10*(Math.random()*2-1))|0;
    imbuf[i + 1] = (green + 10*(Math.random()*2-1))|0;
    imbuf[i + 2] = blue|0;
    imbuf[i + 3] = 255|0;
    var grass = simplex3.noise2D(x, y);
    var grassProb = 0.5;
    if (grass > grassProb) {
      grass = (grass - grassProb) * 1 / (1 - grassProb);
      var grassSize = 5;
      red = (red + 12*(Math.random()*2-1))|0;
      green = (green + 12*(Math.random()*2-1))|0;
      if (grass > 0.6) {
        for (var gi = 1; gi < grassSize; gi++) {
          imbuf[i + 0 - (image.width+1)*4*gi] = red;
          imbuf[i + 1 - (image.width+1)*4*gi] = green;
          imbuf[i + 2 - (image.width+1)*4*gi] = blue;
        }
      } else if (grass > 0.3) {
        for (var gi = 1; gi < grassSize; gi++) {
          imbuf[i + 0 - (image.width)*4*gi] = red;
          imbuf[i + 1 - (image.width)*4*gi] = green;
          imbuf[i + 2 - (image.width)*4*gi] = blue;
        }
      } else {
        for (var gi = 1; gi < grassSize; gi++) {
          imbuf[i + 0 - (image.width-1)*4*gi] = red;
          imbuf[i + 1 - (image.width-1)*4*gi] = green;
          imbuf[i + 2 - (image.width-1)*4*gi] = blue;
        }
      }
    }
    x++;
    if (x >= image.width) {
      x = 0;
      y++;
    }
  }
}


// Height noises.

function heightNoiseHill(x, y, ratio) {
  var octaves = 2; //4;
  var baseAmplitude = -octaves/2+1.9; //1; //.09;
  var amplitudex = baseAmplitude*ratio;
  var amplitudey = baseAmplitude/ratio;
  var divisor = 0;
  var result = 0;
  for (var i = 0; i < octaves; i++) {
    var harmonic = Math.pow(3, i+2.5);
    result += (simplex1.noise2D(x/harmonic/amplitudex, y/harmonic/amplitudey))*harmonic;
    divisor += harmonic;
  }
  return (result / divisor);
}
function heightNoiseMountain(x, y, ratio) {
  var octaves = 6; //6;
  var baseAmplitude = 4; //4;
  var amplitudex = baseAmplitude*ratio;
  var amplitudey = baseAmplitude/ratio;
  var divisor = 0;
  var result = 0;
  for (var i = 0; i < octaves; i++) {
    var harmonic = Math.pow(2, i);
    result += (simplex2.noise2D(x/harmonic/amplitudex, y/harmonic/amplitudey))*harmonic;
    divisor += harmonic;
  }
  return 1.4*(1-2*Math.abs(result / divisor));
}

function topCell(width, height, x, y) {
  if (y <= 0) { return -1; }
  var pos = (y-1)*width + x-1;
  return pos;
}
function rightCell(width, height, x, y) {
  if (x + 1 >= width) { return -1; }
  var pos = y*width + x + 1;
  return pos;
}
function bottomCell(width, height, x, y) {
  if (y > height) { return -1; }
  var pos = (y+1)*width + x+1;
  return pos;
}
function leftCell(width, height, x, y) {
  if (x <= 0) { return -1; }
  var pos = y*width + x - 1;
  return pos;
}

function erosion(data, width, height, size) {
  var water = new Float32Array(size);
  var initWater = .5;
  var soil = new Float32Array(size);
  var x = 0, y = 0;
  for (var i = 0; i < size; i++) { water[i] = initWater; soil[i] = 0; }
  //*
  for (var times = 0; times < 2000; times++) {
    //var i = (height/2+7)*width+width/2+80;
    var i = (Math.random() * size)|0;
    var path = [];
    var pathIncrease = [];
    var downwards = true;

    var tq = Math.random();
    for (var trajectory = 0; trajectory < 40; trajectory++) {
      var localHeight = data[i] + soil[i] + water[i];
      var highHeight = localHeight;
      var lowHeight = localHeight;
      var highest = i;
      var lowest = i;
      var x = i % width;
      var y = (i / width)|0;
      var top = topCell(width, height, x, y);
      if (top >= 0) {
        var currentHeight = data[top] + soil[top] + water[top];
        if (currentHeight > highHeight) { highest = top; highHeight = currentHeight; }
        if (currentHeight < lowHeight) { lowest = top; lowHeight = currentHeight; }
      }
      var right = rightCell(width, height, x, y);
      if (right >= 0) {
        var currentHeight = data[right] + soil[right] + water[right];
        if (currentHeight > highHeight) { highest = right; highHeight = currentHeight; }
        if (currentHeight < lowHeight) { lowest = right; lowHeight = currentHeight; }
      }
      var bottom = bottomCell(width, height, x, y);
      if (bottom >= 0) {
        var currentHeight = data[bottom] + soil[bottom] + water[bottom];
        if (currentHeight > highHeight) { highest = bottom; highHeight = currentHeight; }
        if (currentHeight < lowHeight) { lowest = bottom; lowHeight = currentHeight; }
      }
      var left = leftCell(width, height, x, y);
      if (left >= 0) {
        var currentHeight = data[left] + soil[left] + water[left];
        if (currentHeight > highHeight) { highest = left; highHeight = currentHeight; }
        if (currentHeight < lowHeight) { lowest = left; lowHeight = currentHeight; }
      }
      var sorted = [top, bottom, right, left].sort(function(a, b) {
        return data[b] - data[a];
      });
      var q = Math.random();
      var qlim = 0.9;
      if (tq > 0.4) { qlim = 1 - qlim; }
      highest = (q > qlim)? sorted[0]: sorted[1];
      lowest = (q > qlim)? sorted[3]: sorted[2];
      if (tq > 0.4) { var tmp = highest; highest = lowest; lowest = tmp; }
      var q = Math.random();
      var randLoc = q < 0.25? top: q < 0.5? right: q < 0.75? bottom: left;

      path.push((Math.random() > 0.5)? i: randLoc);
      var target = downwards? lowest: highest;
      pathIncrease.push(downwards? -.002: .004);
      if (i === target) {
        i = downwards? highest: lowest;
        downwards = !downwards;
      } else {
        i = target;
      }
    }
    for (var i = 0; i < path.length; i++) {
      data[path[i]] += pathIncrease[i];
    }
  }
}

function heightmap(width, height) {
  var size = width * height;
  var ratio = width / height;
  var data = new Float32Array(size);
  var x = 0, y = 0;
  for (var i = 0; i < size; i++) {
    data[i] = heightNoiseMountain(x, y, ratio);
    x++;
    if (x > width) {
      x = 0;
      y++;
    }
  }
  erosion(data, width, height, size);
  return data;
}


// Rendering primitives.


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

var centerFromTerrain = {};
centerFromTerrain[tileTypes.water] = -0.2;
centerFromTerrain[tileTypes.steppe] = 0;
centerFromTerrain[tileTypes.hill] = 0;
centerFromTerrain[tileTypes.mountain] = 0;

var variationFromTerrain = {};
variationFromTerrain[tileTypes.water] = 0;
variationFromTerrain[tileTypes.steppe] = 0.2;
variationFromTerrain[tileTypes.hill] = 0.5;
variationFromTerrain[tileTypes.mountain] = 1.0;


// Create the map from the real tiles.
function contextHeightMap(origin, hexSize, canvasWidth, canvasHeight, width, height) {
  var size = width * height;
  var ratio = width / height;
  var data = new Float32Array(size);

  // How many vertices are there in a hexagon?
  var hexHorizDistance = hexSize * Math.sqrt(3);
  var hexVertDistance = hexSize * 3/2;
  var hexaSizeInWidth = canvasWidth / hexHorizDistance;
  var hexaSizeInHeight = canvasHeight / hexVertDistance;
  var verticesInHexWidth = width / hexaSizeInWidth;
  var verticesInHexHeight = height / hexaSizeInHeight;

  var pixelsInWidthEdge = canvasWidth / width;
  var pixelsInHeightEdge = canvasHeight / height;

  var px = {x:0, y:0};
  var distanceWidth = 2 * verticesInHexWidth;
  var distanceHeight = 2 * verticesInHexHeight;
  // Portion of the future terrain; shows how close we are to it.
  var portionWidth = 0;
  var portionHeight = 0;
  // Steepness of points, from left to right, `distanceWidth` apart.
  var northTerrain = [];
  var southTerrain = [];
  var indexNorthTerrain = 0;

  var x = 0, y = 0;
  for (var i = 0; i < size; i++) {
    // Look at the terrain we have further right, and south.
    if (portionWidth === 0) {
      if (portionHeight === 0) {
        if (x === 0) {
          northTerrain = [];
          southTerrain = [];
        }
        px.x = x * pixelsInWidthEdge;
        px.y = y * pixelsInHeightEdge;
        northTerrain[indexNorthTerrain] = terrain.tile(tileFromPixel(px, origin, hexSize)).steepness;
        px.x = (x + distanceWidth) * pixelsInWidthEdge;
        px.y = y * pixelsInHeightEdge;
        northTerrain[indexNorthTerrain + 1] = terrain.tile(tileFromPixel(px, origin, hexSize)).steepness;
        px.x = x * pixelsInWidthEdge;
        px.y = (y + distanceHeight) * pixelsInHeightEdge;
        southTerrain[indexNorthTerrain] = terrain.tile(tileFromPixel(px, origin, hexSize)).steepness;
        px.x = (x + distanceWidth) * pixelsInWidthEdge;
        px.y = (y + distanceHeight) * pixelsInHeightEdge;
        southTerrain[indexNorthTerrain + 1] = terrain.tile(tileFromPixel(px, origin, hexSize)).steepness;
      }
    }

    var center =
      (centerFromTerrain[northTerrain[indexNorthTerrain]] * (1 - portionWidth)
       + centerFromTerrain[northTerrain[indexNorthTerrain + 1]] * portionWidth) * (1 - portionHeight)
    + (centerFromTerrain[southTerrain[indexNorthTerrain]] * (1 - portionWidth)
       + centerFromTerrain[southTerrain[indexNorthTerrain + 1]] * portionWidth) * portionHeight;
    var variation =
      (variationFromTerrain[northTerrain[indexNorthTerrain]] * (1 - portionWidth)
       + variationFromTerrain[northTerrain[indexNorthTerrain + 1]] * portionWidth) * (1 - portionHeight)
    + (variationFromTerrain[southTerrain[indexNorthTerrain]] * (1 - portionWidth)
       + variationFromTerrain[southTerrain[indexNorthTerrain + 1]] * portionWidth) * portionHeight;

    var posx = origin.x0 + x;
    var posy = origin.y0 + y;
    if (variation > variationFromTerrain[tileTypes.hill]) {
      // Slowly go from mountain to hill.
      var portionMountain = (variation - variationFromTerrain[tileTypes.hill])
        / (variationFromTerrain[tileTypes.mountain] - variationFromTerrain[tileTypes.hill]);
      var heightHill = heightNoiseHill(posx, posy, ratio);
      data[i] =
        (heightHill * variation + center) * (1 - portionMountain)
      + ((heightNoiseMountain(posx, posy, ratio) + heightHill)/2 * variation + center)
       * portionMountain;
    } else {
      data[i] = heightNoiseHill(posx, posy, ratio) * variation + center;
    }

    // Advance the portion to the next terrain spot.
    portionWidth += 1 / distanceWidth;
    if (portionWidth >= 1) {
      portionWidth = 0;
      indexNorthTerrain += 1;
    }

    x++;
    if (x > width) {
      x = 0;
      y++;
      indexNorthTerrain = 0;
      portionWidth = 0;
      portionHeight += 1 / distanceHeight;
      if (portionHeight >= 1) { portionHeight = 0; }
    }
  }
  erosion(data, width, height, size);
  return data;
}

exports.contextHeightMap = contextHeightMap;

}(this));


// Message I/O.

onmessage = function workerRecv(e) {
  if (e.data.centerTile) { terrain.setCenterTile(e.data.centerTile); return; }
  var hexSize = e.data.hexSize;
  var origin = e.data.origin;
  var canvasWidth = e.data.canvasWidth;
  var canvasHeight = e.data.canvasHeight;

  //texture(e.data.textureImage);
  postMessage({
    heightmap: contextHeightMap(origin, hexSize, canvasWidth, canvasHeight,
                 e.data.width, e.data.height),
    texture: e.data.textureImage
  });
};
