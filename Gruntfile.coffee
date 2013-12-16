module.exports = (grunt) ->
    @loadNpmTasks('grunt-browserify')
    @loadNpmTasks('grunt-contrib-clean')
    @loadNpmTasks('grunt-contrib-uglify')
    @loadNpmTasks('grunt-release')

    @initConfig
        clean:
            dist: ['dist']

        browserify:
            dist:
                files:
                    'dist/node-po.js': ['node_modules/node-po/lib/po.js']
                options:
                    alias: 'node_modules/node-po/lib/po.js:node-po'

        uglify:
            dist:
                files:
                    'dist/node-po.min.js': 'dist/node-po.js'

    @registerTask 'default', ['build']
    @registerTask 'build', ['clean', 'browserify', 'uglify']
    @registerTask 'package', ['build', 'release']
