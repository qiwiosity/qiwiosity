// Generate the Qiwiosity execution plan
const fs = require('fs');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat,
  HeadingLevel, BorderStyle, WidthType, ShadingType, PageNumber
} = require('docx');

const TITLE = (t) => new Paragraph({
  heading: HeadingLevel.TITLE, alignment: AlignmentType.LEFT,
  children: [new TextRun({ text: t, bold: true, size: 48, font: "Arial" })],
  spacing: { after: 120 }
});
const SUBTITLE = (t) => new Paragraph({
  children: [new TextRun({ text: t, italics: true, size: 24, font: "Arial", color: "555555" })],
  spacing: { after: 240 }
});
const H1 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t })] });
const H2 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: t })] });
const H3 = (t) => new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: t })] });
const P = (t) => new Paragraph({ children: [new TextRun({ text: t, size: 22, font: "Arial" })], spacing: { after: 120 } });
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

const border = { style: BorderStyle.SINGLE, size: 4, color: "BBBBBB" };
const borders = { top: border, bottom: border, left: border, right: border };
const cell = (text, opts = {}) => new TableCell({
  borders,
  width: { size: opts.width, type: WidthType.DXA },
  shading: opts.header ? { fill: "1F4E79", type: ShadingType.CLEAR }
         : (opts.alt ? { fill: "F2F2F2", type: ShadingType.CLEAR } : undefined),
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
      width: columnWidths[j], header: i === 0, alt: i > 0 && i % 2 === 0
    }))
  }))
});

const children = [];

children.push(TITLE("Qiwiosity — Execution Plan"));
children.push(SUBTITLE("Stories Along the Way \u2014 how we actually build it, as a bootstrapped side project"));
children.push(PMIX([
  { text: "Author: ", bold: true }, { text: "Roydon    " },
  { text: "Date: ", bold: true }, { text: "April 2026    " },
  { text: "Status: ", bold: true }, { text: "v0.1 (living document)" }
]));
children.push(SPACER());
children.push(P("This is the companion to Qiwiosity_Blueprint.docx. The blueprint is what we're building and why. This doc is how, who, when, and for how much money."));
children.push(SPACER());

// ===== 1. Operating model =====
children.push(H1("1. Operating model"));
children.push(H2("The team"));
children.push(BULLET_MIX([{ text: "Roydon — founder / everything non-engineering. ", bold: true }, { text: "Product direction, content strategy, partnerships, commercial, App Store presence, marketing, user testing, money decisions." }]));
children.push(BULLET_MIX([{ text: "Claude (Cowork) — technical co-builder. ", bold: true }, { text: "Writes the mobile and backend code, drafts POI scripts, builds internal tooling, produces assets, runs research, writes docs. Effectively your engineering team." }]));
children.push(BULLET_MIX([{ text: "Specialists brought in as needed. ", bold: true }, { text: "Voice actors (hero content), graphic/UI designer (logo, branding, a few key screens), accountant, lawyer for partner contracts." }]));
children.push(SPACER());

children.push(H2("What Claude can and can't do"));
children.push(P("Important to be realistic about the division of labour."));

children.push(table(
  [4680, 4680],
  [
    ["Claude does", "Roydon does"],
    ["Write React Native, backend, SQL, and scripts", "Sign up for all developer accounts (Apple, Google, Stripe, Mapbox, etc.) with your identity + payment"],
    ["Design the data model and API contracts", "Deploy to production (you hold the credentials)"],
    ["Draft POI scripts, route descriptions, itinerary copy", "Review every script for tone and accuracy"],
    ["Generate placeholder audio with TTS for testing", "Hire voice actors for hero content"],
    ["Build internal tools (content CMS, importer, trip parser)", "Walk/drive real routes, field-test audio triggers, take photos"],
    ["Research partners and draft outreach emails", "Send the emails, take the meetings, sign the contracts"],
    ["Write user-facing copy, help docs, onboarding", "Own the brand voice decisions"],
    ["Generate legal boilerplate (privacy policy, ToS starter)", "Get it reviewed by a real lawyer before launch"],
    ["Analyse data, write SQL, build dashboards", "Decide what to do with what it shows"]
  ]
));
children.push(SPACER());

