var fs = require('fs');
var genName = require('./gen-name.js');
var worldFile = process.argv[3] || './world.json';

var dirtyWorld = false;
function saveWorld() {
  // Like a hero.
  if (dirtyWorld) {
    var world = {};
    for (var tileKey in humanityData) {
      world[tileKey] = humanityData[tileKey];
    }
    world.places = places;
    world.usedResources = getUsedResources();
    world.populationLimits = getPopulationLimits();
    fs.writeFile(worldFile, JSON.stringify(world));
    dirtyWorld = false;
  }
}

var terrain;
function start(t, findSpawn, findTreasures) {
  terrain = t;
  try {
    var world = require(worldFile);
    camps = makeCamps();
    places = world.places;
    for (var i = 0; i < numberOfCamps; i++) {
      camps[i].spawn = terrain.tileFromKey(Object.keys(places)[i]);
    }
    delete world.places;
    var usedResources = world.usedResources;
    for (var i = 0; i < numberOfCamps; i++) {
      camps[i].usedLumber = usedResources[i].usedLumber;
      camps[i].usedMetal = usedResources[i].usedMetal;
    }
    delete world.usedResources;
    var populationLimits = world.populationLimits;
    for (var i = 0; i < numberOfCamps; i++) {
      camps[i].populationLimit = populationLimits[i];
    }
    delete world.populationLimits;
    humanityData = world;
    for (var tileKey in world) {
      var humanityTile = world[tileKey];
      if (humanityTile.c != null) {
        campFromId(humanityTile.c).winHomes(tileKey, humanityTile.b);
        campFromId(humanityTile.c).population += humanityTile.h;
      }
    }
  } catch(e) {
    setSpawn(findSpawn, findTreasures);
  }
  for (var i = 0; i < numberOfCamps; i++) {
    console.log('camp', i + ':', camps[i].spawn);
  }
  // Update periodically.
  var periodicity = 10000;  // Every 10s.
  setInterval(saveWorld, periodicity);
}

// Map from tileKeys to objects with the following keys:
// b: building;
// h: number of humans;
// c: camp (territory to which it belongs);
// f: food (how much there is in the group);
// o: manufactured goods owned;
var humanityData = {};
var places = {};
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
      makeCoherentTile(tileChanged);
      humanityData[tileKey] = tileChanged;
    }
    dirtyWorld = true;
  }
}

// Set f and o when the tile doesn't contain humans.
function makeCoherentTile(tile) {
  if (tile.h <= 0) {
    tile.f = 0; tile.o = 0;
    if (tile.b === null) {
      tile.c = null;
    }
  }
}

function campChange(tileKey, oldTile, newTile) {
  if (oldTile == null) { oldTile = makeDefault(); }
  // Nullify camps when necessary.
  makeCoherentTile(oldTile);
  makeCoherentTile(newTile);
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
  residence: 2,
  skyscraper: 6
};

var industryPopulationLimit = 100;

