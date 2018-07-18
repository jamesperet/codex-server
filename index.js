#!/usr/bin/env node

'use strict';

var express = require('express')
var app = express()
var path = require('path');
var fs = require('fs');
var bodyParser = require('body-parser');
var _ = require('lodash');
var cors = require('cors')

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
//app.use('/public', express.static(path.join(__dirname + '/node_modules')));
app.use(express.static('public'))
app.use(bodyParser.json());
app.use(cors());

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
  console.log("Looking for index file in " + path);
  fs.readFile(path + "index.html", 'utf8', function (err,data) {
    if (err) {
      fs.readFile(path + "index.md", 'utf8', function (err,data) {
        if (err) {
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
  console.log("Listing folder: " + path);
  fs.readdir(path, function(err, files) {
    if(files != null){
      files.forEach(function(file) {
        folder_content.push(file);
      });
      res.json({ files: folder_content });
    } else {
      res.json({ files: [] });
    }

  })
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
        return console.log(err);
      } else {
        console.log("Rendered: " + path)
        res.render('index', build_data(data));
      }
    });
  } else if(file_type == "html"){
    fs.readFile(path, 'utf8', function (err,data) {
      if (err) {
        return console.log(err);
      } else {
        console.log("Rendered: " + path)
        res.render(process.cwd() + "/" + path, extra_data());
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
  if(isFile(req.params['file'])){
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

var error_404 = function(req, res){
  res.render('error-404', extra_data());
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
    })//.use(require('markdown-it-highlightjs'), {auto: true, code: false})
  return md.render(data)
}

var build_data = function(data){
  var obj = extra_data();
  obj.body = markdown_parser(data);
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

var url_paths = [
  '/',
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

// Get file
for (var i = 0; i < url_paths.length; i++) {
  app.get(url_paths[i], function (req, res) {
    if(req.query.list == "true"){
      list_folder(req, res);
    } else {
      get_file(req, res);
    }
  })
}

// Write file content
for (var i = 0; i < url_paths.length; i++) {
  app.post(url_paths[i], function (req, res) {
    console.log("Writing file: " + url_paths[i]);
    write_file(req, res);
  })
}


app.listen(3000, function () {
  console.log('Codex Server – listening on port 3000')
})
