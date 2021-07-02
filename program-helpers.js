var create_new_config = function(program) {
    program.log('Creating new configuration');
    var fs = require('fs');
    var dir = process.cwd() + "/.codex-data/";
    if (!fs.existsSync(dir)){
      program.log('> Creating folder: ' + dir);
        fs.mkdirSync(dir);
    } else {
      program.log('> Folder already exists: ' + dir);
    }
    dir = process.cwd() + "/.codex-data/config/";
    if (!fs.existsSync(dir)){
      program.log('> Creating folder: ' + dir);
        fs.mkdirSync(dir);
    } else {
      program.log('> Folder already exists: ' + dir);
    }
    dir = process.cwd() + "/.codex-data/config/default.json";
    if (!fs.existsSync(dir)){
      program.log('> Creating file: ' + dir);
        data = JSON.stringify({
          "server-title" : "James Peret's Codex"
        })
        fs.writeFile(dir, data, function(err) {
          if(err) {
            program.log("> Error: " + dir + " - file could not be saved")
            program.log(err);
          }
        });
    } else {
      program.log('> File already exists: ' + dir);
    }
}

module.exports.create_new_config = create_new_config;