var gulp = require('gulp');
var $ = require('gulp-load-plugins')();

gulp.task('test', function () {
  return gulp.src('test/**/*.js', { read: false })
    .pipe($.mocha({ reporter: 'nyan' }));
});

gulp.task('watch', function () {
  gulp.watch(['test/**/*.js'], ['test']);
});