children.push(H2("Cadence"));
children.push(BULLET_MIX([{ text: "Weekly check-in. ", bold: true }, { text: "30\u201360 minutes to set the week's 1\u20132 goals and unblock anything stuck." }]));
children.push(BULLET_MIX([{ text: "Daily micro-sessions. ", bold: true }, { text: "1\u20133 hours on a weekday evening, longer blocks on weekends. Claude keeps context across sessions via the workspace folder and memory." }]));
children.push(BULLET_MIX([{ text: "Fortnightly demo-to-self. ", bold: true }, { text: "Every two weeks, run the app end-to-end as a user would. Catch drift." }]));
children.push(BULLET_MIX([{ text: "Monthly milestone review. ", bold: true }, { text: "Against the phase plan below. Reset if we're behind." }]));
children.push(SPACER());

// ===== 2. Stage A =====
children.push(H1("2. Stage A — validate (weeks 1\u20138)"));
children.push(P("Goal: prove that the core experience — location-triggered audio storytelling on a real NZ drive — is something travellers actually enjoy. Nothing else matters until this is true."));

children.push(H2("Why Hawke's Bay as the testing base"));
children.push(P("Build from where you live. The feedback loop of code \u2192 drive \u2192 notice the bug \u2192 fix \u2014 ideally within the same day \u2014 is the single biggest factor in how fast this gets good. Queenstown\u2013Milford is a better showcase route; Hawke's Bay is a better development environment."));
children.push(BULLET_MIX([{ text: "Daily testable. ", bold: true }, { text: "Napier loops, Hastings orbit, Te Mata Peak, Cape Kidnappers, the wineries \u2014 all within an hour. Catch a geofence bug on Monday, verify the fix on Tuesday." }]));
children.push(BULLET_MIX([{ text: "Weekend longer-drive tests. ", bold: true }, { text: "Napier\u2192Taup\u014d (Thermal Explorer Hwy), Napier\u2192Rotorua, Napier\u2192National Park (Desert Rd + Tongariro), Napier\u2192Palmerston North (Manawat\u016b Gorge) \u2014 each a realistic day trip, each a totally different content flavour." }]));
children.push(BULLET_MIX([{ text: "Cheap. ", bold: true }, { text: "Petrol and coffee money rather than flights and accommodation." }]));
children.push(BULLET_MIX([{ text: "Content variety on your doorstep. ", bold: true }, { text: "Art deco Napier, the 1931 earthquake, wine country, M\u0101ori cultural sites (Ng\u0101ti Kahungunu), geothermal, mountain roads, gorge country, and the Desert Road \u2014 a great stress-test of the product across different environments." }]));
children.push(BULLET_MIX([{ text: "Tester pipeline. ", bold: true }, { text: "Hawke's Bay and Rotorua are real tourist destinations. Tourists at i-SITEs, vineyards, holiday parks, and backpackers along SH5/SH2 are ready-made user research subjects." }]));
children.push(SPACER());

children.push(H2("Scope"));
children.push(BULLET("Home base: Napier / Hastings (Hawke's Bay region) \u2014 10\u201312 local POIs, walkable / drivable daily."));
children.push(BULLET("One showcase day-drive: Napier \u2192 Taup\u014d \u2192 Rotorua loop \u2014 ~8\u201310 additional POIs along the Thermal Explorer Highway."));
children.push(BULLET("Total Stage A content: 20\u201322 POIs, covering headline / standard / long-form. One 30-minute long-form episode (probably \"The story of the Hawke's Bay earthquake\" \u2014 rich, universally interesting, makes the long-form case)."));
children.push(BULLET("Simple mobile app: Expo-based React Native, GPS-triggered audio playback, no offline yet, no bookings, no payments."));
children.push(BULLET("TestFlight + Android APK for handing to testers."));
children.push(SPACER());

children.push(H2("Week-by-week"));

