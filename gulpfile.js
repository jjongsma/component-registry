'use strict';

var _ = require('lodash');
var del = require('del');
var gulp = require('gulp');
var gulpLoadPlugins = require('gulp-load-plugins');

var plugins = gulpLoadPlugins();
var config;

const paths = {
  scripts: ['lib/**/*.js'],
  tests: [ 'test/**/*.js', ],
  unitTests: [ 'test/unit/**/*.js', ],
  integrationTests: [ 'test/integration/**/*.js', ],
  dist: 'dist'
};

/********************
 * Reusable pipelines
 ********************/

/********************
 * Tasks
 ********************/

function test(files) {
  return gulp.src(files)
    .pipe(plugins.mocha({
      reporter: 'spec',
      require: [ './test/mocha.conf' ]
    }));
}

gulp.task('clean', () => del([paths.dist + '/**']));

gulp.task('lint', () => gulp.src(_.union(paths.scripts))
    .pipe(plugins.jshint('lib/.jshintrc'))
    .pipe(plugins.jshint.reporter( 'jshint-stylish'))
  );

gulp.task('copy', () => gulp.src(['package.json', 'lib'], { cwdbase: true })
    .pipe(gulp.dest(paths.dist))
  );

gulp.task('mocha', () => test(paths.tests));
gulp.task('mocha:unit', () => test(paths.unitTests));
gulp.task('mocha:integration', () => test(paths.integrationTests));

gulp.task('build', gulp.series('clean', 'lint', 'copy'));
gulp.task('test', gulp.series('mocha'));

gulp.task('default', gulp.series('build'));
