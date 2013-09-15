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
  var world;
  try {
    world = require(worldFile);
  } catch(e) { world = {}; }
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

// change = {tileKey: humanityTile}.
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
  if (oldTile.h <= 0) { oldTile.c = null; oldTile.f = 0; }
  if (newTile.h <= 0) { newTile.c = null; newTile.f = 0; }
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
function Camp() {
  this.id = campIdCount++;
  this.populationCap = 0;   // Max. number of people, based on number of houses.
  this.population = 0;      // Number of people.
  this.homes = {};          // Map from tileKey to number of homes.
  this.farm = {};
  this.residence = {};
  this.skyscraper = {};
  this.spawn = { q:0, r:0 };// Starting spot.
}
Camp.prototype = {
  loseHomes: function(tileKey, b) {
    this.populationCap -=
      b === terrain.tileTypes.farm? homePerHouse.farm:
      b === terrain.tileTypes.residence? homePerHouse.residence:
      b === terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    if (b === terrain.tileTypes.farm) {
      delete this.farm[tileKey];
    } else if (b === terrain.tileTypes.residence) {
      delete this.residence[tileKey];
    } else if (b === terrain.tileTypes.skyscraper) {
      delete this.skyscraper[tileKey];
    }
  },
  winHomes: function(tileKey, b) {
    var homes =
      b === terrain.tileTypes.farm? homePerHouse.farm:
      b === terrain.tileTypes.residence? homePerHouse.residence:
      b === terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    this.populationCap += homes;
    if (b === terrain.tileTypes.farm) {
      this.farm[tileKey] = homes;
    } else if (b === terrain.tileTypes.residence) {
      this.residence[tileKey] = homes;
    } else if (b === terrain.tileTypes.skyscraper) {
      this.skyscraper[tileKey] = homes;
    }
  }
};

var camps = [];
function campFromId(id) { if (id != null) { return camps[id]; } }

var numberOfCamps = 3;
// Make all the camps.
function makeCamps() {
  var camps = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) {
    camps[i] = new Camp();
  }
  return camps;
}

// List of camp IDs from most population to least.
function winners() {
  var winners = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) { winners[i] = i; }
  winners.sort(function(a, b) {
    return camps[b].population - camps[a].population;
  });
  return winners;
}

// Given a list of {q,r} spawns, set the map.
// Modifies `camps`.
function setSpawn(spawns) {
  camps = makeCamps();
  humanityData = {};
  var settlements = {};
  for (var i = 0; i < numberOfCamps; i++) {
    camps[i].spawn = spawns[i];
    console.log('camp', i + ':', camps[i].spawn);
    var humanityTile = makeDefault();
    humanityTile.h = 3;
    humanityTile.c = i;
    settlements[spawns[i].q + ':' + spawns[i].r] = humanityTile;
  }
  humanityChange(settlements);
}

// Return a list of population information for each camp.
function population() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = camps[i].population;
  }
  return list;
}


module.exports = humanity;
module.exports.start = start;
module.exports.change = humanityChange;
module.exports.data = data;
module.exports.makeDefault = makeDefault;
module.exports.copy = copy;

module.exports.homePerHouse = homePerHouse;

module.exports.campFromId = campFromId;
module.exports.numberOfCamps = numberOfCamps;
module.exports.population = population;
module.exports.setSpawn = setSpawn;
module.exports.winners = winners;
