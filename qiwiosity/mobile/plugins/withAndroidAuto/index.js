/**
 * withAndroidAuto — an Expo config plugin that wires the Qiwiosity
 * Android Auto experience into the native Android project produced by
 * `expo prebuild`.
 *
 * Mirror of plugins/withCarPlay — same data, same four-tab layout, same
 * hand-off-to-Google-Maps navigation fallback, just on the Jetpack Car
 * App Library (androidx.car.app) instead of Apple's CarPlay framework.
 *
 * What it does:
 *   1. Copies our Kotlin sources into android/app/src/main/java/<pkg>/carapp/
 *      so the generated Android project compiles them.
 *   2. Copies mobile/src/data/attractions.json into android/app/src/main/assets/
 *      so POIStore.kt can read it (same single source of truth the RN app
 *      and iOS CarPlay both use).
 *   3. Adds an Android Auto XML descriptor at res/xml/automotive_app_desc.xml
 *      that declares this app as a "template" app (projected UI, not
 *      Automotive OS head units).
 *   4. Edits AndroidManifest.xml to:
 *        - Declare the CarAppService with intent filter and category
 *        - Declare a MediaBrowserService for Now Playing background audio
 *        - Add <meta-data> for the automotive_app_desc resource
 *        - Add required car-app category meta-data on <application>
 *        - Ensure required permissions + <queries> for Google Maps hand-off
 *   5. Injects the Gradle dependencies (androidx.car.app:app, media) via
 *      app/build.gradle's dependencies block.
 *   6. Adds minSdk / targetSdk floors (Car App Library needs minSdk 23+).
 *
 * Usage (mobile/app.json):
 *   "plugins": [
 *     "expo-location",
 *     "./plugins/withCarPlay",
 *     "./plugins/withAndroidAuto"
 *   ]
 *
 * Then: `npx expo prebuild --clean`
 */

const {
  withAndroidManifest,
  withDangerousMod,
  withAppBuildGradle,
  AndroidConfig,
} = require('@expo/config-plugins');

const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Source manifest
// ---------------------------------------------------------------------------

// Order matters only insofar as each file must be compilable on its own;
// Kotlin doesn't care about declaration order across files.
const KOTLIN_FILES = [
  'QiwiosityCarAppService.kt',
  'QiwiosityCarSession.kt',
  'POIStore.kt',
  'QiwiosityAudioPlayer.kt',
  'QiwiosityMediaService.kt',
  'CarLocationProvider.kt',
  'NearbyMapScreen.kt',
  'RegionsScreen.kt',
  'RegionDetailScreen.kt',
  'CategoriesScreen.kt',
  'CategoryDetailScreen.kt',
  'NowPlayingScreen.kt',
];

// Package where the Kotlin sources live inside the app. We namespace under
// `carapp` so it's obvious what this code is for at a glance in Android
// Studio's project view.
const CARAPP_SUBPACKAGE = 'carapp';

// Car App Library version. Pinning to a known-good 1.4.x release rather
// than `+` so Gradle resolution is reproducible; bump deliberately.
const CAR_APP_VERSION = '1.4.0';
const MEDIA_VERSION = '1.7.0';
const EXOPLAYER_VERSION = '2.19.1';

// ---------------------------------------------------------------------------
// Plugin entry
// ---------------------------------------------------------------------------

const withAndroidAuto = (config) => {
  config = withAndroidAutoManifest(config);
  config = withAndroidAutoGradle(config);
  config = withAndroidAutoFiles(config);
  return config;
};

// ---------------------------------------------------------------------------
// 1. AndroidManifest.xml
// ---------------------------------------------------------------------------

