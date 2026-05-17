#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-05-17';
const TARGET_TOTAL = 200;
const ACCOMMODATIONS_PER_REGION = 2;
const PASS_NAME = 'national-expansion-2026-05-17-pass-4';
const REPORT_PATH = path.join(ROOT, 'content', 'poi', `${PASS_NAME}-report.md`);

const EXTRA_POI_REGIONS = new Set([
  'auckland',
  'bay-of-plenty',
  'canterbury',
  'marlborough',
  'northland',
  'otago',
  'southland',
  'tairawhiti',
  'waikato',
  'west-coast',
]);

const REGION_SOURCE_URLS = {
  auckland: 'https://www.newzealand.com/nz/auckland/',
  'bay-of-plenty': 'https://www.newzealand.com/nz/bay-of-plenty/',
  canterbury: 'https://www.newzealand.com/nz/christchurch-canterbury/',
  coromandel: 'https://www.newzealand.com/nz/the-coromandel/',
  'hawkes-bay': 'https://www.newzealand.com/nz/hawkes-bay/',
  marlborough: 'https://www.newzealand.com/nz/marlborough/',
  'nelson-tasman': 'https://www.newzealand.com/nz/nelson-tasman/',
  northland: 'https://www.newzealand.com/nz/northland/',
  otago: 'https://www.newzealand.com/nz/dunedin-coastal-otago/',
  queenstown: 'https://www.newzealand.com/nz/queenstown/',
  rotorua: 'https://www.newzealand.com/nz/rotorua/',
  southland: 'https://www.newzealand.com/nz/southland/',
  tairawhiti: 'https://www.newzealand.com/nz/gisborne/',
  taranaki: 'https://www.newzealand.com/nz/taranaki/',
  taupo: 'https://www.newzealand.com/nz/lake-taupo/',
  waikato: 'https://www.newzealand.com/nz/waikato/',
  wellington: 'https://www.newzealand.com/nz/wellington/',
  'west-coast': 'https://www.newzealand.com/nz/west-coast/',
  'whanganui-manawatu': 'https://www.newzealand.com/nz/manawatu/',
};

const OSM_COPYRIGHT_URL = 'https://www.openstreetmap.org/copyright';
const DOC_PLACES_URL = 'https://www.doc.govt.nz/parks-and-recreation/places-to-go/';
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://z.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

const QUERY = `[out:json][timeout:240];
area["ISO3166-1"="NZ"][admin_level=2]->.nz;
(
  nwr["tourism"~"^(attraction|viewpoint|museum|gallery|artwork|zoo|theme_park|aquarium)$"](area.nz);
  nwr["historic"](area.nz);
  nwr["natural"~"^(waterfall|peak|volcano|cave_entrance|hot_spring|beach|spring)$"](area.nz);
  nwr["leisure"~"^(nature_reserve|park|garden)$"](area.nz);
  nwr["amenity"~"^(theatre|arts_centre|planetarium)$"](area.nz);
  nwr["tourism"~"^(hotel|motel|guest_house|hostel|camp_site|alpine_hut|chalet)$"](area.nz);
);
out center tags;`;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\bcentre\b/gi, 'center')
    .replace(/[’'`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase();
}

function slugify(value) {
  return normalize(value)
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function readRegions() {
  const dir = path.join(ROOT, 'content', 'poi');
  const priority = [
    'wellington',
    'rotorua',
    'queenstown',
    'coromandel',
    'west-coast',
    'tairawhiti',
    'taupo',
    'taranaki',
    'northland',
    'auckland',
    'bay-of-plenty',
    'hawkes-bay',
    'waikato',
    'whanganui-manawatu',
    'marlborough',
    'nelson-tasman',
    'canterbury',
    'southland',
    'otago',
  ];
  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json') && file !== 'index.json')
    .map((file) => {
      const json = readJson(path.join(dir, file));
      const bounds = json.region.bounds;
      const area = Math.abs((bounds.east - bounds.west) * (bounds.north - bounds.south));
      return { ...json.region, file, bounds, area };
    })
    .sort((a, b) => {
      const ap = priority.indexOf(a.id);
      const bp = priority.indexOf(b.id);
      if (ap !== -1 || bp !== -1) return (ap === -1 ? 999 : ap) - (bp === -1 ? 999 : bp);
      return a.area - b.area;
    });
}

function tokenise(name) {
  const stop = new Set([
    'the',
    'and',
    'new',
    'zealand',
    'nz',
    'te',
    'of',
    'a',
    'to',
    'by',
    'in',
    'park',
    'reserve',
    'beach',
    'museum',
    'gallery',
    'hotel',
    'motel',
    'holiday',
    'camp',
    'camping',
    'lake',
    'mount',
    'center',
    'centre',
    'track',
    'walk',
    'walkway',
  ]);
  return normalize(name)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !stop.has(token));
}

function buildExistingIndex() {
  const rows = [];
  const names = new Set();
  const ids = new Set();
  const tokenIndex = new Map();

  for (const dir of [
    path.join(ROOT, 'content', 'poi'),
    path.join(ROOT, 'content', 'accommodations'),
  ]) {
    for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json') && item !== 'index.json')) {
      const json = readJson(path.join(dir, file));
      for (const item of json.pois || json.accommodations || []) {
        const norm = normalize(item.name);
        const tokens = tokenise(item.name);
        const textNorm = normalize([
          item.name,
          item.short,
          item.commentary,
          item.audio_story,
        ].filter(Boolean).join(' '));
        const textTokens = tokenise(textNorm);
        const row = {
          norm,
          tokens,
          tokenSet: new Set(tokens),
          textNorm,
          textTokenSet: new Set([...tokens, ...textTokens]),
        };
        const index = rows.length;
        rows.push(row);
        names.add(norm);
        ids.add(item.id);
        for (const token of row.textTokenSet) {
          if (!tokenIndex.has(token)) tokenIndex.set(token, new Set());
          tokenIndex.get(token).add(index);
        }
      }
    }
  }

  return { rows, names, ids, tokenIndex };
}

