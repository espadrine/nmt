// Manage the world save and all humanity.

var fs = require('fs');
var Humanity = require('./humanity.js');

function World(worldFile) {
  this.humanity = new Humanity();
  // FIXME: create an instance of terrain.
  this.terrain = this.humanity.terrain;
  this.worldFile = worldFile;

  try {
    var world = require(this.worldFile);
    this.humanity.patch(world);
  } catch(e) {
    this.humanity.setSpawn();
  }
  // Update periodically.
  var periodicity = 10000;  // Every 10s.
  setInterval(this.saveWorld.bind(this), periodicity);
}

World.prototype = {
  humanity: null,
  terrain: null,
  worldFile: 'world.json',

  saveWorld: function saveWorld() {
    // Like a hero.
    if (this.humanity.dirtyWorld) {
      var world = {};
      var humanityData = this.humanity.humanityData;
      for (var tileKey in humanityData) {
        world[tileKey] = humanityData[tileKey];
      }
      world.places = this.humanity.places;
      world.centerTile = this.humanity.centerTile;
      world.campNames = this.humanity.campNames();
      world.resources = this.humanity.getUsedResources();
      fs.writeFile(this.worldFile, JSON.stringify(world), function() {});
      this.humanity.dirtyWorld = false;
    }
  },
};

module.exports = World;
