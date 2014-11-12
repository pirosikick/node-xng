'use strict';

require('es6-promise').polyfill();

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
    console.log(dataURLs);
  })
  .then(function () {
    return rmdir(tmpDir);
  });

