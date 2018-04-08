// Thaddee Tyl, AGPLv3.
// Contrary to popular belief, this file is meant to be a JS code concatenator.
// It is meant to be used in a node environment, as in, `node make.js`.

const fs = require('fs');
const path = require('path');
const uglify = require('uglify-js');
const {Writable} = require('stream');

const debug = process.argv.some(a => a === '--debug');

function main() {
  // Server-side terrain.
  bundle('terrain-gen.js', [
    'terrain-node-before.js',
    'terrain.js',
    'terrain-node-after.js',
  ], {compress: false});

  // Client-side terrain.
  bundle('web/display.js', [
    'simplex-noise.js',
    'pcg.js',
    'terrain.js',
    'web/input.js',
  ]);

  // Rendering worker thread.
  bundle('web/render-worker.js', [
    'simplex-noise.js',
    'pcg.js',
    'terrain.js',
    'web/render.js',
  ]);
}

function bundle(file, inputs, options = {compress: true}) {
  const {compress} = options;
  const compression = !!compress;

  function cat(output, i = 0) {
    const input = fs.createReadStream(path.join(__dirname, inputs[i]));
    input.pipe(output, {end: false});
    input.on('end', function() {
      const next = i + 1;
      if (next < inputs.length) {
        cat(output, next);
      } else {
        output.end();
      }
    });
  }

  if (!compression || debug) {  // do not minify the code.
    cat(fs.createWriteStream(file));
  } else {
    cat(new UglifyWriter(file));
  }
}

class UglifyWriter extends Writable {
  constructor(file, options) {
    super(options);
    this.file = file;
    this.buffer = '';
  }
  _write(chunk, encoding, cb) {
    try { this.buffer += String(chunk); cb(); }
    catch (e) { cb(e); }
  }
  _final(cb) {
    const minified = uglify.minify(this.buffer);
    if (minified.error) {
      console.error(minified.error); cb(minified.error);
    } else { fs.writeFile(this.file, minified.code, cb); }
  }
}

main();
