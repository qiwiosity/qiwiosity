# Qiwiosity — Week 1 kickoff

_Stage A, Week 1 of 8. Home base: Hawke's Bay._

This document tracks what we're building this week, what's done, and what's blocking us. It's living — edit it as things change.

## Goal for weeks 1–2 (from the execution plan)

> Stand up the repo, get an Expo project running with GPS permissions, curate the first 6 Hawke's Bay POIs, draft 3 scripts, and render the Hawke's Bay map.

Concretely: by end of Week 2, you should be able to open the app on your iPhone, see a map of Hawke's Bay with six pins, tap one, read the short description, and hear the commentary read aloud.

## What's done today (Apr 18, 2026)

Repo
- Monorepo scaffolded at `qiwiosity/` with `mobile/`, `backend/`, `content/`, `tools/`.
- Root `package.json` with npm workspaces. `.gitignore` for node_modules, Expo cache, and large audio files.
- Existing `aotearoa-app` code moved into `qiwiosity/mobile/`.

Mobile app
- Rebranded from Aotearoa → Qiwiosity (`app.json`, `package.json`, tab titles, AsyncStorage key).
- iOS bundle ID: `nz.qiwiosity.app`. Android package: same. iOS scheme `qiwiosity` for future deep links.
- Added `expo-location` with foreground + background permission strings and `UIBackgroundModes: [audio, location]` for Stage B geofencing + driving audio.
- New `useLocationPermission` hook — tracks status, exposes a single `request()` to prompt, fetches a one-off fix on grant.
- `MapScreen` now centres on Hawke's Bay, shows category chips, a floating "me" / "home" control column, and a bottom-sheet card on pin tap.
- `showsUserLocation` is wired to permission status — tap the ◎ FAB to trigger the prompt on first run.

Content
- 6 Hawke's Bay POIs authored: Marine Parade / Art Deco Napier, Bluff Hill (Mataruahou), Te Mata Peak, Cape Kidnappers, Waipawa, and a "Welcome to Heretaunga" intro.
- Full `content/poi/hawkes-bay.json` with trigger radii, script references, sources to fact-check, and content-status flags.
- Full mobile `src/data/attractions.json` mirrors the same POIs (simpler schema for the current screens).
- Three full scripts drafted (headline + standard) for the first three: Marine Parade, Bluff Hill, Te Mata Peak. Each script carries its own fact-check notes and voice direction.

## Week 1 checklist

From the execution plan, Weeks 1–2:

- [ ] **Register domain** — open question, see below.
- [x] Stand up repo — monorepo structure live as `qiwiosity/`.
- [x] Set up Expo project, basic screen layout, GPS permissions.
- [x] Pick first 6 POIs in Napier / Hastings.
- [x] Draft scripts for the first 3.
- [x] **Generate TTS audio** — pipeline built (`tools/tts-render.js`); needs your ElevenLabs API key to run. 4 scripts queued, ~3,630 characters (inside free tier).
- [ ] **Set up Mapbox free tier; render the Hawke's Bay map** — deferred. Using `react-native-maps` default tiles for now; Mapbox is a Stage B task unless you want to jump early. Default tiles render Hawke's Bay just fine on iOS and Android.

## How to run the app on your iPhone

