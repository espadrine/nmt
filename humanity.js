// Fake humanity.js, updated through diffs.

var Terrain = require('./terrain-gen.js');
var genName = require('./gen-name.js');
var treasure = require('./treasure.js');

var MAX_INT = 9007199254740992;

// Population management.
var homePerHouse = {
  residence: 2,
  skyscraper: 6
};

var universityPopulationLimit = 100;


function Humanity() {
  // Map from tileKeys to objects with the following keys:
  this.humanityData = {};
  // Map from tileKey to textual description of place.
  this.places = {};
  this.terrain = new Terrain(this);
  this.makeCamps();
}

Humanity.prototype = {
  terrain: null,
  // Tiles that are in use by a user / a bot.
  // Map from tileKey to camp values.
  lockedTiles: {},
  // Map from playerId to tileKey.
  lockedTileFromPlayerId: {},

  // Chapter: Updates.
  //

  // Map from tileKeys to objects with the following keys:
  // b: building;
  // h: number of humans;
  // c: camp (territory to which it belongs);
  // f: food (how much there is in the group);
  // o: manufactured goods owned;
  humanityData: {},
  // Map from tileKey to textual description of place.
  places: {},
  // {q,r} location of center.
  centerTile: null,
  data: function data() { return this.humanityData; },
  dirtyWorld: false,
  commoditiesChanged: false,

  setCenterTile: function setCenterTile(centerTile) {
    // {q,r} location of center.
    this.centerTile = centerTile;
    this.terrain.setCenterTile(this.centerTile);
  },

  makeDefault: function makeDefault() {
    return { b: null, h: 0, c: null, f: 0, o: 0 };
  },
  copy: function copy(tile) {
    if (tile == null) { return this.makeDefault(); }
    return { b:tile.b, h:tile.h, c:tile.c, f:tile.f, o:tile.o };
  },

  // Takes a tile = {q, r}, returns the humanity information for that tile.
  // (See above for humanity information.)
  tile: function tile(tile) {
    return this.humanityData[tile.q + ':' + tile.r];
  },

  // change = {tileKey: humanityTile}.
  change: function change(change) {
    for (var tileKey in change) {
      var tileChanged = change[tileKey];
      this.campChange(tileKey, this.humanityData[tileKey], tileChanged);
      if (tileChanged.b == null && tileChanged.h <= 0) {
        // There is nothing to remember here.
        delete this.humanityData[tileKey];
      } else {
        this.makeCoherentTile(tileChanged);
        this.humanityData[tileKey] = tileChanged;
      }
      this.dirtyWorld = true;
    }
  },

  // Set f and o when the tile doesn't contain humans.
  makeCoherentTile: function makeCoherentTile(tile) {
    if (tile.h <= 0) {
      tile.f = 0; tile.o = 0; tile.h = 0;
      if (tile.b === null ||
          tile.b === this.terrain.tileTypes.road ||
          tile.b === this.terrain.tileTypes.wall) {
        tile.c = null;
      }
    } else if (tile.c >= this.numberOfCamps) {
      for (var i = 0; i < (tile.c - this.numberOfCamps + 1); i++) {
        this.addCamp();
      }
    }
  },

  campChange: function campChange(tileKey, oldTile, newTile) {
    if (oldTile == null) { oldTile = this.makeDefault(); }
    // Nullify camps when necessary.
    this.makeCoherentTile(oldTile);
    this.makeCoherentTile(newTile);
    var oldCamp = this.campFromId(oldTile.c);
    var newCamp = this.campFromId(newTile.c);
    if (oldTile.c !== newTile.c) {
      // Changed ownership.
      if (oldCamp && oldTile.b != null) {
        // The old ones lost homes.
        oldCamp.loseHomes(tileKey, oldTile);
      }
      if (newCamp && newTile.b != null) {
        // The new ones won homes.
        newCamp.winHomes(tileKey, newTile);
      }
    } else if (newCamp) {
      // Same ownership.
      newCamp.loseHomes(tileKey, oldTile);
      newCamp.winHomes(tileKey, newTile);
    }
    if (oldCamp) { oldCamp.population -= oldTile.h; }
    if (newCamp) { newCamp.population += newTile.h; }
  },

  patch: function patch(change) {
    if (change.winners) {
    } else {
      if (change.camp !== undefined) {
        delete change.camp;
      }
      if (change.lockedTiles !== undefined) {
        this.lockedTiles = change.lockedTiles;
        delete change.lockedTiles;
      }
      if (change.resources !== undefined) {
        for (var i = 0; i < this.numberOfCamps; i++) {
          for (var resourceKey in change.resources[i]) {
            this.camps[i][resourceKey] = change.resources[i][resourceKey];
          }
        }
        delete change.resources;
      }
      if (change.commodities !== undefined) {
        // commodities: map camp id to map from commodity to number.
        for (var i = 0; i < this.numberOfCamps; i++) {
          for (var commodity in change.commodities[i]) {
            this.camps[i].commodities[commodity] =
              change.commodities[i][commodity];
          }
        }
        delete change.commodities;
      }
      if (change.population !== undefined) {
        for (var i = 0; i < this.numberOfCamps; i++) {
          this.camps[i].population = change.population[i];
        }
        delete change.population;
      }
      if (change.war !== undefined) {
        // War messages. ["q:r"]
        delete change.war;
      }
      if (change.surrender !== undefined) {
        // Surrender messages. ["q:r"]
        delete change.surrender;
      }
      if (change.artilleryFire !== undefined) {
        // Artillery Fire. {"q:r":["q:r"]}
        delete change.artilleryFire;
      }
      if (change.goto !== undefined) {
        // goto is the spawn tile.
        delete change.goto;
      }
      if (change.centerTile !== undefined) {
        // Set the places.
        this.setCenterTile(change.centerTile);
        delete change.centerTile;
      }
      if (change.places !== undefined) {
        // Set the places.
        this.places = change.places;
        var placesKeys = Object.keys(this.places);
        for (var i = 0; i < this.numberOfCamps; i++) {
          this.camps[i].spawn = this.terrain.tileFromKey(placesKeys[i]);
        }
        delete change.places;
      }
      if (change.campNames !== undefined) {
        // Set the spawn names.
        for (var i = 0; i < this.numberOfCamps; i++) {
          this.camps[i].name = change.campNames[i];
        }
        delete change.campNames;
      }
      this.change(change);
    }
  },


  // Chapter: Camp management.
  //

  camps: [],
  campFromId: function campFromId(id) {
    if (id != null) { return this.camps[id]; }
  },

  numberOfCamps: 3,
  // Make all the camps.
  makeCamps: function makeCamps() {
    this.camps = new Array(this.numberOfCamps);
    for (var i = 0; i < this.numberOfCamps; i++) {
      this.camps[i] = new Camp(i, this);
    }
    return this.camps;
  },

  addCamp: function() {
    var newCamp = new Camp(this.numberOfCamps, this);
    this.camps.push(newCamp);
    this.numberOfCamps++;
    return newCamp;
  },

  addOrReuseCamp: function(minPopulation) {
    for (var i = 0; i < this.numberOfCamps; i++) {
      if (this.camps[i].population < minPopulation) {
        return this.camps[i];
      }
    }
    return this.addCamp();
  },

  // List of camp IDs from most (population, …) to least.
  // criterion is a function that takes a camp, returns a number.
  winners: function winners(criterion) {
    var winners = new Array(this.numberOfCamps);
    for (var i = 0; i < this.numberOfCamps; i++) { winners[i] = i; }
    var self = this;
    winners.sort(function(a, b) {
      return criterion(self.camps[b]) - criterion(self.camps[a]);
    });
    return winners;
  },


  // Chapter: Prepare for Spawn.
  //

  // Modifies `camps`.
  // Returns {q,r} location of center of map.
  setSpawn: function setSpawn() {
    this.numberOfCamps = 3;
    this.spawnCampCursor = 0;
    this.camps = this.makeCamps();
    this.humanityData = {};    // reset humanity.
    this.places = {};
    this.centerTile = this.findSpawns();
    this.findTreasures(this.centerTile);
    return this.centerTile;
  },


  spawnCampCursor: 0,

  // spawn: {q,r} positioning the spawn point.
  // The camp is determined by spawnCampCursor.
  addSpawn: function addSpawn(spawn) {
    this.places[this.terrain.keyFromTile(spawn)]
        = this.camps[this.spawnCampCursor].name + ' Town';
    var change = {};
    this.camps[this.spawnCampCursor].spawn = spawn;
    var humanityTile = this.makeDefault();
    humanityTile.h = 3;  // Just enough to survive losing the initial town.
    humanityTile.f = 3;  // Just enough to have the starving message.
    humanityTile.b = this.terrain.tileTypes.residence;
    humanityTile.c = this.spawnCampCursor;
    change[spawn.q + ':' + spawn.r] = humanityTile;
    this.change(change);
    this.spawnCampCursor++;
  },

  // tileKey = "q:r", treasure = {type, name} (see treasure.js)
  // type: building type (see terrain.tileTypes),
  // name: treasure name, as a string.
  addTreasure: function addTreasure(tileKey, treasure) {
    var change = {};
    var humanityTile = this.makeDefault();
    humanityTile.b = treasure.type;
    change[tileKey] = humanityTile;
    this.places[tileKey] = treasure.name;
    this.change(change);
  },

  // type: one of `terrain.tileTypes`
  // oldpos: 'q:r'
  // pos: 'q:r'
  // updatedHumanity: object from 'q:r' to humanity data.
  // Elements get set if they were modified.
  moveTreasure: function moveTreasure(type, oldpos, pos, updatedHumanity, name){
    var settlements = {};
    settlements[pos] = this.humanityData[pos] || this.makeDefault();
    settlements[pos].b = type;
    updatedHumanity[pos] = this.copy(settlements[pos]);
    this.places[pos] = this.places[oldpos];
    this.places[oldpos] = genName(name);
    this.change(settlements);
  },

  generateRandomDistance: function generateRandomDistance() {
    return ((Math.random() * 100)|0) + 50;
  },

  // Adds the spawns to the map.
  // Returns the game's center, {q,r}.
  findSpawns: function findSpawns() {
    var distanceFromCenter = this.generateRandomDistance();
    var centerSpot = {
      q: (Math.random() * 10000)|0,
      r: (Math.random() * 10000)|0,
    };
    this.terrain.setCenterTile(centerSpot);
    var angle = 0;
    for (var i = 0; i < this.numberOfCamps; i++) {
      var oneSpot = {
        q: (centerSpot.q + distanceFromCenter * Math.cos(angle))|0,
        r: (centerSpot.r + distanceFromCenter * Math.sin(angle))|0,
      };
      this.addSpawn(
          this.findNearestTerrain(oneSpot, this.terrain.tileTypes.steppe));
      angle += 2 * Math.PI / this.numberOfCamps;
    }
    return centerSpot;
  },

  metallicFormation: ['Orebody', 'Cavern', 'Lode', 'Lore', 'Pit', 'Vein', 'Reef', 'Seam', 'Strata'],

  citrusFruits: ['Lemon', 'Orange', 'Grapefruit', 'Clementine', 'Tangerine', 'Lime', 'Kumquat', 'Citron'],

  // Takes center, the tile {q,r} at the center of the map.
  // Return a map from tilekeys "q:r" to {type, name}
  // type: treasure type, see terrain.tileTypes
  // name: treasure name.
  findTreasures: function findTreasures(center) {
    // Black Death.
    var currentTreasure =
      new treasure.Treasure(this.terrain.tileTypes.blackdeath, 'Black Death');
    this.addTreasure(this.findMountain(center), currentTreasure);

    // Citrus.
    var citrusFruitStart = (this.citrusFruits.length * Math.random())|0;
    for (var i = 0; i < 2; i++) {
      var name = this.citrusFruits[
          (citrusFruitStart+i) % this.citrusFruits.length];
      currentTreasure =
        new treasure.Treasure(this.terrain.tileTypes.citrus, name);
      this.addTreasure(this.findMeadow(
          this.awayFrom(center, this.generateRandomDistance())),
          currentTreasure);
    }

    // Metal.
    var metalFormStart = (this.metallicFormation.length * Math.random())|0;
    for (var i = 0; i < 3; i++) {
      var name = this.metallicFormation[(metalFormStart+i)
          % this.metallicFormation.length];
      currentTreasure =
        new treasure.Treasure(this.terrain.tileTypes.metal, 'Metal ' + name);
      this.addTreasure(this.findMountain(
          this.awayFrom(center, this.generateRandomDistance())),
          currentTreasure);
    }
  },

  // Return a tile position away from the mid point `midSpot`
  awayFrom: function awayFrom(midSpot, distance) {
    var angle = Math.random() * 2 * Math.PI;
    return {
      q: (midSpot.q + distance * Math.cos(angle))|0,
      r: (midSpot.r + distance * Math.sin(angle))|0,
    };
  },

  // Return a tileKey of the position of the black death.
  findMountain: function findMountain(oneSpot) {
    return this.terrain.keyFromTile(this.findNearestEmptyTerrain(oneSpot,
          this.terrain.tileTypes.mountain));
  },
  // Return a tileKey position of the nearest meadow.
  findMeadow: function findMeadow(oneSpot) {
    return this.terrain.keyFromTile(this.findNearestEmptyTerrain(oneSpot,
          this.terrain.tileTypes.meadow));
  },

  // tile = {q,r}
  // type: see terrain.tileTypes
  findNearestEmptyTerrain: function findNearestEmptyTerrain(tile, type) {
    var distance = 0;  // If needed, how far away from where we wanted to be.
    for (;;) {
      var spot = this.findNearestTerrain(tile, type);
      if (this.tile(spot) !== undefined) {
        distance += this.generateRandomDistance();
        tile = this.awayFrom(tile, distance);
      } else { break; }
    }
    return spot;
  },

  // tile = {q,r}
  // type: see terrain.tileTypes.
  findNearestTerrain: function findNearestTerrain(tile, type) {
    var self = this;
    return this.findNearest(tile, function(tile) {
      return self.terrain.tile(tile).type === type;
    });
  },

  // tile = {q,r}
  // valid = function(tile = {q,r})
  // limit: number of tiles away from `tile` after which we stop.
  // Returns the first tile which is valid.
  findNearest: function findNearest(tile, valid, limit) {
    if (limit == null) { limit = (MAX_INT - 1); }
    if (limit === 0 && valid(tile)) { return tile; }
    var k = 1;
    while (!valid(tile) && k <= limit) {
      // Take the bottom left tile.
      tile = this.terrain.neighborFromTile(tile, 4);
      // Go round.
      for (var i = 0; i < 6; i++) {
        for (var j = 0; j < k; j++) {
          tile = this.terrain.neighborFromTile(tile, i);
          if (valid(tile)) { return tile; }
        }
      }
      k++;
    }
    if (k > limit) { return null; }
    return tile;
  },

  // Take a function from (humanityTile, tileKey) to a truth value.
  // Returns the first humanityTile for which this function returns true.
  // Returns null if none is found.
  tileWith: function tileWith(valid) {
    for (var tileKey in this.humanityData) {
      var humanityTile = this.humanityData[tileKey];
      if (valid(humanityTile, tileKey)) {
        return this.terrain.tileFromKey(tileKey);
      }
    }
  },


  // Chapter: Population and Resources.
  //

  // Return a list of population information for each camp.
  population: function population() {
    var list = new Array(this.camps.length);
    for (var i = 0; i < this.camps.length; i++) {
      list[i] = this.camps[i].population;
    }
    return list;
  },

  // Map from tileKey to textual description of place.
  getPlaces: function getPlaces() { return this.places; },
  getCenterTile: function getCenterTile() { return this.centerTile; },

  campNames: function campNames() {
    var list = new Array(this.camps.length);
    for (var i = 0; i < this.camps.length; i++) {
      list[i] = this.camps[i].name;
    }
    return list;
  },

  getResources: function getResources() {
    var list = new Array(this.camps.length);
    for (var i = 0; i < this.camps.length; i++) {
      list[i] = this.camps[i].resources;
    }
    return list;
  },

  getUsedResources: function getUsedResources() {
    var list = new Array(this.camps.length);
    for (var i = 0; i < this.camps.length; i++) {
      list[i] = this.camps[i].usedResources;
    }
    return list;
  },

  getCommodities: function getCommodities() {
    var list = new Array(this.camps.length);
    for (var i = 0; i < this.camps.length; i++) {
      list[i] = this.camps[i].commodities;
    }
    return list;
  },

  getPopulationLimits: function getPopulationLimits() {
    var list = new Array(this.camps.length);
    for (var i = 0; i < this.camps.length; i++) {
      list[i] = this.camps[i].populationLimit;
    }
    return list;
  },

  homePerHouse: homePerHouse,
  universityPopulationLimit: universityPopulationLimit,

};


