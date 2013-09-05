var humanityData = {};

function makeDefault() {
  return { b: null, h: 0, c: 0, f: 0, o: 0 };
}

// Takes a tile = {q, r}, returns the humanity information for that tile.
// (See above for humanity information.)
function humanity(tile) {
  return humanityData[tile.q + ':' + tile.r];
}

function changeHumanity(change) {
  for (var tileKey in change) { humanityData[tileKey] = change[tileKey]; }
}

function data() {
  return humanityData;
}

module.exports = humanity;
module.exports.change = changeHumanity;
module.exports.data = data;
module.exports.makeDefault = makeDefault;
