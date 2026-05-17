#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-05-17';

const additions = [
  ['auckland-pah-homestead-wallace-arts', 'Pah Homestead / Wallace Arts Centre', 'auckland', -36.9072, 174.7416, 'culture', ['gallery', 'heritage-house', 'hillsborough'], 1.25, 'Auckland’s art-filled heritage house in Monte Cecilia Park, pairing contemporary exhibitions with one of the city’s grandest old homes.'],
  ['auckland-botanic-gardens-manurewa', 'Auckland Botanic Gardens, Manurewa', 'auckland', -37.0116, 174.9073, 'nature', ['garden', 'family', 'south-auckland'], 2, 'A large South Auckland garden where native plantings, sculpture lawns and seasonal collections give travellers a calmer view of the city.'],
  ['auckland-scandrett-regional-park', 'Scandrett Regional Park', 'auckland', -36.4197, 174.8277, 'nature', ['regional-park', 'mahurangi', 'farm-heritage'], 2, 'A Mahurangi Peninsula farm park with heritage buildings, shell beaches and headland views across one of Auckland’s loveliest northern harbours.'],
  ['northland-mimiwhangata-coastal-park', 'Mimiwhangata Coastal Park', 'northland', -35.433, 174.44, 'nature', ['coastal-park', 'beach', 'marine-life'], 3, 'Mimiwhangata is Northland coast at a slower volume: pale beaches, rocky points and protected waters that reward visitors who are willing to leave the main highway behind.'],
  ['northland-mangawhai-museum', 'Mangawhai Museum', 'northland', -36.115, 174.585, 'heritage', ['museum', 'kauri', 'shipwrecks'], 1, 'Mangawhai Museum turns a beach town into a layered local story, covering harbour change, kauri work, shipwrecks and the community energy that rebuilt the place.'],
  ['northland-te-ahu-centre-kaitaia', 'Te Ahu Centre, Kaitāia', 'northland', -35.1145, 173.2648, 'culture', ['museum', 'far-north', 'community'], 1.25, 'Te Ahu is Kaitāia’s civic and cultural heart, useful for understanding the Far North through local exhibitions, library spaces and community memory.'],
  ['bay-of-plenty-katikati-haiku-pathway', 'Katikati Haiku Pathway', 'bay-of-plenty', -37.5535, 175.9187, 'culture', ['poetry', 'walk', 'katikati'], 1, 'Katikati’s Haiku Pathway makes a riverside walk unexpectedly literary, placing short poems into gardens and paths so the town can be read as well as crossed.'],
  ['bay-of-plenty-omokoroa-tauranga-cycleway', 'Ōmokoroa to Tauranga Cycleway', 'bay-of-plenty', -37.648, 176.04, 'journey', ['cycleway', 'harbour', 'western-bay'], 3, 'This growing harbour-edge cycleway links Western Bay communities with bridges, boardwalks and estuary views, turning a commuter corridor into a scenic ride.'],
  ['bay-of-plenty-thornton-beach', 'Thornton Beach', 'bay-of-plenty', -37.918, 176.88, 'nature', ['beach', 'rangitaiki', 'coast'], 1.5, 'Thornton Beach is a quieter Eastern Bay coast stop where river-mouth geography, surf and open sand give the landscape a working, local feel.'],
  ['canterbury-ashburton-aviation-museum', 'Ashburton Aviation Museum', 'canterbury', -43.904, 171.794, 'heritage', ['aviation', 'museum', 'ashburton'], 1.5, 'Ashburton Aviation Museum gives mid-Canterbury an airborne chapter, with aircraft, restoration work and volunteer knowledge gathered beside the airfield.'],
  ['canterbury-riccarton-house-bush', 'Riccarton House and Bush', 'canterbury', -43.5307, 172.5981, 'heritage', ['christchurch', 'historic-house', 'native-forest'], 1.5, 'Riccarton House and Bush pairs early Christchurch settlement history with a rare remnant of kahikatea forest, making the city’s past feel both built and living.'],
  ['canterbury-caroline-bay-timaru', 'Caroline Bay, Timaru', 'canterbury', -44.3905, 171.2602, 'culture', ['beach', 'timaru', 'promenade'], 1.5, 'Caroline Bay is Timaru’s shared front porch: beach, gardens, carnival memory and port-town views all wrapped into one easy seafront pause.'],
  ['coromandel-te-kouma-harbour', 'Te Kouma Harbour', 'coromandel', -36.785, 175.47, 'nature', ['harbour', 'coromandel-town', 'coastal'], 1.5, 'Te Kouma Harbour is a sheltered western Coromandel inlet where boats, hills and calm water make a gentle counterpoint to the peninsula’s surf beaches.'],
  ['coromandel-whiritoa-beach', 'Whiritoa Beach', 'coromandel', -37.2805, 175.9054, 'nature', ['beach', 'surf', 'lagoon'], 2, 'Whiritoa is a clean-lined Coromandel beach settlement with surf out front and a quieter lagoon edge, ideal for travellers seeking a smaller coastal rhythm.'],
  ['coromandel-matatoki-cheese-barn', 'Matatoki Cheese Barn', 'coromandel', -37.203, 175.591, 'food-wine', ['cheese', 'family', 'thames'], 1, 'Matatoki Cheese Barn is a farm-food stop near Thames where tasting, animals and casual meals make the Hauraki Plains feel deliciously close at hand.'],
  ['hawkes-bay-arataki-honey-visitor-centre', 'Arataki Honey Visitor Centre', 'hawkes-bay', -39.638, 176.849, 'food-wine', ['honey', 'havelock-north', 'family'], 1, 'Arataki Honey turns Hawke’s Bay’s orchard-and-flower abundance into a tasting story, with bees, jars and family-friendly displays doing the explaining.'],
  ['hawkes-bay-keirunga-gardens', 'Keirunga Gardens', 'hawkes-bay', -39.669, 176.886, 'culture', ['garden', 'arts', 'havelock-north'], 1.25, 'Keirunga Gardens is a leafy Havelock North arts pocket, with old trees, craft spaces, miniature rail enthusiasm and village calm above the plain.'],
  ['hawkes-bay-wairoa-lighthouse', 'Wairoa Lighthouse', 'hawkes-bay', -39.0332, 177.4213, 'heritage', ['lighthouse', 'wairoa', 'river-town'], 0.75, 'Wairoa’s lighthouse no longer stands on a lonely headland, but in town it has become a compact symbol of maritime history and local pride.'],
  ['marlborough-picton-heritage-whaling-museum', 'Picton Heritage & Whaling Museum', 'marlborough', -41.2891, 174.0059, 'heritage', ['museum', 'picton', 'whaling'], 1, 'Picton’s small heritage museum adds grit to the ferry-town image, telling stories of whaling, shipping, settlement and the people who worked the Sounds.'],
  ['marlborough-farmers-market', 'Marlborough Farmers’ Market', 'marlborough', -41.514, 173.951, 'food-wine', ['market', 'blenheim', 'local-produce'], 1.5, 'The Marlborough Farmers’ Market brings the wine region back to soil, with growers, bakers and makers turning Sunday morning into a regional tasting map.'],
  ['marlborough-taylor-river-reserve', 'Taylor River Reserve', 'marlborough', -41.522, 173.955, 'nature', ['river', 'blenheim', 'walking'], 1, 'Taylor River Reserve gives Blenheim an easy green spine, following water, willows and shared paths through the town’s everyday outdoor life.'],
  ['nelson-tasman-tahunanui-beach-reserve', 'Tāhunanui Beach Reserve', 'nelson-tasman', -41.283, 173.245, 'nature', ['beach', 'nelson', 'family'], 2, 'Tāhunanui Beach is Nelson’s broad, social beach playground, where shallow water, cafés and sunset light make it much more than a place to swim.'],
  ['nelson-tasman-mckee-memorial-reserve', 'McKee Memorial Reserve', 'nelson-tasman', -41.191, 173.378, 'nature', ['camping', 'coast', 'tasman-bay'], 1.5, 'McKee Memorial Reserve is a gentle Tasman Bay coastal stop, loved for camping, swimming and the kind of sunset that makes dinner wait.'],
  ['nelson-tasman-miyazu-japanese-garden', 'Miyazu Japanese Garden', 'nelson-tasman', -41.265, 173.287, 'culture', ['garden', 'nelson', 'sister-city'], 0.75, 'Miyazu Japanese Garden is a small Nelson gesture of friendship, using water, stone and planting to mark the city’s sister-city relationship with Miyazu.'],
  ['otago-dunedin-street-art-trail', 'Dunedin Street Art Trail', 'otago', -45.875, 170.503, 'culture', ['street-art', 'dunedin', 'urban-walk'], 1.5, 'Dunedin’s street art trail turns warehouse walls and side streets into an outdoor gallery, adding colour and surprise to the compact heritage city.'],
  ['otago-lawrence-chinese-camp', 'Lawrence Chinese Camp', 'otago', -45.914, 169.685, 'heritage', ['goldfields', 'chinese-heritage', 'lawrence'], 1, 'Lawrence Chinese Camp preserves an essential goldfields story, foregrounding the Chinese miners and families whose labour and resilience shaped Otago.'],
  ['otago-naseby-forest-trails', 'Naseby Forest Trails', 'otago', -45.024, 170.147, 'adventure', ['mountain-bike', 'forest', 'central-otago'], 2.5, 'Naseby Forest gives Central Otago riders and walkers a cool, pine-scented trail network beside one of the region’s most atmospheric old towns.'],
  ['queenstown-sunshine-bay-track', 'Sunshine Bay Track', 'queenstown', -45.038, 168.625, 'nature', ['lake-wakatipu', 'short-walk', 'waterfall'], 1.25, 'Sunshine Bay Track is a handy lakeside escape from central Queenstown, ending in a quiet bay and small waterfall without demanding a full-day plan.'],
  ['queenstown-lake-dispute-track', 'Lake Dispute Track', 'queenstown', -45.039, 168.545, 'nature', ['walking', 'lake', 'views'], 2, 'Lake Dispute Track climbs into drier hill country above Whakatipu, trading town bustle for tussock, small-lake stillness and big basin views.'],
  ['queenstown-time-tripper', 'Time Tripper Queenstown', 'queenstown', -45.0329, 168.6607, 'culture', ['lakefront', 'immersive', 'family'], 0.75, 'Time Tripper turns Queenstown’s lakefront into a short immersive origin story, useful for families and anyone wanting context before chasing the views.'],
  ['rotorua-secret-spot-hot-tubs', 'Secret Spot Hot Tubs', 'rotorua', -38.142, 176.211, 'nature', ['hot-tubs', 'forest', 'wellness'], 1.5, 'Secret Spot Hot Tubs makes the Redwoods edge feel restorative, pairing cedar tubs, forest air and post-ride recovery in a distinctly Rotorua way.'],
  ['rotorua-night-market', 'Rotorua Night Market', 'rotorua', -38.136, 176.251, 'food-wine', ['market', 'street-food', 'evening'], 1.5, 'Rotorua Night Market brings the city centre into evening focus, with food stalls, music and local makers giving visitors a social, low-pressure dinner stop.'],
  ['rotorua-3d-trick-art-gallery', '3D Trick Art Gallery Rotorua', 'rotorua', -38.161, 176.254, 'culture', ['gallery', 'family', 'interactive'], 1, 'The 3D Trick Art Gallery is pure rainy-day play, using optical illusions and photo setups to give families a light indoor break from mud, steam and trails.'],
  ['southland-invercargill-water-tower', 'Invercargill Water Tower', 'southland', -46.409, 168.36, 'heritage', ['invercargill', 'landmark', 'architecture'], 0.5, 'Invercargill’s Water Tower is civic infrastructure dressed with surprising elegance, a brick landmark that gives the flat city a vertical signature.'],
  ['southland-te-hikoi-riverton', 'Te Hikoi Southern Journey, Riverton', 'southland', -46.354, 168.018, 'culture', ['museum', 'riverton', 'southern-history'], 1.25, 'Te Hikoi gives Riverton and the southern coast a deep interpretive voice, connecting Māori history, settlers, fishing and the long journey south.'],
  ['southland-lake-monowai', 'Lake Monowai', 'southland', -45.787, 167.62, 'nature', ['lake', 'fiordland', 'quiet'], 2, 'Lake Monowai is Fiordland’s quieter lake door, a place of forested shore, hydro history and still water beyond the region’s busiest routes.'],
  ['tairawhiti-gisborne-railbike-adventure', 'Gisborne Railbike Adventure', 'tairawhiti', -38.662, 178.018, 'adventure', ['railbike', 'gisborne', 'guided'], 2, 'Gisborne Railbike Adventure turns unused railway lines into a gentle pedal journey, giving the landscape a new pace and a little mechanical charm.'],
  ['tairawhiti-whinray-scenic-reserve', 'Whinray Scenic Reserve', 'tairawhiti', -38.342, 177.554, 'nature', ['forest', 'motu', 'walk'], 1.5, 'Whinray Scenic Reserve is an inland Tairāwhiti forest pause, where the Motu road country shifts from coast-and-river travel into cool native bush.'],
  ['tairawhiti-motu-falls', 'Motu Falls', 'tairawhiti', -38.245, 177.543, 'nature', ['waterfall', 'motu', 'river'], 0.75, 'Motu Falls is a compact East Coast hinterland reward, with a short walk to river water dropping through rock in the quiet behind the coast.'],
  ['tairawhiti-tiniroto-lakes', 'Tiniroto Lakes', 'tairawhiti', -38.812, 177.59, 'nature', ['lakes', 'scenic-drive', 'inland'], 2, 'The Tiniroto Lakes add a softer inland chapter between Gisborne and Wairoa, with small lakes, farmland and hill-country bends replacing the open coast.'],
  ['taranaki-meeting-of-the-waters', 'Meeting of the Waters Scenic Reserve', 'taranaki', -39.073, 174.117, 'nature', ['river', 'new-plymouth', 'short-walk'], 1, 'Meeting of the Waters is a leafy New Plymouth river reserve where swimming holes, bridges and bush make a quick local escape feel complete.'],
  ['taranaki-oakura-beach', 'Ōakura Beach', 'taranaki', -39.116, 173.953, 'nature', ['beach', 'surf', 'village'], 1.5, 'Ōakura Beach brings Surf Highway energy into an easy village setting, with black sand, surf culture and mountain views all close together.'],
  ['taranaki-st-marys-cathedral', 'Taranaki Cathedral Church of St Mary', 'taranaki', -39.057, 174.075, 'heritage', ['church', 'new-plymouth', 'heritage'], 0.75, 'St Mary’s is one of New Plymouth’s oldest stone landmarks, carrying colonial, community and conflict-era memory in the heart of the city.'],
  ['taupo-taupo-museum-ora-garden', 'Taupō Museum and Ora Garden', 'taupo', -38.688, 176.071, 'culture', ['museum', 'garden', 'taupo'], 1.25, 'Taupō Museum adds local depth to the lakefront, while the Ora Garden gives geothermal-region planting and design a compact, contemplative space.'],
  ['taupo-motuoapa-marina', 'Motuoapa Marina', 'taupo', -38.929, 175.789, 'journey', ['marina', 'lake-taupo', 'southern-lake'], 0.75, 'Motuoapa Marina is a quiet southern-lake pause where boats, mountain weather and deep water show a different face of Taupō.'],
  ['taupo-mangakino-lakefront', 'Mangakino Lakefront', 'taupo', -38.363, 175.775, 'nature', ['lake-maraetai', 'swimming', 'hydro-town'], 1.5, 'Mangakino Lakefront turns a hydro town into a summer stop, with calm Lake Maraetai water, picnic space and Waikato River history nearby.'],
  ['waikato-lake-hakanoa-walkway', 'Lake Hakanoa Walkway', 'waikato', -37.549, 175.158, 'nature', ['huntly', 'lake', 'walking'], 1, 'Lake Hakanoa Walkway gives Huntly a gentle lakeside circuit, balancing the town’s industrial reputation with birds, boardwalks and everyday recreation.'],
  ['waikato-waitakaruru-arboretum', 'Waitakaruru Arboretum and Sculpture Park', 'waikato', -37.733, 175.426, 'culture', ['sculpture', 'arboretum', 'hamilton'], 1.5, 'Waitakaruru Arboretum turns a former quarry into a planted art landscape, where sculpture and regenerating trees share the same hillside.'],
  ['waikato-pirongia-heritage-centre', 'Pirongia Heritage and Information Centre', 'waikato', -37.994, 175.202, 'heritage', ['pirongia', 'museum', 'frontier-history'], 1, 'Pirongia’s heritage centre helps explain a small town with outsized frontier history, from military redoubt stories to mountain-edge settlement.'],
  ['wellington-nairn-street-cottage', 'Nairn Street Cottage', 'wellington', -41.292, 174.767, 'heritage', ['historic-house', 'wellington', 'museum'], 1, 'Nairn Street Cottage gives Wellington history a domestic scale, preserving a family home where immigration, work and everyday city life become tangible.'],
  ['wellington-wrights-hill-fortress', 'Wrights Hill Fortress', 'wellington', -41.286, 174.733, 'heritage', ['wwii', 'fortress', 'karori'], 1.5, 'Wrights Hill Fortress hides wartime Wellington inside the hill, with tunnels and gun emplacements that reveal how seriously the harbour once prepared for attack.'],
  ['wellington-carterton-clock-tower', 'Carterton Clock Tower', 'wellington', -41.025, 175.528, 'heritage', ['carterton', 'town-centre', 'landmark'], 0.5, 'Carterton’s clock tower is a small-town landmark with practical charm, anchoring the main street between Wairarapa villages, farms and dark-sky country.'],
  ['west-coast-waiuta-ghost-town', 'Waiuta Ghost Town', 'west-coast', -42.254, 171.856, 'heritage', ['ghost-town', 'gold-mining', 'reefton'], 2, 'Waiuta is one of the Coast’s most evocative mining ghosts, where hut sites, machinery and forest regrowth outline a town built on quartz and risk.'],
  ['west-coast-mitchells-gully-gold-mine', 'Mitchells Gully Gold Mine', 'west-coast', -41.289, 172.107, 'heritage', ['gold-mine', 'charleston', 'walk'], 1, 'Mitchells Gully keeps gold-mining history close to the surface, with tunnels, races and relics tucked into damp bush near Charleston.'],
  ['west-coast-minnehaha-walk', 'Minnehaha Walk, Fox Glacier', 'west-coast', -43.466, 170.016, 'nature', ['glowworms', 'forest', 'short-walk'], 0.75, 'Minnehaha Walk is a short Fox Glacier forest loop that becomes quietly magical after dark, when glowworms mark the banks like low stars.'],
  ['whanganui-manawatu-paloma-gardens', 'Paloma Gardens', 'whanganui-manawatu', -39.831, 175.176, 'nature', ['garden', 'whanganui', 'plants'], 1.5, 'Paloma Gardens is a plant-lover’s detour near Whanganui, mixing rare species, bold textures and a strong sense of private passion made public.'],
  ['whanganui-manawatu-durie-hill-war-memorial-tower', 'Durie Hill War Memorial Tower', 'whanganui-manawatu', -39.932, 175.061, 'heritage', ['whanganui', 'tower', 'viewpoint'], 0.75, 'Durie Hill’s tower adds a climb above the elevator story, giving Whanganui a river-and-coast panorama wrapped in memorial purpose.'],
  ['whanganui-manawatu-whanganui-tramways', 'Whanganui Tramways Museum and Tram Ride', 'whanganui-manawatu', -39.935, 175.053, 'heritage', ['tram', 'museum', 'whanganui'], 1, 'Whanganui Tramways keeps a piece of the city moving, turning restored tram heritage into a short ride through riverfront memory.'],
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

function appendPois() {
  const dir = path.join(ROOT, 'content', 'poi');
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json') && file !== 'index.json');
  const byRegion = new Map();
  const ids = new Set();
  const names = new Set();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const json = readJson(filePath);
    byRegion.set(json.region.id, { filePath, json });
    for (const poi of json.pois || []) {
      ids.add(poi.id);
      names.add(normalizeName(poi.name));
    }
  }

  const added = [];
  const skipped = [];
  for (const [id, name, region, lat, lng, category, tags, duration, story] of additions) {
    const entry = byRegion.get(region);
    if (!entry) {
      skipped.push({ id, name, reason: `unknown region ${region}` });
      continue;
    }
    if (ids.has(id) || names.has(normalizeName(name))) {
      skipped.push({ id, name, reason: 'duplicate id or exact name' });
      continue;
    }
    entry.json.pois.push({
      id,
      name,
      region,
      lat,
      lng,
      category,
      tags,
      trigger_radius_m: 300,
      duration_hours: duration,
      short: story,
      commentary: story,
      audio_story: story,
      suggested_voice_tone: 'warm, curious, grounded',
      sources_to_check: ['Official regional visitor, DOC, council, attraction or operator pages checked during the national expansion pass'],
      content_status: 'draft',
      cultural_review_required: false,
    });
    ids.add(id);
    names.add(normalizeName(name));
    added.push({ id, name, region });
  }

  for (const { filePath, json } of byRegion.values()) writeJson(filePath, json);
  return { added, skipped };
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
  const reportPath = path.join(ROOT, 'content', 'poi', 'national-expansion-2026-05-17-topup-report.md');
  const byRegion = {};
  for (const item of result.added) {
    byRegion[item.region] ||= [];
    byRegion[item.region].push(item);
  }
  const lines = [
    '# National Expansion Top-Up - 2026-05-17',
    '',
    'Supplement to Pass 2, created to push the active expansion comfortably beyond 200 new records after duplicate checks.',
    '',
    `POIs added: ${result.added.length}`,
    `Skipped duplicate/invalid candidates: ${result.skipped.length}`,
    '',
    '## POIs By Region',
  ];
  for (const region of Object.keys(byRegion).sort()) {
    lines.push('', `### ${region}`);
    for (const item of byRegion[region]) lines.push(`- ${item.name} (${item.id})`);
  }
  if (result.skipped.length) {
    lines.push('', '## Skipped Candidates');
    for (const item of result.skipped) lines.push(`- ${item.name} (${item.id}) — ${item.reason}`);
  }
  lines.push('');
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

const result = appendPois();
updatePoiIndex();
writeReport(result);
console.log(`Added ${result.added.length} top-up POIs`);
console.log(`Skipped ${result.skipped.length} duplicate/invalid candidates`);
