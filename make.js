// Thaddee Tyl, AGPLv3.
// Contrary to popular belief, this file is meant to be a JS code concatenator.
// It is meant to be used in a node environment, as in, `node make.js`.

var fs = require('fs');
var path = require('path');
var uglify = require('uglify-js');

var debug = !!process.argv[2] || false;

function bundle(file, inputs, compress) {
  compress = !!compress;
  var output = fs.createWriteStream(file);

  function cat(i) {
    var input = fs.createReadStream(path.join(__dirname, inputs[i]));
    input.pipe(output, {end: false});
    input.on('end', function() {
      var next = i + 1;
      if (next < inputs.length) {
        cat(next);
      } else {
        output.end();
      }
    });
  }
  if (!compress || debug) {  // do not minify the code.
    cat(0);
  } else {
    var minified = uglify.minify(inputs);
    output.write(minified.code, function(){});
  }
}

// Union of lists (in the correct order).
function union(lists) {
  var ulist = [];
  for (var i = 0; i < lists.length; i++) {
    ulist = ulist.concat(lists[i]);
  }
  return ulist;
}

// Server-side terrain.
bundle('terrain.js', [
  'terrain-node-before.js',
  'terrain-gen.js',
  'terrain-node-after.js',
], true);

// Client-side terrain.
bundle('web/display.js', [
  'web/simplex-noise.js',
  'web/mersenne-twister.js',
  'terrain-gen.js',
  'web/input.js',
], true);

// Rendering worker thread.
bundle('web/render-worker.js', [
  'web/simplex-noise.js',
  'web/mersenne-twister.js',
  'terrain-gen.js',
  'web/render.js',
], true);
