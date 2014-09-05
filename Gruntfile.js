/*global module*/
/*global require*/

// Generated on 2014-04-28 using generator-angular 0.8.0
'use strict';

// # Globbing
// for performance reasons we're only matching one level down:
// 'test/spec/{,*/}*.js'
// use this if you want to recursively match all subfolders:
// 'test/spec/**/*.js'

module.exports = function (grunt) {

  // Load grunt tasks automatically
  require('load-grunt-tasks')(grunt);

  // Time how long tasks take. Can help when optimizing build times
  require('time-grunt')(grunt);

  // Define the configuration for all the tasks
  grunt.initConfig({

    meta: {
      pkg: grunt.file.readJSON('package.json'),
      app: require('./bower.json').appPath || 'app',
      dist: 'dist',
      version: '<%= meta.pkg.version %>',
      banner: '// <%= meta.pkg.name %> v<%= meta.version %>\n' +
        '// Copyright (c)<%= grunt.template.today("yyyy") %> Boris Kozorovitzky.\n' +
        '// Distributed under MIT license\n' +
        '// https://github.com/BorisKozo/angular-async-locks' + '\n\n'
    },

    // Make sure code styles are up to par and there are no obvious mistakes
    jshint: {
      options: {
        jshintrc: '.jshintrc',
        reporter: require('jshint-stylish')
      },
      all: [
        'Gruntfile.js',
        '<%= meta.app %>/{,*/}*.js'
      ]
    },

    // Empties folders to start fresh
    clean: {
      dist: {
        files: [{
          dot: true,
          src: [
            '.tmp',
            '<%= meta.dist %>/*',
            '!<%= meta.dist %>/.git*'
          ]
        }]
      },
      server: '.tmp'
    },
    rig: {
      compile: {
        options: {
          banner: '<%= meta.banner %>'
        },
        files: {
          '<%= meta.dist %>/async-lock.js': ['<%= meta.app %>/lib/async-lock.js']
        }
      }
    },
    uglify: {
      standard: {
        options: {
          banner: '<%= meta.banner %>'
        },
        files: {
          '<%= meta.dist %>/async-lock.min.js': ['<%= meta.app %>/lib/async-lock.js']
        }
      }
    },


  });

  grunt.registerTask('build', [
    'newer:jshint',
    'clean:dist',
    'rig:compile',
    'uglify:standard'
  ]);
};