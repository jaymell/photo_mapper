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
          'photo_mapper/static/js/bundle.js': ['client/*.js', 'client/*.jsx']
        },
        options: {
          transform: [ 
            [ "babelify", { "presets": ["es2015", "react"] }] ,
            [ 'browserify-css', { global: true } ]
          ]
        }
      }
    },
    shell: {
        pre: {
          command: [
            'cd node_modules/photoswipe',
            'npm i',
            'grunt'
          ].join('&&')
        },
        post: {
          command: './hack.sh'
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
    copy: {
      main: {
        cwd: 'node_modules/photoswipe/dist/default-skin',
        src: '*',
        dest: 'photo_mapper/static/lib/img/',
        expand: true
      }
    }
});

grunt.registerTask('default', ['shell:pre', 'browserify', 'copy', 'shell:post']);

