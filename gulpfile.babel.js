// Generated on 2015-12-23 using generator-angular-fullstack 3.1.1
'use strict';

import _ from 'lodash';
import del from 'del';
import gulp from 'gulp';
import path from 'path';
import gulpLoadPlugins from 'gulp-load-plugins';
import lazypipe from 'lazypipe';
import runSequence from 'run-sequence';

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

let lintScripts = lazypipe()
    .pipe(plugins.jshint, 'lib/.jshintrc')
    .pipe(plugins.jshint.reporter, 'jshint-stylish');

let transpile = lazypipe()
    .pipe(plugins.sourcemaps.init)
    .pipe(plugins.babel, {
        optional: ['es7.classProperties']
    })
    .pipe(plugins.sourcemaps.write, '.');

/********************
 * Tasks
 ********************/

gulp.task('clean', () => del(['dist/**']));

gulp.task('copy', () => {
  return gulp.src([
    'package.json',
  ], { cwdbase: true })
    .pipe(gulp.dest(paths.dist));
});

gulp.task('lint', () => {
    return gulp.src(_.union(paths.scripts, _.map(paths.tests, blob => '!' + blob)))
        .pipe(lintScripts());
});

gulp.task('transpile', () => {
    return gulp.src(paths.scripts)
        .pipe(transpile())
        .pipe(gulp.dest(paths.dist));
});

gulp.task('test', cb => {
  return runSequence(
      //'env:all',
      //'env:test',
      'mocha',
      //'mocha:coverage',
      cb);
});

function test(files) {
  return gulp.src(files)
    .pipe(plugins.mocha({
      reporter: 'spec',
      require: [ './test/mocha.conf' ]
    }))
    .once('end', function() {
      process.exit();
    });
}

gulp.task('mocha', () => {
  return test(paths.tests);
});

gulp.task('mocha:unit', () => {
  return test(paths.unitTests);
});

gulp.task('mocha:integration', () => {
  return test(paths.integrationTests);
});

gulp.task('watch', () => {
  plugins.watch(_.union(paths.scripts, paths.tests))
    .pipe(plugins.plumber())
    .pipe(lintScripts());
});

gulp.task('build', cb => {
  runSequence(
    'clean',
    'lint',
    'copy',
    'transpile',
    cb);
});

gulp.task('default', ['build']);
