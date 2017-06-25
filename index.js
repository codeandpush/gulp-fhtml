/**
 * Created by anthony on 25/06/2017.
 */
'use strict';

var Stream = require('stream');
var Path = require('path');

function gulpFhtml(obj) {
    
    var stream = new Stream.Transform({objectMode: true});
    
    function parsePath(path) {
        var extname = Path.extname(path);
        return {
            dirname: Path.dirname(path),
            basename: Path.basename(path, extname),
            extname: extname
        };
    }
    
    stream._transform = function (originalFile, unused, callback) {
        
        
        var file = originalFile.clone({contents: false});
        var parsedPath = parsePath(file.relative);
        var path;
        
        
        callback(null, file);
    };
    
    return stream;
}

module.exports = gulpFhtml;