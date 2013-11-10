// Thaddée Tyl. AGPLv3.

function Treasure (type, name) {
  this.type = type;
  this.name = name;
}

// updatedHumanity is a map from tileKey = "q:r" to humanityTile.
// camp is the camp that caused the black death
// (and is therefore not affected).
function blackDeath (terrain, humanity, updatedHumanity, campid) {
  for (var i = 0; i < humanity.numberOfCamps; i++) {
    if (i === campid) { continue; }   // Don't modify the originator camp.
    var camp = humanity.campFromId(i);
    // We remove half as many homes as there are population members.
    var population = camp.population;
    var targetPopulation = population / 2;
    for (var tileKey in camp.skyscraper) {
      if (population <= targetPopulation) { break; }
      var humanityTile = humanity.copy(humanity(terrain.tileFromKey(tileKey)));
      population -= humanityTile.h;
      humanityTile.h = 0;
      updatedHumanity[tileKey] = humanityTile;
    }
    for (var tileKey in camp.residence) {
      if (population <= targetPopulation) { break; }
      var humanityTile = humanity.copy(humanity(terrain.tileFromKey(tileKey)));
      population -= humanityTile.h;
      humanityTile.h = 0;
      updatedHumanity[tileKey] = humanityTile;
    }
    for (var tileKey in camp.farm) {
      if (population <= targetPopulation) { break; }
      var humanityTile = humanity.copy(humanity(terrain.tileFromKey(tileKey)));
      population -= humanityTile.h;
      humanityTile.h = 0;
      updatedHumanity[tileKey] = humanityTile;
    }
  }
}

module.exports.Treasure = Treasure;
module.exports.blackDeath = blackDeath;