children.push(H3("Weeks 1\u20132 \u2014 Setup and first local content"));
children.push(BULLET("Register domain (aotearoaguide.com or .app or .nz)."));
children.push(BULLET("Stand up repo (GitHub, monorepo: /mobile, /backend, /content, /tools)."));
children.push(BULLET("Set up Expo project, basic screen layout, GPS permissions."));
children.push(BULLET("Pick the first 6 POIs in Napier / Hastings (e.g., Marine Parade + art deco tour, Bluff Hill, Te Mata Peak, Cape Kidnappers viewpoint, Waipawa, and a \"Welcome to Heretaunga\" intro)."));
children.push(BULLET("Draft scripts for the first 3. Claude drafts, you edit."));
children.push(BULLET("Generate TTS audio (ElevenLabs trial or Azure Neural) for the drafts."));
children.push(BULLET("Set up Mapbox free tier; render the Hawke's Bay map."));
children.push(SPACER());

children.push(H3("Weeks 3\u20134 \u2014 Audio engine + daily field test"));
children.push(BULLET("GPS geofencing on iOS (Core Location) \u2014 fire an event when within trigger radius of a POI."));
children.push(BULLET("Background audio playback with proper audio-session handling."));
children.push(BULLET("Content pack: JSON file of POIs with lat/lon, trigger radius, audio URL, script. Bundled in the app."));
children.push(BULLET("Drive the Napier \u2192 Hastings \u2192 Te Mata loop at least 3 times with the prototype. Fix whatever breaks the same week."));
children.push(BULLET("Test edge cases you only see on real roads: tunnels, poor signal pockets in the Esk Valley, dead zones near Cape Kidnappers, how GPS behaves at 100 km/h vs stationary."));
children.push(SPACER());

children.push(H3("Weeks 5\u20136 \u2014 First long drive + long-form"));
children.push(BULLET("Add 8\u201310 POIs on the Napier \u2192 Taup\u014d \u2192 Rotorua loop. Thermal Explorer Hwy history, Wa\u012froa, geothermal, T\u016brangi, Tongariro backdrop."));
children.push(BULLET("Draft and record the long-form \"Hawke's Bay earthquake of 1931\" episode \u2014 30 min, TTS for now, scripted carefully (cross-check with Hawke's Bay Museum / M. J. Savage archive material)."));
children.push(BULLET("Build the \"what's next\" UI \u2014 current POI card, queued next stop, map position, length toggle (headline / standard / long)."));
children.push(BULLET("Do the Napier\u2192Taup\u014d\u2192Rotorua loop end-to-end as a real test weekend. Dog-food it."));
children.push(SPACER());

children.push(H3("Weeks 7\u20138 \u2014 Test with real people"));
children.push(BULLET("TestFlight build for iOS. Android APK via Expo EAS."));
children.push(BULLET("Find 10 local testers \u2014 Napier/Hastings friends, family, colleagues. They'll be brutally honest."));
children.push(BULLET("Find 20 tourist testers via Hawke's Bay i-SITE, Napier holiday parks, Art Deco Trust, Mission Estate / Craggy Range tasting rooms, Rotorua backpackers. Offer a small thank-you (coffee voucher)."));
children.push(BULLET("Simple feedback form after each drive."));
children.push(BULLET("Instrument basic analytics: app opens, audio plays, audio completion %, skips."));
children.push(BULLET("Decision point at end of week 8: does this feel worth building further?"));
children.push(SPACER());

children.push(H2("Stretch routes for Stage A+ (weeks 9\u201312, if going well)"));
children.push(P("If Stage A passes, immediately extend into more of the drives you can do from home as you prep for Stage B. No new engineering \u2014 just content. Each of these is a weekend dog-food session producing a publishable audio route:"));
children.push(BULLET_MIX([{ text: "Napier \u2192 Taup\u014d (SH5). ", bold: true }, { text: "Thermal Explorer Hwy. Te Pohue, Tarawera, Waipunga Falls, the vast pumice plains, Lake Taup\u014d itself. Good \"long drive, keep talking\" test \u2014 long empty stretches between POIs, exactly where continuous-mode content matters." }]));
children.push(BULLET_MIX([{ text: "Taup\u014d \u2192 National Park (Desert Rd). ", bold: true }, { text: "The Desert Road is the definitive \"nothing there but landscape\" test. Ng\u0101ti T\u016bwharetoa stories, volcanic history (Ruapehu, Tongariro, Ngauruhoe), WWI army training, Lord of the Rings locations. Perfect use case for themed long-form episodes." }]));
children.push(BULLET_MIX([{ text: "Taup\u014d \u2192 Rotorua (SH5). ", bold: true }, { text: "Wai-O-Tapu, Waikite, Te Arawa rohe, the 1886 Tarawera eruption \u2014 one of the great geological stories in NZ history and a long-form goldmine." }]));
children.push(BULLET_MIX([{ text: "Napier \u2192 Palmerston North (SH2 + SH3). ", bold: true }, { text: "Norsewood (Scandinavian settler story), the Manawat\u016b Gorge (closed 2017 \u2014 a story in itself), Te Apiti wind farm, Rangit\u0101ne history. Very different flavour \u2014 settler + engineering + rural NZ." }]));
children.push(BULLET_MIX([{ text: "Napier orbit (day loops). ", bold: true }, { text: "Napier art deco walking tour (pedestrian product, tests walking-pace geofencing), Cape Kidnappers, Te Mata Peak summit, Clive \u2192 Mission estate \u2192 Craggy Range wine trail, Waipawa / Waipukurau heritage." }]));
children.push(SPACER());

