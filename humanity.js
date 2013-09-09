// {b}: building;
// {h}: number of humans;
// {c}: camp (territory to which it belongs);
// {f}: food (how much there is in the group);
// {o}: manufactured goods owned;
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
  // FIXME: delete empty tiles.
  for (var tileKey in change) { humanityData[tileKey] = change[tileKey]; }
}

function data() { return humanityData; }


// Camp management.
//

// Population management.
var homePerHouse = {
  farm: 1,
  residence: 2,
  skyscraper: 6
};

var campIdCount = 0;
var camps = [];
function Camp() {
  this.id = campIdCount++;
  this.populationCap = 0;   // Number of people, based on number of houses.
  camps.push(this);
}

function campFromId(id) { return camps[id]; }

var numberOfCamps = 3;
// Make all the camps.
function makeCamps() {
  for (var i = 0; i < numberOfCamps; i++) { new Camp(); }
}
makeCamps();


module.exports = humanity;
module.exports.change = changeHumanity;
module.exports.data = data;
module.exports.makeDefault = makeDefault;

module.exports.homePerHouse = homePerHouse;

module.exports.campFromId = campFromId;
