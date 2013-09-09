var fs = require('fs');
var genName = require('./gen-name.js');
var worldFile = './world.json';

var dirtyWorld = false;
function saveWorld() {
  // Like a hero.
  if (dirtyWorld) {
    fs.writeFile(worldFile, JSON.stringify(humanityData));
    dirtyWorld = false;
  }
}

var terrain;
function start(t) {
  terrain = t;
  var world = require(worldFile);
  // The following is prophetic.
  humanityChange(world);
  // Update periodically.
  var periodicity = 10000;  // Every 10s.
  setInterval(saveWorld, periodicity);
}

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

function humanityChange(change) {
  for (var tileKey in change) {
    var tileChanged = change[tileKey];
    if (tileChanged.b == null && tileChanged.h <= 0) {
      // There is nothing to remember here.
      delete humanityData[tileKey];
    } else {
      humanityData[tileKey] = tileChanged;
    }
    dirtyWorld = true;
  }
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
module.exports.start = start;
module.exports.change = humanityChange;
module.exports.data = data;
module.exports.makeDefault = makeDefault;

module.exports.homePerHouse = homePerHouse;

module.exports.campFromId = campFromId;