children.push(H2("Stage A budget"));
children.push(table(
  [4680, 2000, 2680],
  [
    ["Item", "Cost (NZD)", "Notes"],
    ["Domain + email", "~50", "One year"],
    ["Apple Developer Program", "150", "Annual"],
    ["Google Play Developer", "40", "One-off"],
    ["Mapbox", "0", "Free tier covers Stage A easily"],
    ["ElevenLabs TTS", "30\u201380", "Scripts only, small volume"],
    ["Hosting (Supabase / Vercel)", "0", "Free tier"],
    ["Field testing (fuel, coffee, occasional meal)", "300", "Driving the route yourself + meeting testers"],
    ["Misc / logo draft / tools", "100\u2013200", "Figma free, Canva Pro maybe"],
    ["Total Stage A", "~NZD 700\u20131,000", "Should stay under a grand"]
  ]
));
children.push(SPACER());

children.push(H2("Stage A success criteria"));
children.push(BULLET("30+ testers, 15+ complete the route with the app running."));
children.push(BULLET("Median audio completion rate > 70% on the standard-length stops."));
children.push(BULLET("At least half of testers say \"I'd pay for this\" in some form."));
children.push(BULLET("Unprompted positive feedback on specific stories (\u2192 tells us storytelling works, not just GPS)."));
children.push(BULLET("No show-stopping bugs (audio not firing, battery drain, crashes in tunnels)."));
children.push(SPACER());

// ===== 3. Stage B =====
children.push(H1("3. Stage B — MVP (months 3\u20138)"));
children.push(P("Goal: a real, shippable app. One region done properly. Paying users. Evidence the business model works at small scale."));

children.push(H2("Scope"));
children.push(BULLET_MIX([{ text: "Region: ", bold: true }, { text: "Central + Eastern North Island \u2014 Hawke's Bay, Taup\u014d, Rotorua, Tongariro National Park, Manawat\u016b. Coherent geographic area, heavy tourist density, everything drivable from Napier for continued field testing." }]));
children.push(BULLET("Offline maps (Mapbox offline + PMTiles bundles)."));
children.push(BULLET("Offline audio packs per sub-region."));
children.push(BULLET("User accounts (email / Apple / Google sign-in)."));
children.push(BULLET("Subscription paywall (Pro) via Apple / Google in-app purchase + Stripe for web."));
children.push(BULLET("Itinerary basics \u2014 manual entry, email-forwarding parser for 5 major booking sources, timeline view, ETA-vs-check-in alerts."));
children.push(BULLET("One booking partner live end-to-end (probably Bokun for activities \u2014 has open signup)."));
children.push(BULLET("Hero content \u2014 1\u20132 long-form pieces voiced by a professional NZ narrator."));
children.push(BULLET("Push notifications, basic personalisation (interests picker)."));
children.push(BULLET("iOS first (build for App Store). Android: build but don't prioritise marketing."));
children.push(SPACER());

