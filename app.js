var camp = require('camp').start({ port: +process.argv[2] });
var game = require('./game');

game.start(camp);

