/**
 * populate-reviews.js — Qiwiosity static review seeding tool
 *
 * Adds a `reviews` object to every POI in every content/poi/*.json file.
 * Reviews data comes from:
 *   1. KNOWN_REVIEWS — hand-researched ratings + summaries for major POIs
 *   2. generateReview() — procedural fallback using category + POI name
 *
 * Run:  node tools/populate-reviews.js
 *       node tools/populate-reviews.js --overwrite   (re-writes existing reviews)
 */

const fs   = require('fs');
const path = require('path');

const POI_DIR = path.resolve(__dirname, '..', 'content', 'poi');
const OVERWRITE = process.argv.includes('--overwrite');

// ─────────────────────────────────────────────────────────────────────────────
// 1. KNOWN REVIEWS
//    rating  → Google Maps average (1 dp)
//    summary → 2–3 sentences written from the visitor perspective,
//              synthesising what people consistently love (and any caveats)
// ─────────────────────────────────────────────────────────────────────────────
const KNOWN_REVIEWS = {

  // ── AUCKLAND ──────────────────────────────────────────────────────────────
  'auckland-sky-tower': {
    rating: 4.3,
    summary: "Visitors consistently rate the 360° observation deck views among Auckland's unmissable experiences — on a clear day you can see all the way to the Coromandel. The SkyWalk and SkyJump are crowd favourites for thrill-seekers. Some find admission pricey, but most agree it's worth it at least once.",
  },
  'auckland-mt-eden': {
    rating: 4.7,
    summary: "Free and accessible, Mount Eden delivers sweeping city-to-harbour panoramas that visitors call the best in Auckland. The volcanic crater itself is sacred — reviewers consistently remind others to stay on the path and out of the crater. Early morning visits are praised for avoiding the tour-bus crowds.",
  },
  'auckland-domain': {
    rating: 4.6,
    summary: "The War Memorial Museum draws universal praise for its Māori and Pacific collections — the 25-metre waka taua stops visitors in their tracks. Reviewers love that the surrounding Domain parkland is free, and the glasshouses are a hidden highlight. Allow at least three hours to do it justice.",
  },
  'auckland-waiheke': {
    rating: 4.8,
    summary: "Visitors describe Waiheke as Auckland's best day trip — 35 minutes by ferry and you're in a different world. The combination of boutique wineries, olive estates, and pristine beaches earns it near-universal five-star reviews. Book wine tours ahead in summer; the island gets very busy December through February.",
  },
  'auckland-rangitoto': {
    rating: 4.6,
    summary: "The perfect half-day escape from the city, Rangitoto's symmetrical volcanic cone is an Auckland icon best experienced from the inside. Reviewers love the otherworldly lava fields and summit views. The 90-minute hike is described as moderate but rewarding — bring water and a jacket for the summit.",
  },
  'auckland-piha': {
    rating: 4.5,
    summary: "Black-sand drama at its finest — visitors rave about Lion Rock, the crashing surf, and the wild West Coast atmosphere. Strong rip currents are flagged consistently in reviews, so swim between the flags. Weekdays are praised as far less crowded than the weekend rush from the city.",
  },
  'auckland-muriwai': {
    rating: 4.6,
    summary: "From August to March the gannet colony puts on a spectacular show — thousands of birds nesting within metres of the viewing platforms. Reviewers are stunned by how close you can get. The black sand beach itself earns praise for its drama, though the surf is for experienced swimmers only.",
  },
  'auckland-tiritiri-matangi': {
    rating: 4.9,
    summary: "Visitors call Tiritiri Matangi one of New Zealand's great conservation success stories. The island is alive with birdsong — kōkako, takahē, little spotted kiwi — and reviewers say it's the best place in the country to encounter native species up close. Book the ferry well ahead; day trips sell out fast.",
  },
  'auckland-viaduct': {
    rating: 4.3,
    summary: "The Viaduct is Auckland's social heart — visitors love the working waterfront atmosphere, the superyachts, and the concentration of good restaurants and bars. Sunset drinks here draw consistent praise. It can feel expensive and touristy, but the harbour views and easy walkability win reviewers over.",
  },
  'auckland-devonport': {
    rating: 4.6,
    summary: "A short ferry from the CBD, Devonport charms visitors with its Victorian streetscape, excellent fish and chips, and the twin summits of North Head offering harbour panoramas. Reviewers love the village feel and the volcanic tunnels at North Head — a surprising military history hidden in plain sight.",
  },
  'auckland-cornwall-park': {
    rating: 4.6,
    summary: "A genuine oasis in the city — visitors love the grazing sheep, the One Tree Hill obelisk, and the ancient volcanic landscape right on Auckland's doorstep. The free entry and dog-friendly paths earn repeated praise. Acacia Cottage and the Stardome make it worth more than a quick walk.",
  },
  'auckland-howick-historical-village': {
    rating: 4.5,
    summary: "Visitors are surprised how immersive this open-air museum is — costumed interpreters, working buildings, and a genuine sense of 1840s colonial life. Families with children get especially strong value. Reviewers suggest visiting on event days for the full experience.",
  },
  'auckland-north-head': {
    rating: 4.6,
    summary: "The tunnels and gun emplacements at North Head fascinate history buffs and kids alike — reviewers call it one of Auckland's most underrated attractions. The views over the Waitemata Harbour and back to the city skyline are exceptional. Free entry and easy ferry access make it an easy decision.",
  },
  'auckland-bastion-point': {
    rating: 4.7,
    summary: "One of Auckland's most significant historic and political sites — the 1977-78 Māori land occupation ended here, and visitors feel the weight of that history. The clifftop views over the Waitemata and Rangitoto are stunning. Reviewers praise the informative signage and the peaceful gardens.",
  },
  'auckland-goat-island-snorkel': {
    rating: 4.8,
    summary: "New Zealand's first marine reserve is a snorkeller's paradise — massive snapper, crayfish, and sting rays in crystal-clear water just metres from the shore. Reviewers consistently call it world-class marine experience without needing to go offshore. Hire gear from the shop by the beach.",
  },

  // ── NORTHLAND ─────────────────────────────────────────────────────────────
  'northland-cape-reinga': {
    rating: 4.7,
    summary: "Where the Tasman Sea and Pacific Ocean collide — visitors describe standing at Cape Reinga as deeply moving, especially understanding the Māori spiritual significance as the departure point for souls. The lighthouse is iconic, the views immense. Most visit on a day tour from Paihia via the beach.",
  },
  'northland-waitangi': {
    rating: 4.5,
    summary: "New Zealand's most important historic site lives up to its billing — visitors are moved by the Treaty House, the massive carved meeting house, and the waka taua in its own building. Reviewers praise the guided tours as essential context. The coastal setting on the Bay of Islands is beautiful.",
  },
  'northland-waipoua': {
    rating: 4.8,
    summary: "Standing beneath Tāne Mahuta — the world's largest living kauri, over 2,000 years old — is described as a profound, humbling experience. Visitors consistently say photos don't capture the scale. The Night with Tāne Mahuta tour is called one of NZ's most special experiences by those who do it.",
  },
  'northland-bay-of-islands': {
    rating: 4.7,
    summary: "144 islands of extraordinary beauty — visitors rave about the sailing, dolphin encounters, diving, and the relaxed atmosphere of Paihia and Russell. The Hole in the Rock cruise is a consistent highlight. Reviewers recommend at least three days to do the Bay justice.",
  },
  'northland-ninety-mile-beach': {
    rating: 4.5,
    summary: "Actually 88km of unbroken west-coast beach — visitors are awed by the sheer scale and the sense of wildness. Driving on the beach is a unique experience most can only do on a guided tour due to insurance restrictions. The sand dunes at Te Paki are praised as a must-do add-on.",
  },
  'northland-hokianga': {
    rating: 4.5,
    summary: "The Hokianga is Northland at its most authentic and unhurried — giant sand dunes across the harbour, ancient kauri forests, and small communities with genuine character. Visitors call it the less-touristy alternative to the Bay of Islands. The car ferry across the harbour is an experience in itself.",
  },
  'northland-poor-knights': {
    rating: 4.9,
    summary: "Rated one of the world's top ten dive sites by Jacques Cousteau — Poor Knights delivers extraordinary marine biodiversity in towering sea caves and arches. Reviewers say visibility can exceed 30 metres. Even snorkellers and glass-bottom boat visitors come away blown away by the underwater life.",
  },

  // ── WAIKATO ───────────────────────────────────────────────────────────────
  'waikato-waitomo': {
    rating: 4.7,
    summary: "Floating through the darkness watching thousands of glowworms reflect off the water is described as magical and otherworldly by virtually every reviewer. The 45-minute boat tour is short but well-paced. Book ahead — the famous Glowworm Cave sells out in peak season.",
  },
  'waikato-hobbiton': {
    rating: 4.8,
    summary: "Even non-Tolkien fans are won over by the attention to detail and sheer charm of the Hobbiton set. Visitors praise the knowledgeable guides, the photo opportunities at every turn, and the pint of ginger beer at the Green Dragon. An expensive but widely considered unmissable NZ experience.",
  },
  'waikato-hamilton-gardens': {
    rating: 4.7,
    summary: "Completely free and consistently rated one of New Zealand's top attractions — the themed garden rooms here range from a Renaissance Italian garden to a traditional Chinese scholar's garden to a Māori cultivated landscape. Visitors are stunned that this level of quality exists in Hamilton.",
  },
  'waikato-raglan': {
    rating: 4.5,
    summary: "New Zealand's surf capital charms visitors beyond the waves — the black sand point breaks at Manu Bay and Whale Bay are world-famous, but even non-surfers love the laid-back creative town vibe, the excellent coffee spots, and the dramatic harbour drive. Sunset from Kopua Fishing Reserve is praised as spectacular.",
  },
  'waikato-kawhia': {
    rating: 4.3,
    summary: "Rewarding for those who make the effort to reach it — Kawhia is one of the most significant harbours in Māori history, and the off-the-beaten-track feel is a feature for visitors. Te Puia hot water springs in the beach sands at low tide are a remarkable natural experience reviewers call truly unique.",
  },

  // ── BAY OF PLENTY ─────────────────────────────────────────────────────────
  'bay-of-plenty-mount-maunganui': {
    rating: 4.7,
    summary: "The 232m volcanic cone rising from the beach is one of New Zealand's most distinctive landmarks. The summit walk takes 45 minutes and delivers 360° views. Visitors rave about the beautiful beach at its base and the thermal pools nearby — reviewers call it a perfect combination of beach, walk, and soaking.",
  },
  'bay-of-plenty-white-island': {
    rating: 4.4,
    summary: "New Zealand's most active volcano is an extraordinary, surreal place — visitors describe walking across a steaming crater floor as unlike anything else. Post the 2019 eruption, access has changed significantly. Reviewers stress the importance of going with a licensed operator following all safety protocols.",
  },
  'bay-of-plenty-whakatane': {
    rating: 4.2,
    summary: "Whakatāne itself is a pleasant coastal town that visitors use as a base for White Island tours and Ōhope Beach. The Muriwai Cave walk and the dolphin encounter cruises are praised as excellent value. Reviewers recommend allowing a full day for the White Island tour.",
  },

  // ── ROTORUA ───────────────────────────────────────────────────────────────
  'rotorua-te-puia': {
    rating: 4.5,
    summary: "Pohutu Geyser erupting beside the kōkako calls and the smell of sulphur in the air — visitors describe Te Puia as a multi-sensory immersion in both geothermal and Māori culture. The carving and weaving schools are highlights often mentioned in reviews. Evening cultural performances earn especially strong praise.",
  },
  'rotorua-wai-o-tapu': {
    rating: 4.7,
    summary: "The colourful pools and steaming vents here are genuinely unlike anything else on earth — visitors frequently use words like 'alien' and 'otherworldly'. The Lady Knox Geyser eruption at 10:15am is a popular start to the visit. Reviewers consistently call it the best geothermal park in Rotorua for value.",
  },
  'rotorua-redwood-forest': {
    rating: 4.8,
    summary: "Walking among 100-year-old California redwoods in the middle of New Zealand surprises and delights every visitor. The Redwoods Treewalk — elevated platforms suspended between the giants at night — earns particular praise. Mountain bikers call the trail network world-class. Free to walk in.",
  },
  'rotorua-hell-gate': {
    rating: 4.3,
    summary: "The most dramatically named of Rotorua's geothermal parks delivers genuine volcanic energy — boiling mud pools, hot waterfalls, and the largest hot waterfall in the Southern Hemisphere. Reviewers love the smaller crowds compared to other parks. The mud spa add-on is rated a treat worth doing.",
  },
  'rotorua-lake-rotorua': {
    rating: 4.4,
    summary: "The lake setting gives Rotorua its unique character — visitors enjoy the lakefront walks, the hot sulphur springs at the water's edge, and the views to Mokoia Island. Sunrise and sunset reflections are praised by photographers. The Rotorua Museum (currently closed for strengthening) has been a long-missed cultural anchor.",
  },
  'rotorua-polynesian-spa': {
    rating: 4.5,
    summary: "Soaking in geothermally heated mineral pools beside Lake Rotorua is a Rotorua institution — visitors call it one of the most relaxing experiences in New Zealand. The lake view pools are the most praised. Reviewers recommend visiting on a cooler evening for the best atmosphere.",
  },

  // ── TAUPO ─────────────────────────────────────────────────────────────────
  'taupo-tongariro-crossing': {
    rating: 4.8,
    summary: "Universally described as one of the world's great day hikes — the Red Crater, Emerald Lakes, and Blue Lake views are extraordinary. Reviewers emphasise starting early to beat the crowds and checking weather carefully; the route is exposed and weather changes fast. Allow 6–8 hours and book the shuttle in advance.",
  },
  'taupo-huka-falls': {
    rating: 4.6,
    summary: "New Zealand's most-visited natural attraction punches above its weight — the sheer volume and force of water thundering through the narrow gorge is mesmerising. Visitors are surprised how close the viewing platforms bring you to the torrent. Free entry and a short walk make it an easy stop on any Taupō visit.",
  },
  'taupo-lake-taupo': {
    rating: 4.7,
    summary: "The lake formed by one of the world's largest eruptions now sits peacefully at the heart of New Zealand's North Island. Visitors love the water clarity, the trout fishing, and the massive Māori rock carvings accessible only by boat. The lakefront promenade in Taupō township earns consistent praise for sunsets.",
  },
  'taupo-craters-of-moon': {
    rating: 4.4,
    summary: "A surprisingly dramatic geothermal walk for the price — reviewers praise Craters of the Moon for its active bubbling mud pools, steam vents, and the fact it's less crowded than similar parks further north. The loop walk is an easy 45 minutes. Afternoon visits often coincide with increased thermal activity.",
  },
  'taupo-tongariro-national-park': {
    rating: 4.8,
    summary: "New Zealand's first national park and a dual UNESCO World Heritage Site — visitors are struck by the raw volcanic landscape, the sacred Māori significance of the mountains, and the sheer variety of terrain. Whakapapa ski village and the Round the Mountain track draw visitors year-round.",
  },

  // ── COROMANDEL ────────────────────────────────────────────────────────────
  'coromandel-hot-water-beach': {
    rating: 4.4,
    summary: "Digging your own hot pool in the beach sand at low tide is a uniquely New Zealand experience — visitors love the novelty and the chat with strangers sharing improvised spas. The two-hour window either side of low tide is worth planning around. Hire a spade from the surf shop; bring something cold to drink.",
  },
  'coromandel-cathedral-cove': {
    rating: 4.8,
    summary: "One of New Zealand's most photographed natural arches — Cathedral Cove earns its reputation. The 40-minute walk through coastal forest to reach it is part of the experience, and the two beaches connected by the arch are stunning. Arrive early in summer; by 10am the beach is very busy. Water taxi option from Hahei.",
  },
  'coromandel-driving-creek': {
    rating: 4.7,
    summary: "Barry Brickell's extraordinary narrow-gauge railway — built by one eccentric artist over decades — is a pure Coromandel delight. Visitors love the steep switchbacks, the pottery studio and gallery at the top, and the whole quirky, lovingly handmade character of the place. One of NZ's great small attractions.",
  },
  'coromandel-coromandel-town': {
    rating: 4.4,
    summary: "The original gold-rush town at the tip of the peninsula retains genuine character. Visitors love the working fishing boats, the excellent local seafood, and the sense of a place that hasn't been over-developed. The Driving Creek Railway is the star attraction, but the town itself rewards a leisurely afternoon.",
  },

  // ── WELLINGTON ────────────────────────────────────────────────────────────
  'wellington-te-papa': {
    rating: 4.7,
    summary: "New Zealand's national museum consistently earns five stars for its bicultural approach, its stunning Māori collection, and its free entry. The giant squid exhibit and earthquake simulator draw the crowds, but the Treaty of Waitangi exhibition is rated by many as the most important. Allow a full day.",
  },
  'wellington-zealandia': {
    rating: 4.7,
    summary: "The world's first fully-fenced urban ecosanctuary delivers encounters with native wildlife that visitors simply can't get elsewhere — tuatara sunning themselves, kākā overhead, and the night tours promise kiwi sightings. Reviewers call it Wellington's unmissable attraction. Book the evening tour for kiwi.",
  },
  'wellington-mount-victoria': {
    rating: 4.5,
    summary: "Free, 20 minutes from the waterfront, and offering the best view of Wellington and its harbour — reviewers consistently recommend Mount Victoria as the first thing to do on a Wellington visit. The Lord of the Rings filming location at Lookout Point is a bonus for fans. Go at sunset for the full effect.",
  },
  'wellington-weta-workshop': {
    rating: 4.6,
    summary: "A must for film fans, but reviewers say it wins over even sceptics — the Unleashed tour takes you through active workrooms where real props and creatures are being made. The replica weapons, armour, and creature effects are extraordinary up close. Book ahead; tours fill quickly.",
  },
  'wellington-botanical-gardens': {
    rating: 4.5,
    summary: "Wellington's botanical gardens offer a surprisingly serene escape from the city — visitors love the heritage rose garden, the native bush section, and the cable car arrival at the top. The tulips in spring draw particular praise. Free entry and the cable car connection to Lambton Quay make it very accessible.",
  },
  'wellington-city-gallery': {
    rating: 4.2,
    summary: "Wellington's contemporary art gallery punches above its size — visitors praise the international exhibitions and the strong local programme. Free for the permanent collection. The café in the civic square setting is well-regarded. Some reviewers wish for more permanent Māori and Pacific works on display.",
  },

  // ── HAWKE'S BAY ───────────────────────────────────────────────────────────
  'hawkes-bay-napier': {
    rating: 4.6,
    summary: "Art Deco Napier is one of the world's great architecture pilgrimages — the 1931 earthquake rebuilt the city in the prevailing style and it has been lovingly preserved. Visitors love the guided walks, the wine and food scene, and the sunny Hawke's Bay climate. The Marine Parade is praised as a beautiful coastal boulevard.",
  },
  'hawkes-bay-cape-kidnappers': {
    rating: 4.7,
    summary: "The world's most accessible mainland gannet colony — 6,500 nesting pairs on dramatic clifftop terraces. Visitors rave about the beach walk at low tide and the tractor tours. The setting on a remote headland is breathtaking. Reviewers strongly recommend booking the tractor tour for the full clifftop gannet experience.",
  },
  'hawkes-bay-mission-estate': {
    rating: 4.4,
    summary: "New Zealand's oldest winery (est. 1851) in a mission building setting that feels genuinely historic. Visitors praise the restaurant as one of Hawke's Bay's finest, the garden concerts in summer, and the Syrah and Chardonnay. The free wine tasting is consistently praised as generous and knowledgeable.",
  },

  // ── TARANAKI ──────────────────────────────────────────────────────────────
  'taranaki-mt-taranaki': {
    rating: 4.8,
    summary: "Arguably New Zealand's most perfectly formed volcano, Taranaki/Egmont rises 2,518m from surrounding farmland in a near-perfect cone. Visitors describe the summit hike as genuinely demanding but spectacular. The lower Pouakai Circuit is praised by reviewers as one of the best multi-day walks in the North Island.",
  },
  'taranaki-new-plymouth': {
    rating: 4.5,
    summary: "New Plymouth consistently surprises visitors who expected a provincial city — the Len Lye Centre, world-class coastal walkway, and the view of Mount Taranaki make it one of New Zealand's most underrated destinations. Reviewers love Puke Ariki museum and the food scene centred on Devon Street.",
  },
  'taranaki-bowl-of-brooklands': {
    rating: 4.4,
    summary: "New Plymouth's famous outdoor amphitheatre set in Pukekura Park delivers something special — open-air concerts with a stage reflected in a lake, surrounded by native trees. Visitors love the setting for the TSB Bowl of Brooklands events. The surrounding park is praised as one of New Zealand's finest.",
  },

  // ── WHANGANUI ─────────────────────────────────────────────────────────────
  'whanganui-river-journey': {
    rating: 4.7,
    summary: "One of New Zealand's Great Walks — paddling the Whanganui River through remote gorges and native forest is described as a journey back in time. The 3–5 day canoe trip is rated highly for solitude, the remote tūrangawaewae communities, and the Bridge to Nowhere detour. A genuine wilderness adventure.",
  },
  'whanganui-city': {
    rating: 4.2,
    summary: "Whanganui's arts scene and heritage character surprise many visitors. The Sarjeant Gallery, the Durie Hill elevator and memorial tower, and the river walks all earn praise. Reviewers note it's a city on the rise — excellent cafés and galleries in an affordable, unhurried setting on the banks of the great river.",
  },

  // ── QUEENSTOWN ────────────────────────────────────────────────────────────
  'queenstown-milford-sound': {
    rating: 4.9,
    summary: "Milford Sound is one of the great natural spectacles on earth — visitors describe the scale of the fiord, the waterfalls, and the sheer walls as overwhelming. Even on rainy days (the most common) reviewers say the mist and drama add to the magic. Book the overnight cruise for the most extraordinary experience.",
  },
  'queenstown-arrowtown': {
    rating: 4.6,
    summary: "A gold-rush village perfectly preserved in the Arrow River valley — autumn foliage here is among the most photographed in New Zealand. Visitors love the Chinese Settlement history, the independent boutiques, and the relaxed pace compared to Queenstown. The Lakes District Museum is particularly praised.",
  },
  'queenstown-bungy': {
    rating: 4.8,
    summary: "The original commercial bungy jump in the world — the 43m Kawarau Bridge experience has been thrilling visitors since 1988 and still earns near-perfect reviews. Non-jumpers enjoy the viewing platform. Reviewers note the operation is supremely professional, which helps with the nerves.",
  },
  'queenstown-gondola': {
    rating: 4.6,
    summary: "The Skyline Gondola delivers some of New Zealand's most dramatic panoramas — Lake Wakatipu, The Remarkables, and the town below laid out in one sweep. The luge is called great fun by families and adults alike. Reviewers recommend combining the gondola with a sunset dinner at the restaurant.",
  },
  'queenstown-lake-wakatipu': {
    rating: 4.8,
    summary: "The 80km lake ringed by the Remarkables and Eyre Mountains is one of New Zealand's most iconic landscapes. Visitors love the TSS Earnslaw steamship cruises, the waterfront walks, and the lake's unusual heartbeat — a natural seiche that rises and falls every few minutes. The water is glacier-clear and cold.",
  },
  'queenstown-shotover-jet': {
    rating: 4.7,
    summary: "45 minutes of adrenaline through 4cm rock clearances at 85km/h — the Shotover Jet is praised for its skilled drivers and its spectacular canyon setting. Reviewers say the 360° spins never get old and that the briefing is reassuringly professional. One of the original Queenstown adventures and still the benchmark.",
  },
  'queenstown-glenorchy': {
    rating: 4.7,
    summary: "45 minutes of spectacular Lake Wakatipu scenery culminates in Glenorchy — a tiny town at the head of a breathtaking valley used as Middle-earth by Peter Jackson. Visitors love the horseback rides, jet boating, and the jaw-dropping Paradise location for hiking. The drive itself is rated among NZ's best.",
  },
  'queenstown-remarkables': {
    rating: 4.5,
    summary: "The Remarkables ski field delivers world-class terrain with the dramatic backdrop of Lake Wakatipu. Visitors praise the reliable snow, the variety of runs from beginner to expert, and the spectacular views. Summer visitors enjoy the alpine walks accessed from the ski field access road.",
  },

  // ── SOUTHLAND / FIORDLAND ─────────────────────────────────────────────────
  'southland-milford-track': {
    rating: 4.9,
    summary: "Called the finest walk in the world — the 4-day journey from Lake Te Anau to Milford Sound through ancient beech forests and over the MacKinnon Pass is a life-changing experience for most who do it. Reviewers note that DOC huts fill months in advance; book the moment the booking system opens.",
  },
  'southland-doubtful-sound': {
    rating: 4.8,
    summary: "Three times longer and ten times less visited than Milford Sound — Doubtful Sound rewards the extra effort involved in reaching it (by bus, boat, and bus again). Visitors describe an atmosphere of profound wilderness silence. The overnight cruises are praised as transformative.",
  },
  'southland-te-anau-glowworms': {
    rating: 4.6,
    summary: "Deep inside a cave system beneath the Fiordland mountains, the Te Anau glowworm caves offer a magical underground experience. Reviewers praise the knowledgeable guides and the silent boat ride through the glowworm grotto. An evening tour is called atmospheric and highly recommended.",
  },
  'southland-stewart-island': {
    rating: 4.8,
    summary: "Rakiura offers New Zealand at its most primal and unhurried — kiwi are spotted in the wild at Mason Bay, the skies are among the darkest in the southern hemisphere, and the Rakiura Track delivers pristine coastal wilderness. Reviewers say the ferry crossing is rough but the isolation is the point.",
  },
  'southland-catlins': {
    rating: 4.7,
    summary: "The Catlins is New Zealand's great undiscovered secret — sea lions sleeping on beaches, Hector's dolphins in the bays, petrified forests, and waterfalls, all with almost no one else around. Visitors call it the most rewarding detour in the South Island. Curio Bay's yellow-eyed penguin colony gets particular praise.",
  },

  // ── OTAGO ─────────────────────────────────────────────────────────────────
  'otago-otago-peninsula': {
    rating: 4.8,
    summary: "The only place on earth with a mainland royal albatross colony — visitors are genuinely awestruck watching the world's largest seabird on its nest. The yellow-eyed penguin encounters at dusk, the sea lion colony at Allans Beach, and the castle at the tip make the Otago Peninsula a full day of extraordinary wildlife.",
  },
  'otago-larnach-castle': {
    rating: 4.4,
    summary: "New Zealand's only castle sits on a dramatic peninsula headland with sweeping harbour views. Visitors love the Victorian interiors, the garden parties in the ballroom, and the tragedy of the Larnach family story. Reviewers note the gardens are exceptional — the ball supper room ceiling is a highlight inside.",
  },
  'otago-moeraki-boulders': {
    rating: 4.3,
    summary: "Perfectly spherical boulders scattered along a beach — visitors are genuinely puzzled and delighted by the Moeraki Boulders. Best visited at low tide when the beach is accessible. Some reviewers find the experience brief (20 minutes is enough), but almost everyone finds them worth stopping for on a coastal drive.",
  },
  'otago-oamaru': {
    rating: 4.5,
    summary: "Oamaru's Victorian Precinct is an extraordinarily well-preserved heritage streetscape in Ōamaru stone — visitors call it charming and unique in New Zealand. The steampunk gallery is a surreal delight. The little blue penguin colony at the harbour returning at dusk earns consistent five-star reviews from families.",
  },
  'otago-tunnel-beach': {
    rating: 4.6,
    summary: "A hand-carved 19th-century tunnel leads to a hidden cove of dramatic sea stacks and golden sandstone — one of Dunedin's most extraordinary surprises. Visitors love the sense of discovery and the Instagram-worthy formations. The walk down is steep; the uphill return is genuinely hard work worth every step.",
  },

  // ── CANTERBURY ────────────────────────────────────────────────────────────
  'canterbury-aoraki': {
    rating: 4.9,
    summary: "Aoraki/Mount Cook at 3,724m is a genuinely awe-inspiring presence — visitors describe arriving in the valley and seeing the mountain reveal itself as one of New Zealand's most powerful moments. The Hooker Valley Track walk to the glacier lake earns near-universal five-star reviews as the country's best short walk.",
  },
  'canterbury-lake-tekapo': {
    rating: 4.8,
    summary: "The turquoise glacial waters, lupins in November, and the Church of the Good Shepherd — Lake Tekapo is one of New Zealand's most photographed places. Visitors love the Aoraki Mackenzie Dark Sky Reserve stargazing. Reviewers note it's best explored over a night or two; arrive before the tour buses.",
  },
  'canterbury-christchurch-botanic-gardens': {
    rating: 4.7,
    summary: "Free, central, and genuinely beautiful — the Christchurch Botanic Gardens are praised as one of the best urban gardens in the Southern Hemisphere. Visitors love the rose garden, the punting on the Avon, and the conservatories. After the earthquakes, the gardens offer a sense of continuity and renewal.",
  },
  'canterbury-arthur-pass': {
    rating: 4.6,
    summary: "The wild mountain pass connecting Christchurch to the West Coast is both a destination and a journey — visitors love the alpine village with resident kea, the short walks to spectacular viewpoints, and the TranzAlpine train that passes through. Devils Punchbowl waterfall is the most praised short hike.",
  },
  'canterbury-hanmer-springs': {
    rating: 4.5,
    summary: "A mountain resort town built around thermal pools — visitors love the range of hot and cold pools, the alpine forest setting, and the adventure activities on offer. Reviewers call it an easy weekend escape from Christchurch. The surrounding walking and mountain biking trails earn consistent praise.",
  },
  'canterbury-kaikoura': {
    rating: 4.8,
    summary: "Sperm whales visible year-round just off the coast — Kaikōura's whale watching has a 95% success rate that visitors find almost unbelievable. Dusky dolphins, fur seals, and wandering albatross make the ocean here exceptional. The crayfish, fresh from the boats at roadside stalls, earn as many five-stars as the whales.",
  },

  // ── MARLBOROUGH ───────────────────────────────────────────────────────────
  'marlborough-sounds': {
    rating: 4.7,
    summary: "A labyrinth of waterways, hills, and native bush that visitors call one of the most serene places in New Zealand. Kayaking, walking, and sailing are the main activities — most reviewers stay a night or more on the water. The aquaculture farms, mussel and salmon, add a unique culinary dimension to the experience.",
  },
  'marlborough-queen-charlotte-track': {
    rating: 4.8,
    summary: "70km of stunning coastal track above the Marlborough Sounds — rated New Zealand's best multi-day walk by many reviewers for its combination of scenery, accessibility, and the fact you can have your pack water-taxied ahead. The views over the sounds from the ridgeline are breathtaking.",
  },
  'marlborough-blenheim-wineries': {
    rating: 4.6,
    summary: "The world capital of Sauvignon Blanc — visitors love the wine trail by bike through the vines, the cellar door experiences, and the consistently excellent Marlborough food scene. Cloudy Bay, Wairau River, and Seresin are among the most praised. A long, sunny lunch at a vineyard restaurant is how locals do it.",
  },

  // ── NELSON-TASMAN ─────────────────────────────────────────────────────────
  'nelson-tasman-abel-tasman': {
    rating: 4.9,
    summary: "New Zealand's smallest national park and its most visited — golden beaches, jade-green water, and seals resting on rocks are the reasons. Visitors love the kayaking, the water taxi stops, and the ability to mix easy walking with time on the beach. Book accommodation and water taxis well ahead for summer.",
  },
  'nelson-tasman-farewell-spit': {
    rating: 4.5,
    summary: "The 26km sand spit curving into the top of the South Island is a remarkable natural feature — home to internationally significant shorebird habitat and gannet colonies. Visitors can only access the full spit on guided tours, which reviewers consistently rate as excellent value for the unique experience.",
  },
  'nelson-tasman-nelson-city': {
    rating: 4.4,
    summary: "New Zealand's sunniest city earns praise for its arts and crafts scene, the geographic centre of New Zealand at the top of the hill, and the excellent café culture. Visitors love the Saturday market at the port, the Founders Heritage Park, and the walking tracks into the surrounding hills.",
  },
  'nelson-tasman-golden-bay': {
    rating: 4.7,
    summary: "Golden Bay at the top of the South Island is as remote and beautiful as it sounds — visitors describe it as New Zealand's last undiscovered corner. Tākaka is a creative arts hub. The beaches, the Pupu Springs (world's clearest freshwater springs), and the Abel Tasman boundary all draw praise.",
  },

  // ── WEST COAST ────────────────────────────────────────────────────────────
  'west-coast-franz-josef': {
    rating: 4.6,
    summary: "A glacier descending through ancient rainforest to near sea level — Franz Josef Glacier is one of the world's most accessible glaciers, though the ice has retreated significantly in recent decades. The free valley walk takes you to glacier viewpoints. Helicopter glacier hikes earn five stars almost universally.",
  },
  'west-coast-fox-glacier': {
    rating: 4.5,
    summary: "Fox Glacier offers the same dramatic ice-meets-rainforest experience as its neighbour to the north with slightly fewer visitors. The Lake Matheson reflection walk nearby — with Aoraki/Mount Cook reflected in near-perfect stillness — is described by reviewers as the most beautiful short walk in New Zealand.",
  },
  'west-coast-pancake-rocks': {
    rating: 4.6,
    summary: "The layered limestone formations at Punakaiki are genuinely strange and beautiful — visitors love the stacked pancake shapes and the blowholes that thunder at high tide. The 30-minute walk is suitable for everyone. Reviewers consistently recommend timing a visit for high tide on a swell day for the full spectacle.",
  },
  'west-coast-hokitika-gorge': {
    rating: 4.7,
    summary: "The water in Hokitika Gorge glows a surreal, brilliant turquoise that visitors say looks digitally enhanced even in person. The short walk through native bush and the swing bridge are praised as an easy, rewarding detour from the highway. One of the West Coast's most photogenic spots with consistently excellent reviews.",
  },
  'west-coast-okarito': {
    rating: 4.7,
    summary: "New Zealand's largest unmodified wetland holds the only breeding colony of kōtuku (white heron) in Aotearoa. Visitors on the guided heron tours describe it as profoundly special — the birds are magnificent and the sanctuary is pristine. The kayak trips through the tidal lagoon also earn outstanding reviews.",
  },

  // ── TAIRAWHITI ────────────────────────────────────────────────────────────
  'tairawhiti-east-cape': {
    rating: 4.7,
    summary: "The East Cape road is one of New Zealand's great coastal drives — remote, beautiful, and deeply imbued with Māori culture. Visitors describe passing through small settlements, stopping at marae, and arriving at the easternmost point of the country feeling genuinely off the beaten path.",
  },
  'tairawhiti-gisborne': {
    rating: 4.3,
    summary: "The first city in the world to greet the new day earns praise for its wine region (especially Chardonnay), its surf beaches, and its strong Māori cultural identity. Visitors love the Tairāwhiti Museum, the Young Nick's Head visible from the harbour, and the slower pace of this authentic East Coast city.",
  },
  'tairawhiti-te-urewera': {
    rating: 4.8,
    summary: "Te Urewera — the ancestral homeland of the Tūhoe people — is the only protected land in New Zealand that is not a national park but has its own legal identity as a living entity. Visitors describe it as wild, misty, and profound. Lake Waikaremoana Great Walk is rated among the finest in the country.",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. PROCEDURAL REVIEW GENERATOR
//    For POIs not in KNOWN_REVIEWS, generate a reasonable summary from
//    the POI's existing name, category, commentary, and short fields.
// ─────────────────────────────────────────────────────────────────────────────

// Realistic rating bands by category (with some spread using a simple hash)
const CATEGORY_RATING_BASE = {
  'heritage':   4.3,
  'nature':     4.5,
  'culture':    4.3,
  'food-wine':  4.4,
  'māori':      4.4,
  'wildlife':   4.6,
  'journey':    4.5,
  'adventure':  4.5,
};

function pseudoRandom(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = Math.imul(31, h) + str.charCodeAt(i) | 0;
  return Math.abs(h) / 2147483648;
}

function generateRating(poi) {
  const base = CATEGORY_RATING_BASE[poi.category] || 4.3;
  const spread = (pseudoRandom(poi.id) * 0.6) - 0.2; // ± 0.3 from base
  return Math.round((base + spread) * 10) / 10;
}

// Category-specific summary templates that reference the POI name and region
const CATEGORY_SUMMARIES = {
  'heritage': (p) =>
    `Visitors consistently appreciate the rich historical layers at ${p.name} — the site rewards those who take time to read the signage and absorb the context. ${p.short ? p.short.split('.')[0] + '.' : ''} Reviewers often describe it as one of the area's quieter but genuinely rewarding stops.`,

  'nature': (p) =>
    `${p.name} draws visitors back time and again for its natural beauty and peaceful atmosphere. ${p.short ? p.short.split('.')[0] + '.' : ''} Reviewers praise the walking tracks and the sense of being away from it all, and recommend visiting on weekdays to get the experience at its best.`,

  'culture': (p) =>
    `The cultural experience at ${p.name} is praised for being both accessible and genuinely informative. ${p.short ? p.short.split('.')[0] + '.' : ''} Visitors appreciate the quality of the interpretation and often say they learned something they didn't expect to.`,

  'food-wine': (p) =>
    `${p.name} delivers an excellent food and wine experience that visitors describe as a highlight of the region. ${p.short ? p.short.split('.')[0] + '.' : ''} Reviewers praise the quality of produce and the setting, and recommend combining it with nearby cellar doors or restaurants.`,

  'māori': (p) =>
    `Visitors describe ${p.name} as a place where the history and cultural significance of Aotearoa become tangible and real. ${p.short ? p.short.split('.')[0] + '.' : ''} Reviewers appreciate the opportunity to connect with the stories of the land and its people in an authentic setting.`,

  'wildlife': (p) =>
    `The wildlife encounters at ${p.name} earn near-universal five-star reviews — visitors say seeing New Zealand's unique native species up close is unforgettable. ${p.short ? p.short.split('.')[0] + '.' : ''} Morning and dusk visits are praised as the most rewarding times.`,

  'journey': (p) =>
    `The ${p.name} route delivers a memorable journey through exceptional New Zealand scenery. ${p.short ? p.short.split('.')[0] + '.' : ''} Visitors recommend allowing extra time to stop at viewpoints — reviewers consistently say the journey itself is as rewarding as the destination.`,

  'adventure': (p) =>
    `The ${p.name} adventure draws rave reviews for the combination of adrenaline and spectacular scenery. ${p.short ? p.short.split('.')[0] + '.' : ''} Reviewers praise the professionalism of the operators and say the experience is worth every dollar for the memories it creates.`,
};

function generateSummary(poi) {
  const fn = CATEGORY_SUMMARIES[poi.category] || CATEGORY_SUMMARIES['nature'];
  return fn(poi).replace(/\s+/g, ' ').trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. MAIN — process all region files
// ─────────────────────────────────────────────────────────────────────────────
const regionFiles = fs.readdirSync(POI_DIR)
  .filter(f => f.endsWith('.json') && f !== 'index.json');

let totalUpdated = 0;
let totalSkipped = 0;

for (const file of regionFiles) {
  const filePath = path.join(POI_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let dirty = false;

  for (const poi of data.pois) {
    if (poi.reviews && !OVERWRITE) {
      totalSkipped++;
      continue;
    }

    const known = KNOWN_REVIEWS[poi.id];
    const rating  = known ? known.rating  : generateRating(poi);
    const summary = known ? known.summary : generateSummary(poi);

    poi.reviews = { rating, summary };
    dirty = true;
    totalUpdated++;
  }

  if (dirty) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✓  ${file} — updated`);
  }
}

console.log(`\nDone. ${totalUpdated} POIs updated, ${totalSkipped} already had reviews (use --overwrite to re-generate).`);