children.push(H2("Month-by-month"));
children.push(PMIX([{ text: "Month 3: ", bold: true }, { text: "Offline maps + offline audio architecture. Content expansion to 40 POIs." }]));
children.push(PMIX([{ text: "Month 4: ", bold: true }, { text: "User accounts, subscription flow, paywall. First 40 POIs polished. Begin Bokun integration." }]));
children.push(PMIX([{ text: "Month 5: ", bold: true }, { text: "Itinerary system \u2014 email parser, manual entry, timeline UI, ETA alerts. Content to 80 POIs. First long-form hero piece recorded with a professional narrator." }]));
children.push(PMIX([{ text: "Month 6: ", bold: true }, { text: "Bokun booking flow live. Onboarding polish. Push notifications. Closed beta with 50\u2013100 users." }]));
children.push(PMIX([{ text: "Month 7: ", bold: true }, { text: "Beta feedback round, bug fixing, content to 120 POIs, submit to App Store." }]));
children.push(PMIX([{ text: "Month 8: ", bold: true }, { text: "Public launch. Small PR push (stuff.nz, NZ Herald travel, tourism media). Begin measurement." }]));
children.push(SPACER());

children.push(H2("Stage B budget"));
children.push(table(
  [4680, 2000, 2680],
  [
    ["Item", "Cost (NZD)", "Notes"],
    ["Mapbox (paid tier once usage grows)", "200\u2013500/mo by launch", "Scales with map loads"],
    ["ElevenLabs TTS", "100\u2013200/mo", "Volume grows with content"],
    ["Supabase / hosting", "0\u2013100/mo", "Free tier until some scale"],
    ["Voice actors (hero content)", "1,500\u20133,000", "2\u20133 pieces, professional NZ talent"],
    ["Designer (brand + key screens)", "1,500\u20133,000", "One-off engagement with a NZ freelancer"],
    ["Legal (privacy policy, ToS, partner contracts)", "800\u20131,500", "Starter kit then one consult"],
    ["Accountant (GST registration, structure)", "300\u2013700", "One-off setup"],
    ["Field testing (more drives, content gathering)", "1,500\u20132,500", "Fuel, a few nights of accom for scouting"],
    ["App Store / PR / soft launch marketing", "500\u20131,500", "Keep this low until signal is clear"],
    ["Total Stage B", "~NZD 10,000\u201320,000", "The real spend. Bootstrap-able on a decent salary, but tight"]
  ]
));
children.push(SPACER());

children.push(H2("Stage B success criteria"));
children.push(BULLET("2,000+ app installs in first 3 months post-launch."));
children.push(BULLET("5% free-to-paid conversion (100 paying users \u2014 small but real)."));
children.push(BULLET("At least 10 bookings through the app with tracked commission."));
children.push(BULLET("App Store rating 4.5+."));
children.push(BULLET("Crash-free sessions > 99.5%."));
children.push(BULLET("One public write-up / review in NZ tourism or tech media."));
children.push(SPACER());

// ===== 4. Stage C =====
children.push(H1("4. Stage C — scale (months 8\u201318)"));
children.push(P("Goal: grow coverage, deepen the trip-OS layer, start generating meaningful revenue, and decide whether to stay bootstrapped or raise."));

children.push(H2("Scope"));
children.push(BULLET("Expand content nationally \u2014 rest of the North Island (Auckland / Bay of Islands / Waikato / Wellington) plus the South Island (starting with the Queenstown\u2013Milford showcase route, then West Coast, Christchurch, W\u0101naka). 300\u2013500 POIs total."));
children.push(BULLET_MIX([{ text: "Queenstown\u2013Milford as the marketing showcase. ", bold: true }, { text: "The iconic drive. Build it with the best production values you can afford \u2014 real voice actors, rich long-form storytelling, the works. This is the drive you'll put in the App Store screenshots and press coverage." }]));
children.push(BULLET("CarPlay and Android Auto \u2014 this is the real unlock for the driving experience."));
children.push(BULLET("Full trip-OS: inbox scan, calendar sync, flight status, shared trips, document vault."));
children.push(BULLET("3\u20135 booking partners (Bokun, Viator/GetYourGuide, Booking.com, OpenTable-equivalent)."));
children.push(BULLET("Android equal priority."));
children.push(BULLET("Simplified Chinese + German translations for audio and UI (biggest inbound markets)."));
children.push(BULLET("First B2B conversation \u2014 rental car co, cruise line, or regional tourism org."));
children.push(SPACER());

