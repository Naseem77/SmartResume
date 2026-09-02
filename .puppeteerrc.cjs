const { join } = require('path')

/**
 * Keep Puppeteer's Chrome inside the project instead of ~/.cache so it is
 * installed by `npm install` and cannot go missing independently of node_modules.
 * @type {import('puppeteer').Configuration}
 */
module.exports = {
  cacheDirectory: join(__dirname, 'node_modules', '.cache', 'puppeteer'),
}