const withAndroidAutoManifest = (config) =>
  withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const application = manifest.application?.[0];
    if (!application) {
      throw new Error('[withAndroidAuto] No <application> tag in manifest — Expo regression?');
    }

    const pkg = AndroidConfig.Package.getPackage(cfg) || 'nz.qiwiosity.app';
    const carAppServiceClass = `${pkg}.${CARAPP_SUBPACKAGE}.QiwiosityCarAppService`;
    const mediaServiceClass = `${pkg}.${CARAPP_SUBPACKAGE}.QiwiosityMediaService`;

    // --- <queries> so we can launch Google Maps for nav hand-off -----------
    // Android 11+ package-visibility rules require this.
    manifest.queries = manifest.queries || [];
    const hasMapsQuery = manifest.queries.some((q) =>
      (q.package || []).some((p) => p.$?.['android:name'] === 'com.google.android.apps.maps')
    );
    if (!hasMapsQuery) {
      manifest.queries.push({
        package: [{ $: { 'android:name': 'com.google.android.apps.maps' } }],
        intent: [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW' } }],
            data: [{ $: { 'android:scheme': 'geo' } }],
          },
        ],
      });
    }

    // --- Permissions -------------------------------------------------------
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    const ensurePermission = (name) => {
      if (!manifest['uses-permission'].some((p) => p.$?.['android:name'] === name)) {
        manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    };
    // Background playback + notification foreground service type.
    ensurePermission('android.permission.FOREGROUND_SERVICE');
    ensurePermission('android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK');
    // Car App Library declares this implicitly, but declaring it is harmless
    // and makes the manifest self-describing.
    ensurePermission('androidx.car.app.ACCESS_SURFACE');
    ensurePermission('androidx.car.app.MAP_TEMPLATES');
    ensurePermission('android.permission.POST_NOTIFICATIONS');

    // --- <uses-feature> for Android Auto ----------------------------------
    manifest['uses-feature'] = manifest['uses-feature'] || [];
    const ensureFeature = (name, required = false) => {
      if (!manifest['uses-feature'].some((f) => f.$?.['android:name'] === name)) {
        manifest['uses-feature'].push({
          $: { 'android:name': name, 'android:required': String(required) },
        });
      }
    };
    ensureFeature('android.hardware.type.automotive', false);
    ensureFeature('android.software.car.templates_host', false);

    // --- <application> meta-data -----------------------------------------
    application['meta-data'] = application['meta-data'] || [];
    const ensureMeta = (name, resource, isResource = true) => {
      const key = isResource ? 'android:resource' : 'android:value';
      const existing = application['meta-data'].find(
        (m) => m.$?.['android:name'] === name
      );
      if (existing) {
        existing.$[key] = resource;
      } else {
        application['meta-data'].push({ $: { 'android:name': name, [key]: resource } });
      }
    };
    // Declares this app as an Android Auto *template* app.
    ensureMeta('com.google.android.gms.car.application', '@xml/automotive_app_desc');
    // Distraction-optimisation category — required, otherwise AA hides us.
    ensureMeta(
      'com.google.android.gms.car.application.theme',
      '@style/CarAppTheme',
      true
    );
    // Minimum Car App API level this app expects. 3 covers everything we
    // use (CPL 1.2+). Increase once we rely on newer APIs.
    ensureMeta('androidx.car.app.minCarApiLevel', '3', false);

    // --- <service> for the CarAppService ---------------------------------
    application.service = application.service || [];
    const hasCarAppService = application.service.some(
      (s) => s.$?.['android:name'] === carAppServiceClass
    );
    if (!hasCarAppService) {
      application.service.push({
        $: {
          'android:name': carAppServiceClass,
          'android:exported': 'true',
          'android:foregroundServiceType': 'mediaPlayback',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'androidx.car.app.CarAppService' } }],
            // POI category is the sweet spot for a travel app — we get the
            // map + list + detail templates without needing full nav
            // entitlements. Media also declared so Now Playing can run
            // foregrounded from the same service.
            category: [
              { $: { 'android:name': 'androidx.car.app.category.POI' } },
              { $: { 'android:name': 'androidx.car.app.category.MEDIA' } },
            ],
          },
        ],
      });
    }

    // --- <service> for the MediaBrowserService (Now Playing off-car) -----
    const hasMediaService = application.service.some(
      (s) => s.$?.['android:name'] === mediaServiceClass
    );
    if (!hasMediaService) {
      application.service.push({
        $: {
          'android:name': mediaServiceClass,
          'android:exported': 'true',
          'android:foregroundServiceType': 'mediaPlayback',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'android.media.browse.MediaBrowserService' } },
            ],
          },
        ],
      });
    }

    return cfg;
  });

// ---------------------------------------------------------------------------
// 2. android/app/build.gradle — add Car App Library + media deps
// ---------------------------------------------------------------------------

const withAndroidAutoGradle = (config) =>
  withAppBuildGradle(config, (cfg) => {
    let src = cfg.modResults.contents;

    // Bump minSdkVersion to 23 (Car App Library floor). Expo default is
    // already 24; we guard for older templates just in case.
    src = src.replace(
      /minSdkVersion\s+(\d+)/,
      (_, v) => `minSdkVersion ${Math.max(parseInt(v, 10), 23)}`
    );

    const marker = '// QIWIOSITY_ANDROID_AUTO_DEPS';
    if (!src.includes(marker)) {
      const injection = `
    ${marker}
    implementation "androidx.car.app:app:${CAR_APP_VERSION}"
    implementation "androidx.car.app:app-projected:${CAR_APP_VERSION}"
    implementation "androidx.media:media:${MEDIA_VERSION}"
    implementation "com.google.android.exoplayer:exoplayer-core:${EXOPLAYER_VERSION}"
    implementation "com.google.android.exoplayer:exoplayer-ui:${EXOPLAYER_VERSION}"
    implementation "org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3"
`;
      // Insert before the closing brace of the dependencies block. Regex is
      // anchored on the first `dependencies {` so we don't accidentally nibble
      // into buildscript { dependencies { ... } }.
      src = src.replace(
        /(dependencies\s*\{[\s\S]*?)(\n\})/,
        (_, head, tail) => `${head}${injection}${tail}`
      );
    }

    cfg.modResults.contents = src;
    return cfg;
  });