children.push(H2("Decision point: raise, B2B, or stay lean"));
children.push(P("By end of Stage C, you'll have 12+ months of data. Time to choose:"));
children.push(BULLET_MIX([{ text: "Stay bootstrapped. ", bold: true }, { text: "If revenue covers costs + a small personal draw, keep going. No dilution, no timeline pressure. Slower growth." }]));
children.push(BULLET_MIX([{ text: "Raise angel round. ", bold: true }, { text: "NZD 500k\u20131M from NZ angels / tourism-connected investors (e.g. Icehouse, Ice Angels, Enterprise Angels, or tourism-industry angels). Trade ~15\u201320% equity for a team and a faster push to national coverage + marketing spend." }]));
children.push(BULLET_MIX([{ text: "Land a B2B anchor. ", bold: true }, { text: "Sell a white-label to a rental-car co or cruise line for NZD 50\u2013200k up front + revenue share. Funds the consumer play without dilution. Slower consumer growth but de-risked." }]));
children.push(BULLET_MIX([{ text: "Grants. ", bold: true }, { text: "Callaghan Innovation R&D Growth Grant / student grants, NZTE advisory, TNZ partnerships, regional tourism innovation funds. Non-dilutive, slow, worth pursuing throughout." }]));
children.push(SPACER());

// ===== 5. Partnerships =====
children.push(H1("5. Partnerships — who to talk to when"));

children.push(H2("Immediate (Stage A)"));
children.push(BULLET("Nobody. Finish the prototype first. Showing something working > showing a pitch deck."));
children.push(SPACER());

children.push(H2("Early (Stage A end / Stage B start)"));
children.push(BULLET_MIX([{ text: "Bokun. ", bold: true }, { text: "Self-serve sign-up, gives you bookable inventory fast. No meeting needed." }]));
children.push(BULLET_MIX([{ text: "Hawke's Bay Tourism + Destination Great Lake Taup\u014d + RotoruaNZ. ", bold: true }, { text: "Regional tourism orgs. Introductions, imagery, maybe co-marketing. Hawke's Bay Tourism is literally based in Napier \u2014 walk in." }]));
children.push(BULLET_MIX([{ text: "MTG Hawke's Bay + Art Deco Trust + local historians. ", bold: true }, { text: "The 1931 earthquake archive, art deco tour content, regional history. Possible content partners or at least fact-checkers for the long-form pieces." }]));
children.push(SPACER());

children.push(H2("Mid-stage (Stage B)"));
children.push(BULLET("Booking.com Partner program (once you have traffic to show)."));
children.push(BULLET("Viator / GetYourGuide affiliate programs."));
children.push(BULLET("DOC \u2014 they have good data and care about visitor management on Great Walks."));
children.push(BULLET("Callaghan Innovation \u2014 founder grant / R&D grants once you're working full-time or close to it."));
children.push(SPACER());

children.push(H2("Later (Stage C)"));
children.push(BULLET("Rental car / campervan cos (Jucy, Maui, Apollo, GO Rentals) \u2014 white-label or in-vehicle bundle."));
children.push(BULLET("Cruise lines (Princess, Royal Caribbean, Holland America) \u2014 day-tripper audio tours for their NZ port stops."));
children.push(BULLET("Tourism New Zealand \u2014 once you're nationally representative they may help with international marketing."));
children.push(SPACER());

// ===== 6. Content production =====
children.push(H1("6. Content production plan"));
children.push(P("Content is the slow, expensive part. Plan the pipeline early so it scales without breaking."));

children.push(H2("Per-POI content pipeline"));
children.push(NUMBER("Research. Claude pulls from Te Ara, NZ History Online, Wikipedia, DOC material, local museum content."));
children.push(NUMBER("First draft script \u2014 Claude drafts at three lengths (headline / standard / long-form)."));
children.push(NUMBER("Roydon reviews and edits for voice, tone, NZ idiom, accuracy."));
children.push(NUMBER("Voicing \u2014 TTS for non-hero (ElevenLabs custom voice, possibly cloned from a paid narrator) or real voice actor for hero."));
children.push(NUMBER("Production \u2014 simple audio polish, add light ambient / music bed if appropriate, export MP3."));
children.push(NUMBER("Metadata \u2014 lat/lon, trigger radius, tags, interests, length tier, test notes."));
children.push(NUMBER("QA \u2014 play on device, verify trigger firing at expected radius, verify offline playback."));
children.push(SPACER());

