const { debug } = require('console');
var fs = require('fs');
var path = require('path');

var list_folder = function(folder_path, recursive) {
    var folder_content = [];
    files = fs.readdirSync(folder_path);
    files.forEach(function(file) {
        if(file != ".DS_Store" && file[0] != "."){
            var location = folder_path.replace(process.cwd(), "");
            var current_path = folder_path + file;
            //console.log(current_path);
            var is_folder = fs.lstatSync(current_path).isDirectory() 
            var data = {
                name : file,
                path : location.replace(".", "") + file + (is_folder ? "/" : ""),
                folder : location,
                ext : path.extname(file),
                isFile : is_folder,
                folder_contents : is_folder && recursive ? list_folder(folder_path + file + "/", recursive) : undefined
            }
            folder_content.push(data);
        }
    });
    return folder_content;
}

module.exports.list_folder = list_folder;