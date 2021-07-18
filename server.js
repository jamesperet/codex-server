#!/usr/bin/env node

'use strict';

var express = require('express')
var app = express()
var pathTool = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var _ = require('lodash');
var cors = require('cors')

var markdown = require('./markdown');
var search = require('./search');
var files = require('./files');
var cli, config, server;

class Server {
  constructor(cli, config, app){
    this.cli = cli;
    this.config = config;
    this.modules = [];
    this.express = app;
    this.auth = undefined;
    this.printUser = printUser;
  }

  init_modules() {
    var module_list = config.get('modules');
    this.modules = [];
    
    for (let i = 0; i < module_list.length; i++) {
      cli.log('> Loading module ' + module_list[i].name);
      try {
        var Module = require(module_list[i].module);
        var module = new Module(this, module_list[i]);
        module.init();
        this.modules.push(module);
      } catch (err)
      {
        cli.log('> Error loading module ' + module_list[i].name);
        cli.log(err);
      }
    }
  }
}

module.exports.start = function(new_cli, new_config){
  cli = new_cli
  config = new_config;
  // Start Server
  server = new Server(cli, config, app);
  server.title = config.get('server-title');
  if(server.title != ""){
    cli.log('> Starting codex server for \"' + server.title + '\"');
  } else {
    cli.log('> Starting codex server');
  }
  server.init_modules();
  
  app.engine('html', require('ejs').renderFile);
  app.set('view engine', 'html');
  if(config.has('views-path')){
    var index_path = pathTool.join(config.get('views-path'), 'index.html');
    var index_exists = fs.existsSync(index_path);
    if(!index_exists) {
      cli.log("> Error: index view not found: " + index_path);
      cli.log("> Fix \'views-path\' in your configuration file to point to a valid theme views folder");
      cli.log("> Shutting down");
      cli.execSync("exit");
    } else {
      app.set('views', config.get('views-path'));
      cli.log('> Setting views from ' + config.get('views-path'));
    }
  } else {
      cli.log("> Add \'views-path\' to your configuration file ");
      cli.log("> Shutting down");
      cli.execSync("exit");
  }
  //app.use('/public', express.static(path.join(__dirname + '/node_modules')));
  //app.use(express.static('public'))
  app.use(bodyParser.json());
  app.use(cors());
  search.start(cli, app, server);
}

var getPath = function(req){
  var path = "";
  if(req.params['folder_10'] != undefined){
    path = path + req.params['folder_10'] + "/"
  }
  if(req.params['folder_9'] != undefined){
    path = path + req.params['folder_9'] + "/"
  }
  if(req.params['folder_8'] != undefined){
    path = path + req.params['folder_8'] + "/"
  }
  if(req.params['folder_7'] != undefined){
    path = path + req.params['folder_7'] + "/"
  }
  if(req.params['folder_6'] != undefined){
    path = path + req.params['folder_6'] + "/"
  }
  if(req.params['folder_5'] != undefined){
    path = path + req.params['folder_5'] + "/"
  }
  if(req.params['folder_4'] != undefined){
    path = path + req.params['folder_4'] + "/"
  }
  if(req.params['folder_3'] != undefined){
    path = path + req.params['folder_3'] + "/"
  }
  if(req.params['folder_2'] != undefined){
    path = path + req.params['folder_2'] + "/"
  }
  if(req.params['folder_1'] != undefined){
    path = path + req.params['folder_1'] + "/"
  }
  return path;
}

var getIndexFilePath = function(path, req, res){
  if(req.params['file'] != undefined){
    path = path + req.params['file'] + "/";
  }
  
  cli.log("> Looking for index file in " + path);
  fs.readFile(path + "index.html", 'utf8', function (err,data) {
    if (err) {
      fs.readFile(path + "index.md", 'utf8', function (err,data) {
        if (err) {
          cli.log("> Error: No index file found in " + path);
          error_404(req, res);
        } else {
          req.params['file'] = buildFilename(req.params['file'], "index.md");
          get_file(req, res);
        }
      });
    } else {
      req.params['file'] = buildFilename(req.params['file'], "index.html");
      get_file(req, res);
    }
  });
}

