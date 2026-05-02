# Qiwiosity — Project Overview

## What is this?

Qiwiosity is a New Zealand travel app — part interactive map, part audio tour guide, part trip planner. It covers attractions, accommodations, itinerary planning, and voice-narrated cultural commentary across all 19 NZ regions.

## Running the App

```bash
node server.js
```

Serves `qiwiosity/mobile/prototype.html` at `http://0.0.0.0:5000`.

## Project Structure

```
qiwiosity/
  mobile/
    prototype.html          ← Main web prototype (Google Maps, Supabase)
    assets/                 ← Logo, splash images, audio files
    src/                    ← React Native app source (Expo SDK 54)
    App.js, app.json, ...   ← Expo entry points
    plugins/                ← CarPlay + Android Auto native plugins
  database/
    seed/                   ← Canonical JSON data (2453 POIs, 382 accommodations)
    migrations/             ← Supabase SQL migrations
    import-to-supabase.js   ← Data import script
  content/
    poi/                    ← Per-region POI JSON files
    accommodations/         ← Per-region accommodation files
    scripts/                ← Narration scripts (Markdown)
    audio/                  ← Generated MP3 audio files
  tools/                    ← TTS rendering, review population scripts
  supabase/                 ← Edge functions (wishlist)
  extension/                ← Browser extension for content scraping
_archive/                   ← Retired codebases (aotearoa-app, backend_express)
server.js                   ← Simple Node.js HTTP server (port 5000)
```

## Tech Stack

- **Web prototype**: Single-file HTML/CSS/JS (`qiwiosity/mobile/prototype.html`)
  - Google Maps JavaScript API (key embedded)
  - Supabase (live data: 2453 POIs, 382 accommodations, 19 regions)
  - Web Speech API + ElevenLabs API for voice narration
- **Mobile app**: React Native via Expo SDK 54, React 19.1, RN 0.81.5
- **Backend**: Supabase (PostgreSQL) — `https://hauksnqehzaxuoeaezji.supabase.co`
- **Server**: Node.js built-in `http` module

## Phase 3 Feature Sprint (Completed — May 2026)

All applied to `qiwiosity/mobile/prototype.html`:

### Itinerary Redesign
- **Multi-day support** — Day tabs (Day 1, Day 2…), "＋ Day" button, Move to Day buttons per stop
- **Collapsible stop cards** — Click header to expand/collapse; shows Audio / Details / Drive actions when open
- **Drive time rows** — Estimated drive time + distance between every consecutive stop pair
- **Up/down reorder** — ▲▼ buttons on each card; drag-and-drop HTML5 reorder also enabled
- **Collapsible stats footer** — Total stops, activity hours, today's distance, estimated drive time, "Show route on map" button
- **New state fields** — `itineraryDays`, `planActiveDay`, `expandedStops`, `itiStatsOpen`, `templatesOpen`
- **New helpers** — `addDay()`, `setActiveDay()`, `moveStop()`, `moveStopToDay()`, `toggleStopExpand()`, `clearItinerary()`, `toggleItiStats()`, `togglePlanTemplates()`, `showCommentaryForStop()`

### In-App Trip Routing
- **`openInAppTripRoute()`** — Uses Google Maps DirectionsService with all day stops as waypoints; draws teal polyline on the map, shows distance + time toast; stays fully in-app (no external Maps)

### POI Popup Redesign
- **Wider + taller** — 360px wide, 260px hero image height (was 320px / 220px)
- **Audio strip** — Teal "🔊 Play Audio Guide" button + "with [Voice Name]" label, right below the hero
- **Clean bottom action row** — Full-width "＋ Add to Itinerary" primary button, then a flex row: Save / Drive / Similar / Compare

