

var server = require('./server');
var search = require('./search');

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

module.exports.start = function(cli, app){

  app.get('/api/search', function (req, res) {
    search.query(req, res, "api-search");
  });

  app.get('/api/keywords', function (req, res) {
    search.query(req, res, "api-keywords");
  });

  app.get('/search', function (req, res) {
    search.query(req, res, "search");
  });

  // Get file
  for (var i = 0; i < url_paths.length; i++) {
    app.get(url_paths[i], function (req, res) {
      if(req.query.list == "true"){
        server.list_folder(req, res);
      } else {
        server.get_file(req, res);
      }
    })
  }

  // Write file content
  for (var i = 0; i < url_paths.length; i++) {
    app.post(url_paths[i], function (req, res) {
      cli.log("Writing file: " + url_paths[i]);
      server.write_file(req, res);
    })
  }
}
