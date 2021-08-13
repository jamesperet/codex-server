

var service = require('./server');
var search = require('./search');
var files = require('./files');
const multer  = require('multer')
const upload = multer({ dest: '.codex-data/uploads/' })

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
    var path = process.cwd() + req.body.path.replace(/%20/g, ' ');
    var new_path = process.cwd() + req.body.new_path.replace(/%20/g, ' ');
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
    var success = files.delete_path(process.cwd() + req.body.path.replace(/%20/g, ' '));
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
    var success = files.create_path(process.cwd() + req.body.path.replace(/%20/g, ' '));
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

  // Get User
  if(server.auth == undefined){
    server.express.get('/api/user', function (req, res) {
      res.json({ user : undefined }).end();
    });
  } else {
    server.express.get('/api/user', server.auth(), function (req, res) {
      var u = undefined;
      if(req.oidc != undefined){
        if(req.oidc.isAuthenticated()) u = req.oidc.user;
      }
      //console.log(u);
      res.json({ user : u }).end();
    });
  }

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
    if(req.files != undefined) {
      
      var promises = []
      req.files.forEach(f => {
        console.log(`> Received uploaded file: ${server.getPath(req)}/${f.originalname} (${f.filename})`);
        var path = process.cwd() + '/' + f.path;
        var file = req.params['file'];
        if(file != undefined && file != '') file += '/';
        var new_path = process.cwd() + '/' + server.getPath(req) + file + f.originalname;
        promises.push(files.move_path(path, new_path)
        .then(() => {
          console.log("> Moved " + path + " => " + new_path);
        })
        .catch(err => {
          if(err.code == 'EEXIST') {
            console.log("> Destination already exists " + new_path);
          } else {
            console.log("> Error moving " + path + " => " + new_path);
            console.log(err);
          }
        }));
      });
      Promise.all(promises).then((values) => {
        server.update_file_structure();
        for (let i = 0; i < values.length; i++) {
          if(values[i] == false) res.status(405).end();
        }
        res.status(200).end();
      })
    } else {
      service.write_file(req, res);
    }
  }
  for (var i = 0; i < url_paths.length; i++) {
    if(server.auth == undefined){
      server.express.post(url_paths[i], upload.array('files'), (req, res) => write_action(req, res));
    } else {
      server.express.post(url_paths[i], server.auth(), upload.array('files'),  (req, res) => write_action(req, res));
    }
  }
}
