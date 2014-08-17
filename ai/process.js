var aiPrimitives = require('./primitives.js');
var Humanity = require('../humanity.js');

var campId;
var humanity = new Humanity();
var humanityUpdated = true;
var strategy;

function strategyCall(data) {

  // Update information about humanity.
  if (data.humanityChange) {
    var humanityChange = JSON.parse(data.humanityChange);
    // Set our camp ID.
    if (campId == null && humanityChange.camp !== undefined) {
      campId = humanityChange.camp;
    }
    humanity.patch(humanityChange);
    humanityUpdated = true;

  // Run the strategy for it.
  } else if (data.run) {
    if (strategy === undefined) {
      strategy = new aiPrimitives.Strategy(
        humanity.campFromId(campId), humanity);
    }
    // Only act when the strategy's vision of the world is up-to-date.
    if (humanityUpdated === false) { return; }
    try {
      process.send({ plans: strategy.runProject() });
      humanityUpdated = false;
    } catch(e) {
      // Reset.
      console.error(e.stack);
      process.exit(1);
    }
  }
}

process.on('message', strategyCall);

