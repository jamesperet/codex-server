#!/usr/bin/env node

'use strict';


var program = require('vorpal')();
var asDefault = require('vorpal-as-default').default;

var server = require('./server');

program.command('default')
  .hidden()
  .action(function()  {
    this.log("Run 'codex start' to start the server or 'codex help' for a list of commands");
  });

program.command('start')
  .description("start codex server with current dir as root folder")
  .action(function(args, callback)  {
    try {
      server.start(this);
      // no callback() is needed so the server stays alive;
    } catch (err) {
      this.log("error starting server");
      program.exit();
    }
  });

program.parse(process.argv).use(asDefault, 'default');