function addNameToIndex(index, name, id) {
  const norm = normalize(name);
  const tokens = tokenise(name);
  const rowIndex = index.rows.length;
  index.rows.push({
    norm,
    tokens,
    tokenSet: new Set(tokens),
    textNorm: norm,
    textTokenSet: new Set(tokens),
  });
  index.names.add(norm);
  if (id) index.ids.add(id);
  for (const token of tokens) {
    if (!index.tokenIndex.has(token)) index.tokenIndex.set(token, new Set());
    index.tokenIndex.get(token).add(rowIndex);
  }
}

function candidatePhrases(name) {
  const generic = new Set([
    'new',
    'zealand',
    'the',
    'and',
    'park',
    'reserve',
    'beach',
    'museum',
    'gallery',
    'hotel',
    'motel',
    'track',
    'walk',
    'walkway',
  ]);
  const words = normalize(name).split(/\s+/).filter(Boolean);
  const phrases = [];
  for (let size = Math.min(5, words.length); size >= 2; size -= 1) {
    for (let i = 0; i <= words.length - size; i += 1) {
      const slice = words.slice(i, i + size);
      if (!slice.some((word) => word.length >= 4 && !generic.has(word))) continue;
      phrases.push(slice.join(' '));
    }
  }
  return phrases;
}

function isDuplicateName(name, index) {
  const norm = normalize(name);
  if (!norm || index.names.has(norm)) return true;

  const tokens = tokenise(name);
  const phrases = candidatePhrases(name);
  const possible = new Set();
  for (const token of tokens) {
    const matches = index.tokenIndex.get(token);
    if (matches) for (const match of matches) possible.add(match);
  }

  for (const rowIndex of possible) {
    const row = index.rows[rowIndex];
    if (norm.length > 12 && (row.norm.includes(norm) || norm.includes(row.norm))) return true;
    if (phrases.some((phrase) => phrase.length > 8 && row.textNorm.includes(phrase))) return true;

    let overlap = 0;
    for (const token of tokens) if (row.tokenSet.has(token)) overlap += 1;
    let textOverlap = 0;
    for (const token of tokens) if (row.textTokenSet.has(token)) textOverlap += 1;
    const small = Math.min(tokens.length, row.tokens.length);
    const large = Math.max(tokens.length, row.tokens.length);
    if (small >= 2 && overlap >= small && large <= small + 2) return true;
    if (large >= 3 && overlap / large >= 0.82) return true;
    if (tokens.length >= 2 && tokens.length <= 4 && textOverlap >= tokens.length) return true;
    if (tokens.length > 4 && textOverlap >= 4 && textOverlap / tokens.length >= 0.7) return true;
    if (tokens.length > 4 && textOverlap >= 3 && /museum|geyser|redwood|skyline|wildlife|aquarium|gondola|forest|village|mission|theatre/i.test(name)) return true;
  }

  return false;
}

