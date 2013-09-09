var terrain = require('./terrain.js');
var humanity = require('./humanity');
var genName = require('./gen-name.js');

// Example data…

humanity.change({
  '24:15': { b:null, h:5, c:1, f:20, o: 6 },
  '-1:-1': { b:null, h:2, c:2, f:20, o: 0 },
  '0:0':   { b:terrain.tileTypes.farm, h:3, c:1, f:20, o: 1 },
  '1:5':   { b:terrain.tileTypes.residence, h:1, c:2, f:20, o: 0 },
  '2:6':   { b:terrain.tileTypes.residence, h:1, c:1, f:20, o: 0 },
  '8:5':   { b:terrain.tileTypes.residence, h:2, c:1, f:20, o: 0 },
  '3:5':   { b:terrain.tileTypes.skyscraper, h:0, c:2, f:20, o: 0 },
  '4:5':   { b:terrain.tileTypes.factory, h:0, c:2, f:20, o: 0 },
  '25:17': { b:terrain.tileTypes.dock, h:0, c:2, f:20, o: 0 },
  '5:3':   { b:terrain.tileTypes.airland, h:0, c:2, f:20, o: 0 },
  '6:4':   { b:terrain.tileTypes.airland, h:0, c:2, f:20, o: 0 },
  '5:4':   { b:terrain.tileTypes.airland, h:0, c:2, f:20, o: 0 },
  '6:3':   { b:terrain.tileTypes.airport, h:0, c:2, f:20, o: 0 },
  '5:10':  { b:terrain.tileTypes.gunsmith, h:0, c:2, f:20, o: 0 },
  '4:6':   { b:terrain.tileTypes.road, h:0, c:2, f:20, o: 0 },
  '5:5':   { b:terrain.tileTypes.road, h:0, c:2, f:20, o: 0 },
  '6:5':   { b:terrain.tileTypes.road, h:0, c:2, f:20, o: 0 },
  '7:5':   { b:terrain.tileTypes.road, h:0, c:2, f:20, o: 0 },
  '8:8':   { b:terrain.tileTypes.wall, h:0, c:2, f:20, o: 0 },
  '8:9':   { b:terrain.tileTypes.wall, h:0, c:2, f:20, o: 0 },
  '9:7':   { b:terrain.tileTypes.wall, h:0, c:2, f:20, o: 0 }
});


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
    // FIXME: add war. Because hippies can't exist without war.
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
    humanityTo.h += plan.h;
    humanityFrom.h -= plan.h;
    // Camp
    humanityTo.c = humanityFrom.c;
    if (emptyingOrigin) { humanityFrom.c = 0; }
    // Food.
    humanityTo.f += humanityFrom.f - (byPlane? 2: 1);
    if (emptyingOrigin) { humanityFrom.f = 0; }
    // Ownership is the intersection of what each group owns.
    if (!emptyTarget) { humanityTo.o &= humanityFrom.o; }
    else { humanityTo.o = humanityFrom.o; }
    if (emptyingOrigin) { humanityFrom.o = 0; }

    // Collecting from the land.
    if (emptyingOrigin) { loseBuilding(humanityFrom.c, humanityFrom.b); }
    if (humanityTo.b === terrain.tileTypes.farm) {
      humanityTo.f = 20;
      if (emptyTarget) { winBuilding(humanityTo.c, humanityTo.b); }
    } else if (humanityTo.b === terrain.tileTypes.residence) {
      if (emptyTarget) { winBuilding(humanityTo.c, humanityTo.b); }
    } else if (humanityTo.b === terrain.tileTypes.skyscraper) {
      if (emptyTarget) { winBuilding(humanityTo.c, humanityTo.b); }
    } else if (humanityTo.b === terrain.tileTypes.factory) {
      humanityTo.o |= terrain.manufacture.car;
    } else if (humanityTo.b === terrain.tileTypes.dock) {
      humanityTo.o |= terrain.manufacture.boat;
    } else if (humanityTo.b === terrain.tileTypes.airport) {
      humanityTo.o |= terrain.manufacture.plane;
    } else if (humanityTo.b === terrain.tileTypes.gunsmith) {
      humanityTo.o |= terrain.manufacture.gun;
    }

    console.log('After:');
    console.log('humanityFrom =', humanityFrom);
    console.log('humanityTo =', humanityTo);
    updatedHumanity[plan.at] = humanityFrom;
    updatedHumanity[plan.to] = humanityTo;

  } else if (plan.do === terrain.planTypes.build) {
    buildConstruction(humanityFrom, plan.b);
    updatedHumanity[plan.at] = humanityFrom;
  } else if (plan.do === terrain.planTypes.destroy) {
    destroyConstruction(humanityFrom);
    updatedHumanity[plan.at] = humanityFrom;
  }
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
  winBuilding(humanityTile.c, b);
}

function destroyConstruction(humanityTile) {
  // FIXME
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
