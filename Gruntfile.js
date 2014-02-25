'use strict';

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
        watch: {
            test: {
                files: ['lib/**/*.js', 'test/**/*.js'],
                tasks: ['shell:test']
            }
        },
        jsdoc : {
            dist : {
                src: ['lib/**/*.js'],
                options: {
                    destination: 'docs'
                }
            }
        },
        jshint: {
            options: {
                jshintrc: '.jshintrc',
                reporter: require('jshint-stylish')
            },
            all: [
                'Gruntfile.js',
                'src/**/*.js'
            ]
        },
        shell: {
            test: {
                command: 'mocha --reporter spec --colors --timeout 150000',
                options: {
                    stdout: true,
                    stderr: true
                }
            }
        }
    });

    grunt.registerTask('test', function(target) {
        var tasks = ['jshint', 'shell:test'];
        var pattern = grunt.option('test') || '*';
        var test = 'test/' + pattern + '_test.js';
        
        grunt.config.set('shell.test.command', grunt.config.get('shell.test.command') + ' ' + test);

        if (target === 'live') {
            tasks.push('watch:test');
        }

        grunt.task.run(tasks);
    });

    grunt.registerTask('default', ['test']);
};