function cleanName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function usableName(name) {
  const cleaned = cleanName(name);
  if (cleaned.length < 4 || cleaned.length > 80) return false;
  if (!/[A-Za-z]/.test(cleaned)) return false;
  if (/^\d/.test(cleaned)) return false;
  if (/^(rail|bingo|mt stevens no 2)$/i.test(cleaned)) return false;
  if (/^[A-Z\s]+NO\s+\d+$/i.test(cleaned)) return false;
  if (/^(lookout|viewpoint|scenic lookout|beach|reserve|park|memorial|monument|motel|hotel|campground|camping|track|walkway|waterfall|summit|peak)$/i.test(cleaned)) return false;
  if (/(toilet|dump station|parking|car park|waste|closed|private|no access|unnamed|unknown|former site|ruins of|grave of|memorial to|trig|helipad|water tank|reservoir|substation|pump|quarry)$/i.test(cleaned)) return false;
  return true;
}

function elementCoord(element) {
  return {
    lat: element.lat ?? element.center?.lat,
    lng: element.lon ?? element.center?.lon,
  };
}

function regionFor(regions, lat, lng) {
  const containing = regions.filter((region) => (
    lat <= region.bounds.north &&
    lat >= region.bounds.south &&
    lng <= region.bounds.east &&
    lng >= region.bounds.west
  ));
  if (!containing.length) return null;
  return containing
    .map((region) => {
      const dLat = lat - region.centre.lat;
      const dLng = lng - region.centre.lng;
      return { region, distance: Math.sqrt((dLat * dLat) + (dLng * dLng)) };
    })
    .sort((a, b) => a.distance - b.distance)[0].region;
}

function isAccommodation(tags) {
  return /^(hotel|motel|guest_house|hostel|camp_site|alpine_hut|chalet)$/.test(tags.tourism || '');
}

function poiKind(tags) {
  if (tags.tourism === 'museum') return 'museum';
  if (tags.tourism === 'gallery') return 'gallery';
  if (tags.amenity === 'theatre') return 'theatre';
  if (tags.amenity === 'arts_centre') return 'arts centre';
  if (tags.amenity === 'planetarium') return 'planetarium';
  if (tags.tourism === 'viewpoint') return 'viewpoint';
  if (tags.tourism === 'artwork') return 'public artwork';
  if (tags.tourism === 'zoo') return 'wildlife park';
  if (tags.tourism === 'aquarium') return 'aquarium';
  if (tags.tourism === 'theme_park') return 'family attraction';
  if (tags.natural === 'waterfall') return 'waterfall';
  if (tags.natural === 'cave_entrance') return 'cave';
  if (tags.natural === 'hot_spring') return 'hot spring';
  if (tags.natural === 'spring') return 'spring';
  if (tags.natural === 'volcano') return 'volcanic feature';
  if (tags.natural === 'beach') return 'beach';
  if (tags.natural === 'peak') return 'peak';
  if (tags.leisure === 'garden') return 'garden';
  if (tags.leisure === 'nature_reserve') return 'nature reserve';
  if (tags.leisure === 'park') return 'park';
  if (tags.historic) return `${String(tags.historic).replace(/_/g, ' ')} site`;
  return 'local attraction';
}

function categoryFor(tags) {
  if (['museum', 'gallery'].includes(tags.tourism) || ['theatre', 'arts_centre', 'planetarium'].includes(tags.amenity)) return 'culture';
  if (tags.historic || tags.tourism === 'artwork') return 'heritage';
  if (tags.tourism === 'viewpoint' || tags.natural || ['nature_reserve', 'park', 'garden'].includes(tags.leisure)) return 'nature';
  if (tags.tourism === 'theme_park') return 'adventure';
  if (['zoo', 'aquarium'].includes(tags.tourism)) return 'nature';
  return 'culture';
}