function Camp(id) {
  this.id = id;
  this.populationCap = 0;   // Max. number of people, based on number of houses.
  this.population = 0;      // Number of people.
  this.populationLimit = industryPopulationLimit;
  this.farm = {};           // Maps from tileKey to number of homes.
  this.residence = {};
  this.skyscraper = {};
  this.farm = 0;
  this.usedFarm = 0;        // Never decreases.
  this.lumber = 1;          // Number of lumber spots occupied.
  this.usedLumber = 0;      // Never decreases.
  this.metal = 0;           // Number of lumber spots occupied.
  this.usedMetal = 0;       // Never decreases.
  this.spawn = { q:0, r:0 };// Starting spot.
  this.nActions = 0;        // Number of actions.
}
Camp.prototype = {
  loseHomes: function(tileKey, b) {
    this.populationCap -=
      b === terrain.tileTypes.residence? homePerHouse.residence:
      b === terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    if (b === terrain.tileTypes.residence) {
      delete this.residence[tileKey];
    } else if (b === terrain.tileTypes.skyscraper) {
      delete this.skyscraper[tileKey];
    } else if (b === terrain.tileTypes.farm) {
      this.farm--;
    } else if (b === terrain.tileTypes.lumber) {
      this.lumber--;
    } else if (b === terrain.tileTypes.mine) {
      this.metal--;
    } else if (b === terrain.tileTypes.industry) {
      this.populationLimit -= industryPopulationLimit;
    }
  },
  winHomes: function(tileKey, b) {
    var homes =
      b === terrain.tileTypes.residence? homePerHouse.residence:
      b === terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    this.populationCap += homes;
    if (b === terrain.tileTypes.residence) {
      this.residence[tileKey] = homes;
    } else if (b === terrain.tileTypes.skyscraper) {
      this.skyscraper[tileKey] = homes;
    } else if (b === terrain.tileTypes.farm) {
      this.farm++;
    } else if (b === terrain.tileTypes.lumber) {
      this.lumber++;
    } else if (b === terrain.tileTypes.mine) {
      this.metal++;
    } else if (b === terrain.tileTypes.industry) {
      this.populationLimit += industryPopulationLimit;
    }
  },
  get resources () {
    return {
      farm: this.farm,
      usedFarm: this.usedFarm,
      lumber: this.lumber,
      usedLumber: this.usedLumber,
      metal: this.metal,
      usedMetal: this.usedMetal,
    };
  },
};

var camps = [];
function campFromId(id) { if (id != null) { return camps[id]; } }

var numberOfCamps = 3;
// Make all the camps.
function makeCamps() {
  var camps = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) {
    camps[i] = new Camp(i);
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

// findSpawn: function returning a list of {q,r} spawns.
// findTreasures: function returning {'q:r': {type,name}}
// with `type` one of `terrain.tileTypes`.
// Modifies `camps`.
function setSpawn(findSpawn, findTreasures) {
  var spawns = findSpawn();
  var treasures = findTreasures(spawns);
  camps = makeCamps();
  humanityData = {};    // reset humanity.
  places = {};
  addSpawns(spawns);
  addTreasures(treasures);
}

function addSpawns(spawns) {
  for (var i = 0; i < spawns.length; i++) {
    places[terrain.keyFromTile(spawns[i])] = genName() + ' Town';
  }
  var settlements = {};
  for (var i = 0; i < numberOfCamps; i++) {
    camps[i].spawn = spawns[i];
    var humanityTile = makeDefault();
    humanityTile.h = 3;  // Just enough to survive losing the initial town.
    humanityTile.f = 3;  // Just enough to have the starving message.
    humanityTile.b = terrain.tileTypes.residence;
    humanityTile.c = i;
    settlements[spawns[i].q + ':' + spawns[i].r] = humanityTile;
  }
  humanityChange(settlements);
}

function addTreasures(treasures) {
  var settlements = {};
  for (var tileKey in treasures) {
    var humanityTile = makeDefault();
    var treasure = treasures[tileKey];
    humanityTile.b = treasure.type;
    settlements[tileKey] = humanityTile;
    places[tileKey] = treasure.name;
  }
  humanityChange(settlements);
}

// type: one of `terrain.tileTypes`
// oldpos: 'q:r'
// pos: 'q:r'
// updatedHumanity: object from 'q:r' to humanity data.
// Elements get set if they were modified.
function moveTreasure(type, oldpos, pos, updatedHumanity, name) {
  var settlements = {};
  settlements[pos] = humanityData[pos] || makeDefault();
  settlements[pos].b = type;
  updatedHumanity[pos] = copy(settlements[pos]);
  places[pos] = places[oldpos];
  places[oldpos] = genName() + ' ' + name;
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

function getPlaces() { return places; }

function getResources() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = camps[i].resources;
  }
  return list;
}

function getUsedResources() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = {usedLumber: camps[i].usedLumber, usedMetal: camps[i].usedMetal};
  }
  return list;
}
function getPopulationLimits() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = camps[i].populationLimit;
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
module.exports.moveTreasure = moveTreasure;
module.exports.winners = winners;
module.exports.getPlaces = getPlaces;
module.exports.getResources = getResources;
