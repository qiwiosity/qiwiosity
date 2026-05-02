# Qiwiosity — Project Overview

## What is this?

Qiwiosity is a New Zealand travel app — part interactive map, part audio tour guide, part trip planner. It covers attractions, accommodations, itinerary planning, and voice-narrated cultural commentary across all 19 NZ regions.

## Running the App

```bash
node server.js
```

Serves `qiwiosity/mobile/prototype.html` at `http://0.0.0.0:5000`.

## Project Structure

```
qiwiosity/
  mobile/
    prototype.html          ← Main web prototype (Google Maps, Supabase)
    assets/                 ← Logo, splash images, audio files
    src/                    ← React Native app source (Expo SDK 54)
    App.js, app.json, ...   ← Expo entry points
    plugins/                ← CarPlay + Android Auto native plugins
  database/
    seed/                   ← Canonical JSON data (2453 POIs, 382 accommodations)
    migrations/             ← Supabase SQL migrations
    import-to-supabase.js   ← Data import script
  content/
    poi/                    ← Per-region POI JSON files
    accommodations/         ← Per-region accommodation files
    scripts/                ← Narration scripts (Markdown)
    audio/                  ← Generated MP3 audio files
  tools/                    ← TTS rendering, review population scripts
  supabase/                 ← Edge functions (wishlist)
  extension/                ← Browser extension for content scraping
_archive/                   ← Retired codebases (aotearoa-app, backend_express)
server.js                   ← Simple Node.js HTTP server (port 5000)
```

## Tech Stack

- **Web prototype**: Single-file HTML/CSS/JS (`qiwiosity/mobile/prototype.html`)
  - Google Maps JavaScript API (key embedded)
  - Supabase (live data: 2453 POIs, 382 accommodations, 19 regions)
  - Web Speech API + ElevenLabs API for voice narration
- **Mobile app**: React Native via Expo SDK 54, React 19.1, RN 0.81.5
- **Backend**: Supabase (PostgreSQL) — `https://hauksnqehzaxuoeaezji.supabase.co`
- **Server**: Node.js built-in `http` module

## Phase 2 UI / Feature Overhaul (Completed)

All applied to `qiwiosity/mobile/prototype.html`:

### Design & Theming
- **Dark mode** — Full `html.dark` CSS variable override; toggleable via Settings → persisted in `localStorage`
- **Premium web-first design** — Proper desktop 3-column grid layout, refined typography, transitions, spacing
- **Standalone splash screen** — Full-cover NZ landscape background, glassmorphism overlay, logo + brand name, bold headline, 4 feature-highlight chips, "Begin Exploring" CTA, animated entry
- **Header redesign** — Deep teal background, bolder brand, improved tab styling, ⚙ Settings gear button

### Voice & Audio
- **5 named voice personas** — Kiri 🌿 (warm NZ), James 🎩 (BBC-style authoritative), Aroha ✨ (energetic), Sam 🎒 (casual Kiwi), Grace 📖 (poetic/thoughtful)
- **ElevenLabs AI integration** — Enter API key in Settings to switch all voices to ultra-realistic AI narration; falls back to Web Speech API automatically
- **Web Speech API fallback** — Each persona has a prioritised list of system voice names to match against
- **Playback speed control** — 0.75×, 1×, 1.25×, 1.5× — persisted to `localStorage`
- **Voice preview** — "▶ Preview" button in Settings lets you audition each persona before committing
- **Commentary overlay** — Shows active persona pill with ⚙ shortcut to Settings; ▶/⏹ play toggle

### Wishlist / Saved Places
- **♡ Save button** — Every POI popup now has a ♡ Save / ❤ Saved toggle button
- **Saved tab** — "❤ Saved" header tab with live badge count (red)
- **Wishlist view** — Sidebar panel lists all saved places with thumbnail, category, region, and ✕ remove button
- **Persistence** — Saved places stored in `localStorage` (`qw_saved`); survive page refresh

### Settings Modal
- Voice persona grid (5 cards, tap to select, Preview button per card)
- ElevenLabs API key input (stored encrypted-style in `localStorage`)
- Dark mode toggle
- Playback speed picker
- Opens from ⚙ button in header; closes on backdrop click or ✕

### Other
- **`<audio id="ttsAudio">` element** — Used for ElevenLabs streaming audio playback
- **`closeCommentary()`** — Properly cancels both Web Speech and `<audio>` sources

## Phase 1 UI Changes (Completed)

1. **Category filter UX** — Solo-select with "All categories" chip
2. **POI popup redesign** — Hero image with gradient overlay, action grid
3. **Commentary no-autoplay** — Separate ▶/⏹ toggle
4. **In-app directions** — DirectionsService + geolocation; falls back to external Maps
5. **Plan view toggle** — "Show nearby attractions on map"
6. **Route cleanup** — Routes cleared on tab switch
7. **Accommodation list** — Real cards with `accomCardClick()` and map sync

## Affiliate Monetisation (Completed)

Added to `qiwiosity/mobile/prototype.html`:

### Affiliate Programs Integrated
| Program | Button colour | Commission | Registration |
|---|---|---|---|
| Booking.com | Green | ~4–8% of booking | booking.com/affiliate-program |
| Wotif | Blue | ~4–8% of booking | wotif.com (Expedia Group) |
| Viator | Orange | 8% of activity booking | viatoraffiliates.com |
| GetYourGuide | Red | 8% of activity booking | partner.getyourguide.com |

### How it works
- **POI popups** — Show "🎯 Book on Viator" + "🎯 GetYourGuide" buttons above the regular action buttons, plus a "🛏 Find nearby stays" link in the affiliate strip
- **Accommodation popups** — Show "🛏 Book on Booking.com" + "🛏 Book on Wotif" buttons replacing the old single directions button
- **URL generation** — `affilBookingUrl()`, `affilWotifUrl()`, `affilViatorUrl()`, `affilGYGUrl()` build correctly-parameterised search URLs using the place/region name
- **Affiliate ID management** — IDs stored in `localStorage` (`qw_affiliate`); loaded via `loadAffiliateSettings()` at startup
- **Settings panel** — "💰 Affiliate IDs" section in the ⚙ Settings modal with input fields for all three programs, commission rate summary, and registration links. IDs are optional — links still work without them, they just won't be tracked.
- **`rel="noopener sponsored"`** — Correct for affiliate links (Google/GDPR compliant)

### To activate commissions
1. Open Settings (⚙ in header) → scroll to Affiliate IDs
2. Register at each program (links provided inline)
3. Paste your IDs and click Save
4. All booking/activity links will now include your tracking parameter

## Deployment

Configured as autoscale deployment running `node server.js`.
