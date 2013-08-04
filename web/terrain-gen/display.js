var simplex1 = new SimplexNoise();
var simplex2 = new SimplexNoise();
var canvas = document.getElementById('c');
var ctx = canvas.getContext('2d');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
var data = imgdata.data;
var origin = [0, 0];
var factor = 50;

var water = 0;
var steppe = 1;
var hills = 2;
var mountain = 3;
function tile(coord) {
  var x = coord.x;
  var y = coord.y;
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
  var seaNoise = simplex1.noise2D(y/factor/5, x/factor/5)
      + 1/2 * simplex1.noise2D(2*y/factor/5, 2*x/factor/5);
  var vegetationNoise = simplex2.noise2D(x/factor, y/factor)
      + 1/2 * simplex2.noise2D(2*x/factor, 2*y/factor)
      + 1/4 * simplex2.noise2D(4*x/factor, 4*y/factor)
      + 1/8 * simplex2.noise2D(8*x/factor, 8*y/factor)
      + 1/16 * simplex2.noise2D(16*x/factor, 16*y/factor);
  var height =
    // Rivers are thinner in mountains.
    ((riverNoise < -0.99 - (heightNoise*0.013)
    // Seas are smaller in mountains.
    || heightNoise + seaNoise < -1) ?
        water:
    (heightNoise < 0.1) ?
        steppe:
    // Mountains are cut off (by hills) to avoid circular mountain formations.
    (heightNoise < 1 - (riverNoise*0.42)) ?
        hills:
        mountain);
  var vegetation = vegetationNoise-seaNoise/18+Math.abs(heightNoise+0.15) < 0;

  return {
    height: height,
    vegetation: vegetation
  };
}

for (var x = 0; x < canvas.width; x++) {
  for (var y = 0; y < canvas.height; y++) {
    var t = tile({ x: x + origin[0], y: y + origin[0] });
    var color = [0, 0, 0];
    if (t.height == water) {
      color = [0, 0, 255];
    } else if (t.height == steppe) {
      color = [0, 255, 0];
    } else if (t.height == hills) {
      color = [255, 0, 0];
    }
    data[(x + y * canvas.width) * 4 + 0] = color[0];
    data[(x + y * canvas.width) * 4 + 1] = color[1];
    data[(x + y * canvas.width) * 4 + 2] = color[2];
    data[(x + y * canvas.width) * 4 + 3] = t.vegetation? 155: 255;
  }
}

ctx.putImageData(imgdata, 0, 0);

