#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TODAY = '2026-05-17';

const poiAdditions = [
  {
    id: 'auckland-waharau-regional-park',
    name: 'Waharau Regional Park',
    region: 'auckland',
    lat: -37.144,
    lng: 175.236,
    category: 'nature',
    tags: ['regional-park', 'hunua-ranges', 'firth-of-thames', 'forest-walk'],
    duration_hours: 2.5,
    trigger_radius_m: 900,
    short: 'A quiet regional park on the Firth of Thames side of the Hunua Ranges, with forest walks and camping.',
    story: 'Waharau feels like Auckland after the city noise has finally run out of road. The park sits between the steep green flank of the Hunua Ranges and the open Firth of Thames, giving walkers a choice between damp forest tracks, picnic lawns and a coastline that belongs more to birds and tides than traffic.',
    tone: 'calm, green, lightly adventurous',
    sources: [
      'https://www.aucklandcouncil.govt.nz/en/parks-recreation/find-park-beach/park-detail/233.html',
    ],
  },
  {
    id: 'auckland-matuku-link',
    name: 'Matuku Link',
    region: 'auckland',
    lat: -36.892,
    lng: 174.457,
    category: 'nature',
    tags: ['wetland', 'conservation', 'te-henga', 'birdlife'],
    duration_hours: 1.5,
    trigger_radius_m: 500,
    short: 'A community wetland restoration project near Te Henga, opening a rare West Auckland habitat to careful visitors.',
    story: 'Matuku Link is a different kind of Auckland attraction: not a finished spectacle, but a landscape being patiently repaired. Boardwalks, planting days and wetland edges invite visitors to notice the small work of recovery, where bittern habitat, volunteers and West Coast weather all matter.',
    tone: 'hopeful, observant, conservation-minded',
    sources: [
      'https://matukulink.org.nz/',
    ],
  },
  {
    id: 'northland-waipu-caves',
    name: 'Waipu Caves',
    region: 'northland',
    lat: -35.978,
    lng: 174.358,
    category: 'adventure',
    tags: ['cave', 'glowworms', 'waipu', 'limestone'],
    duration_hours: 1.5,
    trigger_radius_m: 500,
    short: 'A rough, self-guided limestone cave stop inland from Waipu, known for glowworms and muddy footing.',
    story: 'Waipu Caves is not a polished cave tour, and that is the point. The entrance is low-key, the floor can be wet and muddy, and visitors need to bring their own judgement; step carefully and the darkness opens into a quiet limestone world lit by glowworms.',
    tone: 'practical, curious, lightly adventurous',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/northland/places/waipu-area/things-to-do/waipu-caves-track/',
    ],
  },
  {
    id: 'northland-wairere-boulders',
    name: 'Wairere Boulders',
    region: 'northland',
    lat: -35.376,
    lng: 173.624,
    category: 'nature',
    tags: ['geology', 'boulders', 'hokianga', 'walk'],
    duration_hours: 2,
    trigger_radius_m: 650,
    short: 'A private walking park in the Hokianga where basalt boulders form fluted channels and mossy corridors.',
    story: 'Wairere Boulders turns geology into a maze. Tracks move between dark basalt blocks carved by natural acid weathering, with little bridges and lookouts revealing how strange the Hokianga interior can become when water, rock and time are left to talk.',
    tone: 'curious, tactile, quietly amazed',
    sources: [
      'https://www.wairereboulders.co.nz/',
    ],
  },
  {
    id: 'bay-of-plenty-puketoki-reserve',
    name: 'Puketoki Reserve',
    region: 'bay-of-plenty',
    lat: -37.712,
    lng: 175.994,
    category: 'nature',
    tags: ['short-walk', 'forest', 'tauranga', 'family'],
    duration_hours: 1,
    trigger_radius_m: 350,
    short: 'A small native forest reserve near Tauranga with easy loop tracks and family-friendly bush time.',
    story: 'Puketoki Reserve is the kind of pocket of bush that makes a travel day kinder. The loop is short, shaded and easy to fold around bigger Tauranga plans, but it still gives the pleasure of birdsong, fern edges and a feeling of stepping under a green roof.',
    tone: 'gentle, local, restorative',
    sources: [
      'https://www.westernbay.govt.nz/recreation/walking-tracks-and-trails/puketoki-scenic-reserve',
    ],
  },
  {
    id: 'bay-of-plenty-ohope-scenic-reserve',
    name: 'Ohope Scenic Reserve',
    region: 'bay-of-plenty',
    lat: -37.977,
    lng: 177.052,
    category: 'nature',
    tags: ['coastal-forest', 'ohope', 'whakatane', 'viewpoint'],
    duration_hours: 2,
    trigger_radius_m: 700,
    short: 'Coastal forest tracks above Ohope Beach, with birds, pohutukawa and outlooks over the eastern Bay.',
    story: 'Ohope Scenic Reserve sits just above the beach, but the mood changes quickly once the track enters the forest. The coast is still close enough to smell, while nikau, pohutukawa and birds carry the walk into a cooler, older layer of the Eastern Bay.',
    tone: 'fresh, coastal, quietly lively',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/bay-of-plenty/places/whakatane-area/ohope-scenic-reserve/',
    ],
  },
  {
    id: 'waikato-te-toto-gorge-lookout',
    name: 'Te Toto Gorge Lookout',
    region: 'waikato',
    lat: -37.88,
    lng: 174.768,
    category: 'nature',
    tags: ['raglan', 'lookout', 'coastal', 'geology'],
    duration_hours: 0.75,
    trigger_radius_m: 450,
    short: 'A dramatic roadside lookout near Raglan, facing layered cliffs, surf coast and old garden terraces.',
    story: 'Te Toto Gorge is one of Raglan’s sharpest pauses: a short stop with a long view. From the lookout the coast drops away in cliffs and folds, the Tasman works below, and the shape of the land makes it clear why this western edge has always pulled people toward it.',
    cultural_review_required: true,
    tone: 'wide, respectful, windswept',
    sources: [
      'https://www.waikatonz.com/walking-and-hiking-trails/te-toto-gorge/',
    ],
  },
  {
    id: 'waikato-kaniwhaniwha-caves',
    name: 'Kaniwhaniwha Caves',
    region: 'waikato',
    lat: -37.97,
    lng: 175.035,
    category: 'adventure',
    tags: ['caves', 'pirongia', 'forest', 'walking'],
    duration_hours: 2.5,
    trigger_radius_m: 600,
    short: 'A Pirongia Forest Park walk to small limestone caves and cool stream-side bush.',
    story: 'The Kaniwhaniwha Caves make Pirongia feel playful as well as grand. The track follows forest and stream country before narrowing into limestone pockets, where the reward is less about scale than the fun of discovering a hidden shape in the mountain’s lower folds.',
    tone: 'curious, active, grounded',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/waikato/places/pirongia-forest-park/things-to-do/kaniwhaniwha-caves/',
    ],
  },
  {
    id: 'taupo-whakaipo-bay-reserve',
    name: 'Whakaipo Bay Recreation Reserve',
    region: 'taupo',
    lat: -38.65,
    lng: 176.002,
    category: 'nature',
    tags: ['lake-taupo', 'beach', 'mountain-bike', 'picnic'],
    duration_hours: 2,
    trigger_radius_m: 1000,
    short: 'A northern Lake Taupo reserve with quiet swimming water, picnic space and access to the W2K trail.',
    story: 'Whakaipo Bay is close to Taupo but feels deliberately set apart. The road drops toward a broad lake edge where families swim, riders roll onto the W2K trail, and the western bays of Taupo remind you that the lake has quieter personalities beyond the townfront.',
    cultural_review_required: true,
    tone: 'spacious, calm, lake-warm',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/central-north-island/places/taupo-area/things-to-do/whakaipo-bay-tracks/',
      'https://www.doc.govt.nz/about-us/our-policies-and-plans/non-statutory-management-plans/whakaipo-bay-recreation-reserve-plan/',
    ],
  },
  {
    id: 'taupo-lake-rotopounamu-track',
    name: 'Lake Rotopounamu Track',
    region: 'taupo',
    lat: -39.015,
    lng: 175.732,
    category: 'nature',
    tags: ['tongariro', 'lake', 'forest-loop', 'birdlife'],
    duration_hours: 2,
    trigger_radius_m: 700,
    short: 'A forest loop around a quiet volcanic lake near Tongariro National Park.',
    story: 'Lake Rotopounamu is a small, self-contained world: green forest, sheltered beaches and clear water tucked beside the volcanic country. The loop track slows people down naturally, offering a gentler counterpoint to the big alpine drama nearby.',
    cultural_review_required: true,
    tone: 'quiet, green, contemplative',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/central-north-island/places/tongariro-national-park/things-to-do/tracks/lake-rotopounamu-track/',
    ],
  },
  {
    id: 'rotorua-lake-okareka-boardwalk',
    name: 'Lake Okareka Boardwalk',
    region: 'rotorua',
    lat: -38.166,
    lng: 176.365,
    category: 'nature',
    tags: ['boardwalk', 'wetland', 'lake-okareka', 'birdlife'],
    duration_hours: 1,
    trigger_radius_m: 450,
    short: 'An easy wetland boardwalk on Lake Okareka, with lake views and birdlife close to Rotorua.',
    story: 'Lake Okareka Boardwalk is Rotorua in a quieter key. Instead of geysers or fast trails, it offers reeds, waterbirds and open lake light, letting visitors take a low-effort walk that still feels connected to the district’s deep lake landscape.',
    tone: 'gentle, lake-bright, observant',
    sources: [
      'https://www.rotorualakescouncil.nz/parks-lakes-recreation/lake-reserves/lake-okareka',
    ],
  },
  {
    id: 'rotorua-lake-okataina-western-walkway',
    name: 'Lake Okataina Western Walkway',
    region: 'rotorua',
    lat: -38.079,
    lng: 176.421,
    category: 'journey',
    tags: ['lake-okataina', 'long-walk', 'forest', 'views'],
    duration_hours: 5,
    trigger_radius_m: 1200,
    short: 'A longer forest walkway above Lake Okataina, linking beaches, bush and volcanic-lake views.',
    story: 'The Lake Okataina Western Walkway asks for more time than a quick boardwalk, and gives back a more layered Rotorua. The route moves through native forest above the water, with bays and viewpoints that make the lake feel less like a backdrop and more like the centre of the story.',
    tone: 'steady, immersive, outdoorsy',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/bay-of-plenty/places/lake-okataina-scenic-reserve/things-to-do/lake-okataina-western-walkway/',
    ],
  },
  {
    id: 'tairawhiti-cooks-cove-walkway',
    name: 'Cooks Cove Walkway',
    region: 'tairawhiti',
    lat: -38.375,
    lng: 178.325,
    category: 'journey',
    tags: ['tolaga-bay', 'coastal-walk', 'views', 'heritage'],
    duration_hours: 2.5,
    trigger_radius_m: 900,
    short: 'A Tolaga Bay coastal walk to a sheltered cove, with farmland, cliffs and layered history.',
    story: 'Cooks Cove Walkway is a walk that keeps widening. It begins in farm country above Tolaga Bay, opens to high coastal views, then drops toward a sheltered cove where the land, sea and encounter history all need to be approached with care.',
    cultural_review_required: true,
    tone: 'respectful, open, coastal',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/east-coast/places/tolaga-bay-area/things-to-do/cooks-cove-walkway/',
    ],
  },
  {
    id: 'tairawhiti-mahia-peninsula-scenic-reserve',
    name: 'Mahia Peninsula Scenic Reserve',
    region: 'tairawhiti',
    lat: -39.068,
    lng: 177.91,
    category: 'nature',
    tags: ['mahia', 'forest', 'coastal', 'walk'],
    duration_hours: 1.5,
    trigger_radius_m: 700,
    short: 'A remnant forest reserve on Mahia Peninsula, adding a green inland pause to a beach-and-surf coast.',
    story: 'Mahia Peninsula is often imagined through beaches, headlands and launch-day horizons, but the scenic reserve offers a quieter inland layer. The bush gives shade and texture to a peninsula better known for sea light, making the place feel more whole.',
    tone: 'quiet, coastal, restorative',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/east-coast/places/mahia-peninsula-scenic-reserve/',
    ],
  },
  {
    id: 'hawkes-bay-ongaonga-historic-village',
    name: 'Ongaonga Historic Village',
    region: 'hawkes-bay',
    lat: -39.912,
    lng: 176.418,
    category: 'heritage',
    tags: ['historic-village', 'central-hawkes-bay', 'museum', 'architecture'],
    duration_hours: 1.25,
    trigger_radius_m: 450,
    short: 'A small Central Hawke’s Bay heritage village with preserved buildings and rural settlement stories.',
    story: 'Ongaonga Historic Village rewards travellers who like history at human scale. Timber buildings, local collections and a main-street rhythm make Central Hawke’s Bay feel less like a drive-through landscape and more like a set of lives, trades and town habits still close enough to read.',
    tone: 'warm, historical, local',
    sources: [
      'https://www.ongaongamuseum.co.nz/',
      'https://www.visitchb.co.nz/see-and-do/heritage/ongaonga-historic-village/',
    ],
  },
  {
    id: 'hawkes-bay-central-hawkes-bay-settlers-museum',
    name: 'Central Hawke’s Bay Settlers Museum',
    region: 'hawkes-bay',
    lat: -39.942,
    lng: 176.588,
    category: 'heritage',
    tags: ['museum', 'waipawa', 'settler-history', 'central-hawkes-bay'],
    duration_hours: 1,
    trigger_radius_m: 350,
    short: 'A Waipawa museum preserving Central Hawke’s Bay family, farming and town histories.',
    story: 'The Central Hawke’s Bay Settlers Museum gives the district’s big skies a room full of names, objects and practical memory. It is a modest stop, but a useful one: the kind of place that turns paddocks, bridges and old town fronts into a more legible landscape.',
    tone: 'grounded, historical, attentive',
    sources: [
      'https://www.visitchb.co.nz/see-and-do/heritage/central-hawkes-bay-settlers-museum/',
    ],
  },
  {
    id: 'taranaki-tupare',
    name: 'Tupare',
    region: 'taranaki',
    lat: -39.081,
    lng: 174.117,
    category: 'nature',
    tags: ['garden', 'new-plymouth', 'heritage-house', 'landscape'],
    duration_hours: 1.5,
    trigger_radius_m: 500,
    short: 'A landscaped garden and heritage home above the Waiwhakaiho River in New Plymouth.',
    story: 'Tupare is Taranaki garden-making with patience and flair. Paths step through mature planting, lawns and river views, while the heritage house gives the place an intimate domestic centre; it is a polished pause between mountain, coast and city.',
    tone: 'elegant, green, unhurried',
    sources: [
      'https://www.trc.govt.nz/gardens/tupare/',
    ],
  },
  {
    id: 'taranaki-aotea-utanganui-museum',
    name: 'Aotea Utanganui Museum of South Taranaki',
    region: 'taranaki',
    lat: -39.758,
    lng: 174.483,
    category: 'culture',
    tags: ['museum', 'patea', 'south-taranaki', 'heritage'],
    duration_hours: 1.25,
    trigger_radius_m: 400,
    short: 'South Taranaki’s museum in Patea, holding local taonga, archives and regional stories.',
    story: 'Aotea Utanganui gives South Taranaki a strong cultural anchor. For road-trippers, it is a reason to slow down in Patea and let the district speak through taonga, photographs, archives and the everyday traces of people who shaped the coast and river country.',
    cultural_review_required: true,
    tone: 'respectful, grounded, attentive',
    sources: [
      'https://www.southtaranaki.com/our-facilities/aotea-utanganui-museum-of-south-taranaki',
    ],
  },
  {
    id: 'whanganui-manawatu-mt-lees-reserve',
    name: 'Mt Lees Reserve',
    region: 'whanganui-manawatu',
    lat: -40.066,
    lng: 175.694,
    category: 'nature',
    tags: ['garden', 'reserve', 'feilding', 'short-walk'],
    duration_hours: 1,
    trigger_radius_m: 450,
    short: 'A landscaped country reserve near Feilding, with easy walks, old trees and picnic lawns.',
    story: 'Mt Lees Reserve is one of those gentle Manawatu stops that proves a place does not need to shout. Old trees, open lawns and short paths make it a useful breathing space on rural drives, especially when the day needs a green pause rather than another town centre.',
    tone: 'gentle, local, restorative',
    sources: [
      'https://www.mdc.govt.nz/Services/Parks-Reserves-and-Playgrounds/Mt-Lees-Reserve',
    ],
  },
  {
    id: 'whanganui-manawatu-kimbolton-sculpture-festival',
    name: 'Kimbolton Sculpture Festival',
    region: 'whanganui-manawatu',
    lat: -40.054,
    lng: 175.778,
    category: 'culture',
    tags: ['festival', 'sculpture', 'rural-community', 'kimbolton'],
    duration_hours: 2,
    trigger_radius_m: 800,
    short: 'A rural sculpture festival that turns Kimbolton into an art, garden and community day out.',
    story: 'Kimbolton Sculpture Festival brings a creative charge to the Manawatu countryside. For a day, the village becomes a meeting point for sculpture, gardens, food and rural sociability, showing that small communities can make cultural events with real reach.',
    tone: 'bright, community-minded, creative',
    sources: [
      'https://ruralart.nz/',
      'https://www.manawatunz.co.nz/listing/kimbolton-sculpture-festival',
    ],
  },
  {
    id: 'wellington-fensham-reserve',
    name: 'Fensham Reserve',
    region: 'wellington',
    lat: -41.015,
    lng: 175.482,
    category: 'nature',
    tags: ['wairarapa', 'forest', 'birdlife', 'short-walk'],
    duration_hours: 1,
    trigger_radius_m: 350,
    short: 'A small Forest & Bird reserve near Carterton, protecting lowland forest and wetland habitat.',
    story: 'Fensham Reserve is small enough to miss and good enough not to. Its tracks pass through lowland forest and wetland edges, offering a quieter Wairarapa nature stop between vineyards, villages and the bigger ranges on the horizon.',
    tone: 'quiet, attentive, conservation-minded',
    sources: [
      'https://www.forestandbird.org.nz/projects/fensham-reserve',
    ],
  },
  {
    id: 'wellington-paekakariki-escarpment-track',
    name: 'Paekakariki Escarpment Track',
    region: 'wellington',
    lat: -40.982,
    lng: 174.952,
    category: 'journey',
    tags: ['kapiti', 'coastal-walk', 'te-araroa', 'views'],
    duration_hours: 4,
    trigger_radius_m: 1800,
    short: 'A steep coastal section of Te Araroa between Paekakariki and Pukerua Bay, known for huge sea views.',
    story: 'The Paekakariki Escarpment Track puts the Kapiti coast at full height. Stairs, swing bridges and narrow sidles make it a proper walk rather than a casual stroll, but the reward is a long, bright view over rail line, highway, sea and island.',
    tone: 'energetic, panoramic, practical',
    sources: [
      'https://www.wellingtonnz.com/visit/trails/paekakariki-escarpment-track',
      'https://teararoa.org.nz/the-trail/wellington/paekakariki-escarpment-track/',
    ],
  },
  {
    id: 'marlborough-cullen-point-tracks',
    name: 'Cullen Point Tracks',
    region: 'marlborough',
    lat: -41.265,
    lng: 173.779,
    category: 'nature',
    tags: ['havelock', 'marlborough-sounds', 'short-walk', 'lookout'],
    duration_hours: 1,
    trigger_radius_m: 500,
    short: 'Short bush and lookout tracks near Havelock, with Pelorus Sound views close to the road.',
    story: 'Cullen Point is a compact Marlborough Sounds sampler. The tracks are short, the bush is close, and the lookout gives Havelock’s harbour setting a clear frame, making it an excellent leg-stretch before or after the winding road deeper into the Sounds.',
    tone: 'fresh, easygoing, scenic',
    sources: [
      'https://marlboroughnz.com/guides/marlborough-sounds/cullen-point-tracks/',
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/marlborough/places/pelorus-and-kenepuru-sounds-area/things-to-do/tracks/cullen-point-tracks/',
    ],
  },
  {
    id: 'marlborough-museum',
    name: 'Marlborough Museum',
    region: 'marlborough',
    lat: -41.531,
    lng: 173.939,
    category: 'heritage',
    tags: ['museum', 'blenheim', 'wine-history', 'regional-history'],
    duration_hours: 1.25,
    trigger_radius_m: 400,
    short: 'A Blenheim museum covering Marlborough’s regional history, from early settlement to wine country.',
    story: 'Marlborough Museum helps balance the region’s cellar-door image with older and wider stories. Its collections sit close to the heritage park at Brayshaw, giving visitors a useful bridge between Wairau history, town life and the modern wine landscape.',
    tone: 'curious, historical, grounded',
    sources: [
      'https://marlboroughmuseum.org.nz/',
      'https://marlboroughnz.com/guides/heritage/marlborough-museum/',
    ],
  },
  {
    id: 'nelson-tasman-labyrinth-rocks',
    name: 'Labyrinth Rocks Park',
    region: 'nelson-tasman',
    lat: -40.852,
    lng: 172.808,
    category: 'nature',
    tags: ['golden-bay', 'limestone', 'family', 'short-walk'],
    duration_hours: 1,
    trigger_radius_m: 400,
    short: 'A free limestone maze near Takaka, with narrow rock corridors and playful short walks.',
    story: 'Labyrinth Rocks Park turns Golden Bay limestone into a natural puzzle. It is an easy stop, but the narrow corridors, mossy walls and little surprises make it feel delightfully exploratory, especially for families who want wonder without a full-day track.',
    tone: 'playful, curious, light',
    sources: [
      'https://www.nelsontasman.nz/visit-nelson-tasman/plan-your-trip/activities/3367-labyrinth-rocks',
    ],
  },
  {
    id: 'nelson-tasman-rawhiti-cave',
    name: 'Rawhiti Cave',
    region: 'nelson-tasman',
    lat: -40.846,
    lng: 172.852,
    category: 'nature',
    tags: ['takaka', 'cave', 'limestone', 'walk'],
    duration_hours: 3,
    trigger_radius_m: 650,
    short: 'A steep Golden Bay walk to a limestone cave mouth with remarkable phytokarst formations.',
    story: 'Rawhiti Cave asks for a proper climb, then rewards it with one of Golden Bay’s strangest cave entrances. The formations seem to grow toward the light, making the cave feel alive at the edge between underground darkness and forest air.',
    tone: 'wondering, active, respectful',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/nelson-tasman/places/takaka-area/things-to-do/rawhiti-cave-track/',
    ],
  },
  {
    id: 'west-coast-woods-creek-track',
    name: 'Woods Creek Track',
    region: 'west-coast',
    lat: -42.38,
    lng: 171.42,
    category: 'heritage',
    tags: ['gold-mining', 'walk', 'greymouth', 'forest'],
    duration_hours: 1.25,
    trigger_radius_m: 500,
    short: 'A short West Coast walk through old gold-mining water races, tunnels and regenerating forest.',
    story: 'Woods Creek Track is the West Coast in miniature: bush, water, rock and the remains of people chasing gold through difficult country. The tunnels and races make the walk tactile, while the forest quietly shows what happens after the digging stops.',
    tone: 'earthy, historical, curious',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/greymouth-area/things-to-do/tracks/woods-creek-track/',
    ],
  },
  {
    id: 'west-coast-lake-mahinapua',
    name: 'Lake Mahinapua',
    region: 'west-coast',
    lat: -42.792,
    lng: 170.89,
    category: 'nature',
    tags: ['lake', 'hokitika', 'camping', 'birdlife'],
    duration_hours: 1.5,
    trigger_radius_m: 800,
    short: 'A shallow forest-edged lake south of Hokitika, with camping, short walks and wetland birdlife.',
    story: 'Lake Mahinapua is a soft interruption on the Coast road. The water lies low among forest and wetland, inviting picnics, short walks and camping rather than spectacle; on a still day it feels like the landscape has taken a long breath.',
    tone: 'calm, reflective, west-coast',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/west-coast/places/lake-mahinapua-scenic-reserve/',
    ],
  },
  {
    id: 'canterbury-hinewai-reserve',
    name: 'Hinewai Reserve',
    region: 'canterbury',
    lat: -43.808,
    lng: 173.003,
    category: 'nature',
    tags: ['banks-peninsula', 'conservation', 'walking', 'regeneration'],
    duration_hours: 3,
    trigger_radius_m: 1200,
    short: 'A Banks Peninsula conservation reserve known for native regeneration and a network of walking tracks.',
    story: 'Hinewai Reserve is a living argument for patience. Former farm country is returning to native forest, and the tracks let visitors see that regeneration is not abstract: it is seedlings, birds, gullies, old boundaries and a landscape slowly changing its mind.',
    tone: 'hopeful, thoughtful, green',
    sources: [
      'https://www.hinewai.org.nz/',
      'https://www.bpct.org.nz/hinewai-reserve',
    ],
  },
  {
    id: 'canterbury-waimate-white-horse',
    name: 'Waimate White Horse',
    region: 'canterbury',
    lat: -44.742,
    lng: 171.067,
    category: 'heritage',
    tags: ['waimate', 'lookout', 'landmark', 'hill-walk'],
    duration_hours: 1,
    trigger_radius_m: 500,
    short: 'A hill landmark above Waimate, with town and plains views from the White Horse walkway.',
    story: 'The Waimate White Horse gives South Canterbury a cheerful hillside signature. Climb or drive up for wide views over the town, farms and coastward plains, then look back at the horse itself: part landmark, part local emblem, part excuse to stretch your legs.',
    tone: 'bright, local, panoramic',
    sources: [
      'https://www.waimatedc.govt.nz/recreation/parks-and-reserves/white-horse-walkway',
    ],
  },
  {
    id: 'otago-gabriels-gully',
    name: 'Gabriel’s Gully',
    region: 'otago',
    lat: -45.91,
    lng: 169.674,
    category: 'heritage',
    tags: ['goldfields', 'lawrence', 'heritage', 'walk'],
    duration_hours: 1.25,
    trigger_radius_m: 650,
    short: 'The Lawrence gully where Otago’s 1861 gold rush began, now read through tracks and interpretation.',
    story: 'Gabriel’s Gully looks quiet now, which makes the gold-rush story more striking. In 1861 this little valley changed Otago’s pace almost overnight; today the paths and signs let visitors imagine the noise, hope and hard labour that once crowded the ground.',
    tone: 'historical, reflective, grounded',
    sources: [
      'https://www.heritage.org.nz/list-details/5156/Gabriels-Gully',
      'https://www.cluthanz.com/visit/lawrence/gabriels-gully/',
    ],
  },
  {
    id: 'otago-matanaka-farm-buildings',
    name: 'Matanaka Farm Buildings',
    region: 'otago',
    lat: -45.547,
    lng: 170.733,
    category: 'heritage',
    tags: ['heritage-new-zealand', 'waikouaiti', 'farm-buildings', 'colonial-history'],
    duration_hours: 0.75,
    trigger_radius_m: 400,
    short: 'A group of early farm buildings near Waikouaiti, recognised as some of New Zealand’s oldest surviving examples.',
    story: 'Matanaka’s farm buildings are quiet, spare and powerful because of it. They hold an early farming story in timber and stone rather than drama, giving the Otago coast a physical link to the first decades of European settlement in the south.',
    tone: 'spare, historical, attentive',
    sources: [
      'https://www.heritage.org.nz/places/places-to-visit/otago-region/matanaka-farm-buildings',
    ],
  },
  {
    id: 'queenstown-twelve-mile-delta',
    name: 'Twelve Mile Delta',
    region: 'queenstown',
    lat: -45.031,
    lng: 168.542,
    category: 'nature',
    tags: ['lake-wakatipu', 'camping', 'walking', 'glenorchy-road'],
    duration_hours: 1.5,
    trigger_radius_m: 1000,
    short: 'A Lake Wakatipu recreation reserve on the Glenorchy Road, with camping, shoreline walks and mountain views.',
    story: 'Twelve Mile Delta gives Queenstown a simpler lake edge. The Remarkables and Wakatipu do the visual work, but the place itself is low-key: campsites, shoreline wandering and room to sit with the weather moving across the water.',
    tone: 'open, lake-calm, outdoorsy',
    sources: [
      'https://www.doc.govt.nz/parks-and-recreation/places-to-go/otago/places/queenstown-area/things-to-do/campsites/twelve-mile-delta-campsite/',
    ],
  },
  {
    id: 'queenstown-glenorchy-animal-experience',
    name: 'Glenorchy Animal Experience',
    region: 'queenstown',
    lat: -44.851,
    lng: 168.391,
    category: 'culture',
    tags: ['farm-experience', 'family', 'glenorchy', 'animals'],
    duration_hours: 1.5,
    trigger_radius_m: 500,
    short: 'A hands-on Glenorchy farm experience for families, set beneath the head-of-the-lake mountains.',
    story: 'Glenorchy Animal Experience brings Queenstown’s big mountain scenery down to farm height. It is a friendly, practical stop where children can meet animals and adults can enjoy the surreal contrast between everyday paddocks and the vast scenery beyond them.',
    tone: 'warm, family-friendly, rural',
    sources: [
      'https://www.glenorchyanimalexperience.co.nz/',
      'https://www.queenstownnz.co.nz/listing/glenorchy-animal-experience/1423/',
    ],
  },
  {
    id: 'southland-templeton-flax-mill-museum',
    name: 'Templeton Flax Mill Heritage Museum',
    region: 'southland',
    lat: -46.22,
    lng: 168.05,
    category: 'heritage',
    tags: ['museum', 'flax-milling', 'riverton', 'industrial-heritage'],
    duration_hours: 1,
    trigger_radius_m: 400,
    short: 'A Southland heritage museum preserving the machinery and stories of the flax-milling era.',
    story: 'Templeton Flax Mill Heritage Museum gives Southland’s wetlands and river flats an industrial memory. The machinery tells of fibre, labour and local enterprise, turning what can seem like a quiet rural landscape into a place of invention and hard work.',
    tone: 'hands-on, historical, local',
    sources: [
      'https://southlandnz.com/riverton/templeton-flax-mill-heritage-museum',
    ],
  },
  {
    id: 'southland-doubtful-sound-overnight-cruise',
    name: 'Doubtful Sound Overnight Cruise',
    region: 'southland',
    lat: -45.457,
    lng: 167.188,
    category: 'journey',
    tags: ['fiordland', 'overnight-cruise', 'wildlife', 'manapouri'],
    duration_hours: 24,
    trigger_radius_m: 3000,
    short: 'An overnight Fiordland journey into remote Doubtful Sound, usually starting from Manapouri.',
    story: 'A Doubtful Sound overnight cruise changes the scale of a Fiordland visit. Instead of arriving, looking and leaving, travellers stay long enough for light, weather and silence to move through the fiord, with the boat becoming a small floating room inside a very large landscape.',
    tone: 'immersive, hushed, expansive',
    sources: [
      'https://www.realnz.com/en/experiences/cruises/doubtful-sound-overnight-cruises/',
    ],
  },
];

