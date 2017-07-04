#!/usr/bin/env node

'use strict';

var express = require('express')
var app = express()
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var _ = require('lodash');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
//app.use('/public', express.static(path.join(__dirname + '/node_modules')));
app.use(express.static('public'))
app.use(bodyParser.json());

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

var get_file = function(req, res){

  var path = getPath(req);
  var file_type = "";
  var parts;
  var extension;

  // Load file or look for index?
  if(req.params['file'] != undefined){
    // Set filetype
    path = path + req.params['file'];
    parts = req.params['file'].split(".");
    extension = parts[parts.length - 1]
    if(extension == "md"){
      file_type = "markdown"
    }
  } else {
    // return index file if it exists
  }
  // Action for each filetype
  if(file_type == "markdown"){
    fs.readFile(path, 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      } else {
        console.log("Rendered: " + path)
        res.render('index', { body: markdown_parser(data) });
      }
    });
  } else {
    res.sendFile( process.cwd() + "/" + path, function (err) {
      if (err) {
        console.log("Error: " + path + " - file not found");
        res.status(err.status).end();
      }
      else {
        console.log('Sent:', path);
      }
    });
  }
}

var write_file = function(req, res){
  var path = getPath(req);
  var save_data;
  // Write file
  if(req.params['file'] != undefined){
    path = path + req.params['file'];
    if(path == ""){
      console.log("Error: path not specified")
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
          console.log("Error: " + path + " - file could not be saved")
          console.log(err);
          res.status(err.status).end();
      } else {
        console.log("Saved: " + path);
        res.status(200).end();
      }
    });
  }
}

var markdown_parser = function(data){
  var md = require('markdown-it')({
      html: true,
      linkify: true,
      typographer: true
    }).use(require('markdown-it-math'), {
      inlineOpen: '\\(',
      inlineClose: '\\)',
      blockOpen: '\\[',
      blockClose: '\\]'
    }).use(require('markdown-it-highlightjs'), {auto: true, code: false})
  return md.render(data)
}

var url_paths = [
  '/:file',
  '/:folder_1/:file',
  '/:folder_2/:folder_1/:file',
  '/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_4/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_8/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_9/:folder_8/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file',
  '/:folder_10/:folder_9/:folder_8/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file'
]

for (var i = 0; i < url_paths.length; i++) {
  app.get(url_paths[i], function (req, res) {
    get_file(req, res);
  })
}

for (var i = 0; i < url_paths.length; i++) {
  app.post(url_paths[i], function (req, res) {
    write_file(req, res);
  })
}


app.listen(3000, function () {
  console.log('Codex Server – listening on port 3000')
})
