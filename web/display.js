var prng = new MersenneTwister(0);
var simplex1 = new SimplexNoise(prng.random.bind(prng));
var simplex2 = new SimplexNoise(prng.random.bind(prng));
var canvas = document.getElementById('c');
canvas.width = document.documentElement.clientWidth;
canvas.height = document.documentElement.clientHeight;
var ctx = canvas.getContext('2d');
var imgdata = ctx.getImageData(0, 0, canvas.width, canvas.height);
var data = imgdata.data;
var factor = 50;

for (var y = 0; y < canvas.height; y++) {
  for (var x = 0; x < canvas.width; x++) {
    var heightNoise = Math.sin(
              - 4* Math.abs(simplex1.noise2D(1/4*x/factor, 1/4*y/factor))
              + simplex1.noise2D(x/factor, y/factor)
              - 1/2* Math.abs(simplex1.noise2D(2*x/factor, 2*y/factor))
              + 1/4* Math.abs(simplex1.noise2D(4*x/factor, 4*y/factor))
              - 1/8* Math.abs(simplex1.noise2D(8*x/factor, 8*y/factor))
              + 1/16* Math.abs(simplex1.noise2D(16*x/factor, 16*y/factor)));
    var seaNoise = 2*simplex2.noise2D(x/factor/2, y/factor/2);
    var color = [0,0,0];
    if (heightNoise < -0.99 || heightNoise + seaNoise < -1.7) {
      color = [0, 0, 255];
    } else if (heightNoise < -0.5) {
      color = [0, 255, 0];
    } else if (heightNoise < 0.4) {
      color = [255, 0, 0];
    }
    var vegetationNoise = simplex2.noise2D(x/factor, y/factor)
                       + 1/2* simplex2.noise2D(2*x/factor, 2*y/factor)
                       + 1/4* simplex2.noise2D(4*x/factor, 4*y/factor)
                       + 1/8* simplex2.noise2D(8*x/factor, 8*y/factor)
                       + 1/16* simplex2.noise2D(16*x/factor, 16*y/factor);
    var vegetation = vegetationNoise-seaNoise/18+Math.abs(heightNoise+0.15) < 0;
    data[(x + y * canvas.width) * 4 + 0] = color[0];
    data[(x + y * canvas.width) * 4 + 1] = color[1];
    data[(x + y * canvas.width) * 4 + 2] = color[2];
    data[(x + y * canvas.width) * 4 + 3] = vegetation? 155: 255;
  }
}

ctx.putImageData(imgdata, 0, 0);