var maxFarmImprovements = 2;
var maxFuelImprovements = 4;
var maxIndustryImprovements = 2;
var maxMineImprovements = 8;
var maxMarketValue = 50;
var wealthPerMarketDist = 8;


// Camps.


function Camp(id, humanity) {
  this.id = id;
  this.humanity = humanity;
  this.terrain = humanity.terrain;
  this.name = genName();
  this.populationCap = 0;   // Max. number of people, based on number of houses.
  this.population = 0;      // Number of people.
  this.populationLimit = universityPopulationLimit;
  this.residence = {};      // Maps from tileKey to number of homes.
  this.skyscraper = {};
  this.wealth = 0;
  this.usedWealth = 0;      // Never decreases.
  this.commodities = {};    // Map from commodity to number.
  this.markets = {};        // Map from market tileKey to distance to closest.
  this.fuel = 1;            // Number of fuel spots occupied.
  this.usedFuel = 0;        // Never decreases.
  this.metal = 0;           // Number of metal occupied.
  this.usedMetal = 0;       // Never decreases.
  this.health = 1;
  this.usedHealth = 0;      // Never decreases.
  this.spaceMissions = 0;
  this.stockExchanges = 0;
  this.monuments = 0;
  this.acquiredUniversitiesMap = {};// From tileKey to number of conquests.
  this.spawn = { q:0, r:0 };// Starting spot.
  this.nActions = 0;        // Number of actions.
}
Camp.prototype = {
  name: 'Default',
  populationCap: 0,   // Max. number of people, based on number of houses.
  population: 0,      // Number of people.
  populationLimit: universityPopulationLimit,
  residence: {},      // Maps from tileKey to number of homes.
  skyscraper: {},
  wealth: 0,
  usedWealth: 0,      // Never decreases.
  commodities: {},    // Map from commodity to number.
  markets: {},        // Map from market tileKey to distance to closest.
  fuel: 1,            // Number of fuel spots occupied.
  usedFuel: 0,        // Never decreases.
  metal: 0,           // Number of metal spots occupied.
  usedMetal: 0,       // Never decreases.
  health: 1,
  usedHealth: 0,      // Never decreases.
  acquiredUniversitiesMap: {},// From tileKey to number of conquests.
  spawn: { q:0, r:0 },// Starting spot.
  nActions: 0,        // Number of actions.

  loseHomes: function loseHomes(tileKey, oldTile) {
    var b = oldTile.b;
    this.populationCap -=
      b === this.terrain.tileTypes.residence? homePerHouse.residence:
      b === this.terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    if (b === this.terrain.tileTypes.residence) {
      delete this.residence[tileKey];
    } else if (b === this.terrain.tileTypes.skyscraper) {
      delete this.skyscraper[tileKey];
    } else if (b === this.terrain.tileTypes.farm) {
      this.wealth -= 1 + Math.min(oldTile.h, maxFarmImprovements);
    } else if (b === this.terrain.tileTypes.lumber) {
      var improvements = 1 + Math.min(oldTile.h, maxFuelImprovements);
      this.fuel -= improvements;
      if (this.terrain.tile(this.terrain.tileFromKey(tileKey)).type
          === this.terrain.tileTypes.taiga) {
        this.fuel -= improvements;
      }
    } else if (b === this.terrain.tileTypes.mine) {
      this.metal -= 1 + Math.min(oldTile.h, maxMineImprovements);
    } else if (b === this.terrain.tileTypes.industry) {
      this.metal -= 1 + Math.min(oldTile.h, maxIndustryImprovements);
    } else if (b === this.terrain.tileTypes.university) {
      this.populationLimit -= universityPopulationLimit;
      this.health -= this.acquiredUniversitiesMap[tileKey] - 1;
    } else if (b === this.terrain.tileTypes.field) {
      var commodity = this.terrain.commodity(this.terrain.tileFromKey(tileKey));
      this.updateCommodityWealth(commodity, -1);
    } else if (b === this.terrain.tileTypes.market) {
      // We lose the distance to the nearest market.
      var curTile = this.terrain.tileFromKey(tileKey);
      for (var i = 0; i < this.humanity.numberOfCamps; i++) {
        var camp = this.humanity.camps[i];
        for (var marketTile in camp.markets) {
          var otherTile = this.terrain.tileFromKey(marketTile);
          var dist = this.terrain.distanceBetweenTiles(curTile, otherTile);
          // If the other market was connected to us, we find a new connection.
          if ((camp.markets[marketTile] - dist < 1) &&
            (marketTile === tileKey)) {
            camp.wealth -= (dist / wealthPerMarketDist) >>> 0;
            var newConnDist = this.closestMarket(otherTile);
            if (newConnDist < Infinity) {
              camp.wealth += (newConnDist / wealthPerMarketDist) >>> 0;
              camp.markets[marketTile] = newConnDist;
            }
          }
        }
      }
      this.wealth -= (this.markets[tileKey] / wealthPerMarketDist) >>> 0;
      delete this.markets[tileKey];
    } else if (b === this.terrain.tileTypes['space mission']) {
      this.spaceMissions--;
    } else if (b === this.terrain.tileTypes['stock exchange']) {
      this.stockExchanges--;
    } else if (b === this.terrain.tileTypes.monument) {
      this.monuments--;
    }
  },
  winHomes: function winHomes(tileKey, newTile) {
    var b = newTile.b;
    var homes =
      b === this.terrain.tileTypes.residence? homePerHouse.residence:
      b === this.terrain.tileTypes.skyscraper? homePerHouse.skyscraper:
      0;
    this.populationCap += homes;
    if (b === this.terrain.tileTypes.residence) {
      this.residence[tileKey] = homes;
    } else if (b === this.terrain.tileTypes.skyscraper) {
      this.skyscraper[tileKey] = homes;
    } else if (b === this.terrain.tileTypes.farm) {
      this.wealth += 1 + Math.min(newTile.h, maxFarmImprovements);
    } else if (b === this.terrain.tileTypes.lumber) {
      var improvements = 1 + Math.min(newTile.h, maxFuelImprovements);
      this.fuel += improvements;
      if (this.terrain.tile(this.terrain.tileFromKey(tileKey)).type
          === this.terrain.tileTypes.taiga) {
        this.fuel += improvements;
      }
    } else if (b === this.terrain.tileTypes.mine) {
      this.metal += 1 + Math.min(newTile.h, maxMineImprovements);
    } else if (b === this.terrain.tileTypes.industry) {
      this.metal += 1 + Math.min(newTile.h, maxIndustryImprovements);
    } else if (b === this.terrain.tileTypes.university) {
      this.populationLimit += universityPopulationLimit;
      if (!this.acquiredUniversitiesMap[tileKey]) {
        this.acquiredUniversitiesMap[tileKey] = 1;
      }
      this.health += this.acquiredUniversitiesMap[tileKey];
    } else if (b === this.terrain.tileTypes.field) {
      var commodity = this.terrain.commodity(this.terrain.tileFromKey(tileKey));
      this.updateCommodityWealth(commodity, 1);
    } else if (b === this.terrain.tileTypes.market) {
      // We win the distance to the nearest market.
      var curTile = this.terrain.tileFromKey(tileKey);
      for (var i = 0; i < this.humanity.numberOfCamps; i++) {
        var camp = this.humanity.camps[i];
        for (var marketTile in camp.markets) {
          var otherTile = this.terrain.tileFromKey(marketTile);
          var connDist = camp.markets[marketTile];
          var dist = this.terrain.distanceBetweenTiles(curTile, otherTile);
          // If the other market was connected to something further than us,
          // they reconnect to us instead.
          if (connDist > dist) {
            camp.wealth -= (connDist / wealthPerMarketDist) >>> 0;
            camp.wealth += (dist / wealthPerMarketDist) >>> 0;
            camp.markets[marketTile] = dist;
          }
        }
      }
      var dist = this.closestMarket(curTile);
      if (dist < Infinity) {
        this.wealth += (dist / wealthPerMarketDist) >>> 0;
      }
      this.markets[tileKey] = dist;
    } else if (b === this.terrain.tileTypes['space mission']) {
      this.spaceMissions++;
    } else if (b === this.terrain.tileTypes['stock exchange']) {
      this.stockExchanges++;
    } else if (b === this.terrain.tileTypes.monument) {
      this.monuments++;
    }
  },
  updateCommodityWealth: function(commodity, delta) {
    var oldTotal = 0;
    for (var i = 0; i < this.humanity.numberOfCamps; i++) {
      var camp = this.humanity.camps[i];
      oldTotal += camp.commodities[commodity] || 0;
    }
    var total = oldTotal + delta;
    for (var i = 0; i < this.humanity.numberOfCamps; i++) {
      var camp = this.humanity.camps[i];
      var oldFields = camp.commodities[commodity] || 0;
      var fields = oldFields;
      // wealth = 50 x (market share = fields/total) x (2 - 1/fields)
      // wealth = 50 x (2 x fields - 1) / total
      if (oldFields === 0) {
        var oldMarketShare = 0;
      } else {
        var oldMarketShare = ((oldFields << 1) - 1) / oldTotal;
      }
      if (this.id === i) {
        // Our camp has a change.
        fields += delta;
        camp.commodities[commodity] = fields;
      }
      if (fields === 0) {
        var marketShare = 0;
      } else {
        var marketShare = ((fields << 1) - 1) / total;
      }
      camp.wealth += ((marketShare - oldMarketShare) * maxMarketValue)|0;
    }
    this.humanity.commoditiesChanged = true;
  },
  closestMarket: function(curTile) {
    var dist = Infinity;
    var closest;
    for (var i = 0; i < this.humanity.numberOfCamps; i++) {
      var camp = this.humanity.camps[i];
      for (var marketTile in camp.markets) {
        var otherTile = this.terrain.tileFromKey(marketTile);
        var ndist = this.terrain.distanceBetweenTiles(curTile, otherTile);
        if (ndist < dist) {
          dist = ndist;
          closest = marketTile;
        }
      }
    }
    return dist;
  },
  get resources () {
    return {
      wealth: this.wealth,
      usedWealth: this.usedWealth,
      fuel: this.fuel,
      usedFuel: this.usedFuel,
      metal: this.metal,
      usedMetal: this.usedMetal,
      health: this.health,
      usedHealth: this.usedHealth,
      acquiredUniversitiesMap: this.acquiredUniversitiesMap,
    };
  },
  get usedResources () {
    return {
      usedWealth: this.usedWealth,
      usedFuel: this.usedFuel,
      usedMetal: this.usedMetal,
      usedHealth: this.usedHealth,
      acquiredUniversitiesMap: this.acquiredUniversitiesMap,
    };
  },
  get leftFarm () { return this.wealth - this.usedWealth; },
  get leftFuel () { return this.fuel - this.usedFuel; },
  get leftMetal () { return this.metal - this.usedMetal; },
  get leftHealth () { return this.health - this.usedHealth; },
  // Number of universities won from enemies.
  get acquiredUniversities () {
    return Object.keys(this.acquiredUniversitiesMap).length;
  },
  get tiles () {
    var ourTiles = [];
    for (var tileKey in this.humanity.humanityData) {
      var humanityTile = this.humanity.humanityData[tileKey];
      if (humanityTile.c === this.id) {
        // This is our nationality.
        ourTiles.push(this.terrain.tileFromKey(tileKey));
      }
    }
    return ourTiles;
  },
  // Take a function from (humanityTile, tileKey) to a truth value.
  // Returns our tiles for which this function returns true.
  tilesWith: function tilesWith(valid) {
    var ourTiles = [];
    for (var tileKey in this.humanity.humanityData) {
      var humanityTile = this.humanity.humanityData[tileKey];
      if (humanityTile.c === this.id
        && valid(humanityTile, tileKey)) {
        // This is our nationality.
        ourTiles.push(this.terrain.tileFromKey(tileKey));
      }
    }
    return ourTiles;
  },
  get builtTiles () {
    return this.tilesWith(function(humanityTile) {
      return humanityTile.b != null;
    });
  },
  get inhabitedTiles () {
    return this.tilesWith(function(humanityTile) {
      return humanityTile.h > 0;
    });
  },
};


module.exports = Humanity;
