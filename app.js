var fleau = require('fleau');
var camp = require('camp').start({ port: +process.argv[2] });
var ajax = camp.ajax;
var terrain = require('./terrain.js');
var genName = require('./gen-name.js');
