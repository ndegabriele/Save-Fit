// expo-share-intent uses one name for both the Xcode target and the label in the share sheet.
// "Save Fit" would clash with the app's own SaveFit target, so the target keeps its default
// name (ShareExtension) and this sets the label people see under the icon, once prebuild has written the files.
const fs = require('fs');
const path = require('path');
const { withFinalizedMod } = require('expo/config-plugins');

module.exports = function withShareExtensionName(config, { name, target = 'ShareExtension' }) {
  return withFinalizedMod(config, [
    'ios',
    async (cfg) => {
      const plist = path.join(cfg.modRequest.platformProjectRoot, target, `${target}-Info.plist`);
      if (fs.existsSync(plist)) {
        const xml = fs.readFileSync(plist, 'utf8');
        fs.writeFileSync(
          plist,
          xml.replace(/(<key>CFBundleDisplayName<\/key>\s*<string>)[^<]*(<\/string>)/, `$1${name}$2`),
        );
      }
      return cfg;
    },
  ]);
};
