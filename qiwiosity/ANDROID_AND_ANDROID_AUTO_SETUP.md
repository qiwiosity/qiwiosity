# Qiwiosity — Android & Android Auto setup

This doc is the full build-and-test loop for the Android app, including
the Android Auto integration. Read it end-to-end the first time; after
that, the "Daily build" section is the only bit you'll touch.

It's the Android twin of `IOS_AND_CARPLAY_SETUP.md`. The phone app is
the same Expo project; the car side is a Jetpack **Car App Library**
(`androidx.car.app`) integration, mirroring the iOS CarPlay layout — four
tabs (Nearby / Regions / Categories / Listening), play story + navigate
hand-off on each POI.

## What got added

**Mobile app (Expo / React Native) — unchanged source, new Android wiring**

- The existing contexts, hooks, screens and `contentCache` already
  target both platforms; no JS changes are needed.
- `app.json` now lists two more Android permissions
  (`FOREGROUND_SERVICE_MEDIA_PLAYBACK`, `POST_NOTIFICATIONS`) and
  registers the new plugin.

**Android Auto (native Android)**

- `mobile/plugins/withAndroidAuto/` — config plugin that runs on every
  `expo prebuild`. It:
  - copies Kotlin sources into
    `android/app/src/main/java/<pkg>/carapp/`
  - copies `attractions.json` into `android/app/src/main/assets/` so
    `POIStore.kt` can read it
  - drops an `automotive_app_desc.xml` into `res/xml/` declaring this as
    an AA "template" app, and a `styles.xml` with the `CarAppTheme`
    referenced from the manifest
  - edits `AndroidManifest.xml` to declare `QiwiosityCarAppService`
    (with the POI + MEDIA categories), `QiwiosityMediaService`,
    required `<queries>` for the Google Maps hand-off, car meta-data,
    background playback permissions, and the `<uses-feature>` flags AA
    looks for
  - injects the Gradle dependencies
    (`androidx.car.app:app`, `androidx.media:media`, ExoPlayer,
    Kotlin coroutines) into `app/build.gradle`
- Kotlin side: `QiwiosityCarAppService`, `QiwiosityCarSession`, four
  screens (`NearbyMapScreen`, `RegionsScreen`, `CategoriesScreen`,
  `NowPlayingScreen`) plus `PoiActionScreen` (the action sheet),
  `POIStore`, `QiwiosityAudioPlayer`, `QiwiosityMediaService`. Tapping a
  POI offers "Play story" or "Navigate"; the nav hand-off uses the
  `google.navigation:` intent (Google Maps) and falls back to `geo:`.

## Prerequisites

- macOS, Linux, or Windows with WSL2 — anywhere JDK 17 runs
- JDK 17 (Android Gradle Plugin 8+ requires it)
- Android Studio Koala (2024.1) or newer
- Android SDK Platform 34 + build-tools 34
- Node 18+
- A physical Android device **or** an emulator running Android 11+
  (Android Auto requires at least API 23 to build, but AA-on-phone
  works on API 29+; the DHU needs a head-unit-class image)
- Desktop Head Unit — install via
  `Android Studio → More Actions → SDK Manager → SDK Tools →
  Android Auto Desktop Head Unit Emulator`

## One-time setup

From the repo root:

```bash
npm install
npm --workspace mobile install
```

Generate the native Android project (the `withAndroidAuto` plugin runs
during this step):

```bash
cd qiwiosity/mobile
npx expo prebuild --clean
```

Confirm the wiring actually made it into the generated project:

```bash
# Both should print a line each.
grep -R "QiwiosityCarAppService" android/app/src/main/AndroidManifest.xml
grep -R "automotive_app_desc"     android/app/src/main/AndroidManifest.xml
# Kotlin sources should exist under your package path:
ls android/app/src/main/java/nz/qiwiosity/app/carapp/
# attractions.json should be in assets/:
ls android/app/src/main/assets/attractions.json
```

Build a debug APK:

```bash
cd android
./gradlew :app:assembleDebug
```

The APK lands at `android/app/build/outputs/apk/debug/app-debug.apk`.

## Enabling developer mode on your phone (one-time)

Android Auto on a phone refuses to load your side-loaded app unless
developer mode is on inside the Android Auto app itself:

1. Install and launch the **Android Auto** app on your phone.
2. Settings → tap the version number 10 times → developer mode unlocked.
3. Settings → three-dot menu → Developer settings → enable
   **"Unknown sources"**.

