/**
 * Created by anthony on 25/06/2017.
 */
const gulp = require('gulp')
const _ = require('lodash')
const Parse = require('parse5')

let Stream = require('stream')
let Path = require('path')
const pretty = require('pretty');

const TEMPLATE = `
<!doctype html>
<html lang="en">
<head>
  <%= head %>
  <meta charset="UTF-8">
    <title>Super Awesome</title>
    
    <!-- CSS (load bootstrap from a CDN) -->
    <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous">
    <link rel="stylesheet" href="/css/main.css">
</head>

<body>
  <%= body %>
</body>
</html>
`

function parsePath(path) {
    let extname = Path.extname(path);
    return {
        dirname: Path.dirname(path),
        basename: Path.basename(path, extname),
        extname: extname
    };
}

function serializedAttrs(attrs) {
    let result = []
    for (let attr of attrs) {
        result.push(`${attr.name}="${attr.value}"`)
    }
    return result.join(' ')
}

function serializeNode(node) {
    return `<${node.tagName} ${serializedAttrs(node.attrs)}>${Parse.serialize(node)}</${node.tagName}>`
}

function getLocs(doc, result) {
    result = result || {}
    
    let attrs = doc.attrs
    if (_.isArray(attrs) && !_.isEmpty(attrs)) {
        for (let attr of attrs) {
            if (attr.name === 'loc') {
                let val = ['b.', 'h.'].includes(attr.value.substring(0, 2)) ? attr.value : 'b.' + attr.value
                result[val] = doc//.html
                break
            }
        }
    }
    
    if (!_.isArray(doc.childNodes)) return result
    
    for (let childNode of doc.childNodes) {
        result = _.merge(result, getLocs(childNode))
    }
    
    return result
}

function charCount(string, char) {
    return string.split(char).length - 1
}

// gulp.task('default', () => {
//     console.log(charCount('hello', 'l'))
// })

function setNode(parent, child, keyPath) {
    let finalDest = toIndex(keyPath[0])
    let nodes = parent.childNodes
    if (keyPath.length === 1) {
        if(finalDest >= nodes.length || finalDest === -1){
            nodes.push(child)
        } else {
            nodes.splice(finalDest, 0, child)
        }
    } else {
        setNode(_.nth(nodes), child, keyPath.slice(1))
    }
}

function toIndex(char) {
    const lowerCaseChar = String(char).toLowerCase()
    if (lowerCaseChar === 'first') {
        return 0
    } else if (lowerCaseChar === 'last') {
        return -1
    } else {
        return _.toInteger(char)
    }
}

function buildHtml(locMap) {
    let locArr = _.toPairs(locMap)
    let maxKeyLength = 0
    
    let bRoots = locArr.filter(([key, __]) => {
        //console.log('filter:', key, ' num:', charCount(key, '\.'))
        let dotCount = charCount(key, '.')
        if (dotCount > maxKeyLength) maxKeyLength = dotCount
        return charCount(key, '.') === 1
    })
    
    bRoots = _.sortBy(bRoots, ([key, __]) => {
        let idx = toIndex(key.split('.')[1])
        return idx === -1 ? bRoots.length - 1 : idx
    })
    
    console.log('max length:', maxKeyLength)
    
    for (let i = 2; i <= maxKeyLength; i++) {
        for (let [key, node] of locArr) {
            let keyPath = key.split('.')
            if (keyPath.length - 1 !== i || keyPath[0] !== 'b') continue
            
            let destIdx = toIndex(keyPath[1])
            let [parentKey, parentNode] = _.nth(bRoots, destIdx)
            
            console.log('setting (i=%s) \'%s\' to \'%s\'', i, key, parentKey)
            setNode(parentNode, node, keyPath.slice(2))
        }
    }
    let body = pretty(bRoots.map(([key, node]) => serializeNode(node)).join('\n'))
    return {head: '', body}
}

function gulpFhtml(opts) {
    
    let stream = new Stream.Transform({objectMode: true});
    
    stream._transform = function (file, encoding, callback) {
        
        let parsedPath = parsePath(file.relative);
        if (file.isStream()) {
            console.log('file is stream!')
        } else if (file.isBuffer()) {
            let contents = String(file.contents)
            let doc = Parse.parse(contents)
            let locMap = getLocs(doc)
            //console.dir(locMap)
            file.contents = new Buffer(_.template(TEMPLATE)(buildHtml(locMap)));
        }
        
        file.path = Path.join(file.base, parsedPath.basename + '.html');
        callback(null, file);
    }
    
    return stream
}

gulp.task('default', () => {
    return gulp.src('./examples/sample.fhtml')
        .pipe(gulpFhtml())
        .pipe(gulp.dest('./tmp/'))
})

