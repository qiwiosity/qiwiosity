# withCarPlay — Qiwiosity CarPlay plugin

This folder is both a config plugin and the home of the Swift source
files it injects into the native iOS project. Treat the `.swift` files
here as the **source of truth** — edits you make in `ios/Qiwiosity/CarPlay/`
after `expo prebuild` will be overwritten the next time prebuild runs.

## What it does

On every `npx expo prebuild`:

1. Copies `ios/*.swift` from here into `ios/Qiwiosity/CarPlay/`.
2. Copies `../src/data/attractions.json` into the iOS bundle so
   `POIStore.swift` can read it.
3. Edits `Info.plist` — adds a second `UIScene` for the
   `CPTemplateApplicationScene`, enables `UIApplicationSupportsMultipleScenes`,
   and adds `UIBackgroundModes: [audio, location]`.
4. Adds the `com.apple.developer.carplay-audio` entitlement. The
   stronger entitlements (`carplay-points-of-interest`,
   `carplay-navigation`) are **commented out** because they require a
   direct request to Apple. Uncomment them in `index.js` once granted.

## Entitlements — what to request from Apple

Apple gates CarPlay entitlements. You email them (via the Apple
Developer Contact form) with:

- App name: **Qiwiosity**
- Bundle ID: `nz.qiwiosity.app`
- Entitlements requested:
  - `com.apple.developer.carplay-audio` (usually auto-granted on request)
  - `com.apple.developer.carplay-points-of-interest`
  - `com.apple.developer.carplay-navigation` (optional — only needed
    if we ship Qiwiosity-drawn turn-by-turn. Currently we hand
    navigation off to Apple Maps, which doesn't need this.)

Expect 1–4 weeks turnaround. The audio entitlement works without the
others for shipping a working CarPlay Now Playing experience; the POI
entitlement is what makes the CarPlay map tab light up with real pins.

## Editing the Swift files

1. Edit the file in `mobile/plugins/withCarPlay/ios/`.
2. Run `npx expo prebuild --clean` (or `--no-install` during iteration).
3. Run `npx pod-install ios`.
4. Open `mobile/ios/Qiwiosity.xcworkspace` in Xcode and build.

If you'd rather edit inside Xcode, copy your changes back into this
folder before your next prebuild — otherwise prebuild will clobber them.
