#! /usr/bin/env node

/* --execute=node-- */

//---------//
// Imports //
//---------//

var bPromise = require('bluebird')
    , bFs = require('fs-bluebird')
    , path = require('path')
    , bAsync = bPromise.promisifyAll(require('async'))
    , bGlob = bPromise.promisify(require('glob'))
    , bRimraf = bPromise.promisify(require('rimraf'));


//------//
// Init //
//------//

var home = process.env.HOME;
var fontsDir = path.join(home, 'data/fonts');
var fontsMetaData = {};
var jsonMetadataFileName = 'METADATA.json';
var a = 0;


//------//
// Main //
//------//

bGlob(path.join(fontsDir, '*/METADATA.json'))
    .then(function(files) {
        files = files.map(function(f) {
            return bPromise.join(
                bFs.readFileAsync(f)
                , path.dirname(f)
                , extractMetadata
            );
        });

        return bPromise.all(files);
    })
    .then(function() {
        return [
            path.join(fontsDir, jsonMetadataFileName)
            , bFs.writeFileAsync(path.join(fontsDir, jsonMetadataFileName), JSON.stringify(fontsMetaData, null, '\t'))
        ];
    })
    .spread(function(fileWritten) {
        console.log('finished writing to: ' + fileWritten);
    })
    .catch(function(err) {
        // cleanup
        return bPromise.join(
            bFs.existsAsync(path.join(fontsDir, jsonMetadataFileName))
            , path.join(fontsDir, jsonMetadataFileName)
            , err
            , deleteIfExists
        );
    });

function deleteIfExists(exists, filePath, err) {
    if (exists) {
        bRimraf(filePath)
            .then(function() {
                throw err;
            });
    } else {
        throw err;
    }
}

function extractMetadata(fdata, fullDirPath) {
    var curFontMetadata = JSON.parse(fdata);
    var curFonts = curFontMetadata.fonts;

    curFonts.forEach(function(e) {
        var curFontName = e.postScriptName;
        var curFontFile = e.filename;
        var curFontCopyright = e.copyright;
        var curFontFamily = e.name;
        var curWeight = e.weight;
        var curStyle = e.style;
        fontsMetaData[curFontName] = {
            familyname: curFontFamily
            , weight: curWeight
            , style: curStyle
            , filename: path.join(fullDirPath, curFontFile)
            , copyright: curFontCopyright
        };
    });
}
