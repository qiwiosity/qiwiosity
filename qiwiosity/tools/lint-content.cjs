#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEED_PATH = path.join(ROOT, 'database', 'seed', 'pois.json');
const MOBILE_PATH = path.join(ROOT, 'mobile', 'src', 'data', 'attractions.json');
const SHIP_BLOCKLIST_RE = /\b(?:PLACEHOLDER|do not ship)\b/i;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function textForPoi(poi) {
  return [
    poi.name,
    poi.short,
    poi.commentary,
    poi.audio_story,
  ].filter(Boolean).join(' ');
}

function isShipBlockedPoi(poi) {
  return SHIP_BLOCKLIST_RE.test(textForPoi(poi));
}

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

  if (poi.review_rating != null || poi.review_summary) {
    record.reviews = {};
    if (poi.review_rating != null) record.reviews.rating = poi.review_rating;
    if (poi.review_summary) record.reviews.summary = poi.review_summary;
  }

  return record;
}

function duplicateIds(items) {
  const seen = new Set();
  const dupes = new Set();
  for (const item of items) {
    if (seen.has(item.id)) dupes.add(item.id);
    seen.add(item.id);
  }
  return Array.from(dupes).sort();
}

function main() {
  const seed = readJson(SEED_PATH);
  const mobile = readJson(MOBILE_PATH);
  const expectedMobile = seed.filter(poi => !isShipBlockedPoi(poi)).map(transformPoi);

  const errors = [];
  const warnings = [];

  const seedDupes = duplicateIds(seed);
  const mobileDupes = duplicateIds(mobile);
  if (seedDupes.length) errors.push(`Duplicate seed POI ids: ${seedDupes.join(', ')}`);
  if (mobileDupes.length) errors.push(`Duplicate mobile POI ids: ${mobileDupes.join(', ')}`);

  const blockedInMobile = mobile.filter(isShipBlockedPoi);
  if (blockedInMobile.length) {
    errors.push(`Non-shippable POIs are present in mobile data: ${blockedInMobile.map(p => p.id).join(', ')}`);
  }

  const blockedInSeed = seed.filter(isShipBlockedPoi);
  if (blockedInSeed.length) {
    warnings.push(`Seed contains ${blockedInSeed.length} non-shippable POI(s), skipped by sync: ${blockedInSeed.map(p => p.id).join(', ')}`);
  }

  if (JSON.stringify(expectedMobile) !== JSON.stringify(mobile)) {
    errors.push('mobile/src/data/attractions.json is out of sync. Run npm run sync:mobile from qiwiosity/.');
  }

  if (warnings.length) {
    console.warn('Content lint warnings:');
    for (const warning of warnings) console.warn(`- ${warning}`);
  }

  if (errors.length) {
    console.error('Content lint failed:');
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }

  console.log(`Content lint passed: ${mobile.length} bundled POIs checked.`);
}

main();
