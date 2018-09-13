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
var datetime = require("node-datetime");
var watch = require('node-watch');

var index = elasticlunr(function () {
    this.addField('title')
    this.addField('path')
    this.addField('body')
});

var folder_content = [];
var cli;
var data;

module.exports.start = function(new_cli, app){
  cli = new_cli;
  var update_index = false;

  timer.start();

  fs.stat('./.codex-data/index.json', function(err, stat) {
    if(err == null) {
        var file = fs.readFileSync('./.codex-data/index.json', 'utf8');
        data = JSON.parse(file).table;
        cli.log("> Loaded index file.")
        update_index = true;
    } else if(err.code == 'ENOENT') {
        // file does not exist
        cli.log("> Index doesn't exist. Creating new index.");
        cli.log("> searching for files...");
        data = createIndex();
    } else {
        console.log('> ERROR: ', err.code);
    }
    if(data != undefined){
      for (var i = 0; i < data.length; i++) {
        index.addDoc(data[i]);
      }
      if(update_index){
        data = updateIndex();
      }
      saveIndex(data);
      cli.log("> indexed " + data.length + " files (" + timer.end() + ")");
    } else {
      cli.log("> indexing failed! (" + timer.end() + ")");
    }

    watch('./', { recursive: true }, function(evt, path) {
      console.log('> File changed: /%s', path);
      updateFileIndex(path, true)
    });
    startServer(cli, app)
  });
}

module.exports.query = function(req, res, response_type){
  var results = [];
  var query = req.query.query;
  timer.start();
  //cli.log('> searching for \'' + query + '\'');
  results = search(query);
  cli.log('> searched for \'' + req.query.query + "\' and found " + results.length + " results (" + timer.end() + ")");
  try {
    switch (response_type) {
      case "api-search":
        res.json({ results : results, query: query });
        break;
      case "api-keywords":
        res.json({ keywords : getKeywords(results, query), query: query });
        break;
      default:
        var time = new Date();
        var date = time.getFullYear();
        res.render('search-results', { results : results, date: date, query: query });
        break;
    }

  } catch (err) {
    console.log(err);
  }
}

var search = function(query){
  var results = [];
  try {
    index.search(query, {
        fields: {
            title: {boost: 3, bool: "AND"},
            body: {boost: 2},
            path: {boost: 1}
        },
        bool: "OR",
        expand: true
      })
      .map(({ ref, score }) => {
        // Get doc by ref
        const doc = index.documentStore.getDoc(ref);
        const obj = {
          id: doc.id, title: doc.title, path: doc.path, body: doc.body,
          score: score, ctime: datetime.create(doc.ctime).format('n d, Y - H:M'),
          extension : doc.extension
        };
        results.push(obj);
      });
  } catch(err){
    if(err) console.log(err);
  }
  return results;
}

var getKeywords = function(results, query){
  timer.start();
  //console.log("> Processing Keywords")
  var all_keywords = []
  for (var i = 0; i < results.length; i++) {
    var keywords = []
    try {
      keywords = processKeywords(results[i], query);
    } catch(err){
      if(err) console.log(err);
    }
    for (var a = 0; a < keywords.length; a++) {
      var exists = false;
      for (var b = 0; b < all_keywords.length; b++) {
        if(all_keywords[b].keyword == keywords[a].keyword){
          all_keywords[b].count += 1;
          exists = true;
          //console.log("   - updated keyword count: " + all_keywords[b].keyword + " (" + all_keywords[b].count + ")")
        }
      }
      if(exists == false){
        all_keywords.push(keywords[a]);
        //console.log("   - added new keyword: " + keywords[a].keyword + " (" + keywords[a].count + ")")
      }
    }
  }
  var occurencies = 0;
  for (var i = 0; i < all_keywords.length; i++) {
    occurencies += all_keywords[i].count;
  }
  console.log("> Found " + all_keywords.length + " keywords " + occurencies + " times (" + timer.end() + ")")
  return all_keywords;
}

var startServer = function(cli, app){
  routes.start(cli, app);
  app.listen(3000, function () {
    cli.log('> listening on port 3000');
  });
}

var findFileIndex = function(path){
  for (var i = 1; i < data.length; i++) {
    if(data[i].path == "/" + path){
      return data[i];
    }
  }

}

