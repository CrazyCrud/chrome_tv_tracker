module.exports = function(grunt) {
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),
		sass: {
            options: {
                imagePath: 'assets',
                outputStyle: 'compressed',
            },
            dist: {
                files: {
                    'app/css/app.css': 'app/scss/app.scss'
                }
            }
        },
        autoprefixer: {
            options: {
            	browsers: ['last 2 Chrome versions']
            },
            no_dest: {
                src: 'app/css/app.css'
            },
        },
        concat: {
            options: {
              separator: ';',
              stripBanners: {
                block: true,
                line: true
              },
            },
            app: {
              src: ['app/js/vendor/underscore.js', 'app/js/vendor/jquery.js', 'app/js/vendor/mui.js', 'app/js/app.js'],
              dest: 'app/js/production.js',
            }
        },
		chromeManifest: {
			dist: {
				options: {
					buildnumber: 'false',
					background: {
						target: 'js/background.js',
						exclude: [
						  
						]
					}
				},
				src: 'app',
				dest: 'dist'
			}
		},
		watch: {
            grunt: {
                files: ['Gruntfile.js']
            },
            css: {
                files: ['app/scss/**/*.scss', 'app/scss/framework/*.scss', 'app/scss/modules/*.scss', 'app/scss/sections/*.scss', 'app/scss/vendor/**/*.scss'],
                tasks: ['sass'],
                options: {
                  livereload: false,
                },
            },
            scripts: {
                files: ['app/js/app.js'],
                tasks: ['concat'],
                options: {
                  spawn: true,
                },
            }
        }
	});

	grunt.loadNpmTasks('grunt-sass');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-contrib-concat');
    grunt.loadNpmTasks('grunt-chrome-manifest');
    grunt.loadNpmTasks('grunt-contrib-watch');
	

	grunt.registerTask('build', ['sass', 'autoprefixer', 'concat', 'chromeManifest:dist']);
    grunt.registerTask('default', ['build', 'watch']);
};