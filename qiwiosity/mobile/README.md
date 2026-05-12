# Qiwiosity mobile

Expo React Native app for Qiwiosity. The active app is iOS-first, with Android and web used for testing where practical.

## Run

```bash
cd qiwiosity/mobile
npm install
npx expo start
```

Scan the QR with Expo Go. Press `i` for the iOS Simulator or `w` for the web build.

Requirements: Node 18+ and Expo Go on your device.

## Structure

```text
mobile/
├── App.js                       Providers + splash/loading/app shell
├── app.json                     Expo config and permissions
├── package.json                 Mobile dependencies
├── assets/                      Icons, splash, bundled audio
└── src/
    ├── theme.js                 Colors, spacing, typography
    ├── context/                 Auth, data, itinerary, compare, lists, prefs
    ├── hooks/                   Location, geofence, narration hooks
    ├── lib/                     Supabase clients and server API helpers
    ├── navigation/              Bottom tabs + nested stacks
    ├── utils/                   Audio, cache, directions, geo helpers
    ├── data/                    Generated bundled data from database/seed
    └── screens/                 Active navigated screens
```

## Data

The canonical POI source is `qiwiosity/database/seed/pois.json`. Run `npm run sync:mobile` from `qiwiosity/` to regenerate `mobile/src/data/attractions.json`.

The mobile app uses two Supabase public clients:

- Auth/community/wishlist: `EXPO_PUBLIC_AUTH_SUPABASE_URL`
- Content catalogue: `EXPO_PUBLIC_CONTENT_SUPABASE_URL`

Both have local development fallbacks in `src/lib/config.js`.

## Permissions

`app.json` declares foreground/background location and background audio. Foreground location is requested through `src/hooks/useLocationPermission.js`; background geofencing is started from settings when the user enables drive-mode behavior.

## Audio

Bundled MP3s are resolved through `src/utils/audio.js`. If a POI has no bundled MP3, narration falls back to on-device TTS.

## Branding

The product is **Qiwiosity**, a portmanteau of _kiwi_ and _curiosity_. The working folder was originally `aotearoa-app`; the active mobile app now lives here.
