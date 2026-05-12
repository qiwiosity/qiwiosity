# Qiwiosity

Stories Along the Way — an NZ travel companion that narrates the landscape as you drive through it.

This is the monorepo. Everything that runs the product — mobile app, database, content, internal tooling — lives here.

## Layout

```
qiwiosity/
├── mobile/      Expo (React Native) app. iOS-first during Stage A.
├── database/    Supabase schema, migrations, seed data, and import/sync scripts.
├── content/     POI data, scripts, and generated audio. The product's substance.
│   ├── poi/        JSON: lat/lng, trigger radius, script refs
│   ├── scripts/    Authored scripts (Markdown)
│   └── audio/      Generated TTS files (gitignored for now)
└── tools/       Helper scripts — content linters, TTS pipeline, map utilities.
```

## Current stage

Stage A — validate (weeks 1–8). Prove that location-triggered audio storytelling on a real NZ drive is something travellers actually enjoy. Home base: Hawke's Bay.

See `WEEK_01_KICKOFF.md` for what's being built this week and how to run it.

## Prerequisites

- Node 18+
- Expo Go on an iPhone (or iOS Simulator)
- A Mapbox account (free tier) — later, not week 1

## Quick start (mobile)

```bash
cd mobile
npm install
npx expo start
```

Scan the QR code with the Expo Go app on your iPhone.
