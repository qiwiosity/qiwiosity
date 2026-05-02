# Qiwiosity — iOS & CarPlay setup

This doc is the full build-and-test loop for the iOS app, including the
CarPlay integration. Read it end-to-end the first time; after that, the
"Daily build" section is the only bit you'll touch.

## What got added

**Mobile app (Expo / React Native)**

- New context providers: `PreferencesContext`, `NarrationContext`.
- New hooks: `useGeofence` (foreground + background radius trigger).
- New screens: `SearchScreen`, `SettingsScreen`, `OfflineScreen`.
- New component: `NowPlayingStrip` (shows above the tab bar during audio).
- New utility: `contentCache.js` (sync from API, precache audio).
- Expanded POI data: Wellington, Auckland, Queenstown on top of Hawke's Bay.
- `App.js` now wires geofence hits to the shared narration player,
  gated by `prefs.storyAutoPlay`.

**Backend**

- `backend/src/server.js`: Express API with `/v1/regions`, `/v1/pois`,
  `/v1/manifest`, `/v1/audio/...`.
- Reads straight from `content/` — no database yet.

**CarPlay (native iOS)**

- `mobile/plugins/withCarPlay/` — config plugin that runs on every
  `expo prebuild`. It:
  - copies four Swift files into `ios/Qiwiosity/CarPlay/`
  - copies `attractions.json` into the iOS bundle so Swift can read it
  - edits `Info.plist` to declare a CarPlay scene, enable multi-scene,
    and add `UIBackgroundModes = [audio, location]`
  - adds the `com.apple.developer.carplay-audio` entitlement
- Swift side: `CarPlaySceneDelegate`, `CarPlayController`, `POIStore`,
  `QiwiosityAudioPlayer`. Four tabs — Nearby (map), Regions, Categories,
  Now Playing. Tapping a POI offers "Play story" or "Navigate"; the
  nav hand-off goes to Apple Maps.

## Prerequisites

- macOS with Xcode 15 or 16
- Apple Developer Program membership (needed for CarPlay entitlements)
- Node 18+
- CocoaPods (`sudo gem install cocoapods`)
- An iPhone on iOS 16 or later (simulator is fine for most of this)

## One-time setup

From the repo root:

```bash
npm install                              # root workspaces
npm --workspace mobile install           # explicit, belt and braces
```

Generate the native iOS project. The `withCarPlay` plugin runs during
this step:

```bash
cd qiwiosity/mobile
npx expo prebuild --clean
```

Install CocoaPods:

```bash
cd ios
pod install
cd ..
```

Open the workspace in Xcode:

```bash
open ios/Qiwiosity.xcworkspace
```

In Xcode, on the **Qiwiosity** target, **Signing & Capabilities** tab:

1. Pick your team under Signing.
2. Confirm bundle ID is `nz.qiwiosity.app` (matches `app.json`).
3. You should see **CarPlay — Audio** under Capabilities. Good.

## Requesting CarPlay entitlements from Apple

CarPlay entitlements are gated — you can't self-enable them like most
Apple capabilities. You submit a request on the Apple Developer site:

<https://developer.apple.com/contact/carplay/>

Fill it in with:

- **App name:** Qiwiosity
- **Bundle ID:** `nz.qiwiosity.app`
- **Category:** Audio + Points of Interest (we want both)
- **Company info, App Store release schedule, etc.**

What to request:

- `com.apple.developer.carplay-audio` — usually granted within a week.
  This is what makes the Now Playing tab work. It's the bare minimum.
- `com.apple.developer.carplay-points-of-interest` — this unlocks the
  map-with-pins tab. Takes longer to be granted; you'll need to
  demonstrate the app behaves on real CarPlay hardware.
- `com.apple.developer.carplay-navigation` — only if Qiwiosity starts
  owning turn-by-turn itself. Right now we hand off to Apple Maps, so
  skip this request.

Once granted, Apple emails you. Then:

1. Go to Apple Developer → Identifiers → your bundle ID → edit.
2. Tick the new capabilities.
3. In `mobile/plugins/withCarPlay/index.js`, uncomment the matching
   lines in the `withEntitlementsPlist` block.
4. `npx expo prebuild --clean && cd ios && pod install`.
5. Rebuild in Xcode.

## Daily build loop

```bash
cd qiwiosity/mobile
npx expo prebuild --clean          # if you changed Swift / plugin / app.json
cd ios && pod install && cd ..
# Then build & run in Xcode (⌘R)
```

For pure JS changes you don't need prebuild — the `expo start` dev
server on the phone app works as before. CarPlay changes require a
prebuild + rebuild each time.

## Testing CarPlay

Three options, in order of convenience:

**1. Xcode's CarPlay simulator (easiest)**

1. Build & run the Qiwiosity app on an iOS Simulator (iPhone 15 Pro is
   a solid choice).
2. In the simulator menu bar: **I/O → External Displays → CarPlay**.
3. A second window opens with the CarPlay UI. You should see four tabs.

**2. CarPlay-capable Bluetooth / USB adapter with a physical head unit**

Plug your iPhone into the car; Qiwiosity should appear in the CarPlay
app grid after a short delay.

**3. Wireless CarPlay**

Works the same way, just wireless.

If CarPlay shows a black screen: it's almost always an Info.plist scene
manifest issue. Double-check `UIApplicationSceneManifest` has both the
normal iPhone scene and our CarPlay entry (the plugin should have
written both — run `plutil -p ios/Qiwiosity/Info.plist | grep -A 20
SceneManifest` to confirm).

## App Store submission notes

Apple reviews CarPlay apps strictly. Things they tend to reject:

- Any CarPlay screen with more than 12 items in a list.
- Free-text entry in the car (don't even try).
- Video / animated artwork in Now Playing.
- Destination preview screens that are not using `CPPointOfInterestTemplate`.

Test with the phone locked. Test with the phone on the passenger seat
and the driver never touching it. That's the reviewer's mindset.

## Known gaps / follow-ups

- The bundled MP3 list (mobile/src/utils/audio.js) only references two
  POIs so far. Run the TTS pipeline in `tools/` on the newly authored
  scripts (Wellington / Auckland / Queenstown) to fill it out.
- `GOOGLE_MAPS_IOS_API_KEY` is not yet wired — the phone app uses the
  `react-native-maps` default provider. If you want Google Maps on the
  phone UI, add `NSAppTransportSecurity` and the key in app.json's
  `ios.config.googleMapsApiKey` and rebuild.
- Backend runs on localhost; deploy to Fly.io / Railway and set the
  resulting URL as `QIWIOSITY_API_BASE` in `mobile/src/utils/contentCache.js`
  (or move it to app.json extra config).
- Android: the config plugin is iOS-only. Android Auto for audio apps
  is a separate piece of work — roadmap.
