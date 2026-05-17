#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-05-17';

const poiAdditions = [
  {
    id: 'canterbury-akaroa-lighthouse',
    name: 'Akaroa Lighthouse',
    region: 'canterbury',
    lat: -43.808,
    lng: 172.964,
    category: 'heritage',
    tags: ['lighthouse', 'akaroa', 'harbour', 'heritage'],
    duration_hours: 0.75,
    trigger_radius_m: 300,
    short: 'A preserved harbour lighthouse now standing near Akaroa township after a dramatic move from Akaroa Heads.',
    story: 'Akaroa Lighthouse gives the harbour town a compact maritime chapter. The tower once watched from the heads, high above the entrance, and now sits where visitors can read its lens, timber and relocation story at a more human distance.',
    tone: 'bright, maritime, historical',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/canterbury/places/banks-peninsula-area/historic-akaroa-head/',
      'https://akaroalighthouse.org.nz/',
    ],
  },
  {
    id: 'coromandel-square-kauri-tree',
    name: 'Square Kauri Tree',
    region: 'coromandel',
    lat: -36.961,
    lng: 175.59,
    category: 'nature',
    tags: ['kauri', 'short-walk', '309-road', 'forest'],
    duration_hours: 0.5,
    trigger_radius_m: 250,
    short: 'A short Coromandel Forest Park walk to an unusually square-trunked kauri above the 309 Road.',
    story: 'The Square Kauri Tree is a small stop with a memorable shape. A short climb leads to an old kauri whose trunk seems almost deliberately carved by nature, making it a useful pause on the 309 Road and a reminder to respect kauri hygiene at every forest entrance.',
    tone: 'curious, careful, forest-minded',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/coromandel/places/coromandel-forest-park/things-to-do/square-kauri-tree/',
    ],
  },
  {
    id: 'coromandel-broken-hills-battery-walk',
    name: 'Broken Hills Battery Walk',
    region: 'coromandel',
    lat: -37.133,
    lng: 175.743,
    category: 'heritage',
    tags: ['gold-mining', 'coromandel-forest-park', 'walk', 'river'],
    duration_hours: 1,
    trigger_radius_m: 500,
    short: 'A short Broken Hills walk through Coromandel gold-mining relics, forest and river-country remains.',
    story: 'Broken Hills Battery Walk lets the Coromandel gold story sit inside the bush rather than behind glass. Old workings and battery remains show how much effort was dragged into this valley, while the Tairua River and regenerating forest keep softening the edges.',
    tone: 'earthy, historical, exploratory',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/coromandel/places/coromandel-forest-park/things-to-do/broken-hills-battery-walk/',
    ],
  },
  {
    id: 'tairawhiti-pouawa-beach',
    name: 'Pouawa Beach',
    region: 'tairawhiti',
    lat: -38.536,
    lng: 178.232,
    category: 'nature',
    tags: ['beach', 'camping', 'gisborne', 'coast'],
    duration_hours: 1.5,
    trigger_radius_m: 700,
    short: 'A seasonal camping and swimming beach north of Gisborne, with fishing, diving and open-coast light.',
    story: 'Pouawa Beach is a practical coastal pause north of Gisborne: simple, open and best approached with respect for seasonal camping rules. It suits travellers who want a Tairawhiti beach that still feels local, with surf, fishing and wide Pacific light doing the talking.',
    tone: 'open, local, coastal',
    sources: [
      'https://www.gdc.govt.nz/recreation/camping/summer-camping/pouawa-beach',
    ],
  },
  {
    id: 'taranaki-pukeiti',
    name: 'Pukeiti',
    region: 'taranaki',
    lat: -39.154,
    lng: 174.01,
    category: 'nature',
    tags: ['garden', 'rainforest', 'rhododendrons', 'taranaki'],
    duration_hours: 2,
    trigger_radius_m: 900,
    short: 'A rainforest garden on the slopes between Taranaki Maunga and the Kaitake Range, famed for rhododendrons.',
    story: 'Pukeiti turns Taranaki’s wet green abundance into a garden journey. Rhododendrons, covered walks and rainforest gullies make the place feel lush even by regional standards, and the wider setting keeps the mountain quietly present beyond the leaves.',
    cultural_review_required: true,
    tone: 'lush, gentle, garden-rich',
    sources: [
      'https://www.trc.govt.nz/gardens/pukeiti',
      'https://www.pukeiti.com/',
    ],
  },
  {
    id: 'taranaki-aviation-transport-technology-museum',
    name: 'Taranaki Aviation Technology and Transport Museum',
    region: 'taranaki',
    lat: -39.107,
    lng: 174.119,
    category: 'heritage',
    tags: ['museum', 'technology', 'transport', 'new-plymouth'],
    duration_hours: 1.5,
    trigger_radius_m: 450,
    short: 'A hands-on roadside museum south of New Plymouth, preserving aviation, transport and early technology.',
    story: 'Taranaki Aviation Technology and Transport Museum is wonderfully mechanical. Aircraft, vehicles, radios, printing gear and working exhibits turn regional history into switches, engines and machines, making it a strong rainy-day stop for curious travellers.',
    tone: 'hands-on, curious, nostalgic',
    sources: [
      'https://www.tatatm.co.nz/',
      'https://www.taranaki.co.nz/visit/everything-to-see-and-do/museums-and-heritage/',
    ],
  },
  {
    id: 'wellington-pencarrow-lighthouse',
    name: 'Pencarrow Lighthouse',
    region: 'wellington',
    lat: -41.36,
    lng: 174.856,
    category: 'heritage',
    tags: ['lighthouse', 'eastbourne', 'coastal-ride', 'harbour-history'],
    duration_hours: 4,
    trigger_radius_m: 1200,
    short: 'A historic lighthouse walk or ride at Wellington Harbour’s eastern entrance, reached from Eastbourne.',
    story: 'Pencarrow Lighthouse makes Wellington’s harbour feel like a working threshold. The coast track is exposed and weather-shaped, and the old light above the headland carries the story of danger, navigation and the people who kept ships honest at the harbour mouth.',
    tone: 'windswept, historical, practical',
    sources: [
      'https://nzhistory.govt.nz/culture/pencarrow-lighthouse',
      'https://www.newzealand.com/nz/plan/business/pencarrow-lighthouse-nz-historic-places-trust/',
    ],
  },
];