### Decision Mode Enhancements
- **VS card hero images** — Each comparison card now shows the POI photo at top
- **Price + rating in VS meta** — Shows NZ$ price and ★ rating inline
- **Inline audio** — "🔊 Audio" button per VS card (stops propagation so clicking audio doesn't pick a winner)

### Compare Sheet + Find Similar Nearby
- **`openCompareSheet(id)`** — Opens a bottom sheet with two options: "Add this place only" or "Find similar nearby"
- **Radius picker** — 25 km / 50 km / 100 km / All NZ options
- **`confirmFindSimilar()`** — Adds the POI + all same-category POIs within the chosen radius to the Compare list; `haversineKm()` calculates great-circle distance

### First-Time Onboarding
- **4-slide bottom-sheet overlay** — Welcome → Explore → Plan → Compare/Decide
- **Animated entrance** — `slideUpIn` keyframe animation
- **Progress dots** — Active dot stretches to pill shape
- **Persistent** — Shown once on first visit; stored in `localStorage` as `qiwiosity_onboarded`; "Skip" dismisses immediately

### Audio Commentary Options
- **Short / Full toggle** — "⚡ Quick (30s)" pill plays `a.short` field; "📖 Full Guide" plays the full `a.commentary`; toggling swaps displayed text live without closing the overlay
- **Driving Mode** — Dashed teal button in Plan sidebar; when active turns solid; auto-sets commentary to short; tapping any stop's Audio button triggers immediate auto-play; `drivingModeOn` state flag
- **`getCommText(a)`** / **`setCommLength(mode, poiId)`** — centralised helpers

### Social & Sharing
- **Share POI** — "📤 Share" button in every POI popup action row; Web Share API on mobile; clipboard fallback on desktop with `?poi=<id>` URL + description
- **Share Trip** — "📤 Share Trip" in Plan stats; formats itinerary day-by-day as shareable text; Web Share API or clipboard fallback
- **`sharePoi(id)`** + **`shareTrip()`**

### Admin Panel
- **Secret access** — Type `qiwiadmin` on the page (not in an input), or use `?admin=true` URL param
- **5 tabs** — Overview (stat cards + category/region breakdowns), POIs (searchable/filterable table of all 2,453 with expandable rows), Stays (searchable table of 382 accommodations), Add POI (full form), Activity (feed of recently added POIs)
- **Dark navy/teal design** — Full-screen overlay with left sidebar nav
- **Admin → app actions** — Expand a POI row → "View on map" + "Add to trip" buttons bridge admin back to the live app
- **Auto-refresh** — Overview polls until Supabase data is ready

### Surprise Me / Discover
- **"🎲 Surprise Me" button** in Explore sidebar — picks a random top-rated POI (rating ≥ 4.0, or top 30%); avoids repeating the last 20 shown; pans map + opens popup + shows toast with name & region; `_surpriseHistory` tracks recent picks

### Region List Enhancement
- **POI counts** — Each region in the sidebar now shows a teal pill count of how many POIs are in that region, computed live from ATTRACTIONS data

### Trip Cost Estimator
- **"💰 Cost estimate" row** in Plan stats — collapsible; estimates fuel (10.5 L/100 km × NZ$2.52), activity entry fees by category, accommodation (from AI pref or NZ$150 default), food (NZ$90/day); shows a low–high NZD range; `buildCostEstimate(totalDistKm)` / `toggleCostBreakdown()`

### Near Me — Geolocation
- **"📍 Near Me" toggle** in Explore sidebar — requests browser geolocation; blue Google-style dot marker placed on map; markers re-sorted nearest-first; distance badge (📍 X km/m) shown in POI popup hero row; toggles off cleanly; keyboard shortcut N
- **`distKmFromUser(a)`** + **`fmtDist(km)`** + **`renderUserLocationMarker()`** helpers

### Recently Viewed History Strip
- **Horizontal chip strip** below search box in Explore — tracks last 12 tapped POIs in `localStorage` (`qiwiosity_recently_viewed`); chips jump to POI on map; hidden when empty; `addToRV()` called inside `openPoiInfoWindow()`

### POI Detail Full-Screen Overlay
- **"📖 More" button** on every popup — opens full-screen overlay with large hero, swipeable gallery strip, full commentary, visitor overview, tags, audio guide + Community Voices buttons, add-to-itinerary, directions, share, affiliate booking links; `openPoiDetail()` / `closePoiDetail()` / `toggleSaveFromDetail()`

### Search Autocomplete
- **Dropdown suggestions** under search input as user types (≥2 chars) — top 6 matching POIs by name/tags; matched text highlighted in teal; category label shown; click jumps to POI + clears search; Escape dismisses; blur auto-closes

### Map Style Switcher
- **3-button vertical panel** on map (top-right) — 🗺 Standard, 🛰 Satellite, ⛰ Terrain; active button turns teal; `setMapStyle(type)`; keyboard shortcut M cycles styles

### Keyboard Shortcuts
- **Press `?` anywhere** (outside inputs) to open the shortcuts overlay — lists all shortcuts including `/` search, `E/P/S` tabs, `M` map style, `D` dark mode, `N` near me, `R` surprise me, `Esc` close
- All shortcuts handled in the global `keydown` listener alongside the admin `qiwiadmin` buffer

### PWA Manifest & Meta Tags
- **`manifest.json`** — name, short_name, standalone display, teal theme/background colors, icon
- **Meta tags** — `theme-color`, Apple mobile web app capable/title/status-bar, OG title/description, `viewport-fit=cover` for notched phones

### Marker Clustering
- **@googlemaps/markerclusterer** loaded from CDN; `renderAttractions()` now wraps all markers in a `MarkerClusterer` when there are >50 visible markers; custom teal SVG cluster icons show the count; at higher zoom levels clusters break into individual pins; falls back to direct map rendering for small filtered sets

### AI Trip Generator
- **3-step wizard** — When & Who → Interests & Pace → Stay & Route; animated step progress indicator
- **Smart routing algorithm** — `buildAIItinerary()` scores all 2,453 POIs by category interest match, rating, review count, and budget; greedy nearest-neighbor from start region builds a geographically sensible route; distance penalty relaxes over days to allow spread
- **Accommodation matching** — Finds best accommodation near each day's final stop using keyword matching against user's preference (camping/hostel/B&B/hotel/luxury)
- **Loading UX** — Animated 5-step progress list over 2.4s while algorithm processes
- **Results screen** — Collapsible day cards; shows stops, distance, regions, recommended stay + price/night; Regenerate button
- **Load into Planner** — Transfers full AI itinerary into Plan tab with correct day assignments; sets journey start from chosen region; switches view automatically
- **Entry point** — "✨ Generate AI Trip" primary button at top of Plan sidebar

### Community Voices (EchoVerse)
- **Full-screen overlay** — Teal header showing POI name + two tabs: "👂 Hear Stories" and "🎙 Leave a Memory"
- **MediaRecorder API** — Records audio in `audio/webm;codecs=opus`; pulsing red button with live timer; 60s max; auto-stops at limit
- **Preview & discard** — After stopping, user can preview their recording with progress bar or redo
- **Name/anonymous toggle** — Enter name or click "Anonymous"; disables name input when anonymous
- **9-tag picker** — Love Story, Advice, Funny, Heartbreaking, Inspiring, Local History, First Experience, Hidden Gem, Confession
- **Playback** — Memory cards show name, tag, date, duration; ▶ button plays with orange progress bar
- **Storage** — Base64-encoded audio saved to `localStorage` as `qw_echo_<poiId>` per location
- **POI popup strip** — Every POI popup shows a "🎙 Community Voices · real stories from visitors" strip above action buttons; shows count if memories exist, "Be first →" if none; taps open the overlay
- **New functions** — `openEchoVerse()`, `closeEchoOverlay()`, `switchEchoTab()`, `renderEchoListenPanel()`, `toggleEchoPlayback()`, `startEchoRecording()`, `stopEchoRecording()`, `playEchoPreview()`, `discardEchoRecording()`, `saveEchoMemory()`, `echoMemoryCount()`

---

## Phase 2 UI / Feature Overhaul (Completed)

All applied to `qiwiosity/mobile/prototype.html`:

### Design & Theming
- **Dark mode** — Full `html.dark` CSS variable override; toggleable via Settings → persisted in `localStorage`
- **Premium web-first design** — Proper desktop 3-column grid layout, refined typography, transitions, spacing
- **Standalone splash screen** — Full-cover NZ landscape background, glassmorphism overlay, logo + brand name, bold headline, 4 feature-highlight chips, "Begin Exploring" CTA, animated entry
- **Header redesign** — Deep teal background, bolder brand, improved tab styling, ⚙ Settings gear button

### Voice & Audio
- **5 named voice personas** — Kiri 🌿 (warm NZ), James 🎩 (BBC-style authoritative), Aroha ✨ (energetic), Sam 🎒 (casual Kiwi), Grace 📖 (poetic/thoughtful)
- **ElevenLabs AI integration** — Enter API key in Settings to switch all voices to ultra-realistic AI narration; falls back to Web Speech API automatically
- **Web Speech API fallback** — Each persona has a prioritised list of system voice names to match against
- **Playback speed control** — 0.75×, 1×, 1.25×, 1.5× — persisted to `localStorage`
- **Voice preview** — "▶ Preview" button in Settings lets you audition each persona before committing
- **Commentary overlay** — Shows active persona pill with ⚙ shortcut to Settings; ▶/⏹ play toggle

### Wishlist / Saved Places
- **♡ Save button** — Every POI popup now has a ♡ Save / ❤ Saved toggle button
- **Saved tab** — "❤ Saved" header tab with live badge count (red)
- **Wishlist view** — Sidebar panel lists all saved places with thumbnail, category, region, and ✕ remove button
- **Persistence** — Saved places stored in `localStorage` (`qw_saved`); survive page refresh

### Settings Modal
- Voice persona grid (5 cards, tap to select, Preview button per card)
- ElevenLabs API key input (stored encrypted-style in `localStorage`)
- Dark mode toggle
- Playback speed picker
- Opens from ⚙ button in header; closes on backdrop click or ✕

### Other
- **`<audio id="ttsAudio">` element** — Used for ElevenLabs streaming audio playback
- **`closeCommentary()`** — Properly cancels both Web Speech and `<audio>` sources

## Phase 4 Feature Sprint (Completed — May 2026)

All applied to `qiwiosity/mobile/prototype.html`:

### Stay Tab Enhancements
- **Accommodation sort chips** — Default / ★ Rating / $ Low / $ High; `setAccomSort()` / `renderAccomSortChips()`
- **Budget filter chips** — Any / Budget (≤$120) / Mid ($120–$250) / Luxury (>$250); `setAccomBudget()` / `renderAccomBudgetChips()`
- **Near Me sort** — Near Me active on Explore also sorts accommodations by distance; distance badge on stay cards
- **"Open in Maps ↗" + Directions buttons** in accommodation popup
- **Share accommodation** — "📤 Share" button in accommodation popup; uses Web Share API or clipboard; builds `?accom=<id>` URL; `shareAccom(id)`

### Deep-Link Handlers
- **`?poi=<id>` URL param** — After Supabase loads, pans map, opens popup, shows toast
- **`?accom=<id>` URL param** — Switches to Stay tab, pans map, opens accommodation popup, shows toast
- Both handled in the `handleDeepLink()` IIFE at end of boot

### Plan Sidebar Enhancements
- **`duplicateStop(id)`** — Clones a stop into the same day; button `⧉ Dup` on expanded stop cards
- **Move to Day dropdown** — `<select>` on expanded stop cards to move to any other day
- **Shuffle day stops** — `🔀 Shuffle` button in Plan stats + keyboard shortcut `Z`; Fisher-Yates shuffle of stops within the active day; `shuffleDayStops(day)`
- **Undo last stop removal** — Removing a stop shows an inline "↩ Undo" button in the toast for 6 seconds; `undoLastRemoval()` + keyboard shortcut `U`; stores `_lastRemovedStop` with index
- **Save/favourite toggle on plan card** — ♡/❤ button on each expanded stop card toggles `savedPOIs`; re-renders sidebar
- **Plan stats: avg stop rating** — "Avg stop rating ★ X.X" row in stats; computed from rated stops in itinerary
- **Plan stats: regions visited** — "Regions visited N" row in stats
- **`focusDayOnMap(day)`** + keyboard shortcut `F` — Fits map bounds to all stops in active day

### Saved Tab Improvements
- `"＋ Add all to trip"` button + `addAllSavedToTrip()` function
- Saved cards show rating badge + "Add to trip" / "✓ In trip" buttons
- Thumbnail via `getPoiImageUrl()`; `📋 Coords` copy-coordinates button in POI popup

### Sidebar UX
- Back-to-top sticky button in sidebar (appears after 200px scroll)
- Review count `(N)` shown next to rating in POI popup hero-meta
- Region click in sidebar: pans map + **toggles `state.activeRegion` filter** on `renderAttractions()`; active region highlighted with teal border + pill
- `clearAllFilters()` now also clears `state.activeRegion` and calls `renderRegionList()`
- Keyboard shortcuts `F`, `C`, `Z`, `U` added to `KB_SHORTCUTS` display

## Phase 1 UI Changes (Completed)

1. **Category filter UX** — Solo-select with "All categories" chip
2. **POI popup redesign** — Hero image with gradient overlay, action grid
3. **Commentary no-autoplay** — Separate ▶/⏹ toggle
4. **In-app directions** — DirectionsService + geolocation; falls back to external Maps
5. **Plan view toggle** — "Show nearby attractions on map"
6. **Route cleanup** — Routes cleared on tab switch
7. **Accommodation list** — Real cards with `accomCardClick()` and map sync

## Affiliate Monetisation (Completed)

Added to `qiwiosity/mobile/prototype.html`:

### Affiliate Programs Integrated
| Program | Button colour | Commission | Registration |
|---|---|---|---|
| Booking.com | Green | ~4–8% of booking | booking.com/affiliate-program |
| Wotif | Blue | ~4–8% of booking | wotif.com (Expedia Group) |
| Viator | Orange | 8% of activity booking | viatoraffiliates.com |
| GetYourGuide | Red | 8% of activity booking | partner.getyourguide.com |

### How it works
- **POI popups** — Show "🎯 Book on Viator" + "🎯 GetYourGuide" buttons above the regular action buttons, plus a "🛏 Find nearby stays" link in the affiliate strip
- **Accommodation popups** — Show "🛏 Book on Booking.com" + "🛏 Book on Wotif" buttons replacing the old single directions button
- **URL generation** — `affilBookingUrl()`, `affilWotifUrl()`, `affilViatorUrl()`, `affilGYGUrl()` build correctly-parameterised search URLs using the place/region name
- **Affiliate ID management** — IDs stored in `localStorage` (`qw_affiliate`); loaded via `loadAffiliateSettings()` at startup
- **Settings panel** — "💰 Affiliate IDs" section in the ⚙ Settings modal with input fields for all three programs, commission rate summary, and registration links. IDs are optional — links still work without them, they just won't be tracked.
- **`rel="noopener sponsored"`** — Correct for affiliate links (Google/GDPR compliant)

### To activate commissions
1. Open Settings (⚙ in header) → scroll to Affiliate IDs
2. Register at each program (links provided inline)
3. Paste your IDs and click Save
4. All booking/activity links will now include your tracking parameter

## Deployment

Configured as autoscale deployment running `node server.js`.
