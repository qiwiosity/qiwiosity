#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-05-17';

const poiAdditions = [
  {
    id: 'canterbury-kate-sheppard-house',
    name: 'Te Whare Waiutuutu Kate Sheppard House',
    region: 'canterbury',
    lat: -43.522,
    lng: 172.582,
    category: 'heritage',
    tags: ['christchurch', 'suffrage', 'heritage-house', 'museum'],
    duration_hours: 1.25,
    trigger_radius_m: 350,
    short: 'The Christchurch heritage house connected to Kate Sheppard and New Zealand’s women’s suffrage campaign.',
    story: 'Te Whare Waiutuutu Kate Sheppard House gives a national political story a domestic address. Rooms, garden and interpretation bring the women’s suffrage movement out of abstraction, showing how world-changing civic work can begin around tables, letters and determined organising.',
    tone: 'clear, historical, quietly powerful',
    sources: [
      'https://www.christchurchnz.com/visit/things-to-do/listing/te-whare-waiutuutu-kate-sheppard-house-10004341',
      'https://katesheppardhouse.co.nz/',
    ],
  },
  {
    id: 'taranaki-puke-ariki',
    name: 'Puke Ariki',
    region: 'taranaki',
    lat: -39.057,
    lng: 174.073,
    category: 'culture',
    tags: ['museum', 'new-plymouth', 'taonga', 'library'],
    duration_hours: 1.5,
    trigger_radius_m: 400,
    short: 'New Plymouth’s combined museum, library and visitor information hub, exploring Taranaki history and taonga.',
    story: 'Puke Ariki is a strong first stop for understanding Taranaki. It gathers museum galleries, library knowledge and visitor information in one place, helping travellers connect the coast, maunga, geology, taonga and city streets before they head back out into the region.',
    cultural_review_required: true,
    tone: 'respectful, informed, welcoming',
    sources: [
      'https://pukeariki.com/museum/',
      'https://www.npdc.govt.nz/leisure-and-culture/museums-libraries-and-galleries/puke-ariki-library-museum-visitor-information/',
    ],
  },
  {
    id: 'wellington-baring-head-lighthouse',
    name: 'Baring Head / Orua-pouanui Lighthouse',
    region: 'wellington',
    lat: -41.407,
    lng: 174.872,
    category: 'heritage',
    tags: ['lighthouse', 'east-harbour', 'wairarapa-coast', 'walking'],
    duration_hours: 3,
    trigger_radius_m: 1500,
    short: 'A rugged lighthouse precinct in East Harbour Regional Park, reached by walking and biking tracks.',
    story: 'Baring Head / Orua-pouanui feels like Wellington pushed to its weather edge. Tracks cross open coastal ground to a lighthouse precinct where harbour navigation, keeper life and restoration work all meet the wind head-on.',
    cultural_review_required: true,
    tone: 'windswept, historical, open',
    sources: [
      'https://www.gw.govt.nz/parks/east-harbour-regional-park/',
      'https://www.baringhead.org.nz/',
    ],
  },
];

const accommodationAdditions = [
  {
    id: 'coromandel-coromandel-cottages',
    name: 'Coromandel Cottages',
    region: 'coromandel',
    lat: -36.761,
    lng: 175.499,
    type: 'motel',
    price_nzd_per_night: 210,
    rating: 4.5,
    short: 'Self-contained cottage-style accommodation in Coromandel Town, suited to families and peninsula road trips.',
    sources: [
      'https://www.coromandelcottages.co.nz/',
    ],
  },
];

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

function append(kind, additions, collectionKey, toRecord) {
  const dir = path.join(ROOT, 'content', kind);
  const byRegion = new Map();
  const ids = new Set();
  const names = new Set();
  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json') && item !== 'index.json')) {
    const filePath = path.join(dir, file);
    const json = readJson(filePath);
    byRegion.set(json.region.id, { filePath, json });
    for (const item of json[collectionKey] || []) {
      ids.add(item.id);
      names.add(normalizeName(item.name));
    }
  }

  const added = [];
  const skipped = [];
  for (const addition of additions) {
    const region = byRegion.get(addition.region);
    const type = kind === 'poi' ? 'poi' : 'accommodation';
    if (!region) {
      skipped.push({ type, id: addition.id, name: addition.name, reason: `unknown region ${addition.region}` });
      continue;
    }
    if (ids.has(addition.id) || names.has(normalizeName(addition.name))) {
      skipped.push({ type, id: addition.id, name: addition.name, reason: 'duplicate id or exact name' });
      continue;
    }
    const record = toRecord(addition);
    region.json[collectionKey].push(record);
    if (kind === 'accommodations') region.json.count = region.json[collectionKey].length;
    ids.add(record.id);
    names.add(normalizeName(record.name));
    added.push({ ...addition, type });
  }

  for (const { filePath, json } of byRegion.values()) writeJson(filePath, json);
  return { added, skipped };
}

