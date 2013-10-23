var camp = require('camp').start({ port: +process.argv[2] });
var game = require('./game');

game.start(camp);

// Mirror on /not-my-territory/*.
camp.route(/^\/not-my-territory(\/.*)$/, function (query, match, end) {
  if (match[1].charCodeAt(match[1].length-1) === 47) {
    match[1] += 'index.html';   // Directory index.
  }
  end(null, { template: match[1] });
});

