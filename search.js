#!/usr/bin/env node

'use strict';

var markdown = require('./markdown');
var timer = require('./timer');
var routes = require('./routes');

var Mode = require('stat-mode');
var fs = require('fs');
var path = require('path');
const cheerio = require('cheerio');
var SearchIndex = require('search-index');

var folder_content = [];
var index;
var cli;

var options = {
  batchSize: 100000,
  fieldedSearch: true,
  fieldOptions: {},
  preserveCase: false,
  storeable: true,
  searchable: true,
  indexPath: '.codex-data/si',
  logLevel: 'error',
  nGramLength: 1,
  nGramSeparator: ' ',
  separator: /[' .,\-|(\n)]+/,
  stopwords: require('stopword').en,
}

module.exports.start = function(new_cli, app){
  try {
    cli = new_cli;
    cli.log("> searching for files...")
    timer.start();
    SearchIndex(options, function(err, newIndex) {
      index = newIndex;
      var data = createIndex();
      try {
        index.concurrentAdd({}, data, function(err) {
          cli.log("> indexing done! (" + timer.end() + " seconds)");
          startServer(cli, app)
        })
      } catch (err){
        console.log(err);
      }
    });
  } catch(err){
    console.log(err);
  }

}

module.exports.query = function(req, res){
  var results = [];
  var query = req.query.query.split(" ");
  console.log(query);
  index.search([{
    AND: {'*': query}
  }])
  .on('data', function(data){
    // var new_result = true;
    // for (var i = 0; i < results.length; i++) {
    //   if(data.document.path == results[i].document.path){
    //     new_result = false;
    //   }
    // }
    // if(new_result){
    //     results.push(data)
    // }
    results.push(data)
    console.log(data.document.path);
  }).on('end', function () {
    cli.log('> searching for \'' + req.query.query + "\' and found " + results.length + ' results');
    try {
      res.json({ results : results });
    } catch (err) {
      console.log(err);
    }
  });
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