Without this, the car UI will refuse to surface Qiwiosity even when
connected to a head unit.

## Testing on the Desktop Head Unit (DHU)

The fastest test loop. No car required.

```bash
# Install the debug APK on a connected phone first.
adb install -r android/app/build/outputs/apk/debug/app-debug.apk

# Forward the DHU port from the phone.
adb forward tcp:5277 tcp:5277

# Start the DHU (path depends on your SDK install).
~/Library/Android/sdk/extras/google/auto/desktop-head-unit   # macOS
# or
$ANDROID_HOME/extras/google/auto/desktop-head-unit            # Linux/WSL
```

In the DHU window, click through the AA home screen → app launcher →
**Qiwiosity**. You should see the four tabs. If the app isn't listed:

- Re-check the "enabling developer mode" step above.
- Open `adb logcat | grep -iE 'qiwiosity|carapp|gms.car'` while opening
  AA; rejection reasons show up there (template distraction rules,
  missing manifest entries, etc.).

## Daily build

After you've changed something on the car side:

```bash
cd qiwiosity/mobile
npx expo prebuild --clean           # re-injects Kotlin + manifest edits
cd android
./gradlew :app:installDebug         # reinstalls on the connected phone
```

If you've only changed JS and have not touched the plugin, you don't
need to re-prebuild — `expo start` is enough for phone development.

## Release checklist (Play Console → Android Auto)

1. Sign a release APK/AAB with your upload key.
2. Play Console → your app → **Cars** → declaration → tick
   **Android Auto – template app (POI)**.
3. Upload the AAB to a closed testing track.
4. Fill in the AA declaration form: screenshots of every screen
   (Nearby / Regions / Categories / Listening + a POI action sheet),
   privacy policy URL, test account.
5. Google's car review is separate from the regular Play review and
   often takes a week or so. Expect feedback about driver distraction;
   the template API keeps us mostly compliant, but they'll still read
   the surface copy.

## Troubleshooting

| Symptom | Usually means |
| --- | --- |
| App missing from DHU launcher | Developer mode not on inside the AA app, or manifest missing the `<service>` intent filter. `adb logcat grep carapp` confirms. |
| Crash on tab change | CPL rejected a template (too many rows, banned characters, image too big). Log line starts `CarApp`. |
| Navigate button disabled in DHU | That's correct — `ParkedOnlyOnClickListener` disables it while the car is "driving". Toggle DHU's **Park** switch. |
| No audio in car, fine on phone | `QiwiosityMediaService` not registered (check manifest), or `FOREGROUND_SERVICE_MEDIA_PLAYBACK` permission missing. |
| `expo prebuild --clean` wipes my edits | It's supposed to. Always edit under `mobile/plugins/withAndroidAuto/`, never inside the generated `android/` tree. |
| Gradle can't find `androidx.car.app:app` | Make sure Google's Maven repo is the root `build.gradle`'s `allprojects { repositories { google() } }` block — Expo adds it by default; if you've hand-edited Gradle check it's still there. |

## Known gaps

- **Album art for Now Playing** — `QiwiosityMediaService` doesn't set
  album art yet. Drop a `NowPlayingArtwork.png` into
  `android/app/src/main/res/drawable/` and wire it via
  `MediaMetadataCompat.METADATA_KEY_ART`.
- **Automotive OS (AAOS)** — this plugin targets *Android Auto*
  (phone-projected). AAOS (Polestar / Volvo / GM native) is a separate
  target with its own Play Console track; the Car App Library code is
  reusable but the manifest changes differently.

## What's live as of this iteration

- **Live location in Nearby.** `CarLocationProvider` wraps Android's
  `LocationManager`, subscribes at 5 s / 25 m, and re-ranks the top 12
  POIs by distance from the driver. Distance shows as a subtitle on each
  row ("1.2 km", "450 m"). Falls back to the NZ-centre anchor if
  `ACCESS_FINE_LOCATION` hasn't been granted — the tab title shifts to
  "Nearby (centred on NZ)" so you can tell at a glance.
- **Branded tab + category icons.** Ten vector drawables in
  `plugins/withAndroidAuto/android/res/drawable/` (file names
  `ic_qw_*.xml`) replace the generic Android glyphs. Palette matches
  the logo brief (deep teal + coastal sand). Replace any of them by
  editing the XML — no PNG export step needed.
