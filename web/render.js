onmessage = function workerRecv(e) {
  if (e.data.type === 'raw') {
    paintTilesRaw(e.data.image, e.data.size, e.data.origin);
  } else if (e.data.type === 'rainfall') {
    paintRainfall(e.data.image, e.data.size, e.data.origin);
  }
  postMessage({image:e.data.image,size:e.data.size,origin:e.data.origin});
};

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

// From 'size:x:y' to cached terrain, centered on the map origin.
var cachedTerrainPaint = {};

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintTilesRaw(imgdata, size, origin) {
  var width = imgdata.width;
  var height = imgdata.height;
  var arraySize = width * height * 4;
  var pos = size + ':' + origin.x0 + ':' + origin.y0;
  if (cachedTerrainPaint[pos] === undefined) {
    var data = new Uint8ClampedArray(arraySize);
    for (var y = 0; y < height; y++) {
      for (var x = 0; x < width; x++) {
        var t = terrain({ x: (x + origin.x0)/size , y: (y + origin.y0)/size });
        var color = [0,0,0];
        var fromRed = 0, toRed = 0, fromGreen = 0, toGreen = 0;
        var heightMin = -1, heightMax = 1;
        if (t.steepness == tileTypes.water) {
          color[2] = 180;
        } else if (t.steepness == tileTypes.steppe) {
          fromRed = 0;
          fromGreen = 200;
          toRed = 85;
          toGreen = 170;
          heightMin = -0.6;
          heightMax = 0.4;
        } else if (t.steepness == tileTypes.hill) {
          fromRed = 110;
          fromGreen = 150;
          toRed = 160;
          toGreen = 90;
          heightMin = 0.4;
          heightMax = 0.65;
        } else {
          fromRed = 120;
          fromGreen = 90;
          toRed = 50;
          toGreen = 0;
          heightMin = 0.65;
          heightMax = 1;
        }
        if (t.type == tileTypes.forest) {
          fromRed = 20;
          fromGreen = 100;
          toRed = 50;
          toGreen = 100;
        }
        var grey = (((t.height + 1) / 2));
        grey = (grey - heightMin) / (heightMax - heightMin);
        var inverseGrey = 1 - grey;
        color[0] = grey * toRed + (1 - grey) * fromRed;
        color[1] = grey * toGreen + (1 - grey) * fromGreen;
        // Rainfall
        var rain = Math.min(Math.abs(color[0] - color[1]) / 2 * t.rain, 255);
        color[1] -= rain; // darker green
        color[2] -= Math.min(t.rain * 50, 255);   // darker blue
        // Vegetation
        if (t.vegetation) {
          color[0] -= 50;
          color[1] -= 25;
          color[2] -= 50;
        }
        var position = (x + y * width) * 4;
        data[position + 0] = color[0];
        data[position + 1] = color[1];
        data[position + 2] = color[2];
        data[position + 3] = 255;
      }
    }
    cachedTerrainPaint[pos] = data;
  }
  // Set the contents of imgdata.data.
  imgdata.data.set(cachedTerrainPaint[pos]);
}

// Paint on a canvas with hexagonal tiles with `size` being the radius of the
// smallest disk containing the hexagon.
// The `origin` {x0, y0} is the position of the top left pixel on the screen,
// compared to the pixel (0, 0) on the map.
function paintRainfall(imgdata, size, origin) {
  var width = imgdata.width;
  var height = imgdata.height;
  var arraySize = width * height * 4;
  var data = new Uint8ClampedArray(arraySize);
  for (var y = 0; y < height; y++) {
    for (var x = 0; x < width; x++) {
      var tile = tileFromPixel({ x: x , y: y }, origin, size);
      var t = terrain(tile);
      var grey = (1 - t.rain) / 2;
      var greyMin = 10;
      var greySpan = 157;
      var halfGreySpan = (greySpan / 2)|0;
      grey = (grey * greySpan + greyMin)|0;
      var red = grey;
      var green = grey;
      if (t.type === tileTypes.water) {
      } else {
        var delta = (Math.abs(grey - halfGreySpan))|0;
        if (grey < halfGreySpan) { red -= delta; green += delta; }
        else if (grey > halfGreySpan) { red += 2*delta; green += delta; }
      }
      var position = (x + y * width) * 4;
      data[position + 0] = red;
      data[position + 1] = green;
      data[position + 2] = grey;
      data[position + 3] = 60;
    }
  }
  imgdata.data.set(data);
}