function updateIndexes() {
  const poiDir = path.join(ROOT, 'content', 'poi');
  const accomDir = path.join(ROOT, 'content', 'accommodations');
  const poiRegions = [];
  const byIsland = {};
  const byCategory = {};
  const byStatus = {};
  let poiTotal = 0;
  let culturalReviewRequired = 0;

  for (const file of fs.readdirSync(poiDir).filter((item) => item.endsWith('.json') && item !== 'index.json').sort()) {
    const json = readJson(path.join(poiDir, file));
    const pois = json.pois || [];
    poiTotal += pois.length;
    byIsland[json.region.island] = (byIsland[json.region.island] || 0) + pois.length;
    for (const poi of pois) {
      byCategory[poi.category] = (byCategory[poi.category] || 0) + 1;
      byStatus[poi.content_status || 'draft'] = (byStatus[poi.content_status || 'draft'] || 0) + 1;
      if (poi.cultural_review_required) culturalReviewRequired += 1;
    }
    poiRegions.push({
      id: json.region.id,
      name: json.region.name,
      island: json.region.island,
      centre: json.region.centre,
      poi_count: pois.length,
      file: `content/poi/${file}`,
    });
  }

  writeJson(path.join(poiDir, 'index.json'), {
    generated_at: TODAY,
    project: 'Qiwiosity — New Zealand travel companion',
    schema_version: '1.1',
    totals: {
      regions: poiRegions.length,
      pois: poiTotal,
      by_island: byIsland,
      by_category: byCategory,
      by_content_status: byStatus,
      cultural_review_required: culturalReviewRequired,
    },
    regions: poiRegions,
  });

  const accomRegions = [];
  const byType = {};
  const byRegion = {};
  let accomTotal = 0;
  for (const file of fs.readdirSync(accomDir).filter((item) => item.endsWith('.json') && item !== 'index.json').sort()) {
    const json = readJson(path.join(accomDir, file));
    const accommodations = json.accommodations || [];
    accomTotal += accommodations.length;
    byRegion[json.region.id] = accommodations.length;
    for (const accommodation of accommodations) byType[accommodation.type] = (byType[accommodation.type] || 0) + 1;
    accomRegions.push({
      id: json.region.id,
      name: json.region.name,
      island: json.region.island,
      centre: json.region.centre,
      accommodation_count: accommodations.length,
      file: `content/accommodations/${file}`,
    });
  }

  writeJson(path.join(accomDir, 'index.json'), {
    generated_at: TODAY,
    project: 'Qiwiosity — New Zealand travel companion',
    schema_version: '1.0',
    totals: {
      regions: accomRegions.length,
      accommodations: accomTotal,
      by_type: byType,
      by_region: byRegion,
    },
    regions: accomRegions,
  });
}

function writeReport(results) {
  const reportPath = path.join(ROOT, 'content', 'poi', 'national-expansion-2026-05-17-pass-3-topup-2-report.md');
  const added = [...results.pois.added, ...results.accommodations.added];
  const skipped = [...results.pois.skipped, ...results.accommodations.skipped];
  const lines = [
    '# National Expansion Pass 3 Top-Up 2 - 2026-05-17',
    '',
    'Second top-up to replace duplicate-skipped records from the first top-up.',
    '',
    `POIs added: ${results.pois.added.length}`,
    `Accommodations added: ${results.accommodations.added.length}`,
    `Total additions added: ${added.length}`,
    `Skipped duplicate/invalid candidates: ${skipped.length}`,
    '',
    '## Additions',
  ];
  for (const item of added) {
    lines.push(`- ${item.type}: ${item.name} (${item.id})`);
    for (const source of item.sources || []) lines.push(`  - ${source}`);
  }
  if (skipped.length) {
    lines.push('', '## Skipped Candidates');
    for (const item of skipped) lines.push(`- ${item.type}: ${item.name} (${item.id}) — ${item.reason}`);
  }
  lines.push('');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

const pois = append('poi', poiAdditions, 'pois', (addition) => ({
  id: addition.id,
  name: addition.name,
  region: addition.region,
  lat: addition.lat,
  lng: addition.lng,
  category: addition.category,
  tags: addition.tags,
  trigger_radius_m: addition.trigger_radius_m || 300,
  duration_hours: addition.duration_hours,
  short: addition.short,
  commentary: addition.story,
  audio_story: addition.story,
  suggested_voice_tone: addition.tone,
  sources_to_check: addition.sources,
  content_status: 'draft',
  cultural_review_required: Boolean(addition.cultural_review_required),
}));

const accommodations = append('accommodations', accommodationAdditions, 'accommodations', (addition) => ({
  id: addition.id,
  name: addition.name,
  region: addition.region,
  lat: addition.lat,
  lng: addition.lng,
  type: addition.type,
  price_nzd_per_night: addition.price_nzd_per_night,
  rating: addition.rating,
  short: addition.short,
}));

updateIndexes();
writeReport({ pois, accommodations });

console.log(`Added ${pois.added.length} second top-up POIs`);
console.log(`Added ${accommodations.added.length} second top-up accommodations`);
console.log(`Added ${pois.added.length + accommodations.added.length} total second top-up records`);
if (pois.skipped.length || accommodations.skipped.length) {
  console.log(`Skipped ${pois.skipped.length + accommodations.skipped.length} duplicate/invalid candidates`);
}