children.push(H2("Content cost model"));
children.push(BULLET("AI-drafted + TTS: ~NZD 30\u201380 per POI (Claude + ElevenLabs credits + your time)."));
children.push(BULLET("AI-drafted + human-voiced: ~NZD 150\u2013400 per POI."));
children.push(BULLET("Fully curated + pro voice: ~NZD 400\u20131,200 per POI."));
children.push(SPACER());

children.push(H2("Volume targets"));
children.push(BULLET("Stage A: 10 POIs."));
children.push(BULLET("Stage B: 80\u2013120 POIs (~15\u201320/month sustainable cadence)."));
children.push(BULLET("Stage C: 300\u2013500 POIs (content team or contractor likely by this point)."));
children.push(SPACER());

// ===== 7. Tech decisions locked =====
children.push(H1("7. Tech decisions — lock these in now"));
children.push(P("Blueprint had options. For the side-project bootstrap path these are the chosen defaults so we stop re-deciding:"));

children.push(table(
  [3000, 6360],
  [
    ["Area", "Choice"],
    ["Mobile framework", "React Native with Expo. Faster iteration, native modules when we need them (geofencing, background audio)."],
    ["Maps", "Mapbox. Better offline story than Google Maps; reasonable free tier."],
    ["Backend", "Supabase (Postgres + auth + storage + edge functions) to start. Move off if / when needed."],
    ["Spatial data", "PostGIS inside Supabase."],
    ["Payments", "Apple IAP + Google Play Billing for subscriptions. Stripe for web + B2B."],
    ["Content CMS", "Build a simple internal tool \u2014 Next.js admin panel over Supabase. No Contentful / Sanity yet."],
    ["TTS", "ElevenLabs (best quality, per-use pricing). Azure as backup."],
    ["LLM for content drafting", "Claude via API once we need programmatic drafting; use Cowork interactively for now."],
    ["Analytics", "PostHog (open-source, free self-host tier, generous cloud free tier)."],
    ["Error tracking", "Sentry free tier."],
    ["CI/CD", "GitHub Actions + Expo EAS for app builds."],
    ["Domain", "aotearoaguide.com or .app (TBD on availability)."]
  ]
));
children.push(SPACER());

// ===== 8. Risks =====
children.push(H1("8. Risks for a side-project bootstrap"));
children.push(BULLET_MIX([{ text: "Running out of evenings before running out of money. ", bold: true }, { text: "Most side projects die from energy depletion, not budget. Protect the weekly cadence. One weeknight off is fine; three in a row and momentum is gone." }]));
children.push(BULLET_MIX([{ text: "Content scope creep. ", bold: true }, { text: "Easy to keep polishing the first 10 POIs forever. Set a \"good enough, ship\" bar and move on." }]));
children.push(BULLET_MIX([{ text: "App Store rejection. ", bold: true }, { text: "Apple can be picky about location-based apps. Read their guidelines carefully and submit early for review." }]));
children.push(BULLET_MIX([{ text: "Someone builds a version before you launch. ", bold: true }, { text: "Possible but unlikely \u2014 it's been possible for 5 years and nobody has. Still, ship Stage A fast." }]));
children.push(BULLET_MIX([{ text: "Burnout before revenue. ", bold: true }, { text: "The hardest stretch is months 3\u20138 when there's no public validation yet. Build small wins into the plan (closed beta, first paying user, first booking) to keep morale up." }]));
children.push(SPACER());

// ===== 9. First actions =====
children.push(H1("9. First nine things to do, in order"));
children.push(NUMBER("Name chosen \u2014 Qiwiosity. Next: secure qiwiosity.com (or .app / .co.nz), the App Store / Play Store handles, and the social handles (Instagram, TikTok, LinkedIn) before anyone else takes them. Worth filing an IPONZ trademark application early (~NZD 150 per class; class 39 travel services + class 9 mobile app)."));
children.push(NUMBER("Register domain + set up business email."));
children.push(NUMBER("Apple Developer + Google Play Developer accounts (these take a few days to approve)."));
children.push(NUMBER("Create GitHub repo with the monorepo structure. Claude sets this up."));
children.push(NUMBER("Scaffold the Expo app and get GPS + a test audio file playing on your own phone."));
children.push(NUMBER("Pick the first 6 POIs in Napier / Hastings. Rough map + latitude/longitude + brief description."));
children.push(NUMBER("Write the first 3 scripts (Claude drafts, you edit). Record with TTS. Drop into the app."));
children.push(NUMBER("Drive your local loop with the prototype in your pocket. Note what works and what breaks. Repeat twice."));
children.push(NUMBER("Make a simple 1-pager landing page (email capture, short video of the experience)."));
children.push(SPACER());

