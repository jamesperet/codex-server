var express = require('express')
var app = express()

var get_file = function(req, res){
  fs = require('fs')
  var path = ""
  var file_type = ""
  if(req.params['folder'] != undefined){
    path = req.params['folder'] + "/"
  }
  if(req.params['file'] != undefined){
    path = path + req.params['file']
    parts = req.params['file'].split(".")
    extension = parts[parts.length - 1]
    if(extension == "md"){
      file_type = "markdown"
    }
  }
  fs.readFile(path, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    process_file(res, data, file_type)
  });
}

var process_file = function(res, data, file_type){
  if(file_type == "markdown"){
    res.send(markdown_parser(data))
  } else {
    res.send(data)
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

  var md = require('markdown-it')()
        .use(require('markdown-it-math'), {
            inlineOpen: '\(',
            inlineClose: '\\)',
            blockOpen: '\\[',
            blockClose: '\\]'
        })
  return md.render(data)
}

app.get('/:folder/:file', function (req, res) {
  get_file(req, res);
})

app.get('/:file', function (req, res) {
  get_file(req, res);
})

app.listen(3000, function () {
  console.log('Example app listening on port 3000!')
})
