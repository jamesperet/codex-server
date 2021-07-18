var fs = require('fs');
var path = require('path');

module.exports = {
    list_folder : function(folder_path) {
        var folder_content = [];
        files = fs.readdirSync(folder_path);
        files.forEach(function(file) {
            var data = {
                name : file,
                path : folder_path + file,
                folder : folder_path,
                ext : path.extname(file),
                isFile : path.extname(file) != ""
            }
            folder_content.push(data);
        });
        return folder_content;
    }
}