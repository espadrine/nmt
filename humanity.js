var fs = require('fs');
var genName = require('./gen-name.js');
var treasure = require('./treasure.js');
var worldFile = process.argv[3] || './world.json';



// Chapter: World Updater.
//


var dirtyWorld = false;
function saveWorld() {
  // Like a hero.
  if (dirtyWorld) {
    var world = {};
    for (var tileKey in humanityData) {
      world[tileKey] = humanityData[tileKey];
    }
    world.places = places;
    world.campNames = campNames();
    world.usedResources = getResources();
    world.populationLimits = getPopulationLimits();
    fs.writeFile(worldFile, JSON.stringify(world));
    dirtyWorld = false;
  }
}

var terrain;
function start(t) {
  terrain = t;
  try {
    var world = require(worldFile);
    camps = makeCamps();
    places = world.places;
    for (var i = 0; i < numberOfCamps; i++) {
      camps[i].spawn = terrain.tileFromKey(Object.keys(places)[i]);
      camps[i].name = world.campNames[i];
    }
    delete world.places;
    delete world.campNames;
    var usedResources = world.usedResources;
    for (var i = 0; i < numberOfCamps; i++) {
      for (var resourceKey in usedResources[i]) {
        camps[i][resourceKey] = usedResources[i][resourceKey];
      }
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
    setSpawn();
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


// Chapter: Camp management.
//

// Population management.
var homePerHouse = {
  residence: 2,
  skyscraper: 6
};

var universityPopulationLimit = 100;

function Camp(id) {
  this.id = id;
  this.name = genName();
  this.populationCap = 0;   // Max. number of people, based on number of houses.
  this.population = 0;      // Number of people.
  this.populationLimit = universityPopulationLimit;
  this.farm = {};           // Maps from tileKey to number of homes.
  this.residence = {};
  this.skyscraper = {};
  this.farm = 0;
  this.usedFarm = 0;        // Never decreases.
  this.lumber = 1;          // Number of lumber spots occupied.
  this.usedLumber = 0;      // Never decreases.
  this.metal = 0;           // Number of lumber spots occupied.
  this.usedMetal = 0;       // Never decreases.
  this.acquiredUniversitiesMap = {};// From tileKey to truthy value.
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
      if (terrain(terrain.tileFromKey(tileKey)).type
          === terrain.tileTypes.taiga) {
        this.lumber -= 4;
      }
    } else if (b === terrain.tileTypes.mine
            || b === terrain.tileTypes.industry) {
      this.metal--;
    } else if (b === terrain.tileTypes.university) {
      this.populationLimit -= universityPopulationLimit;
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
      if (terrain(terrain.tileFromKey(tileKey)).type
          === terrain.tileTypes.taiga) {
        this.lumber += 4;
      }
    } else if (b === terrain.tileTypes.mine
            || b === terrain.tileTypes.industry) {
      this.metal++;
    } else if (b === terrain.tileTypes.university) {
      this.populationLimit += universityPopulationLimit;
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
      acquiredUniversitiesMap: this.acquiredUniversitiesMap,
    };
  },
  // Number of universities won from enemies.
  get acquiredUniversities () {
    return Object.keys(this.acquiredUniversitiesMap).length;
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
// criterion is a function that takes a camp, returns a number.
function winners(criterion) {
  var winners = new Array(numberOfCamps);
  for (var i = 0; i < numberOfCamps; i++) { winners[i] = i; }
  winners.sort(function(a, b) {
    return criterion(camps[b]) - criterion(camps[a]);
  });
  return winners;
}



// Chapter: Prepare for Spawn.
//


// Modifies `camps`.
function setSpawn() {
  spawnCampCursor = 0;
  camps = makeCamps();
  humanityData = {};    // reset humanity.
  places = {};
  var center = findSpawns();
  findTreasures(center);
}


var spawnCampCursor = 0;

// spawn: {q,r} positioning the spawn point.
// The camp is determined by spawnCampCursor.
function addSpawn(spawn) {
  places[terrain.keyFromTile(spawn)] = camps[spawnCampCursor].name + ' Town';
  var change = {};
  camps[spawnCampCursor].spawn = spawn;
  var humanityTile = makeDefault();
  humanityTile.h = 3;  // Just enough to survive losing the initial town.
  humanityTile.f = 3;  // Just enough to have the starving message.
  humanityTile.b = terrain.tileTypes.residence;
  humanityTile.c = spawnCampCursor;
  change[spawn.q + ':' + spawn.r] = humanityTile;
  humanityChange(change);
  spawnCampCursor++;
}

// tileKey = "q:r", treasure = {type, name} (see treasure.js)
// type: building type (see terrain.tileTypes),
// name: treasure name, as a string.
function addTreasure(tileKey, treasure) {
  var change = {};
  var humanityTile = makeDefault();
  humanityTile.b = treasure.type;
  change[tileKey] = humanityTile;
  places[tileKey] = treasure.name;
  humanityChange(change);
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

function generateRandomDistance() {
  return ((Math.random() * 100)|0) + 50;
}

// Adds the spawns to the map.
// Returns the game's center, {q,r}.
function findSpawns() {
  var distanceFromCenter = generateRandomDistance();
  var centerSpot = {
    q: (Math.random() * 10000)|0,
    r: (Math.random() * 10000)|0,
  };
  var angle = 0;
  for (var i = 0; i < numberOfCamps; i++) {
    var oneSpot = {
      q: (centerSpot.q + distanceFromCenter * Math.cos(angle))|0,
      r: (centerSpot.r + distanceFromCenter * Math.sin(angle))|0,
    };
    addSpawn(findNearestTerrain(oneSpot, terrain.tileTypes.steppe));
    angle += 2 * Math.PI / numberOfCamps;
  }
  return centerSpot;
}

var metallicFormation = [
  'Orebody',
  'Cavern',
  'Lore',
  'Pit',
  'Vein',
  'Reef'
];

var citrusFruits = [
  'Lemon',
  'Orange',
  'Grapefruit',
  'Clementine',
  'Tangerine',
  'Lime',
  'Kumquat',
  'Citron'
];

// Takes center, the tile {q,r} at the center of the map.
// Return a map from tilekeys "q:r" to {type, name}
// type: treasure type, see terrain.tileTypes
// name: treasure name.
function findTreasures(center) {
  // Black Death.
  var currentTreasure =
    new treasure.Treasure(terrain.tileTypes.blackdeath, 'Black Death');
  addTreasure(findMountain(center), currentTreasure);

  // Citrus.
  var citrusFruitStart = (citrusFruits.length * Math.random())|0;
  for (var i = 0; i < 2; i++) {
    var name = citrusFruits[(citrusFruitStart+i) % citrusFruits.length];
    currentTreasure =
      new treasure.Treasure(terrain.tileTypes.citrus, name);
    addTreasure(findMeadow(awayFrom(center, generateRandomDistance())),
        currentTreasure);
  }

  // Metal.
  var metalFormStart = (metallicFormation.length * Math.random())|0;
  for (var i = 0; i < 3; i++) {
    var name = metallicFormation[(metalFormStart+i) % metallicFormation.length];
    currentTreasure =
      new treasure.Treasure(terrain.tileTypes.metal, 'Metal ' + name);
    addTreasure(findMountain(awayFrom(center, generateRandomDistance())),
        currentTreasure);
  }
}

// Return a tile position away from the mid point `midSpot`
function awayFrom(midSpot, distance) {
  var angle = Math.random() * 2 * Math.PI;
  return {
    q: (midSpot.q + distance * Math.cos(angle))|0,
    r: (midSpot.r + distance * Math.sin(angle))|0,
  };
}

// Return a tileKey of the position of the black death.
function findMountain(oneSpot) {
  return terrain.keyFromTile(findNearestEmptyTerrain(oneSpot,
        terrain.tileTypes.mountain));
}
// Return a tileKey position of the nearest meadow.
function findMeadow(oneSpot) {
  return terrain.keyFromTile(findNearestEmptyTerrain(oneSpot,
        terrain.tileTypes.meadow));
}

// tile = {q,r}
// type: see terrain.tileTypes
function findNearestEmptyTerrain(tile, type) {
  var distance = 0;  // If needed, how far away from where we wanted to be.
  for (;;) {
    var spot = findNearestTerrain(tile, type);
    if (humanity(spot) !== undefined) {
      distance += generateRandomDistance();
      tile = awayFrom(tile, distance);
    } else { break; }
  }
  return spot;
}

// tile = {q,r}
// type: see terrain.tileTypes.
function findNearestTerrain(tile, type) {
  var k = 1;
  while (terrain(tile).type !== type) {
    // Take the bottom left tile.
    tile = terrain.neighborFromTile(tile, 4);
    // Go round.
    for (var i = 0; i < 6; i++) {
      for (var j = 0; j < k; j++) {
        tile = terrain.neighborFromTile(tile, i);
        if (terrain(tile).type === type) {
          return tile;
        }
      }
    }
    k++;
  }
  return tile;
}




// Chapter: Population and Resources.
//

// Return a list of population information for each camp.
function population() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = camps[i].population;
  }
  return list;
}

function getPlaces() { return places; }

function campNames() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = camps[i].name;
  }
  return list;
}

function getResources() {
  var list = new Array(camps.length);
  for (var i = 0; i < camps.length; i++) {
    list[i] = camps[i].resources;
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
module.exports.awayFrom = awayFrom;
module.exports.findMountain = findMountain;
module.exports.findMeadow = findMeadow;
module.exports.generateRandomDistance = generateRandomDistance;
module.exports.winners = winners;
module.exports.getPlaces = getPlaces;
module.exports.campNames = campNames;
module.exports.getResources = getResources;
