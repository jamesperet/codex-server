const { debug } = require('console');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');

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

var delete_path = function(path){
    try {
        if(fs.lstatSync(path).isDirectory()){
            rimraf.sync(path);
        } else {
            fs.unlinkSync(path)
        }
        return true;
    } catch (error) {
        console.log(error)
        return false;
    }
}

var create_path = function(path){
    try {
        if (!fs.existsSync(path)){
            fs.mkdirSync(path, { recursive: true });
            return true;
        } else return false
    } catch (error) {
        console.log(error);
        return false;
    }
}

module.exports.list_folder = list_folder;
module.exports.delete_path = delete_path;
module.exports.create_path = create_path;