'use strict';

require('colors');

module.exports = function (grunt) {
    require('load-grunt-tasks')(grunt);
    require('time-grunt')(grunt);

    grunt.initConfig({
        package: grunt.file.readJSON('package.json'),
        general: {
            dist: 'dist',
            src: 'src',
            tmp: 'tmp',
            test: 'test'
        },
        watch: {
            test: {
                // tasks and files options are set in `test` task
                options: {
                    spawn: false
                }
            }
        },
        clean: {
            tmp: ['tmp']
        },
        jsdoc : {
            dist : {
                src: ['<%= general.src %>/{browser,common,node}/*.js'],
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
                '<%= general.src %>/**/*.js'
            ]
        },
        browserify: {
            dist: {
                src: ['<%= general.src %>/browser/api.js'],
                dest: '<%= general.dist %>/gdc-api-<%= package.version %>.js',
                options: {
                    alias: ['<%= general.src %>/browser/api_factory.js:gdc-api']
                },
            },
            test: {
                // src option is set in `test` task
                dest: '<%= general.tmp %>/package.js',
                options: {
                    alias: ['<%= general.src %>/browser/api.js:gdc-api']
                },
            }
        },
        // using shell task to launch mocha since
        // grunt-mocha-test has issues when using in conjunction with watch task
        // (0 tests are run after a change has been detected)
        shell: {
            mocha: {
                options: {
                    stderr: false
                },
                reporter: 'spec',
                command: function() {
                    var files = grunt.config.get('shell.mocha.src'),
                        reporter = grunt.config.get('shell.mocha.reporter');

                    return './node_modules/istanbul/lib/cli.js cover _mocha -- --reporter ' + reporter + ' --colors ' + files.join(' ');
                },
            }
        },
        karma: {
            browser: {
                singleRun: true,
                autoWatch: false,
                frameworks: ['mocha'],
                port: 8181,
                browsers: ['Chrome'],
                reporters: ['spec'],
                options: {
                    files: ['<%= general.test %>/browser/lib/*.js', '<%= general.tmp %>/package.js']
                }
            }
        },
        test: {
            browser: {
                src: ['<%= general.test %>/{common,browser}/spec/*_test.js'],
                options: {
                    tasks: ['browserify:test', 'karma:browser'],
                    setSrcTo: 'browserify.test.src'
                }
            },
            node: {
                src: ['<%= general.test %>/{common,node}/spec/*_test.js'],
                options: {
                    tasks: ['shell:mocha'],
                    setSrcTo: 'shell.mocha.src'
                }
            }
        }
    });

    grunt.registerMultiTask('test', function() {
        var options = this.options();
        var testFilenamePattern = new RegExp('/' + (grunt.option('test') || '.*') + '_test\\.js$', 'i');
        var files = this.filesSrc.filter(function(filename) {
            return testFilenamePattern.test(filename);
        });

        // Limit the scope of following tasks to filtered set of files
        grunt.config.set(options.setSrcTo, files);

        var tasks = ['clean:tmp', 'jshint'].concat(options.tasks);

        var live = !!grunt.option('live');
        if (live) {
            grunt.config.set('watch.test.files', ['src/**/*.js'].concat(files));
            grunt.config.set('watch.test.tasks', tasks.slice());

            tasks.push('watch:test');
            grunt.option('force', true);
        }

        grunt.task.run(tasks);
    });

    grunt.registerTask('example-config', function() {
        var username = grunt.option('username'),
            password = grunt.option('password'),
            server = grunt.option('server') || 'secure.gooddata.com',
            domain = grunt.option('domain') || undefined,
            token = grunt.option('token') || undefined;

        if (!username || !password) {
            grunt.fail.fatal('Username and password must be set. Please see examples/README.md for help.');
        }

        var filename = __dirname + '/examples/config.json';
        if (grunt.file.exists(filename)) {
            grunt.fail.warn('Configuration file (examples/config.json) already exists. Please use --force option or delete this file manually.');
        }

        var config = {
            username: username,
            password: password,
            token: token,
            api: {
                domain: domain,
                hostname: server
            }
        };

        grunt.file.write(filename, JSON.stringify(config, null, '\t'));
    });

    grunt.registerTask('list-examples', function() {
        var exampleFiles = grunt.file.expand(['examples/{0,1}*.js']);
        if (!exampleFiles.length) {
            grunt.fail.fatal('There are no examples at the moment');
        }

        grunt.log.subhead('There are %d examples:', exampleFiles.length);
        exampleFiles.forEach(function(file) {
            var exampleName = file.match(/examples\/(.*?)\.js/)[1];
            var command = 'grunt run-example --example ' + exampleName;

            grunt.log.writeln(exampleName + '\t(run with ' + command.yellow + ')');
        });
    });

    grunt.registerTask('run-example', function() {
        var example = grunt.option('example');
        if (!example) {
            grunt.fail.fatal('You have to provide a name of an example to run. Please see examples/README.md for more information.');
        }

        var filename = __dirname + '/examples/' + example + '.js';
        if (!grunt.file.exists(filename)) {
            grunt.fail.fatal('Example named `' + example + '` does not exist. Please see examples/README.md for more information.');
        }

        var configFilename = __dirname + '/examples/config.json';
        if (!grunt.file.exists(configFilename)) {
            grunt.fail.fatal('Configuration file required for running an example not found. Please see examples/README.md for more information.');
        }

        var done = this.async();
        var spawn = require('child_process').spawn;
        var node = spawn('node', [filename]);

        node.stdout.on('data', function(data) {
            process.stdout.write(data.toString('utf8'));
        });

        node.stderr.on('data', function(data) {
            process.stderr.write(data.toString('utf8'));
        });

        node.on('exit', function() {
            done();
        });
    });

    grunt.registerTask('default', ['list-examples']);

    grunt.registerTask('build', ['browserify:dist']);
};
