#!/usr/bin/env node

'use strict';

var markdown = require('./markdown');
var timer = require('./timer');
var routes = require('./routes');

var Mode = require('stat-mode');
var fs = require('fs');
var path = require('path');
const cheerio = require('cheerio');
var elasticlunr = require('elasticlunr');

var index = elasticlunr(function () {
    this.addField('title')
    this.addField('path')
    this.addField('body')
});

var folder_content = [];
var cli;

module.exports.start = function(new_cli, app){
  cli = new_cli;
  cli.log("> searching for files...")
  timer.start();
  var data = createIndex();
  for (var i = 0; i < data.length; i++) {
    index.addDoc(data[i]);
  }
  cli.log("> indexing done! (" + timer.end() + " seconds)");
  startServer(cli, app)
}

module.exports.query = function(req, res){
  var results = [];
  var query = req.query.query;
  cli.log(query);
  index.search(query)
    .map(({ ref, score }) => {
      // Get doc by ref
      const doc = index.documentStore.getDoc(ref);
      const obj = {id: doc.id, title: doc.title, path: doc.path, body: doc.body};
      results.push(obj);
    });
  cli.log('> searched for \'' + req.query.query + "\' and found " + results.length + ' results');
  try {
    res.json({ results : results });
  } catch (err) {
    console.log(err);
  }
}

var startServer = function(cli, app){
  routes.start(cli, app);
  app.listen(3000, function () {
    cli.log('> listening on port 3000');
  });
}

var createIndex = function(){
  var indexData = [];
  var indexed = 0;
  var counter = 1;

  readDir("./");
  while(folder_content.length > 0 && indexed < 100000){
    var item = folder_content[0];
    folder_content.shift();
    var stat;
    try {
      stat = fs.statSync(item);
    } catch (err) {
      console.log(err);
    }
    if(stat != undefined){
      var mode = new Mode(stat);
      if(mode.isDirectory()){
        readDir(item);
      }
      if(mode.isFile()){
        var extension;
        var parts = item.split(".");
        extension = parts[parts.length - 1]
        if(extension == "md" || extension == "html"){
          var file;
          try {
            file = fs.readFileSync(item, 'utf8');
          } catch (err) {
            console.log(err);
          }
          if(file != undefined){
            var data = {}
            data.id = counter;
            counter += 1;
            data.path = item.replace('.//','/');
            if(extension == "md"){
               var render = markdown.parse(file);
               var text = cheerio.load(render);
               data.title = text('h1').text();
               data.body = text.text().replace(/(\r\n\t|\n|\t|\r\t)/gm," ");
            }
            if(extension == "html"){
               var html = cheerio.load(file);
               data.title = html('h1').text();
               data.body = html('body').text();
               data.body = data.body.replace(/\<\%\-[^]*?\%\>/g, "").replace(/(\r\n\t|\n|\t|\r\t)/gm," ").replace(/\s+/g,' ').trim()
            }
            indexData.push(data);
            //cli.log("> indexing " +  item.replace('.//','/'));
            indexed += 1;
          }
        }
      }
    }
  }

  cli.log("> indexing " + indexData.length + ' files...');
  console.log(indexData[0]);
  console.log(indexData[indexData.length / 2]);
  console.log(indexData[indexData.length - 1]);
  var dir = './.codex-data';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
  var obj = { table: indexData };
  fs.writeFileSync('./.codex-data/index.json', JSON.stringify(obj), 'utf8');
  return indexData;
}

var readDir = function(path) {
  var files = [];
  try {
    files = fs.readdirSync(path);
  } catch (err) {
    console.log(err);
  }
  files.forEach(function(file) {
    folder_content.push(path + '/' + file);
  });
}
