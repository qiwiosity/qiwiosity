#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-05-17';

const addition = {
  id: 'taranaki-lucys-gully',
  name: "Lucy's Gully",
  region: 'taranaki',
  lat: -39.144,
  lng: 173.973,
  category: 'nature',
  tags: ['kaitake-range', 'picnic', 'forest', 'walking'],
  duration_hours: 1.5,
  trigger_radius_m: 600,
  short: 'A forested picnic and track access point in the Kaitake Range, just inland from Oakura.',
  story: "Lucy's Gully is a cool green Taranaki pause after Surf Highway salt and sun. Redwoods, native bush and access to longer Kaitake Range tracks make it useful for a picnic, a short wander, or the start of a more ambitious climb toward Patuhā Trig.",
  tone: 'green, local, outdoorsy',
  sources: [
    'https://www.taranaki.co.nz/explore/listing/lucys-gully',
    'https://www.doc.govt.nz/parks-and-recreation/places-to-go/taranaki/places/te-papa-kura-o-taranaki/things-to-do/tracks/waimoku-track/',
  ],
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalizeName(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function appendPoi() {
  const dir = path.join(ROOT, 'content', 'poi');
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json') && file !== 'index.json');
  const ids = new Set();
  const names = new Set();
  let target = null;

  for (const file of files) {
    const filePath = path.join(dir, file);
    const json = readJson(filePath);
    if (json.region.id === addition.region) target = { filePath, json };
    for (const poi of json.pois || []) {
      ids.add(poi.id);
      names.add(normalizeName(poi.name));
    }
  }

  if (!target) return { added: [], skipped: [{ type: 'poi', id: addition.id, name: addition.name, reason: 'unknown region' }] };
  if (ids.has(addition.id) || names.has(normalizeName(addition.name))) {
    return { added: [], skipped: [{ type: 'poi', id: addition.id, name: addition.name, reason: 'duplicate id or exact name' }] };
  }

  target.json.pois.push({
    id: addition.id,
    name: addition.name,
    region: addition.region,
    lat: addition.lat,
    lng: addition.lng,
    category: addition.category,
    tags: addition.tags,
    trigger_radius_m: addition.trigger_radius_m,
    duration_hours: addition.duration_hours,
    short: addition.short,
    commentary: addition.story,
    audio_story: addition.story,
    suggested_voice_tone: addition.tone,
    sources_to_check: addition.sources,
    content_status: 'draft',
    cultural_review_required: false,
  });
  writeJson(target.filePath, target.json);
  return { added: [{ ...addition, type: 'poi' }], skipped: [] };
}

function updatePoiIndex() {
  const dir = path.join(ROOT, 'content', 'poi');
  const regions = [];
  const byIsland = {};
  const byCategory = {};
  const byStatus = {};
  let total = 0;
  let culturalReviewRequired = 0;

  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json') && item !== 'index.json').sort()) {
    const json = readJson(path.join(dir, file));
    const pois = json.pois || [];
    total += pois.length;
    byIsland[json.region.island] = (byIsland[json.region.island] || 0) + pois.length;
    for (const poi of pois) {
      byCategory[poi.category] = (byCategory[poi.category] || 0) + 1;
      byStatus[poi.content_status || 'draft'] = (byStatus[poi.content_status || 'draft'] || 0) + 1;
      if (poi.cultural_review_required) culturalReviewRequired += 1;
    }
    regions.push({
      id: json.region.id,
      name: json.region.name,
      island: json.region.island,
      centre: json.region.centre,
      poi_count: pois.length,
      file: `content/poi/${file}`,
    });
  }

  writeJson(path.join(dir, 'index.json'), {
    generated_at: TODAY,
    project: 'Qiwiosity — New Zealand travel companion',
    schema_version: '1.1',
    totals: {
      regions: regions.length,
      pois: total,
      by_island: byIsland,
      by_category: byCategory,
      by_content_status: byStatus,
      cultural_review_required: culturalReviewRequired,
    },
    regions,
  });
}

function writeReport(result) {
  const reportPath = path.join(ROOT, 'content', 'poi', 'national-expansion-2026-05-17-pass-3-topup-3-report.md');
  const lines = [
    '# National Expansion Pass 3 Top-Up 3 - 2026-05-17',
    '',
    'Final one-record top-up to replace the last duplicate-skipped Taranaki candidate.',
    '',
    `POIs added: ${result.added.length}`,
    `Skipped duplicate/invalid candidates: ${result.skipped.length}`,
    '',
  ];

  if (result.added.length) {
    const item = result.added[0];
    lines.push('## Addition', `- ${item.name} (${item.id})`);
    for (const source of item.sources) lines.push(`  - ${source}`);
  }
  if (result.skipped.length) {
    lines.push('', '## Skipped Candidates');
    for (const item of result.skipped) lines.push(`- ${item.type}: ${item.name} (${item.id}) — ${item.reason}`);
  }
  lines.push('');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

const result = appendPoi();
updatePoiIndex();
writeReport(result);
console.log(`Added ${result.added.length} final top-up POI`);
if (result.skipped.length) console.log(`Skipped ${result.skipped.length} duplicate/invalid candidate`);
