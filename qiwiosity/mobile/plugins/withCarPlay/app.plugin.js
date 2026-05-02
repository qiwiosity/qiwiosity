// Expo resolves plugins by looking for app.plugin.js at the plugin root
// and re-exporting index.js. Keeps "./plugins/withCarPlay" working in
// app.json without having to write "./plugins/withCarPlay/index.js".
module.exports = require('./index');
