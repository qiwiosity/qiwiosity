# withAndroidAuto

Expo config plugin that wires up the Qiwiosity Android Auto experience.
It's the Android-side twin of `withCarPlay`.

## What it produces in the generated `android/` tree

- `android/app/src/main/java/<pkg>/carapp/` — Kotlin sources
  (`QiwiosityCarAppService`, `QiwiosityCarSession`, four `Screen`s,
  `POIStore`, `QiwiosityAudioPlayer`, `QiwiosityMediaService`)
- `android/app/src/main/res/xml/automotive_app_desc.xml` — the XML that
  tells Android Auto this app is a "template" app (projected UI, not
  Automotive OS head-unit native)
- `android/app/src/main/res/values/qiwiosity_styles.xml` — `CarAppTheme`
  resource referenced from the manifest
- `android/app/src/main/assets/attractions.json` — same file the RN app
  and iOS CarPlay both read; single source of truth
- Manifest edits: `<service>` declarations, `<meta-data>`, permissions,
  `<queries>` for Google Maps hand-off, `<uses-feature>` flags
- Gradle edits: `androidx.car.app`, `androidx.media`, ExoPlayer, coroutines

## Why a config plugin, not manual edits?

`expo prebuild --clean` wipes the `android/` directory every time. The
plugin is the only way to make these native changes survive regeneration.

## Knobs worth knowing about

- `CAR_APP_VERSION` / `MEDIA_VERSION` / `EXOPLAYER_VERSION` in `index.js`
  pin Gradle versions — bump them deliberately when you're ready to test
  against a new release.
- The Car App Service is registered for **both** `POI` and `MEDIA`
  categories. POI gives us the map + list templates a travel app needs;
  MEDIA lets our Now Playing audio run in the foreground from the same
  service. Drop MEDIA if Play Console flags the dual-category submission.
- `minCarApiLevel` is set to **3**, the level that supports the map
  templates we rely on. Don't bump without checking that DHU and the
  oldest phones in your test fleet still work.

## Running

From `mobile/`:

```bash
npx expo prebuild --clean
./gradlew :app:assembleDebug    # in android/
```

See `qiwiosity/ANDROID_AND_ANDROID_AUTO_SETUP.md` for the full build
and Desktop Head Unit test loop.

## If something's missing in the car

1. `adb logcat | grep -i qiwiosity` — our Kotlin logs tag every path.
2. `adb logcat | grep -i "CarApp"` — CPL logs show template rejections
   (distraction rules, unsupported templates).
3. Re-run `expo prebuild --clean` to re-inject any file you may have
   edited directly in the generated tree.
