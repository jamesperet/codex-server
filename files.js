const { debug } = require('console');
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
const moveFile = require('move-file');

var list_folder = function(folder_path, recursive) {
    folder_path = folder_path.replace("/./", "/");
    var folder_content = [];
    try {
        files = fs.readdirSync(folder_path);
    } catch (error) { 
        if(error.code != "ENOENT") console.log(error);
        else console.log("> No content found in " + folder_path);
        return false;
    }
    files.forEach(function(file) {
        if(file != ".DS_Store" && file[0] != "."){
            var location = folder_path.replace(process.cwd(), "");
            var current_path = folder_path + file;
            var stat = fs.lstatSync(current_path);
            var data = {
                name : file,
                path : location.replace(".", "") + file + (stat.isDirectory() ? "/" : ""),
                folder : location,
                ext : path.extname(file),
                isFile : !stat.isDirectory(),
                size : stat.size,
                mtime : stat.mtime,
                ctime : stat.ctime,
                folder_contents : stat.isDirectory() && recursive ? list_folder(folder_path + file + "/", recursive) : undefined
            }
            folder_content.push(data);
        }
    });
    return folder_content;
}

var path_exists = function(path){
    try {
        if (fs.existsSync(path)) {
            return true;
        }
    } catch (error) { 
        if(error.code != "ENOENT") console.log(error);
        else console.log("> No content found in " + folder_path);
        return false;
    }
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

var move_path = function(path, new_path){
    return moveFile(path, new_path);
}

module.exports.path_exists = path_exists;
module.exports.list_folder = list_folder;
module.exports.delete_path = delete_path;
module.exports.create_path = create_path;
module.exports.move_path = move_path;