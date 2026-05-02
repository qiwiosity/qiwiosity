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

## Deployment

Configured as autoscale deployment running `node server.js`.