var isFile = function(filename){
  var re = /(?:\.([^.]+))?$/;
  var ext = re.exec(filename)[1];
  if(ext != undefined){
    return true;
  }
  return false;
}

var buildFilename = function(path, filename){
  if(path == undefined){
    return filename;
  }
  return path + "/" + filename
}

var list_folder = function(req, res){
  var path = getPath(req);
  var file_type = "";
  var parts;
  var extension;
  var folder_content = [];
  // Path is file or folder
  if(!isFile(req.params['file']) && req.params['file'] != undefined){
    path = path + "./" + req.params['file'] + "/";
  }
  if(path == "" || path == "undefined"){
    path = "./";
  }
  cli.log("> Listing folder: " + path);
  res.json({ files: files.list_folder(path)});
  // fs.readdir(path, function(err, files) {
  //   if(files != null){
  //     files.forEach(function(file) {
  //       folder_content.push(file);
  //     });
  //     res.json({ files: folder_content });
  //   } else {
  //     res.json({ files: [] });
  //   }
  // })
}

var get_file = function(req, res){
  
  
  var path = getPath(req);
  var file_type = "";
  var parts;
  var extension;

  // Load file or look for index?
  if(isFile(req.params['file'])){
    // Set filetype
    path = path + req.params['file'];
    parts = req.params['file'].split(".");
    extension = parts[parts.length - 1]
    if(extension == "md"){
      file_type = "markdown"
    }
    else if(extension == "html"){
      file_type = "html"
    }
  } else {
    // return index file if it exists
    path = getIndexFilePath(path, req, res)
    return;
  }
  // Action for each filetype
  if(file_type == "markdown"){
    fs.readFile(path, 'utf8', function (err,data) {
      if (err) {
        return cli.log(err);
      } else {
        if(req.query['view'] == 'raw'){
          res.send(data);
          cli.log("> Sending raw content " + path + printUser(req))
        }
        else if(req.query['view'] == 'content'){
          res.send(build_data(data));
          cli.log("> Sending content " + path + printUser(req))
        }
        else {
          res.render('index', build_data(data));
          cli.log("> Sending rendered page " + path + printUser(req))
        }
      }
    });
  } else if(file_type == "html"){
    fs.readFile(path, 'utf8', function (err,data) {
      if (err) {
        return cli.log(err);
      } else {
        cli.log("> Sending " + path + printUser(req))
        res.render(process.cwd() + "/" + path, extra_data());
      }
    });
  } else {
    res.sendFile( process.cwd() + "/" + path, function (err) {
      if (err) {
        cli.log("> Error: " + path + " - file not found");
        res.status(err.status).end();
      }
      else {
        cli.log('> Sending ' + path + printUser(req));
      }
    });
  }
}

var write_file = function(req, res){
  var path = getPath(req);
  var save_data;
  // Write file
  if(isFile(req.params['file'])){
    path = path + req.params['file'];
    if(path == ""){
      cli.log("> Error: path not specified")
      res.status(400).end();
      return;
    }
    if (req.body.file != undefined) {
      save_data = req.body.file
    }
    else if(req.body.data != undefined){
      save_data = JSON.stringify(req.body.data)
    }
    fs.writeFile(path, save_data, function(err) {
      if(err) {
          cli.log("> Error: " + path + " - file could not be saved")
          cli.log(err);
          res.status(err.status).end();
      } else {
        cli.log("> Saved: " + path);
        res.status(200).end();
      }
    });
  }
}

var error_404 = function(req, res){
  res.render('error-404', extra_data());
}

var build_data = function(data){
  var obj = extra_data();
  obj.body = markdown.parse(data);
  return obj;
}

var extra_data = function(){
  var time = new Date();
  var date = time.getFullYear();
  var obj = {
    date: date
  }
  return obj;
}

var printUser = function(req)
{
  var u = undefined;
  if(server.auth != undefined)
  {
    //cli.log(req.oidc.isAuthenticated() ? '> User is logged in' : '> User is logged out');
    //cli.log(req.oidc.user);
    u = req.oidc.user.nickname;
  }
  if(u == undefined) return "";
    else return " to " + u;
}

module.exports.get_file = get_file;
module.exports.list_folder = list_folder;
module.exports.write_file = write_file;
