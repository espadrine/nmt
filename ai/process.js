var aiPrimitives = require('./primitives.js');
var Humanity = require('../humanity.js');

var campId;
var humanity = new Humanity();
var strategy;

function strategyCall(data) {
  // Set our camp ID.
  if (campId == null && data.humanityChange
      && data.humanityChange.camp !== undefined) {
    campId = data.humanityChange.camp;
  }

  // Update information about humanity.
  if (data.humanityChange) {
    humanity.patch(data.humanityChange);

  // Run the strategy for it.
  } else if (data.run) {
    if (strategy === undefined) {
      strategy = new aiPrimitives.Strategy(
        humanity.campFromId(campId), humanity);
    }
    try {
      process.send({ plans: strategy.runProject() });
    } catch(e) {
      // Reset.
      console.error(e.stack);
      process.exit(1);
    }
  }
}

process.on('message', strategyCall);

