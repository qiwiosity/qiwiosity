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
    seed/                   ← Canonical JSON data (1100+ POIs, 382 accommodations)
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
  - Supabase (live data: 1100+ POIs, 382 accommodations, 19 regions)
- **Mobile app**: React Native via Expo SDK 54, React 19.1, RN 0.81.5
- **Backend**: Supabase (PostgreSQL) — `https://hauksnqehzaxuoeaezji.supabase.co`
- **Server**: Node.js built-in `http` module

## Phase 1 UI Changes (Completed)

Applied to `qiwiosity/mobile/prototype.html`:

1. **Header branding** — Removed long tagline; header now shows just "Qiwiosity" (logo already in header)
2. **Category filter UX** — Changed from multi-toggle to solo-select: click any category to show ONLY that type, click again (or "All categories") to reset. New "All categories" chip at top of the list.
3. **POI popup redesign** — Hero image expanded to 220px; place name, category chip, star rating, and duration now overlaid on the image with a gradient. Action buttons laid out in a 2×2 grid. Audio button added directly in popup ("🎧 Audio").
4. **Commentary no-autoplay** — "Audio" button in popup opens a text panel with separate "▶ Play" / "⏹ Stop" toggle. No auto-speech on click.
5. **In-app directions** — "🧭 Directions" button now draws the route on the existing Google Map using DirectionsService + geolocation (requests location permission). Falls back to opening Google Maps externally if location denied or unavailable.
6. **Plan view toggle** — "Show all places" toggle renamed to "Show nearby attractions on map".
7. **Route cleanup** — In-app direction routes are cleared when switching between tabs.

## Deployment

Configured as autoscale deployment running `node server.js`.
