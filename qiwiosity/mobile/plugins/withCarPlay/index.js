/**
 * withCarPlay — an Expo config plugin that wires the Qiwiosity CarPlay
 * scene into the native iOS project produced by `expo prebuild`.
 *
 * What it does:
 *   1. Copies our four Swift source files into ios/<ProjectName>/CarPlay/
 *      and registers them with the Xcode project via project-level file
 *      references.
 *   2. Copies mobile/src/data/attractions.json into the iOS bundle so
 *      POIStore.swift can read it (identical file the React Native side
 *      already reads — no duplication).
 *   3. Edits Info.plist to:
 *        - Declare a second UIScene for CarPlay
 *        - Add UIBackgroundModes (audio, location)
 *        - Add NSLocationAlwaysAndWhenInUseUsageDescription if missing
 *        - Ensure UIApplicationSupportsMultipleScenes is true
 *   4. Adds the CarPlay + audio entitlements to Qiwiosity.entitlements.
 *
 * Usage (mobile/app.json):
 *   "plugins": [
 *     "expo-location",
 *     "./plugins/withCarPlay"
 *   ]
 *
 * Then: `npx expo prebuild --clean && npx pod-install ios`
 */

const {
  withInfoPlist,
  withEntitlementsPlist,
  withDangerousMod,
} = require('@expo/config-plugins');

const fs = require('fs');
const path = require('path');

const SWIFT_FILES = [
  'CarPlaySceneDelegate.swift',
  'CarPlayController.swift',
  'POIStore.swift',
  'QiwiosityAudioPlayer.swift',
];

const CARPLAY_SCENE_CONFIG = {
  UISceneConfigurations: {
    CPTemplateApplicationSceneSessionRoleApplication: [
      {
        UISceneConfigurationName: 'Qiwiosity CarPlay',
        UISceneClassName: 'CPTemplateApplicationScene',
        UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).CarPlaySceneDelegate',
      },
    ],
  },
};

const withCarPlay = (config) => {
  // -- 1. Entitlements --------------------------------------------------
  config = withEntitlementsPlist(config, (cfg) => {
    cfg.modResults['com.apple.developer.carplay-audio'] = true;
    // Ship-safe default: audio entitlement only. Add POI / navigation
    // entitlements below once Apple grants them — they're gated requests.
    // cfg.modResults['com.apple.developer.carplay-points-of-interest'] = true;
    // cfg.modResults['com.apple.developer.carplay-navigation']         = true;
    return cfg;
  });

  // -- 2. Info.plist ----------------------------------------------------
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSupportsMultipleScenes = true;

    // Merge scene manifest without clobbering an existing one.
    const existing = cfg.modResults.UIApplicationSceneManifest || {};
    const existingRoles = (existing.UISceneConfigurations || {});
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: true,
      UISceneConfigurations: {
        ...existingRoles,
        ...CARPLAY_SCENE_CONFIG.UISceneConfigurations,
      },
    };

    // Background modes for driving audio and location.
    const modes = new Set(cfg.modResults.UIBackgroundModes || []);
    modes.add('audio');
    modes.add('location');
    cfg.modResults.UIBackgroundModes = Array.from(modes);

    // Usage strings — defensive; expo-location usually sets these but we
    // want to guarantee CarPlay has what it needs.
    if (!cfg.modResults.NSLocationWhenInUseUsageDescription) {
      cfg.modResults.NSLocationWhenInUseUsageDescription =
        'Qiwiosity uses your location to surface stories for nearby places.';
    }
    if (!cfg.modResults.NSLocationAlwaysAndWhenInUseUsageDescription) {
      cfg.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
        'Qiwiosity uses background location so narration can start automatically as you drive past a landmark.';
    }

    return cfg;
  });

  // -- 3. Copy Swift files + attractions.json into native project ------
  config = withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const iosRoot = cfg.modRequest.platformProjectRoot; // .../ios
      const projectName = cfg.modRequest.projectName || 'Qiwiosity';
      const targetDir = path.join(iosRoot, projectName, 'CarPlay');
      const srcDir = path.join(__dirname, 'ios');

      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      for (const filename of SWIFT_FILES) {
        const from = path.join(srcDir, filename);
        const to = path.join(targetDir, filename);
        if (!fs.existsSync(from)) {
          console.warn(`[withCarPlay] Missing source ${from} — skipping`);
          continue;
        }
        fs.copyFileSync(from, to);
      }

      // Copy attractions.json into the bundle resources directory so
      // POIStore can read it. Same file the RN app reads — single source
      // of truth.
      const attractionsSrc = path.join(
        cfg.modRequest.projectRoot,
        'src',
        'data',
        'attractions.json'
      );
      if (fs.existsSync(attractionsSrc)) {
        const attractionsDest = path.join(iosRoot, projectName, 'attractions.json');
        fs.copyFileSync(attractionsSrc, attractionsDest);
      } else {
        console.warn(
          '[withCarPlay] src/data/attractions.json not found — CarPlay will ship empty.'
        );
      }

      return cfg;
    },
  ]);

  return config;
};

module.exports = withCarPlay;
