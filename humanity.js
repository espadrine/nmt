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
function data() { return humanityData; }

function makeDefault() {
  return { b: null, h: 0, c: null, f: 0, o: 0 };
}
function copy(tile) {
  if (tile == null) { return makeDefault(); }
  return { b:tile.b, h:tile.h, c:tile.c, f:tile.f, o:tile.o };
}

// Takes a tile = {q, r}, returns the humanity information for that tile.
// (See above for humanity information.)
function humanity(tile) {
  return humanityData[tile.q + ':' + tile.r];
}

function humanityChange(change) {
  for (var tileKey in change) {
    var tileChanged = change[tileKey];
    campChange(tileKey, humanityData[tileKey], tileChanged);
    if (tileChanged.b == null && tileChanged.h <= 0) {
      // There is nothing to remember here.
      delete humanityData[tileKey];
    } else {
      humanityData[tileKey] = tileChanged;
    }
    dirtyWorld = true;
  }
}

function campChange(tileKey, oldTile, newTile) {
  if (oldTile == null) { oldTile = makeDefault(); }
  // Nullify camps when necessary.
  if (oldTile.h <= 0) { oldTile.c = null; }
  if (newTile.h <= 0) { newTile.c = null; }
  var oldCamp = campFromId(oldTile.c);
  var newCamp = campFromId(newTile.c);
  if (oldTile.c !== newTile.c) {
    // Changed ownership.
    if (oldCamp && oldTile.b != null) {
      // The old ones lost homes.
      oldCamp.loseHomes(tileKey, oldTile.b);
    }
    if (newCamp && newTile.b != null) {
      // The new ones won homes.
      newCamp.winHomes(tileKey, newTile.b);
    }
  } else if (newCamp && oldTile.b !== newTile.b) {
    // Same ownership, different building.
    newCamp.loseHomes(tileKey, oldTile.b);
    newCamp.winHomes(tileKey, newTile.b);
  }
  if (oldCamp) { oldCamp.population -= oldTile.h; }
  if (newCamp) { newCamp.population += newTile.h; }
}


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
  this.population = 0;
  this.homes = {};     // Map from tileKey to number of homes.
  camps.push(this);
}
Camp.prototype = {
  loseHomes: function(tileKey, b) {
    this.populationCap -=
      b === terrain.tileTypes.farm? homePerHouse.farm:
      b === terrain.tileTypes.residence? homePerHouse.residence:
      b === terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    delete this.homes[tileKey];
  },
  winHomes: function(tileKey, b) {
    var homes =
      b === terrain.tileTypes.farm? homePerHouse.farm:
      b === terrain.tileTypes.residence? homePerHouse.residence:
      b === terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    this.populationCap += homes;
    this.homes[tileKey] = homes;
  }
};

function campFromId(id) { if (id != null) { return camps[id]; } }

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
module.exports.copy = copy;

module.exports.homePerHouse = homePerHouse;

module.exports.campFromId = campFromId;
module.exports.numberOfCamps = numberOfCamps;