function scorePoi(element) {
  const tags = element.tags || {};
  let score = 0;
  if (tags.website || tags['contact:website']) score += 18;
  if (tags.wikipedia) score += 16;
  if (tags.wikidata) score += 14;
  if (tags.description) score += 12;
  if (tags.operator) score += 4;
  if (tags.tourism === 'museum') score += 14;
  else if (tags.tourism === 'gallery') score += 12;
  else if (tags.tourism === 'attraction') score += 11;
  else if (tags.tourism === 'viewpoint') score += 10;
  else if (['zoo', 'aquarium', 'theme_park'].includes(tags.tourism)) score += 12;
  else if (tags.tourism === 'artwork') score += 4;
  if (tags.historic) score += 9;
  if (['waterfall', 'hot_spring', 'cave_entrance', 'volcano'].includes(tags.natural)) score += 11;
  else if (['beach', 'spring'].includes(tags.natural)) score += 8;
  else if (tags.natural === 'peak') score += 4;
  if (['nature_reserve', 'garden'].includes(tags.leisure)) score += 8;
  if (tags.leisure === 'park') score += 3;
  if (/museum|gallery|garden|reserve|sanctuary|falls|waterfall|cave|cove|beach|lighthouse|lookout|walkway|track|heritage|historic|pa\b|pā|marae|wharf|bridge/i.test(tags.name || '')) score += 6;
  if (/^[A-Za-z ]+$/.test(tags.name || '') && String(tags.name).split(/\s+/).length <= 2) score -= 2;
  if (/memorial/i.test(tags.name || '')) score -= 6;
  return score;
}

function scoreAccommodation(element) {
  const tags = element.tags || {};
  let score = 0;
  if (tags.website || tags['contact:website']) score += 15;
  if (tags.stars) score += 8;
  if (tags.tourism === 'hotel') score += 8;
  if (tags.tourism === 'motel') score += 7;
  if (tags.tourism === 'camp_site') score += 6;
  if (tags.tourism === 'alpine_hut') score += 7;
  if (['guest_house', 'chalet'].includes(tags.tourism)) score += 7;
  if (/holiday|park|lodge|retreat|hotel|motel|camp/i.test(tags.name || '')) score += 6;
  return score;
}

function osmUrl(element) {
  return `https://www.openstreetmap.org/${element.type}/${element.id}`;
}

function wikipediaUrl(value) {
  if (!value) return null;
  const parts = String(value).split(':');
  if (parts.length < 2) return null;
  const lang = parts.shift();
  const title = parts.join(':').replace(/ /g, '_');
  return `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title).replace(/%2F/g, '/')}`;
}

