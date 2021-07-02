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
const logUpdate = require('log-update');
var glob = require('glob');

var index = elasticlunr(function () {
    this.addField('title')
    this.addField('path')
    this.addField('body')
});

var folder_content = [];
var cli;
var app;
var data;
var update_index = false;

module.exports.start = function(new_cli, new_app){
  cli = new_cli;
  app = new_app;
  timer.start();

  fs.stat('./.codex-data/index.json', function(err, stat) {
    if(err == null) {
        var file = fs.readFileSync('./.codex-data/index.json', 'utf8');
        data = JSON.parse(file).table;
        cli.log("> Loaded index file.")
        update_index = true;
        createIndex(startServer);
    } else if(err.code == 'ENOENT') {
        // file does not exist
        cli.log("> Index doesn't exist. Creating new index.");
        cli.log("> searching for files...");
        update_index = false;
        createIndex(startServer);
    } else {
        console.log('> ERROR: ', err.code);
    }
  });
}

module.exports.query = function(req, res, response_type){
  var results = [];
  var query = req.query.query;
  timer.start();
  //cli.log('> searching for \'' + query + '\'');
  try {
    switch (response_type) {
      case "api-search":
        results = search(query, true);
        cli.log('> searched for \'' + req.query.query + "\' and found " + results.length + " results (" + timer.end() + ")");
        res.json({ results : results, query: query });
        break;
      case "api-keywords":
        results = search(query, false);
        res.json({ keywords : getKeywords(results, query), query: query });
        break;
      default:
        results = search(query, true);
        cli.log('> searched for \'' + req.query.query + "\' and found " + results.length + " results (" + timer.end() + ")");
        var time = new Date();
        var date = time.getFullYear();
        res.render('search-results', { results : results, date: date, query: query });
        break;
    }

  } catch (err) {
    console.log(err);
  }
}

