# Qiwiosity — mobile

Expo (React Native) app. iOS-first during Stage A.

## Run on your iPhone

```bash
cd qiwiosity/mobile
npm install
npx expo start
```

Scan the QR with the Expo Go app. Press `i` for the iOS Simulator, `w` for the web build.

Requirements: Node 18+, Expo Go on your device.

## Structure

```
mobile/
├── App.js                       Providers + navigation root
├── app.json                     Expo config (permissions, bundle IDs)
├── package.json                 Dependencies
├── assets/                      Icons, splash
└── src/
    ├── theme.js                 Colors, spacing, typography
    ├── context/
    │   └── ItineraryContext.js  Global itinerary state + AsyncStorage persist
    ├── hooks/
    │   └── useLocationPermission.js  Foreground location permission + status
    ├── navigation/
    │   └── AppNavigator.js      Bottom tabs + nested stacks
    ├── utils/
    │   └── geo.js               Haversine + drive-time helpers
    ├── data/                    Bundled POI content (Week 1: Hawke's Bay)
    └── screens/
        ├── MapScreen.js         Map + markers + filter chips
        ├── AttractionsScreen.js List view
        ├── AttractionDetailScreen.js
        ├── ItineraryScreen.js
        ├── AccommodationsScreen.js
        └── TourGuideScreen.js   Audio-first commentary playlist
```

## Permissions

`app.json` declares foreground + background location and background audio. The background permission matters once geofencing is wired up (Weeks 3–4). Week 1 only uses "while in use" — requested on first launch via `src/hooks/useLocationPermission.js`.

## Maps

Stage A uses `react-native-maps` with default tiles — zero setup, works on iOS and Android immediately. Migration to Mapbox (for offline packs + NZ-specific styling) is planned for Stage B.

## Audio

Stage A uses `expo-speech` (on-device TTS) for fast iteration. Stage B swaps in pre-rendered ElevenLabs / Azure Neural audio bundled per-region.

## Content

POIs live in `src/data/attractions.json`. The authoritative source is `qiwiosity/content/` at the repo root; a build step will eventually sync it down here. For Week 1 they're hand-edited in both places.

## Theme

- Pounamu green `#0B4F3C` primary
- Pōhutukawa orange `#E07B3C` accent
- Stone `#F5F3EF` background

## Branding note

The product is **Qiwiosity** — a portmanteau of _kiwi_ and _curiosity_. The working folder was originally `aotearoa-app`; it now lives in the monorepo as `qiwiosity/mobile`.
