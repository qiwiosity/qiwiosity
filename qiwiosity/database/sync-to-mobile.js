#!/usr/bin/env node
/**
 * sync-to-mobile.js
 *
 * Single source of truth: database/seed/pois.json  →  mobile/src/data/attractions.json
 *
 * This script transforms the canonical seed data into the format the mobile app
 * expects and writes it to the bundled data directory. It should run:
 *   - Automatically before every build  (wired into npm scripts)
 *   - Manually via `npm run sync:mobile` from the monorepo root
 *   - Automatically via a file-watcher in dev mode
 *
 * Field mapping:
 *   seed.region_id      → bundled.region
 *   seed.category_id    → bundled.category
 *   seed.review_rating  → bundled.reviews.rating
 *   seed.review_summary → bundled.reviews.summary
 *
 * Internal-only fields (content_status, cultural_review_required, sources_to_check,
 * approach_bearing_deg) are stripped — the mobile app doesn't need them.
 */

const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────
const SEED_PATH = path.join(__dirname, 'seed', 'pois.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'mobile', 'src', 'data', 'attractions.json');

// ── Transform ────────────────────────────────────────────
function transformPoi(poi) {
  const record = {
    id: poi.id,
    name: poi.name,
    region: poi.region_id,
    lat: poi.lat,
    lng: poi.lng,
    category: poi.category_id,
    tags: poi.tags || [],
    duration_hours: poi.duration_hours,
    short: poi.short,
    commentary: poi.commentary,
    audio_story: poi.audio_story || null,
    trigger_radius_m: poi.trigger_radius_m || 250,
    suggested_voice_tone: poi.suggested_voice_tone || 'warm',
  };

  // Only include reviews object if there's actual review data
  if (poi.review_rating != null || poi.review_summary) {
    record.reviews = {};
    if (poi.review_rating != null) record.reviews.rating = poi.review_rating;
    if (poi.review_summary) record.reviews.summary = poi.review_summary;
  }

  return record;
}

// ── Main ─────────────────────────────────────────────────
function sync() {
  if (!fs.existsSync(SEED_PATH)) {
    console.error(`❌  Seed file not found: ${SEED_PATH}`);
    process.exit(1);
  }

  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf-8'));
  const bundled = seed.map(transformPoi);

  // Ensure output directory exists
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(bundled, null, 2) + '\n', 'utf-8');

  // Summary by category
  const cats = {};
  bundled.forEach(p => { cats[p.category] = (cats[p.category] || 0) + 1; });
  const catSummary = Object.entries(cats)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `  ${k}: ${v}`)
    .join('\n');

  console.log(`✅  Synced ${bundled.length} POIs → ${path.relative(process.cwd(), OUTPUT_PATH)}`);
  console.log(catSummary);
}

sync();
