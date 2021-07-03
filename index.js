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
var program_helpers = require('./program-helpers');

program.command('default')
  .hidden()
  .action(function()  {
    this.log("Run 'codex start' to start the server or 'codex help' for a list of commands");
  });

program.command('start')
  .description("start codex server with current dir as root folder")
  .action(function(args, callback)  {
    if(config == undefined)
    {
      this.log("> No configuration found. Run 'codex create config' to create a new configuration file");
    } else {
      try {
        server.start(this, config);
        // no callback() is needed so the server stays alive;
      } catch (err) {
        this.log("> Error starting server, shutting down");
        this.log(err);
        program.exec('exit');
      }
    }
  });

program.command('create')
  .description("Create files and folder inside codex")
  .action(function(args)  {
    switch (process.argv[1]) {
      case 'config':
        program_helpers.create_new_config(this);
        break;
      default:
        this.log('No create operation for \"' + process.argv[1] + '\"');
        break;
    }
  });

program.parse(process.argv).use(asDefault, 'default');

