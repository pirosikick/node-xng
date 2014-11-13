'use strict';

require('es6-promise').polyfill();

var os = require('os');
var fs = require('fs');
var path = require('path');
var child_process = require('child_process');
var _ = require('lodash');

var promisify = require('es6-promisify');
var exec = promisify(child_process.exec, function (err, stdout, stderr) {
  err ? this.reject(err) : this.resolve(stdout, stderr);
});
var readdir = promisify(fs.readdir);
var readFile = promisify(fs.readFile);
var rmdir = promisify(fs.rmdir);

var tmpBase = path.resolve(__dirname, '../tmp');
var tmpDir = tmpBase + '/' + (+new Date());
var source = path.resolve(__dirname, '../test/vine.mp4');
var fps = 30;
var command = ['ffmpeg', '-i', source, '-r', fps, tmpDir + '/%3d.jpg'].join(' ');

if (!fs.existsSync(tmpBase)) {
  fs.mkdirSync(tmpBase);
}
fs.mkdirSync(tmpDir);

module.exports = function (source, options) {
  var fps = options.fps || 30;
  var imageType = options.imageType || 'jpeg';
  var tmpDir = (options.tmpDir || os.tmpDir());
  var timestamp = (new Date()).getTime();

  if (!fs.existsSync(tmpDir) && !fs.mkdirSync(tmpDir)) {
    throw new 'fs.mkdirSync(options.tmpDir) is failed. tmpDir="'+tmpDir+'"';
  }
  console.log(tmpDir);

  tmpDir += '/' + timestamp;
  fs.mkdirSync(tmpDir);

  var output = tmpDir + '/%3d.' + imageType;
  var command = ['ffmpeg', '-i', source, '-r', fps, output].join(' ');

  exec(command)
    .then(
      function () {
        return readdir(tmpDir);
      },
      function (err) {
        console.log(err);
      }
    )
    // read files
    .then(function (files) {
      var promises = _.map(files, function (file) {
        return readFile(path.resolve(tmpDir, file));
      });

      return Promise.all(promises);

    }).catch(function (err) { console.log(err); })
    // buffer -> Data URL
    .then(function (buffers) {
      return _.map(buffers, function (buffer) {
        return 'data:image/jpeg;base64,' + buffer.toString('base64');
      });
    })
    .then(function (dataURLs) {
      console.log(buildXng(dataURLs, 33));
    })
    .then(function () {
      return rmdir(tmpDir);
    });

}

function buildXng (dataURLs, duration) {
  var numOfFrames = dataURLs.length;
  var imageTags = [];
  var setTags = [];
  var beforeId = false;

  _.forEach(dataURLs, function (url, index) {
    var id = zeroPadding(index);
    imageTags.push (imageTag(id, url));
    setTags.push(setTag(id, beforeId, 33));
    beforeId = id;
  });

  return svg(300, 300, imageTags, setTags);
}

function svg(width, height, imageTags, setTags) {
  var openTag = tag('svg', {
    'xmlns': 'http://www.w3.org/2000/svg',
    'xmlns:A': 'http://www.w3.org/1999/xlink',
    'width': width,
    'height': height
  });

  return openTag
    + imageTags.join('')
    + setTags.join('')
    + '</svg>';
}

function imageTag(id, dataURL) {
  return tag('image', {
    'id': 'i' + id,
    'height': '100%',
    'A:href': dataURL
  }, true);
}

function setTag(id, beforeId, duration) {
  var begin;

  if (beforeId) {
    begin = 'a' + beforeId + '.end';
  } else {
    begin = '0s';
  }

  return tag('set', {
    'A:href': 'i' + id,
    'dur': duration + 'ms',
    'id': 'a' + id,
    'attributeName': 'width',
    'to': '100%',
    'begin': begin
  }, true);
}

function tag(tagName, attributes, close) {
  var keyValues = _.map(attributes, function (value, key) {
    // key="value"
    return key + '="' + value + '"';
  });

  return '<' + tagName + ' ' + keyValues.join(' ') + (close ? ' />' : '>');
}

function zeroPadding (num, numOfFrames) {
  var numOfDigits = ((numOfFrames - 1) + "").length;
  var zeros = new Array(numOfDigits).join('0');
  return (zeros + (num + '')).slice(-numOfDigits);
}
