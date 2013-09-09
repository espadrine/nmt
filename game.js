var terrain = require('./terrain.js');
var humanity = require('./humanity');

humanity.start(terrain);

// Send and receive data from players.

function actWSStart(socket) {
  console.log('A player entered the game.');
  socket.on('message', actWSRecv);
  socket.send(JSON.stringify(humanity.data()));
}

function actWSRecv(data) {
  var plan;
  try {
    plan = JSON.parse(data);
  } catch(e) { return; }
  console.log('Proposed plan: ' + data);

  if (plan.do !== undefined && (typeof plan.at === 'string')) {
    if ((typeof plan.to === 'string') && (typeof plan.h === 'number')
     && plan.do === terrain.planTypes.move) {
      // Is the move valid?
      if (terrain.travel(terrain.tileFromKey(plan.at),
                         terrain.tileFromKey(plan.to)).length > 1
       && (plan.h > 0 || plan.h <= terrain.tileFromKey(plan.to).h)) {
        terrain.addPlan(plan);
        console.log('… move accepted');
      } else { console.log('… move denied'); }
    } else if ((typeof plan.b === 'number')
            && plan.do === terrain.planTypes.build) {
      // Is the move valid?
      if (terrain.validConstruction(plan.b, terrain.tileFromKey(plan.at))) {
        terrain.addPlan(plan);
        console.log('… construction accepted');
      } else { console.log('… construction denied'); }
    }
  }
}

var updatedHumanity = {};

function applyPlan(plan) {
  var humanityFrom = humanity(terrain.tileFromKey(plan.at));
  if (plan.do === terrain.planTypes.move) {
    console.log('Plan: moving people from', plan.at, 'to', plan.to);
    var humanityTo = humanity(terrain.tileFromKey(plan.to));
    if (humanityTo === undefined) {
      humanityTo = humanity.makeDefault();
    }

    console.log('Before:');
    console.log('humanityFrom =', humanityFrom);
    console.log('humanityTo =', humanityTo);
    var byPlane = (humanityFrom.o & terrain.manufacture.plane) !== 0;
    var emptyTarget = humanityTo.h === 0;
    var emptyingOrigin = (humanityFrom.h - plan.h) === 0;
    // Human movement.
    if (!emptyTarget && humanityTo.c !== humanityFrom.c) {
      // They're not us. This means war. Because culture difference.
      if (humanityTo.h >= plan.h) {
        // We lose.
        if (humanityTo.h === plan.h) {
          removeHumanStuff(humanityFrom);
          removeHumanStuff(humanityTo);
        } else if (emptyingOrigin) {
          removeHumanStuff(humanityFrom);
        } else {
          humanityTo.h -= plan.h;
          humanityFrom.h -= plan.h;
        }
        updatedHumanity[plan.at] = humanityFrom;
        updatedHumanity[plan.to] = humanityTo;
        return;
      } else {
        // We win.
        loseBuilding(humanityTo.c, humanityTo.b);
        humanityTo.h = plan.h - humanityTo.h;
        emptyTarget = true;
      }
    } else {
      // Joining forces.
      humanityTo.h += plan.h;
      humanityFrom.h -= plan.h;
    }
    // Camp
    humanityTo.c = humanityFrom.c;
    // Food.
    humanityTo.f += humanityFrom.f - (byPlane? 2: 1);
    if (emptyingOrigin) { humanityFrom.f = 0; }
    // Ownership is the intersection of what each group owns.
    if (!emptyTarget) { humanityTo.o &= humanityFrom.o; }
    else { humanityTo.o = humanityFrom.o; }
    if (emptyingOrigin) { humanityFrom.o = 0; }

    // Collecting from the land.
    if (emptyingOrigin) { removeHumanStuff(humanityFrom); }
    collectFromTile(humanityTo, emptyTarget);

    console.log('After:');
    console.log('humanityFrom =', humanityFrom);
    console.log('humanityTo =', humanityTo);
    updatedHumanity[plan.at] = humanityFrom;
    updatedHumanity[plan.to] = humanityTo;

  } else if (plan.do === terrain.planTypes.build) {
    buildConstruction(humanityFrom, plan.b);
    updatedHumanity[plan.at] = humanityFrom;
    collectFromTile(humanityFrom, true);
  } else if (plan.do === terrain.planTypes.destroy) {
    destroyConstruction(humanityFrom);
    updatedHumanity[plan.at] = humanityFrom;
  }
}

// Collect from the humanity tile. If `addBuilding` is truthy,
// we add the building as a resource for a camp.
function collectFromTile(humanityTile, addBuilding) {
  if (humanityTile.b === terrain.tileTypes.farm) {
    humanityTile.f = 20;
    if (addBuilding) { winBuilding(humanityTile.c, humanityTile.b); }
  } else if (humanityTile.b === terrain.tileTypes.residence) {
    if (addBuilding) { winBuilding(humanityTile.c, humanityTile.b); }
  } else if (humanityTile.b === terrain.tileTypes.skyscraper) {
    if (addBuilding) { winBuilding(humanityTile.c, humanityTile.b); }
  } else if (humanityTile.b === terrain.tileTypes.factory) {
    humanityTile.o |= terrain.manufacture.car;
  } else if (humanityTile.b === terrain.tileTypes.dock) {
    humanityTile.o |= terrain.manufacture.boat;
  } else if (humanityTile.b === terrain.tileTypes.airport) {
    humanityTile.o |= terrain.manufacture.plane;
  } else if (humanityTile.b === terrain.tileTypes.gunsmith) {
    humanityTile.o |= terrain.manufacture.gun;
  }
}

function removeHumanStuff(human) {
  if (human.b) {
    loseBuilding(human.c, human.b);
  }
  human.h = 0;
  human.c = null;
  human.f = 0;
}

function winBuilding(camp, b) {
  humanity.campFromId(camp).populationCap +=
    b === terrain.tileTypes.farm? humanity.homePerHouse.farm:
    b === terrain.tileTypes.residence? humanity.homePerHouse.residence:
    b === terrain.tileTypes.skyscraper? humanity.homePerHouse.skyscraper:
    0;
}
function loseBuilding(camp, b) {
  humanity.campFromId(camp).populationCap -=
    b === terrain.tileTypes.farm? humanity.homePerHouse.farm:
    b === terrain.tileTypes.residence? humanity.homePerHouse.residence:
    b === terrain.tileTypes.skyscraper? humanity.homePerHouse.skyscraper:
    0;
}

function buildConstruction(humanityTile, b) {
  destroyConstruction(humanityTile);
  humanityTile.b = b;
}

function destroyConstruction(humanityTile) {
  loseBuilding(humanityTile.c, humanityTile.b);
  humanityTile.b = null;
}


// Game turn.

var gameTurnTime = 100;     // Every 100ms.

function gameTurn() {
  // Run all accepted plans.
  terrain.eachPlan(applyPlan);
  // Send new humanity to all.
  if (Object.keys(updatedHumanity).length > 0) {
    humanity.change(updatedHumanity);
    actChannel.clients.forEach(function (client) {
      client.send(JSON.stringify(updatedHumanity));
    });
  }
  terrain.clearPlans();
  updatedHumanity = {};
  setTimeout(gameTurn, gameTurnTime);
}


// Starting the game.

var actChannel;
function start(camp) {
  actChannel = camp.ws('act', actWSStart);
  setTimeout(gameTurn, gameTurnTime);
}


exports.start = start;
