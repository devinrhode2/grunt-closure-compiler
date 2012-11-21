module.exports = function(grunt) {

  'use strict';

  var exec = require('child_process').exec,
      fs = require('fs'),
      gzip = require('zlib').gzip;

  // From http://stackoverflow.com/a/3955096
  Array.prototype.remove = function() {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
      what = a[--L];
      while ((ax = this.indexOf(what)) !== -1) {
        this.splice(ax, 1);
      }
    }
    return this;
  };

  // ==========================================================================
  // TASKS
  // ==========================================================================

  grunt.registerMultiTask('closure-compiler', 'Minify JS files using Closure Compiler.', function() {

    var closurePath = '',
        reportFile = '',
        data = this.data,
        done = this.async();

    // Check for closure path.
    if (data.closurePath) {
      closurePath = data.closurePath;
    } else if (process.env.CLOSURE_PATH) {
      closurePath = process.env.CLOSURE_PATH;
    } else {
      grunt.log.error('' +
          '/!\\'.red +
          ' Set an environment variable called ' +
          'CLOSURE_PATH'.red + ' or the build parameter' + 'closurePath'.red +
          ' and\nmake it point to your root install of Closure Compiler.' +
          '\n');
      return false;
    }

    data.js = grunt.file.expandFiles(data.js);

    // Sanitize options passed.
    if (!data.js.length) {
      // This task requires a minima an input file.
      grunt.warn('Missing js property.');
      return false;
    }

    // Build command line.
    var buildCommand = function buildCommand(js, output) {
      var command = 'java -jar ' + closurePath + '/build/compiler.jar';

      // Indentation will happen in another commit
      if (data.simple || data.advanced) {
        //remove each simple script from main compilation
        if (data.advanced) throw new Error('the advanced option is not yet fully supported, please fork and implement it!');

        //forEach data.simple or data.advanced script...
        data[(data.simple ? 'simple' : 'advanced')].forEach(function(script){
          data.js.remove(script);
        });
      }
      command += ' --js ' + js.join(' --js ');

      if (data.jsOutputFile) {
        command += ' --js_output_file ' + data.jsOutputFile;
        reportFile = data.jsOutputFile + '.report.txt';
      }

      if (data.externs) {
        data.externs = grunt.file.expandFiles(data.externs);
        command += ' --externs ' + data.externs.join(' --externs ');

        if (!data.externs.length) {
          delete data.externs;
        }
      }

      if (data.options.externs) {
        data.options.externs = grunt.file.expandFiles(data.options.externs);

        if (!data.options.externs.length) {
          delete data.options.externs;
        }
      }

      for (var directive in data.options) {
        if (Array.isArray(data.options[directive])) {
          command += ' --' + directive + ' ' + data.options[directive].join(' --' + directive + ' ');
        } else if (data.options[directive] === undefined || data.options[directive] === null) {
          command += ' --' + directive;
        } else {
          command += ' --' + directive + ' ' + String(data.options[directive]);
        }
      }
      
      return command;
    };

    // Minify WebGraph class.
    options = { maxBuffer: data.maxBuffer*1024 };
    exec(buildCommand(data.js, data.jsOutputFile), options, function(err, stdout, stderr) {
      if (err) {
        grunt.warn(err);
        done(false);
      }

      if (stdout) {
        grunt.log.writeln(stdout);
      }

      exec(buildCommand(data.simple, data.), options, function(err, stdout, stderr) {
        if (err) {
          grunt.warn(err);
          done(false);
        }

        if (stdout) {
          grunt.log.writeln(stdout);
        }

        // If OK, calculate gzipped file size.
        if (reportFile.length) {
          var min = fs.readFileSync(data.jsOutputFile, 'utf8');
          min_info(min, function(err) {
            if (err) {
              grunt.warn(err);
              done(false);
            }

            // Write compile report to a file.
            console.log('write file path:', reportFile);

            fs.writeFile(reportFile, stderr, function(err) {
              if (err) {
                grunt.warn(err);
                done(false);
              }

              grunt.log.writeln('A report is saved in ' + reportFile + '.');
              done();
            });

          });
        }
      });
    });

  });

  // Output some size info about a file.
  function min_info(min, onComplete) {
    gzip(min, function(err, buffer) {
      if (err) {
        onComplete.call(this, err);
      }

      var gzipSize = buffer.toString().length;
      grunt.log.writeln('Compressed size: ' + String((gzipSize / 1024).toFixed(2)).green + ' kb gzipped (' + String(gzipSize).green + ' bytes).');

      onComplete.call(this, null);
    });
  }

};