1. Install [Expo Go](https://apps.apple.com/app/expo-go/id982107779) on your iPhone from the App Store.
2. On your laptop:

   ```bash
   cd qiwiosity/mobile
   npm install
   npx expo start
   ```

3. A QR code appears in your terminal. Open the Camera app on your iPhone, point it at the QR code, tap the banner — Expo Go launches and loads the app.
4. First launch: tap the ◎ button (bottom-right of the map) to trigger the location prompt. Tap "Allow Once" or "Allow While Using App".
5. You should see six pins. Tap any pin to bring up the bottom sheet; tap "Open" to see the detail screen with the audio-playback button.

If Expo gets stuck on "installing", you likely need Node 18+ and a working `npm`. `node --version` to check.

## Open questions / decisions

1. **Domain.** `qiwiosity.com` / `.app` / `.nz` — which one? Check availability and reserve this week; it unblocks marketing assets later. `.co.nz` is the safe bet for a local brand; `.app` is nice for a mobile product.
2. **Mapbox.** Register a free-tier account sometime this month — the Stage B offline-map plan needs it. Not urgent.
3. **ElevenLabs API key.** Pipeline is built and ready. Next action: sign up at [elevenlabs.io](https://elevenlabs.io), create an API key, drop it in `qiwiosity/tools/.env`, and run `node tts-render.js` from `tools/`. See `tools/README.md`. Free tier handles all Stage A content.
4. **Field testing window.** You're in Napier — what evening this week can you drive Marine Parade → Bluff Hill → Te Mata Peak with the app in your pocket? That's the real Week 1 validation.

## TTS pipeline (new today)

Lives in `tools/`. Reads the three drafted scripts, sends them to ElevenLabs, writes MP3s to `content/audio/`.

```bash
cd qiwiosity/tools
cp .env.example .env
# paste your ElevenLabs API key into .env
node tts-render.js --dry-run    # sanity check
node tts-render.js              # generate
```

The pipeline is provider-agnostic in spirit — if ElevenLabs doesn't work out, the API-call function is ~40 lines and can be swapped for Azure Neural without touching the rest.

Once MP3s exist at `content/audio/<poi_id>.<length>.mp3`, copy them into `mobile/assets/audio/` and uncomment the matching line in `mobile/src/utils/audio.js`. The in-app listen button will then prefer the studio audio; if it's missing, it falls back to on-device TTS. No code change needed to toggle between them — it's data-driven.

## Next (Week 2)

- Add your ElevenLabs key, run the pipeline, listen to the three drafts. Iterate on the scripts based on what sounds wooden vs. lands.
- Copy the first round of MP3s into `mobile/assets/audio/` and update the manifest in `utils/audio.js`.
- Add a "Now playing" / current-POI strip above the bottom nav.
- Manual geofence test: use the simulator's "Custom Location" to feed in lat/lng near Marine Parade and confirm the card surfaces.
- Start weeks 3–4: real `expo-location` background watcher + distance calculation against the POI list.

## File map (what changed today)

```
qiwiosity/
├── README.md                                    NEW
├── WEEK_01_KICKOFF.md                           NEW (this file)
├── package.json                                 NEW (workspace root)
├── .gitignore                                   NEW
├── backend/README.md                            NEW (placeholder)
├── content/
│   ├── audio/.gitkeep                           NEW
│   ├── poi/hawkes-bay.json                      NEW
│   └── scripts/
│       ├── napier-marine-parade.headline.md     NEW
│       ├── napier-marine-parade.standard.md     NEW
│       ├── napier-bluff-hill.headline.md        NEW
│       ├── napier-bluff-hill.standard.md        NEW
│       ├── te-mata-peak.headline.md             NEW
│       └── te-mata-peak.standard.md             NEW
├── tools/
│   ├── package.json                             NEW
│   ├── README.md                                NEW (pipeline docs)
│   ├── .env.example                             NEW (API key template)
│   └── tts-render.js                            NEW (ElevenLabs pipeline)
└── mobile/
    ├── README.md                                UPDATED (Qiwiosity branding)
    ├── app.json                                 UPDATED (Qiwiosity, bundle IDs, bg perms)
    ├── package.json                             UPDATED (+expo-location, +expo-av)
    ├── assets/audio/                            NEW (empty, awaiting generation)
    └── src/
        ├── context/ItineraryContext.js          UPDATED (storage key)
        ├── hooks/useLocationPermission.js       NEW
        ├── hooks/useNarration.js                NEW (prefers MP3, falls back to TTS)
        ├── utils/audio.js                       NEW (bundled-MP3 manifest)
        ├── navigation/AppNavigator.js           UPDATED (title)
        ├── screens/MapScreen.js                 UPDATED (HB-centred, sheet, FABs)
        ├── screens/AttractionDetailScreen.js    UPDATED (useNarration, "studio audio" tag)
        ├── screens/TourGuideScreen.js           UPDATED (useNarration, source indicator)
        └── data/
            ├── attractions.json                 UPDATED (6 HB POIs)
            ├── categories.json                  UPDATED (heritage first)
            ├── regions.json                     UPDATED (HB only)
            └── accommodations.json              UPDATED (HB options)
```

The original `aotearoa-app/` folder is untouched — leave it there as a safety net until you've confirmed `qiwiosity/mobile/` runs end-to-end on your phone, then archive or delete it.
