// Generate the NZ Tourism App blueprint as a Word document
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  TabStopType, TabStopPosition, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, PageBreak, TableOfContents
} = require('docx');

// ---------- helpers ----------
const TITLE = (t) => new Paragraph({
  heading: HeadingLevel.TITLE,
  alignment: AlignmentType.LEFT,
  children: [new TextRun({ text: t, bold: true, size: 48, font: "Arial" })],
  spacing: { after: 120 }
});

const SUBTITLE = (t) => new Paragraph({
  alignment: AlignmentType.LEFT,
  children: [new TextRun({ text: t, italics: true, size: 24, font: "Arial", color: "555555" })],
  spacing: { after: 240 }
});

const H1 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text: t })]
});

const H2 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text: t })]
});

const H3 = (t) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text: t })]
});

const P = (t) => new Paragraph({
  children: [new TextRun({ text: t, size: 22, font: "Arial" })],
  spacing: { after: 120 }
});

// paragraph with mixed runs (bold + normal)
const PMIX = (runs) => new Paragraph({
  children: runs.map(r => new TextRun({ text: r.text, bold: !!r.bold, italics: !!r.italics, size: 22, font: "Arial" })),
  spacing: { after: 120 }
});

const BULLET = (t, level = 0) => new Paragraph({
  numbering: { reference: "bullets", level },
  children: [new TextRun({ text: t, size: 22, font: "Arial" })],
  spacing: { after: 60 }
});

const BULLET_MIX = (runs, level = 0) => new Paragraph({
  numbering: { reference: "bullets", level },
  children: runs.map(r => new TextRun({ text: r.text, bold: !!r.bold, italics: !!r.italics, size: 22, font: "Arial" })),
  spacing: { after: 60 }
});

const NUMBER = (t) => new Paragraph({
  numbering: { reference: "numbers", level: 0 },
  children: [new TextRun({ text: t, size: 22, font: "Arial" })],
  spacing: { after: 60 }
});

const SPACER = () => new Paragraph({ children: [new TextRun("")] });

// table helpers
const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };

const cell = (text, opts = {}) => new TableCell({
  borders,
  width: { size: opts.width, type: WidthType.DXA },
  shading: opts.header ? { fill: "1F4E79", type: ShadingType.CLEAR } : (opts.alt ? { fill: "F2F2F2", type: ShadingType.CLEAR } : undefined),
  margins: { top: 80, bottom: 80, left: 120, right: 120 },
  children: [new Paragraph({
    children: [new TextRun({
      text, size: 20, font: "Arial",
      bold: !!opts.header,
      color: opts.header ? "FFFFFF" : "000000"
    })]
  })]
});

