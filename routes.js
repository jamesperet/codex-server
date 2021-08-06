

var service = require('./server');
var search = require('./search');
var files = require('./files');

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

module.exports.start = function(server){

  server.express.post('/api/move', function (req, res) {
    var path = process.cwd() + req.body.path;
    var new_path = process.cwd() + req.body.new_path;
    files.move_path(path, new_path)
      .then(() => {
        console.log("> Moved " + path + " => " + new_path);
        server.update_file_structure();
        res.status(200).end();
      })
      .catch(err => {
        console.log("> Error moving " + path + " => " + new_path);
        console.log(err);
        if(err.code == 'EEXIST') {
          console.log("> Destination already exists " + new_path);
          res.status(405).end();
        } else {
          res.status(500).end();
        }
      });
  });

  server.express.post('/api/delete', function (req, res) {
    var success = files.delete_path(process.cwd() + req.body.path);
    if(success) {
      console.log("> Deleted " + req.body.path);
      server.update_file_structure();
      res.status(200).end();
    }
    else {
      console.log("> Error deleting " + req.body.path);
      res.status(500).end();
    }
  });

  server.express.post('/api/create_folder', function (req, res) {
    var success = files.create_path(process.cwd() + req.body.path);
    if(success) {
      console.log("> Create new folder " + req.body.path);
      server.update_file_structure();
      res.status(200).end();
    }
    else {
      console.log("> Error creating folder " + req.body.path);
      res.status(500).end();
    }
  });

  server.express.get('/api/search', function (req, res) {
    search.query(req, res, "api-search");
  });

  server.express.get('/api/keywords', function (req, res) {
    search.query(req, res, "api-keywords");
  });

  server.express.get('/search', function (req, res) {
    search.query(req, res, "search");
  });

  // Get file
  var get_action = function (req, res) {
    if(req.query.list == "true"){
      service.list_folder(req, res);
    } else {
      service.get_file(req, res);
    }
  }
  for (var i = 0; i < url_paths.length; i++) {
    if(server.auth == undefined){
      server.express.get(url_paths[i], (req, res) => get_action(req, res));
    } else {
      server.express.get(url_paths[i], server.auth(), (req, res) => get_action(req, res));
    }
  }

  // Write file content
  var write_action = function (req, res) {
    service.write_file(req, res);
  }
  for (var i = 0; i < url_paths.length; i++) {
    if(server.auth == undefined){
      server.express.post(url_paths[i], (req, res) => write_action(req, res));
    } else {
      server.express.post(url_paths[i], server.auth(), (req, res) => write_action(req, res));
    }
    
  }
}
