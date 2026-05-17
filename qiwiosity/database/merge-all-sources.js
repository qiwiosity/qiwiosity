#!/usr/bin/env node
/**
 * merge-all-sources.js
 *
 * Reads ALL data sources across the three Qiwiosity projects,
 * merges them into a single canonical dataset, and writes
 * seed JSON files ready for Supabase import.
 *
 * Data sources:
 *   1. qiwiosity/content/poi/*.json        (region-split, richest metadata)
 *   2. qiwiosity/content/accommodations/*  (region-split)
 *   3. aotearoa-app/src/data/*             (flat JSON, bundled in old app)
 *   4. qiwiosity/mobile/src/data/*         (flat JSON, bundled in new app)
 *   5. nz_points_of_interest.xlsx          (original spreadsheet)
 *   6. qiwiosity/content/scripts/*.md      (narration scripts)
 *   7. qiwiosity/content/audio/*.mp3       (generated audio)
 *   8. aotearoa-app/src/data/poi_images.json (image URLs)
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

// ── Helpers ──────────────────────────────────────────────

function readJSON(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    console.warn(`  ⚠ Could not read ${filePath}: ${e.message}`);
    return null;
  }
}

function listFiles(dir, ext) {
  try {
    return fs.readdirSync(dir)
      .filter(f => f.endsWith(ext) && f !== 'index.json')
      .map(f => path.join(dir, f));
  } catch (e) {
    return [];
  }
}

function parseScriptMarkdown(filePath) {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const frontmatterMatch = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!frontmatterMatch) return null;

  const frontmatter = {};
  frontmatterMatch[1].split('\n').forEach(line => {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) frontmatter[key.trim()] = rest.join(':').trim();
  });

  // Extract narration body (between the heading and the voice direction section)
  let body = frontmatterMatch[2].trim();

  // Remove the heading line
  body = body.replace(/^#[^\n]*\n+/, '');

  // Split off voice direction and fact-check sections
  const voiceMatch = body.match(/\n\*\*Voice direction:\*\*\s*([\s\S]*?)(?=\n\*\*|$)/);
  const factMatch = body.match(/\n\*\*Fact-check:\*\*\s*([\s\S]*?)$/);

  const narration = body
    .replace(/\n---[\s\S]*$/, '')  // Remove everything after ---
    .replace(/\n\*\*Voice direction:\*\*[\s\S]*$/, '')
    .replace(/\n\*\*Fact-check:\*\*[\s\S]*$/, '')
    .trim();

  return {
    poi_id: frontmatter.poi_id || path.basename(filePath).split('.')[0],
    length: frontmatter.length || (filePath.includes('.headline.') ? 'headline' : 'standard'),
    target_seconds: parseInt(frontmatter.target_duration_seconds) || null,
    status: frontmatter.status || 'draft_v1',
    author: frontmatter.author || 'unknown',
    narration_text: narration,
    voice_direction: voiceMatch ? voiceMatch[1].trim() : null,
    fact_check: factMatch ? factMatch[1].trim() : null,
  };
}

// ── 1. Load Regions ──────────────────────────────────────

console.log('📍 Loading regions...');
const regionsApp = readJSON(path.join(ROOT, '_archive/aotearoa-app/src/data/regions.json'))
  || readJSON(path.join(ROOT, 'qiwiosity/mobile/src/data/regions.json'));
const regionsContent = {};

// Enrich from content files (they have centre coords in a different format)
listFiles(path.join(ROOT, 'qiwiosity/content/poi'), '.json').forEach(f => {
  const data = readJSON(f);
  if (data && data.region) {
    regionsContent[data.region.id] = data.region;
  }
});

const regions = (regionsApp || []).map(r => ({
  id: r.id,
  name: r.name,
  island: r.island,
  lat: r.lat,
  lng: r.lng,
  description: r.description,
  bounds_north: r.bounds ? r.bounds.north : null,
  bounds_south: r.bounds ? r.bounds.south : null,
  bounds_east: r.bounds ? r.bounds.east : null,
  bounds_west: r.bounds ? r.bounds.west : null,
}));

console.log(`  ✓ ${regions.length} regions`);

// ── 2. Load Categories ───────────────────────────────────

console.log('🏷️  Loading categories...');
const categories = readJSON(path.join(ROOT, '_archive/aotearoa-app/src/data/categories.json'))
  || readJSON(path.join(ROOT, 'qiwiosity/mobile/src/data/categories.json'))
  || [];
console.log(`  ✓ ${categories.length} categories`);

// ── 3. Load & Merge POIs ─────────────────────────────────

console.log('📌 Loading POIs from all sources...');

// Source A: qiwiosity/content/poi (richest — has content_status, scripts, approach_bearing)
const poisContent = {};
listFiles(path.join(ROOT, 'qiwiosity/content/poi'), '.json').forEach(f => {
  const data = readJSON(f);
  if (data && data.pois) {
    data.pois.forEach(p => { poisContent[p.id] = p; });
  }
});
console.log(`  Source A (content/poi): ${Object.keys(poisContent).length} POIs`);

// Source B: aotearoa-app/src/data/attractions.json (has audio_story, suggested_voice_tone)
const poisApp = {};
const appAttractions = readJSON(path.join(ROOT, '_archive/aotearoa-app/src/data/attractions.json')) || [];
appAttractions.forEach(p => { poisApp[p.id] = p; });
console.log(`  Source B (aotearoa-app): ${Object.keys(poisApp).length} POIs`);

// Note: mobile/src/data/attractions.json is NOT a source — it is a DERIVATIVE
// generated by sync-to-mobile.js. Including it here would create a circular dependency.

// Merge: content is primary, fill gaps from app
const allPoiIds = new Set([
  ...Object.keys(poisContent),
  ...Object.keys(poisApp),
]);

const pois = [];
for (const id of allPoiIds) {
  const c = poisContent[id] || {};
  const a = poisApp[id] || {};

  pois.push({
    id,
    name: c.name || a.name,
    region_id: c.region || a.region,
    category_id: c.category || a.category,
    lat: c.lat || a.lat,
    lng: c.lng || a.lng,
    tags: c.tags || a.tags || [],
    trigger_radius_m: c.trigger_radius_m || a.trigger_radius_m || 250,
    duration_hours: c.duration_hours || a.duration_hours || 1,
    short: c.short || a.short || '',
    commentary: c.commentary || a.commentary || '',
    audio_story: c.audio_story || a.audio_story || null,
    suggested_voice_tone: c.suggested_voice_tone || a.suggested_voice_tone || null,
    approach_bearing_deg: c.approach_bearing_deg || null,
    content_status: c.content_status || 'draft',
    cultural_review_required: c.cultural_review_required || false,
    sources_to_check: c.sources_to_check || null,
    review_rating: (c.reviews && c.reviews.rating) || (a.reviews && a.reviews.rating) || null,
    review_summary: (c.reviews && c.reviews.summary) || (a.reviews && a.reviews.summary) || null,
  });
}

// Sort by region then name for consistent output
pois.sort((a, b) => {
  if (a.region_id !== b.region_id) return a.region_id.localeCompare(b.region_id);
  return a.name.localeCompare(b.name);
});

console.log(`  ✓ ${pois.length} POIs merged (superset of all sources)`);

// ── 4. Load & Merge Accommodations ───────────────────────

console.log('🏨 Loading accommodations...');

const accomContent = {};
listFiles(path.join(ROOT, 'qiwiosity/content/accommodations'), '.json').forEach(f => {
  const data = readJSON(f);
  if (data && data.accommodations) {
    data.accommodations.forEach(a => { accomContent[a.id] = a; });
  }
});

const accomApp = {};
const appAccom = readJSON(path.join(ROOT, '_archive/aotearoa-app/src/data/accommodations.json')) || [];
appAccom.forEach(a => { accomApp[a.id] = a; });

// Note: mobile accommodations is a derivative, not a source

const allAccomIds = new Set([
  ...Object.keys(accomContent),
  ...Object.keys(accomApp),
]);

const accommodations = [];
for (const id of allAccomIds) {
  const c = accomContent[id] || {};
  const a = accomApp[id] || {};

  accommodations.push({
    id,
    name: c.name || a.name,
    region_id: c.region || a.region,
    lat: c.lat || a.lat,
    lng: c.lng || a.lng,
    type: c.type || a.type,
    price_nzd_per_night: c.price_nzd_per_night || a.price_nzd_per_night,
    rating: c.rating || a.rating,
    short: c.short || a.short || '',
  });
}

accommodations.sort((a, b) => {
  if (a.region_id !== b.region_id) return a.region_id.localeCompare(b.region_id);
  return a.name.localeCompare(b.name);
});

console.log(`  ✓ ${accommodations.length} accommodations merged`);

// ── 5. Load Images ───────────────────────────────────────

console.log('🖼️  Loading images...');

const imagesData = readJSON(path.join(ROOT, '_archive/aotearoa-app/src/data/poi_images.json'))
  || readJSON(path.join(ROOT, 'qiwiosity/mobile/src/data/poi_images.json'))
  || {};

const validRegionIds = new Set(regions.map(r => r.id));
const validCategoryIds = new Set(categories.map(c => c.id));
const categoryIdsByAscii = new Map(categories.map(c => [
  c.id.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),
  c.id,
]));

const REGION_ID_ALIASES = {
  bop: 'bay-of-plenty',
  'waikato-region': 'waikato',
};

function canonicalRegionId(regionId) {
  return REGION_ID_ALIASES[regionId] || regionId;
}

function canonicalCategoryId(categoryId) {
  const asciiId = categoryId.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  return categoryIdsByAscii.get(asciiId) || categoryId;
}

const poiImages = [];
if (imagesData.attractions) {
  for (const [poiId, urls] of Object.entries(imagesData.attractions)) {
    (urls || []).forEach((url, i) => {
      poiImages.push({
        poi_id: poiId,
        image_url: url,
        source: 'wikimedia',
        display_order: i + 1,
      });
    });
  }
}
console.log(`  ✓ ${poiImages.length} POI images`);

const regionImages = [];
const regionImageCounts = new Map();
const regionImageSeen = new Set();
if (imagesData.regions) {
  for (const [regionId, value] of Object.entries(imagesData.regions)) {
    const canonicalId = canonicalRegionId(regionId);
    if (!validRegionIds.has(canonicalId)) {
      continue;
    }

    const urls = Array.isArray(value) ? value : [value];
    urls.forEach((url) => {
      const seenKey = `${canonicalId}\n${url}`;
      if (regionImageSeen.has(seenKey)) return;
      regionImageSeen.add(seenKey);

      const displayOrder = (regionImageCounts.get(canonicalId) || 0) + 1;
      regionImageCounts.set(canonicalId, displayOrder);

      regionImages.push({
        region_id: canonicalId,
        image_url: url,
        display_order: displayOrder,
      });
    });
  }
}
console.log(`  ✓ ${regionImages.length} region images`);

const categoryImages = [];
const categoryImageCounts = new Map();
const categoryImageSeen = new Set();
if (imagesData.categories) {
  for (const [catId, value] of Object.entries(imagesData.categories)) {
    const canonicalId = canonicalCategoryId(catId);
    if (!validCategoryIds.has(canonicalId)) {
      continue;
    }

    const urls = Array.isArray(value) ? value : [value];
    urls.forEach((url) => {
      const seenKey = `${canonicalId}\n${url}`;
      if (categoryImageSeen.has(seenKey)) return;
      categoryImageSeen.add(seenKey);

      const displayOrder = (categoryImageCounts.get(canonicalId) || 0) + 1;
      categoryImageCounts.set(canonicalId, displayOrder);

      categoryImages.push({
        category_id: canonicalId,
        image_url: url,
        display_order: displayOrder,
      });
    });
  }
}
console.log(`  ✓ ${categoryImages.length} category images`);

// ── 6. Load Scripts ──────────────────────────────────────

console.log('📝 Loading narration scripts...');

const scriptsDir = path.join(ROOT, 'qiwiosity/content/scripts');
const scripts = [];
if (fs.existsSync(scriptsDir)) {
  listFiles(scriptsDir, '.md').forEach(f => {
    const parsed = parseScriptMarkdown(f);
    if (parsed) scripts.push(parsed);
  });
}
console.log(`  ✓ ${scripts.length} scripts parsed`);

// ── 7. Load Audio references ─────────────────────────────

console.log('🔊 Loading audio file references...');

const audioDir = path.join(ROOT, 'qiwiosity/content/audio');
const audioFiles = [];
if (fs.existsSync(audioDir)) {
  fs.readdirSync(audioDir)
    .filter(f => f.endsWith('.mp3'))
    .forEach(f => {
      // filename format: poi-id.headline.mp3 or poi-id.standard.mp3
      const parts = f.replace('.mp3', '').split('.');
      const length = parts.pop();
      const poiId = parts.join('.');
      audioFiles.push({
        poi_id: poiId,
        length: length,
        filename: f,
        file_url: `audio/${f}`,  // relative — will become Supabase Storage URL
      });
    });
}
console.log(`  ✓ ${audioFiles.length} audio files`);

// ── 8. Write Seed Files ──────────────────────────────────

console.log('\n💾 Writing canonical seed files...');

const seedDir = path.join(__dirname, 'seed');

const seedFiles = {
  'regions.json': regions,
  'categories.json': categories,
  'pois.json': pois,
  'accommodations.json': accommodations,
  'poi_images.json': poiImages,
  'region_images.json': regionImages,
  'category_images.json': categoryImages,
  'poi_scripts.json': scripts,
  'poi_audio.json': audioFiles,
};

for (const [filename, data] of Object.entries(seedFiles)) {
  const outPath = path.join(seedDir, filename);
  fs.writeFileSync(outPath, JSON.stringify(data, null, 2));
  console.log(`  ✓ ${filename} — ${Array.isArray(data) ? data.length : Object.keys(data).length} records`);
}

// ── 9. Summary ───────────────────────────────────────────

console.log('\n══════════════════════════════════════════');
console.log('  CONSOLIDATION COMPLETE');
console.log('══════════════════════════════════════════');
console.log(`  Regions:          ${regions.length}`);
console.log(`  Categories:       ${categories.length}`);
console.log(`  POIs:             ${pois.length}`);
console.log(`  Accommodations:   ${accommodations.length}`);
console.log(`  POI Images:       ${poiImages.length}`);
console.log(`  Region Images:    ${regionImages.length}`);
console.log(`  Category Images:  ${categoryImages.length}`);
console.log(`  Scripts:          ${scripts.length}`);
console.log(`  Audio Files:      ${audioFiles.length}`);
console.log('══════════════════════════════════════════');
console.log(`\nSeed files written to: ${seedDir}/`);

// ── Auto-sync bundled mobile data ────────────────────
console.log('\n📱 Syncing bundled mobile data...\n');
require('child_process').execSync(`node "${path.join(__dirname, 'sync-to-mobile.js')}"`, {
  stdio: 'inherit',
  cwd: path.join(__dirname, '..'),
});
