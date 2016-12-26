"use strict";

// init Grunt
var grunt = require('grunt');
require('load-grunt-tasks')(grunt);

grunt.loadNpmTasks('grunt-browserify');
grunt.loadNpmTasks('grunt-contrib-watch');
grunt.loadNpmTasks('grunt-contrib-copy');

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
    },
    copy: {
      main: {
        src: 'node_modules/jquery-lazyload/jquery.lazyload.js',
        dest: 'photo_mapper/static/lib/js/'
      }
    },
    shell: {
        target: {
          command: [
            "./hack.sh",
            'cd node_modules/photoswipe',
            'npm i',
            'grunt'
     ].join('&&')
        }
    },
    watch: {
      scripts: {
        files: ['client/*'],
        tasks: ['browserify'],
        options: {
          spawn: false,
        },
      },
    },
});

grunt.registerTask('default', ['shell', 'browserify']);

