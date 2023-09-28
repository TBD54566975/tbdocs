var lib = require(path.join(__dirname, '../dist/index.js'))

// list all files in the current working directory
console.log(require('fs').readdirSync('.'))

lib.run()