const accommodationAdditions = [
  {
    id: 'auckland-warblers-retreat',
    name: 'Warblers Retreat',
    region: 'auckland',
    lat: -36.724,
    lng: 174.675,
    type: 'lodge',
    price_nzd_per_night: 520,
    rating: 4.8,
    short: 'Boutique lodge-style accommodation in North Auckland bush, suited to quiet luxury stays near the city.',
    sources: ['https://www.warblersretreat.nz/auckland-luxury-accommodation-lodge'],
  },
  {
    id: 'northland-duke-of-marlborough-hotel',
    name: 'The Duke of Marlborough Hotel',
    region: 'northland',
    lat: -35.261,
    lng: 174.122,
    type: 'hotel',
    price_nzd_per_night: 260,
    rating: 4.5,
    short: 'Historic Russell waterfront hotel with Bay of Islands views, dining and heritage atmosphere.',
    sources: ['https://www.theduke.co.nz/'],
  },
  {
    id: 'bay-of-plenty-ohiwa-beach-holiday-park',
    name: 'Ohiwa Beach Holiday Park',
    region: 'bay-of-plenty',
    lat: -37.988,
    lng: 177.134,
    type: 'holiday-park',
    price_nzd_per_night: 135,
    rating: 4.5,
    short: 'Beachfront holiday park between Ohope and Opotiki, with cabins and campsites beside Ohiwa Harbour.',
    sources: ['https://tasmanholidayparks.com/nz/ohiwa/'],
  },
  {
    id: 'waikato-woodlyn-park',
    name: 'Woodlyn Park',
    region: 'waikato',
    lat: -38.258,
    lng: 175.107,
    type: 'motel',
    price_nzd_per_night: 190,
    rating: 4.2,
    short: 'Novelty Waitomo accommodation with cave, boat, train and plane motel units near the caves area.',
    sources: ['https://www.woodlynpark.co.nz/'],
  },
  {
    id: 'taupo-lake-taupo-lodge',
    name: 'Lake Taupo Lodge',
    region: 'taupo',
    lat: -38.731,
    lng: 176.097,
    type: 'lodge',
    price_nzd_per_night: 680,
    rating: 4.8,
    short: 'Luxury Acacia Bay lodge with gardens, lake views and a hosted retreat feel above Taupo.',
    sources: ['https://laketaupolodge.co.nz/'],
  },
  {
    id: 'rotorua-vr-lake-resort',
    name: 'VR Rotorua Lake Resort',
    region: 'rotorua',
    lat: -38.077,
    lng: 176.354,
    type: 'hotel',
    price_nzd_per_night: 210,
    rating: 4.1,
    short: 'Lake Rotoiti resort accommodation at Mourea, useful for travellers exploring Rotorua’s eastern lakes.',
    sources: ['https://www.vrhotels.co.nz/vr-rotorua-lake-resort/'],
  },
  {
    id: 'tairawhiti-ocean-beach-motor-lodge',
    name: 'Ocean Beach Motor Lodge',
    region: 'tairawhiti',
    lat: -38.681,
    lng: 178.082,
    type: 'motel',
    price_nzd_per_night: 190,
    rating: 4.4,
    short: 'Wainui Beach motel accommodation east of Gisborne, close to surf, coastal walks and the city.',
    sources: ['https://www.oceanbeachmotorlodge.co.nz/'],
  },
  {
    id: 'hawkes-bay-art-deco-masonic-hotel',
    name: 'Art Deco Masonic Hotel',
    region: 'hawkes-bay',
    lat: -39.49,
    lng: 176.918,
    type: 'hotel',
    price_nzd_per_night: 260,
    rating: 4.5,
    short: 'Central Napier hotel in a landmark Art Deco building by the waterfront and city attractions.',
    sources: ['https://masonic.co.nz/'],
  },
  {
    id: 'taranaki-the-devon-hotel',
    name: 'The Devon Hotel',
    region: 'taranaki',
    lat: -39.055,
    lng: 174.091,
    type: 'hotel',
    price_nzd_per_night: 210,
    rating: 4.4,
    short: 'Established New Plymouth hotel with easy access to the coastal walkway, city centre and Taranaki touring.',
    sources: ['https://www.devonhotel.co.nz/'],
  },
  {
    id: 'whanganui-manawatu-makoura-lodge',
    name: 'Makoura Lodge',
    region: 'whanganui-manawatu',
    lat: -39.996,
    lng: 175.822,
    type: 'lodge',
    price_nzd_per_night: 240,
    rating: 4.6,
    short: 'Rural lodge and event accommodation near Apiti, with hill-country views and outdoor activities.',
    sources: ['https://www.makouralodge.co.nz/'],
  },
  {
    id: 'wellington-parehua-resort-martinborough',
    name: 'Parehua Resort Martinborough',
    region: 'wellington',
    lat: -41.223,
    lng: 175.469,
    type: 'hotel',
    price_nzd_per_night: 310,
    rating: 4.5,
    short: 'Wine-country Martinborough resort with cottage-style accommodation, gardens and vineyard access.',
    sources: ['https://www.parehuaresort.co.nz/'],
  },
  {
    id: 'marlborough-escape-to-picton',
    name: 'Escape to Picton',
    region: 'marlborough',
    lat: -41.29,
    lng: 174.006,
    type: 'hotel',
    price_nzd_per_night: 330,
    rating: 4.4,
    short: 'Boutique Picton hotel and restaurant close to the marina, ferry terminal and Marlborough Sounds departures.',
    sources: ['https://www.escapetopicton.com/'],
  },
  {
    id: 'nelson-tasman-the-pear-orchard-lodge',
    name: 'The Pear Orchard Lodge',
    region: 'nelson-tasman',
    lat: -41.334,
    lng: 173.154,
    type: 'lodge',
    price_nzd_per_night: 260,
    rating: 4.7,
    short: 'Hosted Richmond lodge accommodation set among orchard country between Nelson city and Tasman routes.',
    sources: ['https://www.thepearorchard.co.nz/'],
  },
  {
    id: 'west-coast-maruia-hot-springs',
    name: 'Maruia Hot Springs',
    region: 'west-coast',
    lat: -42.331,
    lng: 172.188,
    type: 'lodge',
    price_nzd_per_night: 260,
    rating: 4.4,
    short: 'Thermal hot-springs retreat on the Lewis Pass route, with bathing, dining and lodge accommodation.',
    sources: ['https://www.maruiahotsprings.nz/'],
  },
  {
    id: 'canterbury-the-vicarage-geraldine',
    name: 'The Vicarage Geraldine',
    region: 'canterbury',
    lat: -44.09,
    lng: 171.244,
    type: 'hotel',
    price_nzd_per_night: 230,
    rating: 4.7,
    short: 'Boutique accommodation in a restored Geraldine vicarage, handy to cafes, galleries and inland routes.',
    sources: ['https://thevicaragegeraldine.co.nz/'],
  },
  {
    id: 'otago-waipiata-country-hotel',
    name: 'Waipiata Country Hotel',
    region: 'otago',
    lat: -45.189,
    lng: 170.147,
    type: 'hotel',
    price_nzd_per_night: 155,
    rating: 4.6,
    short: 'Rail Trail country hotel in Maniototo, popular with cyclists and travellers crossing Central Otago.',
    sources: ['https://waipiatacountryhotel.co.nz/'],
  },
  {
    id: 'queenstown-kinloch-wilderness-retreat',
    name: 'Kinloch Wilderness Retreat',
    region: 'queenstown',
    lat: -44.815,
    lng: 168.347,
    type: 'lodge',
    price_nzd_per_night: 210,
    rating: 4.5,
    short: 'Head-of-the-lake retreat near Glenorchy, with lodge rooms, cabins and access to walking and lake journeys.',
    sources: ['https://www.kinlochlodge.co.nz/'],
  },
  {
    id: 'southland-radfords-on-the-lake',
    name: 'Radfords on the Lake',
    region: 'southland',
    lat: -45.418,
    lng: 167.718,
    type: 'motel',
    price_nzd_per_night: 280,
    rating: 4.8,
    short: 'Lakefront Te Anau apartment-motel accommodation with Fiordland views and town-centre access.',
    sources: ['https://www.radfordsonthelake.co.nz/'],
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

  for (const addition of poiAdditions) {
    const region = byRegion.get(addition.region);
    if (!region) {
      skipped.push({ type: 'poi', id: addition.id, name: addition.name, reason: `unknown region ${addition.region}` });
      continue;
    }

    const normalized = normalizeName(addition.name);
    if (ids.has(addition.id) || names.has(normalized)) {
      skipped.push({ type: 'poi', id: addition.id, name: addition.name, reason: 'duplicate id or exact name' });
      continue;
    }

    const record = {
      id: addition.id,
      name: addition.name,
      region: addition.region,
      lat: addition.lat,
      lng: addition.lng,
      category: addition.category,
      tags: addition.tags || [],
      trigger_radius_m: addition.trigger_radius_m || 300,
      duration_hours: addition.duration_hours || 1,
      short: addition.short,
      commentary: addition.story,
      audio_story: addition.story,
      suggested_voice_tone: addition.tone || 'warm, curious, grounded',
      sources_to_check: addition.sources || [],
      content_status: 'draft',
      cultural_review_required: Boolean(addition.cultural_review_required),
    };

    region.json.pois.push(record);
    ids.add(record.id);
    names.add(normalized);
    added.push({ ...addition, type: 'poi' });
  }

  for (const { filePath, json } of byRegion.values()) writeJson(filePath, json);
  return { added, skipped };
}

function appendAccommodations() {
  const dir = path.join(ROOT, 'content', 'accommodations');
  const files = fs.readdirSync(dir).filter((file) => file.endsWith('.json') && file !== 'index.json');
  const byRegion = new Map();
  const ids = new Set();
  const names = new Set();

  for (const file of files) {
    const filePath = path.join(dir, file);
    const json = readJson(filePath);
    byRegion.set(json.region.id, { filePath, json });
    for (const accommodation of json.accommodations || []) {
      ids.add(accommodation.id);
      names.add(normalizeName(accommodation.name));
    }
  }

  const added = [];
  const skipped = [];

  for (const addition of accommodationAdditions) {
    const region = byRegion.get(addition.region);
    if (!region) {
      skipped.push({ type: 'accommodation', id: addition.id, name: addition.name, reason: `unknown region ${addition.region}` });
      continue;
    }

    const normalized = normalizeName(addition.name);
    if (ids.has(addition.id) || names.has(normalized)) {
      skipped.push({ type: 'accommodation', id: addition.id, name: addition.name, reason: 'duplicate id or exact name' });
      continue;
    }

    const record = {
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

    region.json.accommodations.push(record);
    region.json.count = region.json.accommodations.length;
    ids.add(record.id);
    names.add(normalized);
    added.push({ ...addition, type: 'accommodation' });
  }

  for (const { filePath, json } of byRegion.values()) {
    json.count = (json.accommodations || []).length;
    writeJson(filePath, json);
  }

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

function updateAccommodationIndex() {
  const dir = path.join(ROOT, 'content', 'accommodations');
  const regions = [];
  const byType = {};
  const byRegion = {};
  let total = 0;

  for (const file of fs.readdirSync(dir).filter((item) => item.endsWith('.json') && item !== 'index.json').sort()) {
    const json = readJson(path.join(dir, file));
    const accommodations = json.accommodations || [];
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
    project: 'Qiwiosity — New Zealand travel companion',
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

function writeReport(results) {
  const reportPath = path.join(ROOT, 'content', 'poi', 'national-expansion-2026-05-17-pass-3-report.md');
  const addedPoi = results.pois.added;
  const addedAccommodations = results.accommodations.added;
  const skipped = [...results.pois.skipped, ...results.accommodations.skipped];
  const byRegion = {};

  for (const item of [...addedPoi, ...addedAccommodations]) {
    byRegion[item.region] ||= { poi: [], accommodations: [] };
    if (item.type === 'poi') byRegion[item.region].poi.push(item);
    else byRegion[item.region].accommodations.push(item);
  }

  const lines = [
    '# National Expansion Pass 3 - 2026-05-17',
    '',
    'Goal: keep broadening the map after the 200-addition milestone, with another balanced national pass across every Qiwiosity region.',
    '',
    `POIs added: ${addedPoi.length}`,
    `Accommodations added: ${addedAccommodations.length}`,
    `Total additions added: ${addedPoi.length + addedAccommodations.length}`,
    `Skipped duplicate/invalid candidates: ${skipped.length}`,
    '',
    '## Source Pattern',
    '- Prioritised official public-land, DOC, council, regional tourism, heritage and operator pages.',
    '- Wrote original short stories and draft audio stories from verified high-level facts rather than copying source wording.',
    '- Marked records for cultural review where the place story touches cultural history, taonga, or whenua/rohe context beyond simple visitor logistics.',
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
    for (const item of skipped) {
      lines.push(`- ${item.type}: ${item.name} (${item.id}) — ${item.reason}`);
    }
  }

  lines.push(
    '',
    '## Notes For Next Pass',
    '- Keep filling smaller districts and route-adjacent stops, not just marquee attractions.',
    '- Add image records for accepted draft POIs once the content baseline is reviewed.',
    '- Re-check accommodation pricing before exposing booking-oriented UI copy.',
    ''
  );

  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8');
}

function main() {
  const pois = appendPois();
  const accommodations = appendAccommodations();
  updatePoiIndex();
  updateAccommodationIndex();
  writeReport({ pois, accommodations });

  const total = pois.added.length + accommodations.added.length;
  console.log(`Added ${pois.added.length} POIs`);
  console.log(`Added ${accommodations.added.length} accommodations`);
  console.log(`Added ${total} total records`);
  if (pois.skipped.length || accommodations.skipped.length) {
    console.log(`Skipped ${pois.skipped.length + accommodations.skipped.length} duplicate/invalid candidates`);
  }
}

main();