const accommodationAdditions = [
  {
    id: 'coromandel-shelly-beach-top10',
    name: 'Coromandel Shelly Beach TOP 10 Holiday Park',
    region: 'coromandel',
    lat: -36.733,
    lng: 175.505,
    type: 'holiday-park',
    price_nzd_per_night: 135,
    rating: 4.6,
    short: 'Beachfront holiday park north of Coromandel Town, with cabins, camping, family facilities and Hauraki Gulf sunsets.',
    sources: [
      'https://www.shellybeachcoromandel.co.nz/',
      'https://www.newzealand.com/int/plan/business/coromandel-shelly-beach-top-10-holiday-park/',
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

function appendSplitContent(kind, additions, toRecord) {
  const collectionKey = kind === 'poi' ? 'pois' : 'accommodations';
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
    for (const accommodation of accommodations) {
      byType[accommodation.type] = (byType[accommodation.type] || 0) + 1;
    }
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
  const reportPath = path.join(ROOT, 'content', 'poi', 'national-expansion-2026-05-17-pass-3-topup-report.md');
  const added = [...results.pois.added, ...results.accommodations.added];
  const skipped = [...results.pois.skipped, ...results.accommodations.skipped];
  const byRegion = {};
  for (const item of added) {
    byRegion[item.region] ||= { poi: [], accommodations: [] };
    if (item.type === 'poi') byRegion[item.region].poi.push(item);
    else byRegion[item.region].accommodations.push(item);
  }

  const lines = [
    '# National Expansion Pass 3 Top-Up - 2026-05-17',
    '',
    'Top-up to replace duplicate-skipped pass-3 candidates and add the missing Coromandel slice.',
    '',
    `POIs added: ${results.pois.added.length}`,
    `Accommodations added: ${results.accommodations.added.length}`,
    `Total additions added: ${added.length}`,
    `Skipped duplicate/invalid candidates: ${skipped.length}`,
    '',
    '## Additions By Region',
  ];

  for (const regionId of Object.keys(byRegion).sort()) {
    const group = byRegion[regionId];
    lines.push('', `### ${regionId}`);
    lines.push(`POIs: ${group.poi.length}`);
    for (const item of group.poi) {
      lines.push(`- ${item.name} (${item.id})`);
      for (const source of item.sources || []) lines.push(`  - ${source}`);
    }
    lines.push(`Accommodations: ${group.accommodations.length}`);
    for (const item of group.accommodations) {
      lines.push(`- ${item.name} (${item.id})`);
      for (const source of item.sources || []) lines.push(`  - ${source}`);
    }
  }

  if (skipped.length) {
    lines.push('', '## Skipped Candidates');
    for (const item of skipped) lines.push(`- ${item.type}: ${item.name} (${item.id}) — ${item.reason}`);
  }
  lines.push('');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

function poiRecord(addition) {
  return {
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
  };
}

function accommodationRecord(addition) {
  return {
    id: addition.id,
    name: addition.name,
    region: addition.region,
    lat: addition.lat,
    lng: addition.lng,
    type: addition.type,
    price_nzd_per_night: addition.price_nzd_per_night,
    rating: addition.rating,
    short: addition.short,
  };
}

function main() {
  const pois = appendSplitContent('poi', poiAdditions, poiRecord);
  const accommodations = appendSplitContent('accommodations', accommodationAdditions, accommodationRecord);
  updateIndexes();
  writeReport({ pois, accommodations });

  console.log(`Added ${pois.added.length} top-up POIs`);
  console.log(`Added ${accommodations.added.length} top-up accommodations`);
  console.log(`Added ${pois.added.length + accommodations.added.length} total top-up records`);
  if (pois.skipped.length || accommodations.skipped.length) {
    console.log(`Skipped ${pois.skipped.length + accommodations.skipped.length} duplicate/invalid candidates`);
  }
}

main();