var updateFileIndex = function(path, save, stat){
  if("/" + path != "/.codex-data/index.json"){
    var doc = findFileIndex(path);
    var filepath = ".//" + path
    try {
      if(stat == undefined){
          stat = fs.statSync(filepath);
      }
      var file = fs.readFileSync(filepath, 'utf8');
    } catch (err) {
      console.log(err);
    }
    if(doc != undefined){
      var file_index = createFileIndex(file, path, doc.id, stat, doc.extension)
      for (var i = 0; i < data.length; i++) {
        if(data[i].id == file_index.id){
          data[i] = file_index;
        }
      }
      data[file_index.id] = file_index;
      index.updateDoc(file_index);
      cli.log("> updated index " + file_index.id + " for file: " + file_index.path);
    } else {
      var parts = path.split('.');
      var extension = parts[parts.length];
      var file_index = createFileIndex(file, path, data.length + 1, stat, extension);
      data.push(file_index);
      index.addDoc(file_index);
      cli.log("> added new index " + file_index.id + " for file: " + file_index.path);
    }
    if(save) saveIndex(data);
  }
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
    if(stat != undefined && "/" + file != "/.codex-data/index.json"){
      var mode = new Mode(stat);
      if(mode.isDirectory()){
        readDir(item);
      }
      if(mode.isFile()){
        var extension;
        var parts = item.split(".");
        extension = parts[parts.length - 1]
        if(extension == "md" || extension == "html"
            || extension == "gif" || extension == "png" || extension == "jpg" || extension == "txt"
            || extension == "pdf"
            || extension == "mov" || extension == "avi"
            || extension == "zip"
          ){
          var file;
          try {
            file = fs.readFileSync(item, 'utf8');
          } catch (err) {
            console.log(err);
          }
          counter += 1;
          var data = createFileIndex(file, item, counter, stat, extension);
          if(data != undefined){
            indexData.push(data);
            //cli.log("> indexing " +  item.replace('.//','/'));
            indexed += 1;
          }

        }
      }
    }
  }
  return indexData;
}

var saveIndex = function(data){

  var dir = './.codex-data';
  if (!fs.existsSync(dir)){
      fs.mkdirSync(dir);
  }
  var obj = { table: data };
  try{
      fs.writeFileSync('./.codex-data/index.json', JSON.stringify(obj), { encoding:'utf8', flag : 'w'});
      cli.log("> saving index to file.")
  } catch(err){
      if(err) console.log(err);
  }
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

var createFileIndex = function(file, path, counter, stat, extension){
  var data = {};
  try{
    if(file != undefined){
      data.id = counter;
      data.path = path.replace('.//','/');
      data.ctime = new Date(stat.ctime);
      data.mtime = new Date(stat.mtime);
      data.extension = extension;
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
         data.body = data.body.replace(/\<\%\-[^]*?\%\>/g, "").replace(/(\r\n\t|\n|\t|\r\t)/gm," ").replace(/\s+/g,' ').trim();
      }
      if(extension == "jpg" || extension == "png" || extension == "pdf" || extension == "mov" || extension == "avi" || extension == "zip"){
        var name_parts = path.split("/");
        data.title = name_parts[name_parts.length - 1];
        data.body = "";
      }
    }
  } catch (err){
    if(err) console.log(err);
  }
  return data;
}

var processKeywords = function(doc, query){
  //console.log("   - searching for keyword in: " + doc.path )
  if(doc.extension == "md"){
      var body_keywords = doc.body.match("(\\b\\w*" + query + "\\w*\\b)", "gi");
  }
  if(doc.title != undefined){
      var title_keywords = doc.title.match("(\\b\\w*" + query + "\\w*\\b)", "gi");
  }
  var path_keywords = doc.path.match("(\\b\\w*" + query + "\\w*\\b)", "gi");
  var all_keywords = [];
  var keywords = [];
  if(title_keywords != undefined){
    if(title_keywords.length > 0){
      //console.log("      - " + title_keywords.length + " words in title")
      for (var i = 0; i < title_keywords.length; i++) {
        all_keywords.push(title_keywords[i]);
      }
    }
  }
  if(body_keywords != undefined && doc.extension == "md"){
    if(body_keywords.length > 0){
      //console.log("      - " + body_keywords.length + " words in body")
      for (var i = 0; i < body_keywords.length; i++) {
        all_keywords.push(body_keywords[i]);
      }
    }
  }
  if(path_keywords != undefined){
    if(path_keywords.length > 0){
      //console.log("      - " + path_keywords.length + " words in path");
      for (var i = 0; i < path_keywords.length; i++) {
        all_keywords.push(path_keywords[i]);
      }
    }
  }
  //console.log("      - " + all_keywords.length + " words found in total");
  for (var i = 0; i < all_keywords.length; i++) {
    var has_keyword = false
    for (var a = 0; a < keywords.length; a++) {
      if(keywords[a].keyword == all_keywords[i]){
        has_keyword = true;
        keywords[a].count += 1;
        //console.log("      - " + keywords[a].keyword + " found " + keywords[a].count  + " times");
      }
    }
    if(has_keyword == false){
      keywords.push( {keyword : all_keywords[i], count : 1 });
      //console.log("      - " + all_keywords[i] + " found 1 time");
    }
  }
  //console.log("      - found " + keywords.length + " keywords" );
  return keywords;
}

var updateIndex = function(){
  for (var i = 0; i < data.length; i++) {
    var stat;
    try {
      stat = fs.statSync("./" + data[i].path);
      var new_mtime = new Date(stat.mtime)
      var old_mtime = new Date(data[i].mtime)
      if(new_mtime.toString() != old_mtime.toString()){
        var path = data[i].path;
        if(path.charAt(0) == "/") {
          path = path.substr(1);
        }
        updateFileIndex(path, false, stat)
      }
    } catch (err) {
      if(err) console.log(err);
    }
  }
  return data;
}
