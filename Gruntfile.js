"use strict";

// init Grunt
var grunt = require('grunt');

grunt.loadNpmTasks('grunt-browserify');
grunt.loadNpmTasks('photoswipe');

// define configuration
grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    browserify: {
      dist: {
        files: {
          'photo_mapper/static/js/bundle.js': ['client/*.js']
        },
        options: {
          transform: [ 
            [ "babelify", { "presets": ["es2015", "react"] }] ,
            [ 'browserify-css', { global: true } ]
          ]
        }
      }
    }
});

grunt.registerTask('default', ['browserify']);