// ---------------------------------------------------------------------------
// 3. Copy Kotlin sources + attractions.json + XML resources
// ---------------------------------------------------------------------------

const withAndroidAutoFiles = (config) =>
  withDangerousMod(config, [
    'android',
    async (cfg) => {
      const androidRoot = cfg.modRequest.platformProjectRoot; // .../android
      const pkg = AndroidConfig.Package.getPackage(cfg) || 'nz.qiwiosity.app';
      const pkgPath = pkg.replace(/\./g, '/');

      // Kotlin source directory: android/app/src/main/java/<pkg>/carapp/
      const kotlinTargetDir = path.join(
        androidRoot,
        'app',
        'src',
        'main',
        'java',
        pkgPath,
        CARAPP_SUBPACKAGE
      );
      fs.mkdirSync(kotlinTargetDir, { recursive: true });

      const kotlinSrcDir = path.join(__dirname, 'android', 'kotlin');

      for (const filename of KOTLIN_FILES) {
        const from = path.join(kotlinSrcDir, filename);
        const to = path.join(kotlinTargetDir, filename);
        if (!fs.existsSync(from)) {
          console.warn(`[withAndroidAuto] Missing Kotlin source ${from} — skipping`);
          continue;
        }
        // Rewrite the template package declaration `package nz.qiwiosity.app.carapp`
        // to match whatever the real package is (in case someone rebrands).
        const body = fs.readFileSync(from, 'utf8').replace(
          /^package\s+nz\.qiwiosity\.app\.carapp\s*$/m,
          `package ${pkg}.${CARAPP_SUBPACKAGE}`
        );
        fs.writeFileSync(to, body, 'utf8');
      }

      // --- XML resources --------------------------------------------------
      const xmlTargetDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'xml');
      const valuesTargetDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'values');
      const drawableTargetDir = path.join(androidRoot, 'app', 'src', 'main', 'res', 'drawable');
      fs.mkdirSync(xmlTargetDir, { recursive: true });
      fs.mkdirSync(valuesTargetDir, { recursive: true });
      fs.mkdirSync(drawableTargetDir, { recursive: true });

      const xmlSrcDir = path.join(__dirname, 'android', 'res', 'xml');
      const valuesSrcDir = path.join(__dirname, 'android', 'res', 'values');
      const drawableSrcDir = path.join(__dirname, 'android', 'res', 'drawable');

      for (const file of fs.readdirSync(xmlSrcDir)) {
        fs.copyFileSync(path.join(xmlSrcDir, file), path.join(xmlTargetDir, file));
      }
      if (fs.existsSync(valuesSrcDir)) {
        for (const file of fs.readdirSync(valuesSrcDir)) {
          fs.copyFileSync(
            path.join(valuesSrcDir, file),
            path.join(valuesTargetDir, `qiwiosity_${file}`)
          );
        }
      }
      if (fs.existsSync(drawableSrcDir)) {
        // Names are already namespaced `ic_qw_*`, so no collision risk
        // with existing Expo drawables (splash icon, etc).
        for (const file of fs.readdirSync(drawableSrcDir)) {
          fs.copyFileSync(
            path.join(drawableSrcDir, file),
            path.join(drawableTargetDir, file)
          );
        }
      }

      // --- Copy attractions.json into assets/ -----------------------------
      const assetsTargetDir = path.join(androidRoot, 'app', 'src', 'main', 'assets');
      fs.mkdirSync(assetsTargetDir, { recursive: true });

      const attractionsSrc = path.join(
        cfg.modRequest.projectRoot,
        'src',
        'data',
        'attractions.json'
      );
      if (fs.existsSync(attractionsSrc)) {
        fs.copyFileSync(
          attractionsSrc,
          path.join(assetsTargetDir, 'attractions.json')
        );
      } else {
        console.warn(
          '[withAndroidAuto] src/data/attractions.json not found — Android Auto will ship empty.'
        );
      }

      return cfg;
    },
  ]);

module.exports = withAndroidAuto;
