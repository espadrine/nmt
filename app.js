const camp = require('camp').start({ port: +process.env.PORT });
const game = require('./game');

game.start(camp);

// Mirror on /not-my-territory/*.
camp.path('/not-my-territory/*', (req, res) =>
  res.redirect(req.path.slice(17)));
