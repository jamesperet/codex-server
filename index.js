#!/usr/bin/env node

'use strict';

var express = require('express')
var app = express()
var path = require('path');
var fs = require('fs');

app.engine('html', require('ejs').renderFile);
app.set('view engine', 'html');
//app.use('/public', express.static(path.join(__dirname + '/node_modules')));
app.use(express.static('public'))



var get_file = function(req, res){

  var path = "";
  var file_type = "";
  var parts;
  var extension;

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
      }
      res.render('index', { body: markdown_parser(data) });
    });
  } else {
    res.sendFile( process.cwd() + "/" + path)
  }

}

var markdown_parser = function(data){
  //var markdown = require( "markdown" ).markdown;
  // var marked = require('marked');
  // marked.setOptions({
  //   renderer: new marked.Renderer(),
  //   gfm: true,
  //   tables: true,
  //   breaks: true,
  //   pedantic: true,
  //   sanitize: false,
  //   smartLists: true,
  //   smartypants: true
  // });
  //return markdown.toHTML(data)
  //return marked(data)
  // var md = require('markdown-it')()
  //             .use(require('markdown-it-mathjax')());

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

app.get('/:folder_10/:folder_9/:folder_8/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_9/:folder_8/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_8/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_7/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_6/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_5/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_4/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_3/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_2/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:folder_1/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:file', function (req, res) {
  get_file(req, res);
})

app.listen(3000, function () {
  console.log('Codex Server – listening on port 3000')
})
