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

  if (plan.do === terrain.planTypes.move) {
    // Is the move valid?
    if (terrain.travel(terrain.tileFromKey(plan.at),
                       terrain.tileFromKey(plan.to)).length > 0) {
      terrain.addPlan(plan);
      console.log('…plan accepted');
    } else { console.log('…plan denied'); }
  }
}

var updatedHumanity = {};

function applyPlan(plan) {
  if (plan.do === terrain.planTypes.move) {
    console.log('Plan: moving people from', plan.at, 'to', plan.to);
    // FIXME: use plan.h to pick the number of persons moving over.
    var humanityFrom = humanity(terrain.tileFromKey(plan.at));
    var humanityTo = humanity(terrain.tileFromKey(plan.to));
    if (humanityTo === undefined) {
      humanityTo = humanity.makeDefault();
    }

    console.log('Before:');
    console.log('humanityFrom', humanityFrom);
    console.log('humanityTo', humanityTo);
    var mergeGroups = humanityTo.h > 0;
    var byPlane = (humanityFrom.o & terrain.manufacture.plane) !== 0;
    // Human movement.
    humanityTo.h += humanityFrom.h;
    humanityFrom.h = 0;
    // Camp
    humanityTo.c = humanityFrom.c;
    if (humanityFrom.h <= 0) { humanityFrom.c = 0; }
    // Food.
    humanityTo.f += humanityFrom.f - (byPlane? 2: 1);
    humanityFrom.f = 0;
    // Ownership is the intersection of what each group owns.
    if (mergeGroups) { humanityTo.o &= humanityFrom.o; }
    else { humanityTo.o = humanityFrom.o; }
    humanityFrom.o = 0;
    console.log('After:');
    console.log('humanityFrom', humanityFrom);
    console.log('humanityTo', humanityTo);
    updatedHumanity[plan.at] = humanityFrom;
    updatedHumanity[plan.to] = humanityTo;
  }
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