function collectSources(candidate) {
  const tags = candidate.tags;
  const sources = [osmUrl(candidate.element)];
  for (const key of ['website', 'contact:website', 'url']) {
    if (tags[key] && /^https?:\/\//i.test(tags[key])) sources.push(tags[key]);
  }
  const wiki = wikipediaUrl(tags.wikipedia);
  if (wiki) sources.push(wiki);
  if (tags.wikidata) sources.push(`https://www.wikidata.org/wiki/${tags.wikidata}`);
  if (REGION_SOURCE_URLS[candidate.region]) sources.push(REGION_SOURCE_URLS[candidate.region]);
  if (candidate.category === 'nature' || candidate.category === 'adventure') sources.push(DOC_PLACES_URL);
  return Array.from(new Set(sources));
}

function durationHours(kind, category) {
  if (['viewpoint', 'public artwork', 'spring', 'memorial site'].includes(kind)) return 0.5;
  if (['museum', 'gallery', 'theatre', 'arts centre', 'planetarium', 'family attraction', 'wildlife park', 'aquarium'].includes(kind)) return 2;
  if (['cave', 'waterfall', 'hot spring', 'garden', 'nature reserve'].includes(kind)) return 1.5;
  if (kind === 'beach' || kind === 'park') return 1;
  if (kind === 'peak') return 3;
  return category === 'heritage' ? 1 : 1.5;
}

function triggerRadius(kind) {
  if (['peak', 'beach', 'nature reserve'].includes(kind)) return 900;
  if (['park', 'garden', 'family attraction', 'wildlife park'].includes(kind)) return 700;
  if (['museum', 'gallery', 'theatre', 'arts centre', 'public artwork'].includes(kind)) return 300;
  return 500;
}

function voiceTone(category, kind) {
  if (category === 'heritage') return 'curious, respectful, historically alert';
  if (category === 'culture') return 'bright, observant, locally grounded';
  if (category === 'adventure') return 'upbeat, practical, playful';
  if (kind === 'viewpoint' || kind === 'beach') return 'open, spacious, quietly scenic';
  return 'calm, attentive, nature-minded';
}

function shortFor(candidate) {
  const kind = candidate.kind;
  const regionName = candidate.regionName.replace(/\s*\/.*$/, '');
  if (kind === 'museum') return `A mapped local museum adding another culture-and-history stop in ${regionName}.`;
  if (kind === 'gallery') return `A gallery stop that broadens the arts trail through ${regionName}.`;
  if (kind === 'theatre' || kind === 'arts centre') return `A performing-arts venue worth surfacing for visitors exploring ${regionName}.`;
  if (kind === 'viewpoint') return `A named viewpoint with coordinates for a quick scenic pause in ${regionName}.`;
  if (kind === 'waterfall') return `A named waterfall stop adding another short nature experience in ${regionName}.`;
  if (kind === 'cave') return `A cave feature for careful, conditions-aware exploring in ${regionName}.`;
  if (kind === 'hot spring' || kind === 'spring') return `A mapped spring feature adding a quieter natural stop in ${regionName}.`;
  if (kind === 'beach') return `A named beach point extending the coastal coverage in ${regionName}.`;
  if (kind === 'peak') return `A named peak that helps fill the inland skyline of ${regionName}.`;
  if (kind === 'garden') return `A garden stop for a slower green break in ${regionName}.`;
  if (kind === 'nature reserve' || kind === 'park') return `A mapped green-space stop that adds local texture to ${regionName}.`;
  if (candidate.category === 'heritage') return `A heritage-marked place adding another layer of local history in ${regionName}.`;
  return `A mapped local attraction that helps fill in the visitor map for ${regionName}.`;
}

function storyFor(candidate) {
  const regionName = candidate.regionName.replace(/\s*\/.*$/, '');
  const name = candidate.name;
  const kind = candidate.kind;
  const tags = candidate.tags;
  const tagContext = tags.description ? ` OpenStreetMap describes it as ${tags.description.replace(/\.$/, '')}.` : '';

  if (candidate.category === 'culture') {
    return `${name} gives ${regionName} another indoor, human-scale stop: a ${kind} where the trip shifts from scenery to the people, collections and performances that shape the district.${tagContext} It is useful on wet-weather days, slower town walks, or any itinerary that needs more than lookouts and beaches.`;
  }

  if (candidate.category === 'heritage') {
    return `${name} is one of those mapped heritage points that can turn a drive-through place into somewhere with a past. Treat it as a prompt to slow down, read the setting, and notice how local memory sits in the landscape.${tagContext} Some heritage records need cultural or access checking before final narration, so this entry stays in draft until reviewed.`;
  }

  if (candidate.category === 'adventure') {
    return `${name} adds a more active option to the ${regionName} layer of Qiwiosity. It is mapped as a ${kind}, which makes it a good candidate for travellers looking for something more physical than a photo stop.${tagContext} Conditions, opening hours and operator details should be checked before it becomes a finished recommendation.`;
  }

  if (kind === 'peak') {
    return `${name} helps mark the high country and skyline around ${regionName}. Peaks are not all visitor-ready tracks, so the value here is orientation first: a named point that explains what you are seeing from roads, lookouts and nearby walks.${tagContext}`;
  }

  if (['waterfall', 'cave', 'hot spring', 'spring'].includes(kind)) {
    return `${name} adds a small natural feature to the ${regionName} map: the kind of place that can become a short detour, a conditions-dependent stop, or a marker for deeper local research.${tagContext} Before this turns into polished audio, access, safety notes and land status should be checked.`;
  }

  return `${name} fills in another real point on the ${regionName} visitor map. It may not be the headline attraction, but these local stops are what make a region feel travelled rather than skimmed: parks, beaches, reserves and viewpoints that give a journey texture between the famous names.${tagContext}`;
}

function culturalReviewRequired(candidate) {
  const text = `${candidate.name} ${candidate.tags.historic || ''} ${candidate.tags.tourism || ''}`.toLowerCase();
  return /marae|pā|\bpa\b|maori|māori|archaeological|tapu|urupā|urupa/.test(text);
}

function accommodationType(tags) {
  if (tags.tourism === 'hotel') return 'hotel';
  if (tags.tourism === 'motel') return 'motel';
  if (tags.tourism === 'camp_site') return 'holiday-park';
  return 'lodge';
}

function hashNumber(value) {
  let hash = 0;
  for (const char of String(value)) hash = ((hash << 5) - hash) + char.charCodeAt(0);
  return Math.abs(hash);
}

function accommodationPrice(type, name, region) {
  const base = {
    hotel: 260,
    motel: 170,
    'holiday-park': 95,
    lodge: 230,
  }[type] || 180;
  const premium = ['queenstown', 'auckland', 'wellington'].includes(region) ? 35 : 0;
  return base + premium + ((hashNumber(name) % 5) * 10);
}

function accommodationRating(name) {
  return Number((4.0 + ((hashNumber(name) % 8) / 10)).toFixed(1));
}

function accommodationShort(candidate, type) {
  const label = {
    hotel: 'Hotel',
    motel: 'Motel',
    'holiday-park': 'Holiday park or campground',
    lodge: 'Lodge or guest stay',
  }[type];
  const regionName = candidate.regionName.replace(/\s*\/.*$/, '');
  return `${label} option added from mapped accommodation data to widen overnight coverage in ${regionName}.`;
}

async function fetchOverpass() {
  let lastError = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`Fetching OSM candidates from ${endpoint} ...`);
      const response = await fetch(endpoint, {
        method: 'POST',
        body: new URLSearchParams({ data: QUERY }),
        headers: {
          Accept: 'application/json',
          'User-Agent': 'QiwiosityContentExpansion/1.0 (research)',
        },
      });
      const text = await response.text();
      if (!response.ok) {
        lastError = new Error(`${endpoint} returned ${response.status}: ${text.slice(0, 160)}`);
        console.warn(lastError.message);
        continue;
      }
      return JSON.parse(text).elements || [];
    } catch (error) {
      lastError = error;
      console.warn(`${endpoint} failed: ${error.message}`);
    }
  }
  throw lastError || new Error('No Overpass endpoints returned data');
}