const table = (columnWidths, rows) => new Table({
  width: { size: columnWidths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
  columnWidths,
  rows: rows.map((r, i) => new TableRow({
    children: r.map((c, j) => cell(c, {
      width: columnWidths[j],
      header: i === 0,
      alt: i > 0 && i % 2 === 0
    }))
  }))
});

// ---------- content ----------
const children = [];

children.push(TITLE("Qiwiosity"));
children.push(SUBTITLE("Stories Along the Way \u2014 an AI-powered, location-aware travel companion for New Zealand"));
children.push(PMIX([
  { text: "Author: ", bold: true }, { text: "Roydon    " },
  { text: "Date: ", bold: true }, { text: "April 2026    " },
  { text: "Status: ", bold: true }, { text: "Thinking document / v0.1" }
]));
children.push(SPACER());

// ===== 1. Vision =====
children.push(H1("1. Vision & concept"));
children.push(P("A smart travel companion that knows where you are in New Zealand and whispers the right story, suggestion, or booking into your ear at the right moment. Think of it as hiring a knowledgeable Kiwi local, a cultural guide, and a concierge — all packaged into a phone app that also works offline on a remote stretch of road."));
children.push(P("More than a guidebook: the app is the traveller's trip operating system. It holds their whole itinerary — flights, rental car, ferry, accommodation, tours, restaurants — and uses that context to be actually useful: never upselling a bed they've already booked, warning them they'll be late to check-in at the pace they're driving, nudging them out the door in time for the morning cruise."));
children.push(P("The core promise to the traveller:"));
children.push(BULLET("Show me where I am, what's special about it, and why it matters."));
children.push(BULLET("Tell me stories — Māori history, settler history, geology, film locations, local legends — in a voice that suits me."));
children.push(BULLET("Keep my whole trip straight — bookings, timings, check-ins, tickets — and warn me when something's about to go wrong."));
children.push(BULLET("Suggest the next great thing — but only for the gaps, never against what I've already booked."));
children.push(BULLET("Work when I'm out of range, because most of NZ is."));
children.push(SPACER());

children.push(H2("Positioning"));
children.push(P("Positioned between a guidebook (static, outdated, not personal), a booking site (transactional, location-agnostic), and a trip-organiser app like TripIt (good at holding data, bad at storytelling or real-time awareness). The differentiator is all three in one: contextual storytelling, intent-aware upsell that respects existing bookings, and a trip OS that runs the whole journey."));
children.push(SPACER());

children.push(H2("Target users"));
children.push(BULLET_MIX([{ text: "Independent international tourists", bold: true }, { text: " — campervan / rental car travellers doing the North + South Island loop (Australians, Americans, Germans, British, Chinese, Indian)." }]));
children.push(BULLET_MIX([{ text: "Cruise day-trippers", bold: true }, { text: " — short stops in Auckland, Tauranga, Wellington, Picton, Akaroa, Dunedin, Milford." }]));
children.push(BULLET_MIX([{ text: "Domestic roadtrippers", bold: true }, { text: " — NZ families doing weekend or school-holiday trips, rediscovering their own country." }]));
children.push(BULLET_MIX([{ text: "Premium travellers", bold: true }, { text: " — higher willingness to pay for private experiences, lodges, and unique access." }]));
children.push(SPACER());

// ===== 2. User journey =====
children.push(H1("2. The user journey"));
children.push(P("A walk-through of what a traveller actually experiences, from discovery to post-trip."));

children.push(H2("Before the trip"));
children.push(NUMBER("Downloads the app. Sees a beautiful teaser of NZ regions."));
children.push(NUMBER("Picks interests (history, hiking, food, film, Māori culture, adventure, wildlife, wine, kid-friendly)."));
children.push(NUMBER("Loads their trip — forwards booking emails to a trip@ address, connects Gmail/Outlook, imports calendar, or types bookings in manually. Flights, rental car, ferries, hotels, tours and restaurant reservations all land on a single timeline."));
children.push(NUMBER("App fills the gaps — shows free windows between bookings, suggests what to do, and plots the driving route between locked-in stops."));
children.push(NUMBER("Pre-downloads offline maps + audio for the whole route."));
children.push(SPACER());

children.push(H2("On the trip — the magic loop"));
children.push(NUMBER("User drives / walks / cruises. Phone is in their pocket or on the dash."));
children.push(NUMBER("App detects a meaningful location or geofence (a viewpoint, a town, a pā site, a trailhead, a film location)."));
children.push(NUMBER("A soft chime. Audio commentary plays at the length the user chose — anything from a 30-second headline to a 30-minute deep dive — mixing history, landscape, Māori context, and human stories."));
children.push(NUMBER("On long stretches with nothing nearby (Desert Road, Haast Pass, Lindis, Kaikōura coast), the app keeps talking — chaining regional history, geology, and stories so the silence never drags."));
children.push(NUMBER("At the natural end, a soft upsell: \"There's a short walk down to the rock pools 400m ahead — want directions?\" or \"The café in this village does NZ's best whitebait fritters — pin it?\""));
children.push(NUMBER("Itinerary-aware nudges: \"Your Interislander ferry boards in 90 minutes — at this pace you'll make it with 15 to spare\" or \"Your lodge check-in closes at 6pm; you'll be 40 minutes late — want me to let them know?\""));
children.push(NUMBER("Gap-filling upsell: \"You've got 2 hours of daylight and no bed booked tonight\" — but only on the nights the user actually has no booking. Never upsells beds, tours, or restaurants that are already on the plan."));
children.push(SPACER());

children.push(H2("After the trip"));
children.push(BULLET("Auto-generated travel journal with photos, the audio snippets they heard, and the places they stopped."));
children.push(BULLET("Shareable map + highlights reel."));
children.push(BULLET("Hooks for re-engagement: \"Come back for the South Island next time.\""));
children.push(SPACER());

// ===== 3. Core features =====
children.push(H1("3. Core tourist features"));

children.push(H2("3.1 Location-aware audio commentary"));
children.push(P("The headline feature. Geofenced triggers deliver well-written audio at the right moment — with the traveller, not the app, deciding how much detail they want."));
children.push(BULLET_MIX([{ text: "Trigger types: ", bold: true }, { text: "GPS proximity, approaching a named place, entering a region, pulling over and stopping, arriving at a saved POI, or continuously on a long drive with nothing else around." }]));
children.push(BULLET_MIX([{ text: "Tone: ", bold: true }, { text: "pick a \"voice\" — friendly Kiwi local, cultural storyteller (reo Māori accents and terms), nature docuphile (Attenborough-style), kid-friendly narrator, adventure junkie, academic historian." }]));
children.push(BULLET_MIX([{ text: "Don't interrupt: ", bold: true }, { text: "respect \"do not disturb\" states (phone call, another app playing, night driving)." }]));
children.push(SPACER());

children.push(H3("Length as a first-class setting"));
children.push(P("Different travellers, different journeys, different moods. The app lets the user pick a length preference globally, and override it per stop. A retired couple on a leisurely South Island loop wants the full story; a family with bored kids in the back wants 90 seconds and a joke. The same POI has multiple takes recorded."));

children.push(table(
  [1800, 1600, 2400, 3560],
  [
    ["Mode", "Typical length", "Best for", "Example at Lake Tekapō"],
    ["Headline", "30–60 seconds", "Drive-bys, kid-friendly, \"just the gist\"", "\"That blue is from glacial rock flour. The church you passed is one of the most photographed buildings in NZ. Keep going — better views coming.\""],
    ["Standard", "2–4 minutes", "Most viewpoints, short stops", "Adds how the lake was formed, the Mackenzie Basin's farming story, and the dark-sky reserve."],
    ["Long-form", "10–20 minutes", "Town tours, themed walks, scenic stops where you'll sit a while", "A full podcast-style segment with multiple voices, historic recordings, and Māori place-name stories."],
    ["Deep dive", "30–60+ minutes", "Long drives, rainy hotel evenings, flights, ferry crossings", "A documentary-length history of the Mackenzie Basin — Ngāi Tahu before settlement, the high-country runs, the 1950s hydro schemes, modern tourism debates."]
  ]
));
children.push(SPACER());

children.push(H3("Long journeys — keep talking"));
children.push(P("Some drives are 3+ hours with barely a signpost. The audio experience has to hold up. Techniques:"));
children.push(BULLET_MIX([{ text: "Continuous mode. ", bold: true }, { text: "On roads like the Desert Road, Haast Pass, or Lindis Pass the app queues chained content — region-level history, geology, flora/fauna, stories of the people — so there's always something playing until the next POI-specific trigger fires." }]));
children.push(BULLET_MIX([{ text: "Themed long-drive \"episodes\". ", bold: true }, { text: "Pre-made, podcast-style 30–90 minute programmes matched to specific routes: \"The story of the West Coast,\" \"Fiordland: how a landscape was carved,\" \"The Māori navigators and the shaping of Aotearoa,\" \"Sheep, wool and the making of modern NZ.\" User can browse and play like Spotify playlists." }]));
children.push(BULLET_MIX([{ text: "Chapterised content. ", bold: true }, { text: "Long pieces are broken into chapters with clean resume points, so a pit-stop doesn't mean re-hearing the intro." }]));
children.push(BULLET_MIX([{ text: "\"Tell me more\" on demand. ", bold: true }, { text: "At the end of any segment the user can say or tap \"tell me more\" and the app pulls a deeper layer — same topic, longer, more detail. Repeat until satisfied." }]));
children.push(BULLET_MIX([{ text: "Passenger mode vs driver mode. ", bold: true }, { text: "If a passenger is holding the phone, show visuals (photos, maps, archival images) alongside the audio. If in-car via CarPlay, audio-only with richer narration." }]));
children.push(BULLET_MIX([{ text: "Smart queuing. ", bold: true }, { text: "Given current location + destination + remaining drive time + interests + what's already been heard, the app builds a playlist that \"lands\" at the destination. Like GPS-aware podcast DJ." }]));
children.push(SPACER());

children.push(H3("Content depth tiers"));
children.push(P("Every major region carries content at multiple depths, stacked like Wikipedia levels:"));
children.push(BULLET_MIX([{ text: "Tier 1 — The hook. ", bold: true }, { text: "Why this place matters in one line. Always free." }]));
children.push(BULLET_MIX([{ text: "Tier 2 — Standard tour. ", bold: true }, { text: "The things every visitor should know. Free or in Pro." }]));
children.push(BULLET_MIX([{ text: "Tier 3 — Historical deep dive. ", bold: true }, { text: "Long-form regional history, pre-colonial and post-colonial, oral histories, archive recordings. Pro or paid content pack." }]));
children.push(BULLET_MIX([{ text: "Tier 4 — Specialist tracks. ", bold: true }, { text: "Geology, botany, film, wine, military, Māori astronomy, specific iwi histories. Niche but high-value for the right traveller." }]));
children.push(SPACER());

children.push(H2("3.2 Guided routes"));
children.push(BULLET("Pre-built iconic routes (Twin Coast, Thermal Explorer, Classic NZ, Milford Road, Great Taste Trail, Forgotten World Highway, Southern Scenic Route)."));
children.push(BULLET("Theme routes (Lord of the Rings locations, WWI memorials, craft-beer trail, Māori heritage trail, geothermal trail)."));
children.push(BULLET("\"Build me a route\" — AI generator that takes start, end, days, interests, and stitches an itinerary with stops, estimated drive times, and bed suggestions."));
children.push(BULLET("Multi-day handoff — the route knows where you slept and where you're heading next."));
children.push(SPACER());

children.push(H2("3.3 Offline-first maps and content"));
children.push(P("Large parts of NZ (Fiordland, West Coast, East Cape, Tongariro) have no cell coverage. Offline is not optional."));
children.push(BULLET("Download by region or by route. Maps + audio + essential POIs bundled."));
children.push(BULLET("GPS works without signal — no nasty surprises."));
children.push(BULLET("Audio cached locally; cloud-only for fresh recommendations and bookings."));
children.push(SPACER());

children.push(H2("3.4 Rich POI layer"));
children.push(BULLET("Natural: viewpoints, beaches, waterfalls, hot pools, walking tracks (DOC Great Walks and short walks)."));
children.push(BULLET("Cultural: marae (only where public visits are welcomed and respected), pā sites, museums, galleries, memorials."));
children.push(BULLET("Practical: i-SITE visitor centres, petrol, EV chargers, public toilets, dump stations, supermarkets."));
children.push(BULLET("Experiences: bookable activities (bungy, scenic flight, jet boat, wine tour, glowworm caves, marine wildlife)."));
children.push(BULLET("Food & drink: cafés, bakeries, fish and chips, vineyards, breweries, seasonal picks (whitebait, cherries, crayfish)."));
children.push(SPACER());

children.push(H2("3.5 Cultural depth"));
children.push(P("NZ's identity is inseparable from te ao Māori. The app treats Māori history, place names, and stories as first-class content alongside settler history, geology, and natural history — researched well, written respectfully, voiced clearly."));
children.push(BULLET("Place names in te reo Māori with audio pronunciation by native speakers."));
children.push(BULLET("Māori history and oral-tradition stories woven through the regional content — pre-colonial, colonial-era, and contemporary."));
children.push(BULLET("Visitor guidance where relevant — tapu sites, photography restrictions, and appropriate behaviour at specific places, so travellers know how to be respectful."));
children.push(SPACER());

children.push(H2("3.6 Practical traveller tools"));
children.push(BULLET("Driving time honesty (Google says 2h, it's actually 3.5h on NZ roads)."));
children.push(BULLET("Weather / avalanche / alpine alerts and DOC closures."));
children.push(BULLET("Road condition alerts (slips, closures — NZTA data)."));
children.push(BULLET("Tide times for beach walks and crossings (e.g., Wharariki, Cathedral Cove access)."));
children.push(BULLET("Sunrise / sunset / golden hour for photography POIs."));
children.push(BULLET("Currency, tipping culture, emergency numbers (111), basic phrases in te reo."));
children.push(SPACER());

children.push(H2("3.7 Personalisation and memory"));
children.push(BULLET("Profile with interests, pace, budget, mobility."));
children.push(BULLET("Learns from thumbs-up / skip / replay signals."));
children.push(BULLET("Remembers what you've already seen/heard — doesn't repeat the same story at the same lookout."));
children.push(BULLET("Travel journal auto-built from GPS trail + saved moments + photos."));
children.push(SPACER());

children.push(H2("3.8 Trip OS — itinerary & logistics management"));
children.push(P("The traveller's entire New Zealand trip runs through the app. This is what lifts it from \"nice audio guide\" to \"the one app you open every day of the holiday.\" It also makes every other feature smarter — upsell, routing, audio pacing — because the app knows what's actually on the plan."));

children.push(H3("What the trip object holds"));
children.push(BULLET("Flights (arrival + any internal NZ hops), with live flight status."));
children.push(BULLET("Rental car or campervan — pickup / dropoff location and time."));
children.push(BULLET("Ferries — Interislander / Bluebridge, Stewart Island, Waiheke, etc."));
children.push(BULLET("Accommodation — name, address, check-in window, check-out time, confirmation number."));
children.push(BULLET("Booked experiences and tours — meeting point, start time, duration, what to bring."));
children.push(BULLET("Restaurant reservations."));
children.push(BULLET("Trains (Northern Explorer, Coastal Pacific, TranzAlpine) and buses."));
children.push(BULLET("Free windows — anything that isn't yet booked."));
children.push(SPACER());

children.push(H3("How the data gets in"));
children.push(BULLET_MIX([{ text: "Forward-to-email. ", bold: true }, { text: "trip@aotearoaguide.app. User forwards Booking.com, Airbnb, Expedia, airline, tour confirmations. The app parses and files them. (TripIt model — proven, low-friction.)" }]));
children.push(BULLET_MIX([{ text: "Inbox scan. ", bold: true }, { text: "Optional Gmail / Outlook / iCloud Mail connection that auto-detects travel emails. Read-only. Clear consent flow." }]));
children.push(BULLET_MIX([{ text: "Calendar import. ", bold: true }, { text: "ICS feed or direct Google/Apple Calendar sync for users who already keep their itinerary there." }]));
children.push(BULLET_MIX([{ text: "Direct partner connections. ", bold: true }, { text: "OAuth into Booking.com, Airbnb, Expedia accounts to pull bookings directly (where APIs permit)." }]));
children.push(BULLET_MIX([{ text: "Manual entry. ", bold: true }, { text: "A clean form and a \"scan a confirmation\" camera mode using OCR + LLM parsing for paper or PDF confirmations." }]));
children.push(BULLET_MIX([{ text: "Bookings made in the app. ", bold: true }, { text: "Anything booked via the app's upsell flow is auto-added to the itinerary. Closes the loop." }]));
children.push(SPACER());

children.push(H3("What the app does with it"));
children.push(BULLET_MIX([{ text: "Respect existing bookings. ", bold: true }, { text: "If the user has a bed tonight, never surface an accommodation upsell for tonight. Same for tours, restaurants, and transport. This is a hard rule — the fastest way to lose trust is to push a traveller to book something they already have." }]));
children.push(BULLET_MIX([{ text: "Fill only the gaps. ", bold: true }, { text: "Look at the itinerary, find unbooked nights and empty day-slots, and suggest for those specifically: \"You've got Thursday night unbooked between Wānaka and Te Anau — here are three options near your route.\"" }]));
children.push(BULLET_MIX([{ text: "Live ETA vs commitments. ", bold: true }, { text: "Continuously compares the user's position and driving speed against their next booking. Alerts early enough to matter: \"You'll arrive at the lodge after reception closes — call them, or want me to request a late check-in?\"" }]));
children.push(BULLET_MIX([{ text: "Morning briefing. ", bold: true }, { text: "Each morning: today's plan, weather on the route, drive times, check-in / tour times, last moment to leave to make the next commitment, and the one or two best things to squeeze in along the way." }]));
children.push(BULLET_MIX([{ text: "End-of-day wrap. ", bold: true }, { text: "Confirms tomorrow's plan, asks if anything's changed, pre-downloads offline content for tomorrow's route." }]));
children.push(BULLET_MIX([{ text: "Re-plan on the fly. ", bold: true }, { text: "Road closed, weather's turned, kids had enough, loved a place and want to stay an extra night — the app re-flows the rest of the trip, flags what needs rebooking, and helps do it." }]));
children.push(BULLET_MIX([{ text: "Documents and tickets in one place. ", bold: true }, { text: "Boarding passes, car rental voucher, tour tickets, confirmation numbers — stored offline, surfaced at the right time (e.g. ferry QR code appears 30 min before boarding)." }]));
children.push(BULLET_MIX([{ text: "Shared trip view. ", bold: true }, { text: "Travel companions can see and edit the same itinerary. Parent-booked, kid-viewable. No \"wait, where are we staying tonight?\" fights." }]));
children.push(BULLET_MIX([{ text: "Emergency handoff. ", bold: true }, { text: "If things go wrong (missed ferry, accident, medical), one tap shows all upcoming commitments, contact numbers, insurance details." }]));
children.push(SPACER());

children.push(H3("Why this matters strategically"));
children.push(P("Once the traveller has loaded their whole trip, the switching cost to another app is huge. It becomes the home screen of their holiday. It also massively improves the quality of every other feature — upsell is surgical, audio pacing is itinerary-aware, personalisation compounds. And the data (with consent) is gold for partner tourism operators who currently have no visibility into the traveller's full journey."));
children.push(SPACER());

// ===== 4. Monetisation =====
children.push(H1("4. Monetisation & upsell model"));
children.push(P("Multiple revenue streams, layered so that no single one has to be huge. The experience has to feel like help, not ads — if upsell feels pushy, retention dies."));

children.push(H2("4.1 Revenue streams"));

children.push(table(
  [2600, 3200, 3560],
  [
    ["Stream", "How it works", "Notes"],
    ["Freemium subscription", "Free tier (limited regions, ads-lite); Pro tier (~NZD 9.99/trip or $19.99/month)", "Biggest recurring line. Pro unlocks offline, all regions, premium voices, journal export."],
    ["Experience commissions", "Bookings of activities (jet boat, scenic flight, tours, guided walks) with operator affiliate deals", "15–25% commission typical. Rezdy, Bokun, Viator, GetYourGuide, Bookme aggregators."],
    ["Accommodation commissions", "Last-minute beds — holiday parks, motels, lodges, BnBs, glamping", "8–15% via Booking.com, Expedia, direct hotel deals. Last-minute has highest intent."],
    ["Food & drink partnerships", "Featured cafés, wineries, breweries, restaurants; sponsored \"local picks\"", "Clearly labelled. Flat listing fees + booking commission (OpenTable, Resy, Dine)."],
    ["Transport upsells", "Campervan add-ons, shuttle bookings, ferry upgrades (Interislander/Bluebridge), ski lift passes", "Seasonal but high-ticket."],
    ["Premium content packs", "One-off purchases — e.g., \"LOTR deep-dive pack\", \"Wine country audio tour\", \"Kids' adventure pack\"", "Cheap impulse buys (NZD 2.99–7.99) with high margin."],
    ["Long-form audio / audiobook tier", "Deep-dive regional histories, documentary-length episodes, specialist series", "Podcast/audiobook-style. Sold standalone or bundled into Pro+. Can be co-produced with museums, universities, or local historians — credibility + content."],
    ["B2B / white-label", "Licence to tourism boards (RTOs), rental car companies, cruise lines, hotels", "Long sales cycle but sticky. Co-branded versions for partners."],
    ["Data & insights (carefully)", "Aggregated, anonymised movement data sold to RTOs, DOC, MBIE for planning", "Only with explicit consent. Never individual-level."]
  ]
));
children.push(SPACER());

children.push(H2("4.2 Upsell mechanics"));
children.push(P("The art is blending monetisation into the storytelling. Rules of thumb:"));
children.push(BULLET_MIX([{ text: "Never upsell against a held booking. ", bold: true }, { text: "Hard rule. The itinerary is the source of truth — if they have a bed, tour, or table on the plan, the app does not surface alternatives for that slot. It only sells into gaps. This is non-negotiable for trust." }]));
children.push(BULLET_MIX([{ text: "Trigger at peak intent. ", bold: true }, { text: "Accommodation prompts after 4pm on nights without a booking, not at 10am or for a night that's already sorted. Activity prompts when entering the town, not 200km away." }]));
children.push(BULLET_MIX([{ text: "One suggestion at a time. ", bold: true }, { text: "Never show five motels — show the best one for this user with a \"see alternatives\" tap." }]));
children.push(BULLET_MIX([{ text: "Label what's sponsored. ", bold: true }, { text: "Trust is the product. Mix sponsored picks with genuine editorial picks." }]));
children.push(BULLET_MIX([{ text: "Offer bundles. ", bold: true }, { text: "\"Milford day pass\" = cruise + lunch + audio guide. Higher AOV, simpler decision." }]));
children.push(BULLET_MIX([{ text: "Last-minute advantage. ", bold: true }, { text: "Partner deals for same-night beds or same-day experience slots — wins for traveller and operator." }]));
children.push(BULLET_MIX([{ text: "Complement, don't compete. ", bold: true }, { text: "If the user booked a lodge independently, upsell the restaurant, the massage, the sunset cruise — things that add to the stay, not replace it." }]));
children.push(SPACER());

children.push(H2("4.3 Unit economics — rough mental model"));
children.push(P("Back-of-envelope per active user on a 14-day NZ trip:"));
children.push(BULLET("Pro subscription: NZD 15 average"));
children.push(BULLET("~2 experiences booked × NZD 180 avg × 20% commission = NZD 72"));
children.push(BULLET("~3 nights booked × NZD 200 × 10% = NZD 60"));
children.push(BULLET("~1 food/wine booking × NZD 120 × 8% = NZD 10"));
children.push(BULLET_MIX([{ text: "ARPU per trip: NZD ~150–170. ", bold: true }, { text: "With 50k paying trips a year, that's ~NZD 7–8M gross revenue. A useful number for thinking about scale, not a promise." }]));
children.push(SPACER());

// ===== 5. Tech & architecture =====
children.push(H1("5. Tech & architecture"));

children.push(H2("5.1 Platforms"));
children.push(BULLET_MIX([{ text: "iOS + Android native ", bold: true }, { text: "using React Native or Flutter for shared codebase, with native modules for GPS, background audio, geofencing, Bluetooth-to-car." }]));
children.push(BULLET_MIX([{ text: "CarPlay and Android Auto ", bold: true }, { text: "— absolutely critical for the driving use case." }]));
children.push(BULLET_MIX([{ text: "Web companion ", bold: true }, { text: "for trip planning / post-trip journal viewing / sharing. Not the main experience." }]));
children.push(SPACER());

children.push(H2("5.2 Suggested stack"));

children.push(table(
  [2600, 6760],
  [
    ["Layer", "Choice & rationale"],
    ["Mobile client", "React Native (Expo for prototyping, bare for production) OR Flutter. Both fine — pick based on dev talent."],
    ["Maps & routing", "Mapbox (better offline + custom styling than Google Maps) + OpenStreetMap as base. Google Maps only if specific POI coverage needed."],
    ["Geofencing / location", "Native iOS Core Location + Android FusedLocationProvider. Battery-optimised — significant location changes, not continuous polling."],
    ["Audio playback", "Native audio with background playback entitlements; AVAudioSession on iOS, ExoPlayer on Android."],
    ["Offline content", "SQLite for POIs/metadata, MBTiles/PMTiles for map tiles, MP3/AAC for audio — all packaged in downloadable region bundles."],
    ["Backend", "Node.js or Go on AWS/GCP. Serverless (Lambda/Cloud Functions) for most endpoints; Postgres + PostGIS for spatial queries."],
    ["AI / LLM layer", "Claude or GPT-4-class model for content generation, itinerary planning, Q&A. Use retrieval-augmented generation over a curated content base — don't let it hallucinate history."],
    ["TTS / voices", "ElevenLabs or Azure Neural TTS for scalable voices; hire real voice actors for hero content, including a native te reo Māori speaker for place-name pronunciation."],
    ["Recommendations", "Hybrid — rules + collaborative filtering + LLM reasoning. Start with rules; add ML when you have data."],
    ["Analytics", "Mixpanel or Amplitude for product analytics; Segment for routing events to partners."],
    ["Payments", "Stripe for subscriptions and one-off purchases. Apple/Google in-app purchase for subs (mandatory)."],
    ["Booking integrations", "Bokun, Rezdy, Viator, GetYourGuide, Booking.com, Expedia, OpenTable."],
    ["Itinerary ingestion", "Dedicated email inbox (trip@) + parser service. LLM-based extraction from booking emails, PDFs and screenshots. Gmail / Outlook / iCloud OAuth for auto-scan. ICS calendar import. Flight status via FlightAware or AviationStack. Vendor-specific connectors (Booking.com Partner API, Airbnb where possible)."]
  ]
));
children.push(SPACER());

children.push(H2("5.3 High-level architecture"));
children.push(P("Three layers, loosely coupled:"));
children.push(BULLET_MIX([{ text: "Client (mobile app). ", bold: true }, { text: "Handles GPS, geofencing, audio playback, offline cache, UI, and communicates with backend over REST/GraphQL when online." }]));
children.push(BULLET_MIX([{ text: "Backend services. ", bold: true }, { text: "Content API (POIs, stories, media), User API (profile, journal, subscriptions), Recs API (what to surface next), Booking API (partner aggregator calls), Payments." }]));
children.push(BULLET_MIX([{ text: "Content platform (CMS). ", bold: true }, { text: "Where editors, writers, and voice actors upload and approve content. Strong editorial workflow + localisation + versioning. This is where a lot of the real work sits." }]));
children.push(SPACER());

children.push(H2("5.4 Geofencing and \"the right moment\""));
children.push(P("The trickiest engineering problem is triggering the right audio at the right time without draining the battery or annoying the user."));
children.push(BULLET("Use sparse GPS sampling + significant-change APIs when idle, tighten sampling when inside a route corridor."));
children.push(BULLET("Pre-load the nearest ~50 geofences into the OS geofencing service — iOS limits to 20, Android to 100 active, so rotate based on movement."));
children.push(BULLET("Speed-aware: if moving at 100 km/h, use wider trigger radii and shorter audio segments; if stopped or walking, tighter radii and richer content."));
children.push(BULLET("Prioritise: if two POIs overlap, pick the one matching the user's interests and not-yet-heard."));
children.push(BULLET("Fail gracefully offline — all of this must work without a network call."));
children.push(SPACER());

children.push(H2("5.5 AI commentary — generation vs curation"));
children.push(P("Important distinction. Three possible modes:"));
children.push(BULLET_MIX([{ text: "Fully curated (editorial). ", bold: true }, { text: "Every audio piece written by a human, voiced by a human, editor-reviewed. Highest quality, most expensive, slowest to scale." }]));
children.push(BULLET_MIX([{ text: "AI-generated, human-reviewed. ", bold: true }, { text: "LLM drafts from a curated knowledge base, editor reviews and approves, TTS voices. Middle ground — scales well, quality manageable." }]));
children.push(BULLET_MIX([{ text: "Fully AI live. ", bold: true }, { text: "LLM generates on the fly. Dangerous for history and te ao Māori — hallucinations are brand-killing." }]));
children.push(P("Recommendation: hero content curated; long-tail content AI-drafted + reviewed; live AI only for Q&A (\"Why is the water this colour?\") with strong guardrails."));
children.push(P("Long-form (30–60 min) content is produced more like a podcast — scripted by a historian or subject expert, edited for tone and accuracy, voiced by a real narrator. AI helps with research, first-draft scripting, and generating shorter edits from the master recording, but the hero long-form is human-crafted. A sensible production target is one flagship long-form piece per major region for launch, then expand."));
children.push(SPACER());

children.push(H2("5.6 Data & content sources"));
children.push(BULLET("DOC (Department of Conservation) — tracks, huts, campsites, closures."));
children.push(BULLET("NZTA / Waka Kotahi — road conditions, travel times."));
children.push(BULLET("LINZ — authoritative geographic data, place names (including dual names)."));
children.push(BULLET("Te Ara, NZ History Online, and Ministry for Culture and Heritage public archives — Māori history and wider NZ history."));
children.push(BULLET("MetService — weather."));
children.push(BULLET("Wikipedia + Te Ara (NZ encyclopedia) + NZ History Online — background research, not user-facing."));
children.push(BULLET("Tourism New Zealand, RTOs — imagery, some content, partnership channels."));
children.push(BULLET("GBIF / iNaturalist — flora and fauna."));
children.push(BULLET("Partner APIs — Bokun, Rezdy, Booking.com, etc. for bookable inventory."));
children.push(SPACER());

// ===== 6. Phases =====
children.push(H1("6. Phased roadmap"));

children.push(H2("Phase 0 — validate (1–2 months)"));
children.push(BULLET("10-stop audio tour of a single iconic drive (e.g., Queenstown–Milford or Auckland–Bay of Islands)."));
children.push(BULLET("Web + simple mobile prototype; no geofencing yet, just GPS-triggered playback."));
children.push(BULLET("Hand it to 30 real travellers. Watch them use it. Do they finish? Do they skip? What do they ask?"));
children.push(SPACER());

children.push(H2("Phase 1 — MVP (3–6 months)"));
children.push(BULLET("One region done properly (South Island loop or Bay of Islands + Auckland)."));
children.push(BULLET("Offline maps + 50–100 POIs with curated audio."));
children.push(BULLET("Route builder (rules-based, not ML)."));
children.push(BULLET("Itinerary basics — manual entry + email forwarding parser for the top 5 booking sources (Booking.com, Airbnb, Expedia, a major airline, a tour aggregator). Timeline view, ETA-vs-check-in alerts."));
children.push(BULLET("Subscription paywall + 1–2 booking partners (one experience API, one accommodation API). Upsell strictly into unbooked gaps."));
children.push(BULLET("iOS first, Android fast-follow."));
children.push(BULLET("Measure: session length, audio completion rate, conversion to paid, booking take-rate, itinerary-load rate."));
children.push(SPACER());

children.push(H2("Phase 2 — scale content & trip OS (6–12 months)"));
children.push(BULLET("Full country coverage, 500+ POIs."));
children.push(BULLET("CarPlay / Android Auto."));
children.push(BULLET("AI-drafted content workflow with editorial review."));
children.push(BULLET("Full trip OS — inbox scan, calendar sync, direct OAuth to Booking.com/Airbnb, morning briefings, live flight status, shared trips, document vault."));
children.push(BULLET("Expanded partnerships — 10+ experience APIs, major accommodation aggregators."));
children.push(BULLET("Personalisation (interests, pace, budget) live."));
children.push(BULLET("Multilingual content — start with English, then simplified Chinese, German, Japanese, Spanish."));
children.push(SPACER());

children.push(H2("Phase 3 — ecosystem (12–24 months)"));
children.push(BULLET("B2B / white-label for rental car and cruise partners."));
children.push(BULLET("Deeper AI — live Q&A, on-the-fly trip re-planning, predictive suggestions (\"rain tomorrow, want me to swap the hike for the museum?\")."));
children.push(BULLET("Loyalty / repeat-traveller mechanics."));
children.push(BULLET("Cross-border expansion (Australia, Pacific) or deepen within NZ — your call."));
children.push(SPACER());

// ===== 7. Risks =====
children.push(H1("7. Risks, unknowns, and things to get right"));

children.push(H2("Content quality and accuracy"));
children.push(P("Tourism content lives or dies on accuracy. Get a date wrong, mispronounce a place name, or repeat a tired tourist myth and trust evaporates. Invest in good research sources (Te Ara, NZ History Online, regional museums), human editing, and a clear correction process when readers flag mistakes."));

children.push(H2("Content cost"));
children.push(P("Curated audio is expensive to produce well (writers, voice actors, editors, rights clearance). Model the unit cost per POI (~NZD 400–1,200 for hero content) and build tooling to get AI-assisted drafting cheap and fast without losing quality."));

children.push(H2("Battery and reliability"));
children.push(P("GPS-heavy apps kill phone batteries. If a traveller's phone dies because of your app, they'll never open it again. Engineering excellence in background location is a moat."));

children.push(H2("Seasonality"));
children.push(P("NZ tourism is peaky — Dec–Mar is the boom, May–Aug is quiet. Revenue is lumpy. Plan for it; don't panic-hire in summer."));

children.push(H2("Competitive landscape"));
children.push(BULLET("GuideAlong, Shaka Guide, VoiceMap — international audio tour apps. None are NZ-native."));
children.push(BULLET("CamperMate, Rankers — NZ-specific but utility-focused, not storytelling."));
children.push(BULLET("Google Maps + Tripadvisor — the default, but generic."));
children.push(BULLET("Your edge: NZ-native, culturally rooted, storytelling-first, context-aware upsell."));
children.push(SPACER());

children.push(H2("Legal / privacy"));
children.push(BULLET("Location data is sensitive — NZ Privacy Act 2020 + GDPR for international travellers. Consent flows matter."));
children.push(BULLET("Partner booking T&Cs (cancellations, refunds) — you're the face of the booking; set customer expectations clearly."));
children.push(BULLET("Content licensing — photos, music, facts — keep a clean rights log."));
children.push(SPACER());

// ===== 8. Open questions =====
children.push(H1("8. Open questions to answer next"));
children.push(NUMBER("Which region do we prototype first? (Strong case for Queenstown–Milford — high-intent, concentrated, iconic.)"));
children.push(NUMBER("Solo build or co-founder / small team? Who owns content, engineering, partnerships?"));
children.push(NUMBER("Bootstrap or raise? Tourism tech in NZ is a thin market for VCs; angel + grants (Callaghan, TNZ) may be the path."));
children.push(NUMBER("White-label first or consumer first? White-label (e.g., sold to a rental-car co) could fund the consumer play."));
children.push(NUMBER("Pricing experimentation — per-trip vs monthly vs freemium? All defensible, test early."));
children.push(SPACER());

// ===== 9. Path to build =====
children.push(H1("9. Path to build — summary"));
children.push(P("This is being built as a bootstrapped side project. Roydon leads product, content strategy, commercial, and partnerships. Claude (via Cowork) is the technical co-builder — writes the app and backend code, drafts POI content, builds tooling, and handles most of the engineering grind. Detailed week-by-week plan lives in the companion document Qiwiosity_Execution_Plan.docx."));
children.push(H2("Core principles"));
children.push(BULLET_MIX([{ text: "Prove it with drives you can do daily before building a platform. ", bold: true }, { text: "Start in Hawke's Bay (the founder's home base) \u2014 Napier / Hastings local loops after work, then Napier\u2013Taup\u014d\u2013Rotorua, Napier\u2013National Park, and Napier\u2013Palmerston North on weekends. Same-week iteration beats monthly field trips. Queenstown\u2013Milford is the Stage C showcase, not the Stage A prototype." }]));
children.push(BULLET_MIX([{ text: "Cash discipline. ", bold: true }, { text: "Spend under NZD 2\u20133k until there's clear user signal. Free-tier cloud services, AI-drafted content, TTS voices for everything that isn't a hero long-form piece." }]));
children.push(BULLET_MIX([{ text: "Boring tech choices. ", bold: true }, { text: "React Native + Mapbox + Supabase/Postgres + Stripe. Proven, well-documented, fast to build with." }]));
children.push(BULLET_MIX([{ text: "Ship vertically, not horizontally. ", bold: true }, { text: "End-to-end thin slice first (one route, one feature, one paying user) before breadth." }]));
children.push(BULLET_MIX([{ text: "Side-project pace, honestly modelled. ", bold: true }, { text: "Assume 10\u201315 focused hours a week. MVP in ~6 months is realistic; anything faster requires full-time." }]));
children.push(SPACER());
children.push(H2("Three-stage shape"));
children.push(BULLET_MIX([{ text: "Stage A (weeks 1\u20138): ", bold: true }, { text: "Validate. Hawke's Bay base, 20+ audio stops across local loops and the Napier\u2013Taup\u014d\u2013Rotorua drive, simple mobile prototype, 30 user tests." }]));
children.push(BULLET_MIX([{ text: "Stage B (months 3\u20138): ", bold: true }, { text: "MVP. Central + eastern North Island covered (Hawke's Bay, Taup\u014d, Rotorua, Tongariro, Manawat\u016b), offline, paywall, one booking partner, itinerary basics, App Store launch." }]));
children.push(BULLET_MIX([{ text: "Stage C (months 8\u201318): ", bold: true }, { text: "Scale. National coverage including the Queenstown\u2013Milford showcase route, CarPlay, full trip OS, more partners, consider first outside investment or a B2B pilot." }]));
children.push(SPACER());

// ===== 10. Summary =====
children.push(H1("10. One-paragraph summary"));
children.push(P("Qiwiosity is an offline-first, location-aware trip operating system for New Zealand. It blends well-researched storytelling, end-to-end itinerary management, and context-aware upsell that only sells into unbooked gaps. It earns through subscriptions, experience and accommodation commissions, long-form audio content, and partner integrations. It differentiates through engineering quality around offline GPS + geofencing, editorial + AI-blended content at multiple depths, depth and accuracy of NZ-specific storytelling (history, geology, Māori place-names and oral tradition, film locations, food and wine), and a trip-OS layer that makes it the one app a traveller opens every day. MVP is a single region done beautifully with the basic itinerary layer; the scale path is national coverage, CarPlay-native driving UX, full trip-OS capabilities, and B2B licensing to tourism ecosystem partners."));

// ---------- build document ----------
const doc = new Document({
  creator: "Roydon",
  title: "Qiwiosity — Product Blueprint",
  description: "Product blueprint for an AI-powered NZ travel companion app",
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Title", name: "Title", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 48, bold: true, font: "Arial", color: "1F4E79" },
        paragraph: { spacing: { before: 0, after: 240 } } },
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: "1F4E79" },
        paragraph: { spacing: { before: 360, after: 180 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: "2E74B5" },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: "333333" },
        paragraph: { spacing: { before: 180, after: 80 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [
          { level: 0, format: LevelFormat.BULLET, text: "\u2022", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } },
          { level: 1, format: LevelFormat.BULLET, text: "\u25E6", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 1440, hanging: 360 } } } }
        ] },
      { reference: "numbers",
        levels: [
          { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: 720, hanging: 360 } } } }
        ] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
      }
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "Qiwiosity — Blueprint v0.1", size: 18, font: "Arial", color: "888888" })]
        })]
      })
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 18, font: "Arial", color: "888888" }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Arial", color: "888888" })
          ]
        })]
      })
    },
    children
  }]
});

Packer.toBuffer(doc).then(buffer => {
  const out = "/sessions/admiring-gallant-noether/mnt/Tourism map/Qiwiosity_Blueprint.docx";
  fs.writeFileSync(out, buffer);
  console.log("Wrote " + out + " (" + buffer.length + " bytes)");
});
