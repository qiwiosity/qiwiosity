# Qiwiosity — Project Overview

## What is this?

Qiwiosity is a New Zealand travel app — part interactive map, part audio tour guide, part trip planner. It covers attractions, accommodations, itinerary planning, and voice-narrated cultural commentary across all 19 NZ regions.

## Project Structure

This repository contains planning documents, seed data, and a UI prototype:

| File/Folder | Purpose |
|-------------|---------|
| `compare-feature-prototype.html` | Self-contained interactive UI prototype (served as the main app) |
| `server.js` | Simple Node.js HTTP server (port 5000) |
| `HANDOVER.md` | Full project handover document with architecture details |
| `Qiwiosity_Blueprint.docx` | Product vision and feature spec |
| `Qiwiosity_Execution_Plan.docx` | Development roadmap |
| `Qiwiosity_Database_Consolidation_Plan.md` | Database architecture plan |
| `image_corrections.json` / `.sql` | Image URL corrections for POI data |
| `build_blueprint.js` / `build_execution_plan.js` | Docx generators (uses `docx` npm package) |

## Running the App

```bash
node server.js
```

Serves the prototype at `http://0.0.0.0:5000`.

## Tech Stack

- **Frontend prototype**: Single-file HTML/CSS/JS (`compare-feature-prototype.html`)
- **Server**: Node.js built-in `http` module
- **Planned mobile app**: React Native via Expo SDK 54
- **Planned backend**: Supabase (PostgreSQL)

## Architecture (Planned)

The full app architecture (see `HANDOVER.md`) includes:
- `qiwiosity/mobile/` — Expo React Native app
- `qiwiosity/database/` — Supabase schema, seed data, and import scripts
- `qiwiosity/tools/` — TTS rendering, review population scripts
- `qiwiosity/content/` — Audio files and narration scripts

## Deployment

Configured as autoscale deployment running `node server.js`.
