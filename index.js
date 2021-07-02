#!/usr/bin/env node

'use strict';

process.env["SUPPRESS_NO_CONFIG_WARNING"] = true;
process.env["NODE_CONFIG_DIR"] = process.cwd() + "/.codex-data/config/";
const config = require("config");
if(!config.has('server-title')){
  console.log('> No configuration file found in \"' + process.env["NODE_CONFIG_DIR"] + '\"');
}

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
      server.start(this, config);
      // no callback() is needed so the server stays alive;
    } catch (err) {
      this.log("> Error starting server, shutting down");
      program.exec('exit');
    }
  });

program.parse(process.argv).use(asDefault, 'default');
