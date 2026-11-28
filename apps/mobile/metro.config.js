const { getDefaultConfig } = require('expo/metro-config');
const { withUniwindConfig } = require('uniwind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: './global.css',
  dtsFile: './src/uniwind-types.d.ts',
  // Colour themes beyond light/dark (see src/lib/palettes.ts).
  extraThemes: ['bone-light', 'bone-dark', 'mouse-light', 'mouse-dark', 'obsidian-dim-dark', 'obsidian-dark'],
});