children.push(H1("10. The simplest possible first week"));
children.push(P("If you want to feel momentum immediately, this is what Week 1 looks like \u2014 all testable from your driveway:"));
children.push(BULLET_MIX([{ text: "Monday evening (1 hr): ", bold: true }, { text: "Decide and register a domain. Set up Apple Developer account (it'll take a day or two to approve)." }]));
children.push(BULLET_MIX([{ text: "Tuesday evening (1 hr): ", bold: true }, { text: "With Claude, scaffold the GitHub repo and bare Expo app. Get \"Hello Aotearoa\" on your phone." }]));
children.push(BULLET_MIX([{ text: "Wednesday evening (2 hrs): ", bold: true }, { text: "Pick 6 POIs within 30 minutes of home \u2014 e.g., Marine Parade, Bluff Hill lookout, Te Mata Peak, a spot along the Hawke's Bay Trail, Clive, Havelock North village. Drop lat/longs into a JSON file." }]));
children.push(BULLET_MIX([{ text: "Thursday evening (2 hrs): ", bold: true }, { text: "Claude drafts the first 3 scripts (Bluff Hill, Te Mata Peak, Marine Parade art deco). You edit. Generate TTS. Drop MP3s into the app." }]));
children.push(BULLET_MIX([{ text: "Saturday (4 hrs): ", bold: true }, { text: "Add basic GPS + geofence trigger + audio playback. Test on desk, then do a short real drive: Napier CBD \u2192 Bluff Hill \u2192 Marine Parade." }]));
children.push(BULLET_MIX([{ text: "Sunday (2\u20133 hrs): ", bold: true }, { text: "Longer loop: home \u2192 Te Mata Peak \u2192 Havelock North \u2192 home. Celebrate the first time audio plays at the right moment. That's the whole product in miniature \u2014 and you drove past your own house doing it." }]));
children.push(SPACER());
children.push(P("Total Week 1: ~12 hours and under NZD 200 spent. End of the week, you have a working piece of the app playing location-aware audio on roads you drive anyway. Every subsequent weekend you can extend a little further \u2014 Cape Kidnappers next weekend, the SH5 climb to Te Pohue the one after."));
children.push(SPACER());

// ===== 11. Summary =====
children.push(H1("11. TL;DR"));
children.push(P("Weeks 1\u20138: prove the concept with Hawke's Bay drives you can do after work and the Napier\u2013Taup\u014d\u2013Rotorua loop on weekends. 30 testers. Under NZD 1,000. Months 3\u20138: ship an MVP covering the central + eastern North Island \u2014 Hawke's Bay, Taup\u014d, Rotorua, Tongariro, Manawat\u016b \u2014 with paid subs and a booking upsell live. ~NZD 15k budget. Months 8\u201318: expand nationally, build the Queenstown\u2013Milford showcase drive as the marketing flagship, launch CarPlay + trip-OS, and decide whether to stay bootstrapped, raise angel, or land a B2B anchor. Claude does the engineering grind and the draft content; you do the product calls, the relationships, the deployment, and the judgement."));

// ---------- doc ----------
const doc = new Document({
  creator: "Roydon",
  title: "Qiwiosity — Execution Plan",
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
          children: [new TextRun({ text: "Qiwiosity \u2014 Execution Plan v0.1", size: 18, font: "Arial", color: "888888" })]
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
  const out = "/sessions/admiring-gallant-noether/mnt/Tourism map/Qiwiosity_Execution_Plan.docx";
  fs.writeFileSync(out, buffer);
  console.log("Wrote " + out + " (" + buffer.length + " bytes)");
});