var search = function(query, search_snippets){
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
  if(results.length > 10){
    //results = results.slice(0, 100);
  }
  if(search_snippets){
    for (var i = 0; i < results.length; i++) {
      if(results[i].extension == 'md' || results[i].extension == 'html')
      results[i].keywords = getKeywordSnippets(results[i].path, query);
    }
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
  console.log("> Found " + all_keywords.length + " keywords " + occurencies + " times for '" + query + "' (" + timer.end() + ")")
  return all_keywords;
}

var startServer = function(){
  if(data != undefined){
    for (var i = 0; i < data.length; i++) {
      index.addDoc(data[i]);
    }
    if(update_index){
      updateIndex();
    }
    saveIndex(data);
    cli.log("> indexed " + data.length + " files (" + timer.end() + ")");
  } else {
    cli.log("> indexing failed! (" + timer.end() + ")");
  }

  watch('./', { recursive: true }, function(evt, path) {
    if (evt == 'update') {
      // on create or modify
      //console.log('> File changed: /%s', path);
      updateFileIndex(path, true)
    }
    if (evt == 'remove') {
      // on delete
      //console.log('> File removed: /%s', path);
      removeFileIndex(path, undefined, true);
    }
  });
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
      var file_index = createFileIndex(file, doc.path, doc.id, stat, doc.extension)
      for (var i = 0; i < data.length; i++) {
        if(data[i].id == file_index.id){
          data[i] = file_index;
        }
      }
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

var removeFileIndex = function(path, doc, save){
  if("/" + path != "/.codex-data/index.json"){
    if(doc == undefined){
      doc = findFileIndex(path);
    }
    if(doc != undefined){
      for (var i = 0; i < data.length; i++) {
        if(data[i].id == doc.id){
          data.splice(i, 1);
          index.removeDoc(doc);
          console.log("> File no longer exists, removing from index: " + path);
          if(save) saveIndex(data);
        }
      }
    } else {
      console.log("> File was changed, but not found in index: " + path);
    }
  }
}

var createIndex = function(callback){
  var indexData = [];
  var new_files = [];
  var counter = 1;
  var folder_count = 0;
  var file_count = 0;
  var log_counter = 0
  var update_speed = 100;
  if(update_index == true){
    update_speed = 1000;
  }
  glob("**/*",{'cwd': './', 'ignore':['.DS_Store', '**/.DS_Store', ".codex-data/*", "**/*.zip"]}, function (err, files) {
    console.log(`> Found ${files.length} files`);
    while(files.length > 0){
      log_counter += 1;
      logUpdate(`> Scaning file ${log_counter} (${new_files.length} new files found)`);
      var item = files[0];
      var extension;
      var parts = item.split(".");
      extension = parts[parts.length - 1]
      var new_file = true;
      files.shift();
      var doc = undefined;
      var file_data = undefined;
      if(update_index == true){
        for (var i = 1; i < data.length; i++) {
          if(data[i].path == item){
            doc = data[i];
            //console.log(data[i].path)
            //console.log(item)
          }
        }
        if(doc == undefined){
          if(allowedExtensions(extension)){
              //console.log("> New file found: " + item.replace('.//','/'))
              new_file = true;
          } else {
            new_file = true; false
          }
        } else {
          new_file = false;
          //console.log("   - file already exists: " + item.replace('.//','/'))
        }
      } else {
        if(allowedExtensions(extension)){
          new_file = true;
        } else {
          new_file = true; false
        }
      }
      if(new_file){
        var stat;
        try {
          stat = fs.statSync(item);
        } catch (err) {
          console.log(err);
        }
        if(stat != undefined){
          var mode = new Mode(stat);
          if(mode.isDirectory()){
            folder_count += 1;
            readDir(item);
          }
          if(mode.isFile()){
            file_count += 1;
            if(allowedExtensions(extension)){
              var file;
              try {
                file = fs.readFileSync(item, 'utf8');
              } catch (err) {
                console.log(err);
              }
              counter += 1;
              file_data = createFileIndex(file, item, counter, stat, extension);
            }
          }
        }
      }
      //console.log(`indexed ${indexData.length} files`);
      if(file_data != undefined){
        indexData.push(file_data);
        new_files.push(file_data);
      } else if(doc != undefined){
        indexData.push(doc);
      }
    }
    for (let a = 0; a < new_files.length; a++) {
      console.log(`> New file found: \"${new_files[a].path}\"`);
      
    }
    clearInterval(log_counter);
    console.log(`> Added ${new_files.length} new files to the index`);
    data = indexData;
    callback();
  });
}

var createIndex2 = function(){
  var indexData = [];
  var indexed = 0;
  var counter = 1;
  var folder_count = 0;
  var file_count = 0;
  var log_counter = 0
  var update_speed = 100;
  if(update_index == true){
    update_speed = 1000;
  }
  logUpdate('> searched ' + folder_count + ' folders and ' + file_count + ' files');
  readDir("./");
  while(folder_content.length > 0 && indexed < 100000){
    log_counter += 1;
    if(log_counter > update_speed){
        logUpdate('> searched ' + folder_count + ' folders and ' + file_count + ' files');
        log_counter = 0;
    }
    var item = folder_content[0];
    var extension;
    var parts = item.split(".");
    extension = parts[parts.length - 1]
    var new_file = true;
    folder_content.shift();
    if(update_index == true){
      var doc = findFileIndex(item.replace('.//',''));
      if(doc == undefined){
        new_file = true;
        doc = {};
        if(allowedExtensions(extension)){
            console.log("> New file found: " + item.replace('.//','/'))
        }
      } else {
        new_file = false;
        //console.log("   - file already exists: " + item.replace('.//','/'))
      }
    }
    var stat;
    try {
      stat = fs.statSync(item);
    } catch (err) {
      console.log(err);
    }
    if(stat != undefined && "/" + file != "/.codex-data/index.json" && new_file){
      var mode = new Mode(stat);
      if(mode.isDirectory()){
        folder_count += 1;
        readDir(item);
      }
      if(mode.isFile()){
        file_count += 1;
        if(allowedExtensions(extension)){
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
  clearInterval(log_counter);
  return indexData;
}

var allowedExtensions = function(extension){
  if(extension == "md" || extension == "html"
      || extension == "gif" || extension == "png" || extension == "jpg" || extension == "txt"
      || extension == "pdf"
      || extension == "mov" || extension == "avi"
      || extension == "zip"
    ){
      return true;
    } else {
      return false;
    }
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
    var updated_files = 0;
    var removed_files = 0;
    var path = data[i].path;
    if(path == undefined) { continue; }
    if(path.charAt(0) == "/") {
      path = path.substr(1);
    }
    var stat;
    try {
      stat = fs.statSync("./" + data[i].path);
      var new_mtime = new Date(stat.mtime)
      var old_mtime = new Date(data[i].mtime)
      if(new_mtime.toString() != old_mtime.toString()){
        updated_files += 1;
        updateFileIndex(path, false, stat)
      }
    } catch (err) {
      if (err.code == 'ENOENT') { // no such file or directory. File really does not exist
        //console.log(err);
        removed_files += 1;
        removeFileIndex(path, data[i], false);
      }
    }
  }
  console.log(`> Updated ${updated_files} files and removed ${removed_files} files`);
}

// Find all occurencies of the keyword and a snippet of text for each one.
var getKeywordSnippets = function(path, query){
  var file = fs.readFileSync('./' + path, 'utf8');
  var render = markdown.parse(file);
  var html = cheerio.load(render);
  var body_keywords = [];
  var processHtmlBlock = function(text, tag){
    var keywords_data = [];
    if(text != null && text != ""){
        //console.log(html(this).html());
        var keywords = text.match("(\\b\\w*" + query + "\\w*\\b)", "gi");
        text = text.replace("{{", " ").replace("}}", " ");
        if(keywords != null){
          for (var i = 0; i < keywords.length; i++) {
            if(tag == 'code'){
              var lines = ""
              var code_counter = 0;
              var index_filter = 0;
              text.toString().split("\n").forEach(function(line, index, arr) {
                if (index === arr.length - 1 && line === "") { return; }
                if(code_counter > 3){ return; }
                var match = line.match("(\\b\\w*" + query + "\\w*\\b)", "gi");
                if(match != undefined && match != "" && index >= index_filter){
                  if(index > 0 && arr.length > index + 2){
                    if(line != ""){
                      lines += "...\n" + arr[index - 1] + '\n' + arr[index] + '\n' + arr[index + 1] + '\n' + arr[index + 2] + "\n...\n";
                      index += 3;
                      index_filter = index;
                      code_counter += 1;
                    }
                  } else {
                    if(line != ""){
                      lines += line;
                      index_filter = index;
                    }
                  }
                }
              });
              text = lines;
            }
            if(text != ""){
              var is_new = false;
              for (var b = 0; b < keywords_data.length; b++) {
                if(keywords_data[b].text == text) { is_new = true; }
              }
              if(is_new == false){
                  keywords_data.push({ keyword : keywords[i], text: text, tag: tag });
              }
            }
          }
        }
    }
    for (var a = 0; a < keywords_data.length; a++) {
      var exists = false;
      for (var i = 0; i < body_keywords.length; i++) {
        if(body_keywords[i].text == keywords_data[a].text ){
          exists = true;
        }
      }
      if(!exists) body_keywords.push(keywords_data[a]);
    }
  }
  var content = html('body').contents().each(function(i, elem){
    if(html(this).is('ul')){
      var ul = cheerio.load(html(this).html());
      ul('li').each(function(a, elem){
        //console.log(ul(this).html())
        processHtmlBlock(ul(this).html(), 'li');
      });
    } else if(html(this).is('p')){
      html(this).children('img').remove();
      processHtmlBlock(html(this).html(), 'p');
    } else if(html(this).is('pre')){
      processHtmlBlock(html(this).children('code').html(), 'code');
    } else if(html(this).is('h2')){
        processHtmlBlock(html(this).html(), html(this).get(0).tagName);
    } else if(html(this).is('h3')){
        processHtmlBlock(html(this).html(), html(this).get(0).tagName);
    } else if(html(this).is('h4')){
        processHtmlBlock(html(this).html(), html(this).get(0).tagName);
    } else if(html(this).is('h5')){
        processHtmlBlock(html(this).html(), html(this).get(0).tagName);
    } else {
        //processHtmlBlock(html(this).html(), html(this).get(0).tagName);
    }

    //console.log(keywords);
    if(html(this).is('h1')){
      //console.log(html(this).html());
    }
  });
  //console.log(body_keywords);
  return body_keywords;
}