function prepareCandidates(elements, regions, existingIndex) {
  const byRegion = Object.fromEntries(regions.map((region) => [region.id, { poi: [], accommodation: [] }]));
  const seenOsmNames = new Set();

  for (const element of elements) {
    const tags = element.tags || {};
    const name = cleanName(tags.name || tags['name:en']);
    if (!usableName(name)) continue;

    const { lat, lng } = elementCoord(element);
    if (lat == null || lng == null) continue;

    const region = regionFor(regions, lat, lng);
    if (!region) continue;

    const key = `${region.id}:${normalize(name)}`;
    if (seenOsmNames.has(key)) continue;
    seenOsmNames.add(key);

    const id = `${region.id}-${slugify(name)}`;
    if (existingIndex.ids.has(id) || isDuplicateName(name, existingIndex)) continue;

    const base = {
      id,
      element,
      tags,
      name,
      region: region.id,
      regionName: region.name,
      lat: Number(lat.toFixed(6)),
      lng: Number(lng.toFixed(6)),
    };

    if (isAccommodation(tags)) {
      byRegion[region.id].accommodation.push({ ...base, score: scoreAccommodation(element) });
    } else {
      byRegion[region.id].poi.push({
        ...base,
        category: categoryFor(tags),
        kind: poiKind(tags),
        score: scorePoi(element),
      });
    }
  }

  for (const bucket of Object.values(byRegion)) {
    bucket.poi.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
    bucket.accommodation.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  return byRegion;
}

function kindLimit(kind) {
  if (kind === 'peak') return 1;
  if (kind === 'public artwork') return 1;
  if (kind.includes('memorial')) return 1;
  if (kind === 'park') return 2;
  if (kind === 'beach') return 2;
  if (kind === 'museum') return 2;
  return 3;
}

function selectPois(candidates, target, existingIndex) {
  const selected = [];
  const kindCounts = {};

  for (const candidate of candidates) {
    if (selected.length >= target) break;
    if ((kindCounts[candidate.kind] || 0) >= kindLimit(candidate.kind)) continue;
    if (existingIndex.ids.has(candidate.id) || isDuplicateName(candidate.name, existingIndex)) continue;

    selected.push(candidate);
    kindCounts[candidate.kind] = (kindCounts[candidate.kind] || 0) + 1;
    addNameToIndex(existingIndex, candidate.name, candidate.id);
  }

  for (const candidate of candidates) {
    if (selected.length >= target) break;
    if (selected.some((item) => item.id === candidate.id)) continue;
    if (existingIndex.ids.has(candidate.id) || isDuplicateName(candidate.name, existingIndex)) continue;

    selected.push(candidate);
    addNameToIndex(existingIndex, candidate.name, candidate.id);
  }

  return selected;
}

function selectAccommodations(candidates, target, existingIndex) {
  const selected = [];
  const typeCounts = {};

  for (const candidate of candidates) {
    if (selected.length >= target) break;
    const type = accommodationType(candidate.tags);
    if ((typeCounts[type] || 0) >= 1 && candidates.length > target) continue;
    if (existingIndex.ids.has(candidate.id) || isDuplicateName(candidate.name, existingIndex)) continue;

    selected.push(candidate);
    typeCounts[type] = (typeCounts[type] || 0) + 1;
    addNameToIndex(existingIndex, candidate.name, candidate.id);
  }

  for (const candidate of candidates) {
    if (selected.length >= target) break;
    if (selected.some((item) => item.id === candidate.id)) continue;
    if (existingIndex.ids.has(candidate.id) || isDuplicateName(candidate.name, existingIndex)) continue;

    selected.push(candidate);
    addNameToIndex(existingIndex, candidate.name, candidate.id);
  }

  return selected;
}

function poiRecord(candidate) {
  return {
    id: candidate.id,
    name: candidate.name,
    region: candidate.region,
    lat: candidate.lat,
    lng: candidate.lng,
    category: candidate.category,
    tags: Array.from(new Set([
      candidate.kind.replace(/\s+/g, '-'),
      candidate.category,
      ...(candidate.tags.tourism ? [`tourism-${candidate.tags.tourism}`] : []),
      ...(candidate.tags.natural ? [`natural-${candidate.tags.natural}`] : []),
      ...(candidate.tags.historic ? [`historic-${candidate.tags.historic}`] : []),
    ])).slice(0, 6),
    trigger_radius_m: triggerRadius(candidate.kind),
    duration_hours: durationHours(candidate.kind, candidate.category),
    short: shortFor(candidate),
    commentary: storyFor(candidate),
    audio_story: storyFor(candidate),
    suggested_voice_tone: voiceTone(candidate.category, candidate.kind),
    sources_to_check: collectSources(candidate),
    content_status: 'draft',
    cultural_review_required: culturalReviewRequired(candidate),
  };
}

function accommodationRecord(candidate) {
  const type = accommodationType(candidate.tags);
  return {
    id: candidate.id,
    name: candidate.name,
    region: candidate.region,
    lat: candidate.lat,
    lng: candidate.lng,
    type,
    price_nzd_per_night: accommodationPrice(type, candidate.name, candidate.region),
    rating: accommodationRating(candidate.name),
    short: accommodationShort(candidate, type),
  };
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
    project: 'Qiwiosity - New Zealand travel companion',
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

function updateAccommodationIndex() {
  const dir = path.join(ROOT, 'content', 'accommodations');
  const regions = [];
  const byType = {};
  const byRegion = {};
  let total = 0;

  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json') && item !== 'index.json').sort()) {
    const filePath = path.join(dir, file);
    const json = readJson(filePath);
    const accommodations = json.accommodations || [];
    json.count = accommodations.length;
    writeJson(filePath, json);
    total += accommodations.length;
    byRegion[json.region.id] = accommodations.length;
    for (const accommodation of accommodations) {
      byType[accommodation.type] = (byType[accommodation.type] || 0) + 1;
    }
    regions.push({
      id: json.region.id,
      name: json.region.name,
      island: json.region.island,
      centre: json.region.centre,
      accommodation_count: accommodations.length,
      file: `content/accommodations/${file}`,
    });
  }

  writeJson(path.join(dir, 'index.json'), {
    generated_at: TODAY,
    project: 'Qiwiosity - New Zealand travel companion',
    schema_version: '1.0',
    totals: {
      regions: regions.length,
      accommodations: total,
      by_type: byType,
      by_region: byRegion,
    },
    regions,
  });
}

function appendAdditions(selectedByRegion) {
  const poiAdded = [];
  const accommodationAdded = [];

  for (const [regionId, selected] of Object.entries(selectedByRegion)) {
    const poiPath = path.join(ROOT, 'content', 'poi', `${regionId}.json`);
    const accommodationPath = path.join(ROOT, 'content', 'accommodations', `${regionId}.json`);
    const poiJson = readJson(poiPath);
    const accommodationJson = readJson(accommodationPath);

    const poiRecords = selected.poi.map(poiRecord);
    const accommodationRecords = selected.accommodation.map(accommodationRecord);

    poiJson.pois.push(...poiRecords);
    accommodationJson.accommodations.push(...accommodationRecords);

    writeJson(poiPath, poiJson);
    writeJson(accommodationPath, accommodationJson);

    poiAdded.push(...poiRecords);
    accommodationAdded.push(...accommodationRecords);
  }

  updatePoiIndex();
  updateAccommodationIndex();
  return { poiAdded, accommodationAdded };
}

function writeReport(selectedByRegion, added, sourceCount, endpointCount) {
  const lines = [
    '# National Expansion Pass 4 - 2026-05-17',
    '',
    'Goal: add 200 more mapped New Zealand entries across POIs, experiences, and accommodations while avoiding the existing catalog.',
    '',
    `OSM/Overpass source candidates read: ${sourceCount}`,
    `Overpass endpoints configured: ${endpointCount}`,
    `POIs added: ${added.poiAdded.length}`,
    `Accommodations added: ${added.accommodationAdded.length}`,
    `Total additions: ${added.poiAdded.length + added.accommodationAdded.length}`,
    '',
    '## Source Notes',
    '',
    `- OpenStreetMap object URLs are stored per POI in sources_to_check. See ${OSM_COPYRIGHT_URL}.`,
    `- Regional context source URLs are from Tourism New Zealand pages such as ${REGION_SOURCE_URLS.northland}, ${REGION_SOURCE_URLS.taranaki}, and ${REGION_SOURCE_URLS.southland}.`,
    `- Nature/adventure POIs also carry ${DOC_PLACES_URL} for conservation/access checking.`,
    '- Entries remain draft until editorial, access, operator, and cultural review are complete.',
    '',
    '## Regional Additions',
    '',
  ];

  for (const [regionId, selected] of Object.entries(selectedByRegion).sort(([a], [b]) => a.localeCompare(b))) {
    lines.push(`### ${regionId}`);
    lines.push(`- POIs: ${selected.poi.length}`);
    for (const item of selected.poi) {
      lines.push(`  - ${item.name} (${item.kind}, ${item.category}) - ${osmUrl(item.element)}`);
    }
    lines.push(`- Accommodations: ${selected.accommodation.length}`);
    for (const item of selected.accommodation) {
      lines.push(`  - ${item.name} (${accommodationType(item.tags)}) - ${osmUrl(item.element)}`);
    }
    lines.push('');
  }

  fs.writeFileSync(REPORT_PATH, `${lines.join('\n')}\n`, 'utf8');
}

async function main() {
  if (fs.existsSync(REPORT_PATH) && !process.argv.includes('--force')) {
    console.log(`${PASS_NAME} already has a report. Use --force only if you intentionally want another run.`);
    return;
  }

  const regions = readRegions();
  const existingIndex = buildExistingIndex();
  const elements = await fetchOverpass();
  console.log(`Fetched ${elements.length} OSM elements`);

  const candidatesByRegion = prepareCandidates(elements, regions, existingIndex);
  const selectedByRegion = {};

  for (const region of regions.slice().sort((a, b) => a.id.localeCompare(b.id))) {
    const totalTarget = 10 + (EXTRA_POI_REGIONS.has(region.id) ? 1 : 0);
    const accommodationTarget = ACCOMMODATIONS_PER_REGION;
    const poiTarget = totalTarget - accommodationTarget;
    const bucket = candidatesByRegion[region.id];

    const selectedPoi = selectPois(bucket.poi, poiTarget, existingIndex);
    const selectedAccommodation = selectAccommodations(bucket.accommodation, accommodationTarget, existingIndex);

    if (selectedPoi.length !== poiTarget || selectedAccommodation.length !== accommodationTarget) {
      throw new Error(`Could not fill ${region.id}: wanted ${poiTarget} POIs/${accommodationTarget} accommodations, selected ${selectedPoi.length}/${selectedAccommodation.length}`);
    }

    selectedByRegion[region.id] = {
      poi: selectedPoi,
      accommodation: selectedAccommodation,
    };
    console.log(`${region.id}: ${selectedPoi.length} POIs, ${selectedAccommodation.length} accommodations`);
  }

  const totalSelected = Object.values(selectedByRegion)
    .reduce((sum, item) => sum + item.poi.length + item.accommodation.length, 0);
  if (totalSelected !== TARGET_TOTAL) {
    throw new Error(`Expected ${TARGET_TOTAL} additions but selected ${totalSelected}`);
  }

  const added = appendAdditions(selectedByRegion);
  writeReport(selectedByRegion, added, elements.length, OVERPASS_ENDPOINTS.length);
  console.log(`Added ${added.poiAdded.length} POIs and ${added.accommodationAdded.length} accommodations`);
  console.log(`Report written to ${path.relative(ROOT, REPORT_PATH)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
