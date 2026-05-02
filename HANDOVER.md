# Qiwiosity — Project Handover Document

**Prepared:** 26 April 2026 (updated: images wired up, accommodation detail, Expo Go ready)
**Owner:** Roydon McLaughlin (mclaughlin.roydon@gmail.com)
**Purpose:** Everything a new Claude session needs to pick up this project immediately.

---

## ⚠️ DATABASE CONSOLIDATION (20 April 2026)

The project was consolidated from three separate codebases into one unified architecture. Here's what changed:

### What was archived (in `_archive/`)
- `aotearoa-app/` — the v1 prototype (Expo 50, React 18). Superseded by `qiwiosity/mobile`.
- `backend_express/` — the Express.js API server. Being replaced by Supabase.
- `content_json_split/` — the region-split JSON files. Data now lives in `qiwiosity/database/seed/`.
- `old_content/` — legacy audio test files.
- `nz_points_of_interest.xlsx` — the original data spreadsheet.

### New unified database (`qiwiosity/database/`)
All data from every source has been merged into **one canonical set of seed files**:

| File | Records | Description |
|------|---------|-------------|
| `seed/pois.json` | 1,100 | Every POI with superset of all fields |
| `seed/accommodations.json` | 382 | All accommodation listings |
| `seed/regions.json` | 19 | Region metadata with bounds |
| `seed/categories.json` | 8 | Category definitions |
| `seed/poi_images.json` | 3,414 | Wikimedia image URLs |
| `seed/poi_scripts.json` | 50 | Parsed narration scripts |
| `seed/poi_audio.json` | 4 | Generated audio file references |
| `seed/region_images.json` | 21 | Region image URLs |
| `seed/category_images.json` | 19 | Category image URLs |

### Database deployment (Supabase)
- SQL migration: `qiwiosity/database/migrations/001_initial_schema.sql`
- Import script: `qiwiosity/database/import-to-supabase.js`
- Merge script (re-runnable): `qiwiosity/database/merge-all-sources.js`
- Env template: `qiwiosity/database/.env.example`

**To deploy:**
1. Create a Supabase project at supabase.com
2. Run the SQL migration in the SQL Editor
3. Copy `.env.example` to `.env` and fill in credentials
4. Run `npm install @supabase/supabase-js dotenv` in `qiwiosity/database/`
5. Run `node import-to-supabase.js`

### Mobile app data layer
The mobile app (`qiwiosity/mobile/`) now uses a unified data layer:
- `src/lib/supabase.js` — Supabase client (needs project URL + anon key)
- `src/lib/dataService.js` — Data service with Supabase → cache → bundled fallback
- `src/context/DataContext.js` — React context providing data to all screens
- All screens now use `useData()` hook instead of static JSON imports
- Bundled JSON files in `src/data/` are kept as offline fallback only

**The app works offline from first launch** using bundled data, then syncs with Supabase when connected.

### Architecture diagram
```
                    ┌──────────────────┐
                    │   SUPABASE DB    │
                    │   (PostgreSQL)   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  WEBSITE   │  │ MOBILE APP │  │   TOOLS    │
     │            │  │ (qiwiosity │  │ tts-render │
     │            │  │  /mobile)  │  │ reviews.js │
     └────────────┘  └────────────┘  └────────────┘
```

---

## PART 1 — Project Overview & Tech Stack

### What is this?

Qiwiosity is a New Zealand travel app — part interactive map, part audio tour guide, part trip planner. The goal is to be the "ultimate travel app for New Zealand," covering attractions, accommodations, itinerary planning, and voice-narrated cultural commentary across all 19 regions.

### One codebase: `qiwiosity/`

The project has been consolidated into a single monorepo:

| Workspace | Purpose | Key Tech |
|-----------|---------|----------|
| `mobile/` | React Native app | Expo SDK 54, React 19.1, RN 0.81.5 |
| `database/` | Unified DB schema, seeds, and import tools | PostgreSQL / Supabase |
| `tools/` | TTS rendering, review population | Node.js scripts |
| `content/` | Audio files and narration scripts | MP3 + Markdown |

**Run command:** `cd qiwiosity && npm --workspace mobile run start`

### Other files in the workspace root

| File | What it is |
|------|-----------|
| `Qiwiosity_Blueprint.docx` | Product vision and feature spec |
| `Qiwiosity_Execution_Plan.docx` | Development roadmap document |
| `Qiwiosity_Database_Consolidation_Plan.md` | Full analysis of the consolidation |
| `Qiwiosity_Logo_Brief_and_Prompts.md` | Brand/logo design brief |
| `logo/` | Logo assets |
| `_archive/` | Retired codebases and data files (aotearoa-app, old backend, spreadsheet) |

---

---

## PART 2 — Data & Content Inventory

### Data lives in the unified database

All data is now in `qiwiosity/database/seed/` as canonical JSON files, ready to import into Supabase. The mobile app's `src/data/` folder contains bundled copies for offline fallback only.

### Attractions / Points of Interest

| Location | Total POIs | Structure |
|----------|-----------|-----------|
| `aotearoa-app/src/data/attractions.json` | 767 | Single flat array |
| `qiwiosity/content/poi/{region}.json` | 1,100 | One file per region (19 files + index) |

The qiwiosity dataset is larger and more recent (1,100 vs 767). Both use the same base schema:

```json
{
  "id": "auckland-sky-tower",
  "name": "Sky Tower",
  "region": "auckland",
  "lat": -36.8484,
  "lng": 174.7625,
  "category": "heritage",
  "tags": ["viewpoint", "skyline", "engineering"],
  "duration_hours": 1,
  "short": "The 328m spire at the centre of Auckland...",
  "commentary": "Opened in 1997. At 328 metres..."
}
```

The qiwiosity version adds two extra fields:
- `trigger_radius_m` (200–400) — geofence trigger distance in metres
- `content_status` ("draft") — editorial review flag

**POIs by category (aotearoa-app):**
| Category | ID | Count | Color |
|----------|-----|-------|-------|
| Māori Heritage & Culture | `māori` | 295 | #C0392B (red) |
| Nature & Landscapes | `nature` | 201 | #2E7D32 (green) |
| Historic Sites | `heritage` | 166 | #4527A0 (purple) |
| Arts, Museums & Urban | `culture` | 59 | #2C6FAD (blue) |
| Wildlife & Conservation | `wildlife` | 18 | #00695C (teal) |
| Food & Wine | `food-wine` | 15 | #B71C1C (dark red) |
| Adventure & Adrenaline | `adventure` | 7 | #E65100 (orange) |
| Scenic Journeys | `journey` | 6 | #37474F (grey) |

**Note:** The data is heavily skewed — Māori (295) and Nature (201) together make up 65% of all POIs. Food & Wine (15), Adventure (7), and Journey (6) are very thin. This is a content gap worth addressing.

**POIs by region (aotearoa-app):**
Northland 57, Waikato 53, Wellington 50, Canterbury 49, Auckland 47, Bay of Plenty 47, Otago 46, Taranaki 44, Whanganui-Manawatū 44, Hawke's Bay 39, Southland 39, Tairāwhiti 38, Coromandel 35, Marlborough 34, Rotorua 34, West Coast 33, Nelson-Tasman 28, Taupō 28, Queenstown 22.

Distribution is reasonably even across regions.

### Accommodations

| Location | Total | Structure |
|----------|-------|-----------|
| `aotearoa-app/src/data/accommodations.json` | 382 | Single flat array |
| `qiwiosity/content/accommodations/{region}.json` | 382 | One file per region (19 files + index) |

Same count in both — exactly 20 per region (Queenstown and Whanganui-Manawatū have 21).

```json
{
  "id": "auckland-sofitel-viaduct",
  "name": "Sofitel Auckland Viaduct Harbour",
  "region": "auckland",
  "lat": -36.8432,
  "lng": 174.7591,
  "type": "hotel",
  "price_nzd_per_night": 420,
  "rating": 4.6,
  "short": "Five-star harbourside luxury on Viaduct marina with Sofitel signature spa."
}
```

**Accommodations by type:**
| Type | Count |
|------|-------|
| Motel | 134 |
| Hotel | 116 |
| Holiday Park | 77 |
| Lodge | 55 |

**Missing types:** No hostels/backpackers, no Airbnb/holiday homes, no glamping, no campgrounds, no farm stays. This is a significant gap for a NZ travel app — backpackers and holiday homes are a huge part of the NZ accommodation market.

### Regions

19 regions defined in `aotearoa-app/src/data/regions.json` and `qiwiosity/content/poi/index.json`:

North Island (12): Auckland, Bay of Plenty, Coromandel, Hawke's Bay, Northland, Rotorua, Tairāwhiti, Taranaki, Taupō, Waikato, Wellington, Whanganui-Manawatū.

South Island (7): Canterbury, Marlborough, Nelson-Tasman, Otago, Queenstown, Southland, West Coast.

Each region has: id, name (English / Te Reo), island, lat/lng centre point, description, and bounding box (north/south/east/west).

### Categories

8 categories defined in `aotearoa-app/src/data/categories.json`. Each has: id, label, Feather icon name, and hex color. (See table above for full list.)

### Audio files

Only 4 MP3 files exist in `qiwiosity/content/audio/`:
- `napier-bluff-hill.headline.mp3`
- `napier-bluff-hill.standard.mp3`
- `napier-marine-parade.headline.mp3`
- `napier-marine-parade.standard.mp3`

These are proof-of-concept only. The current audio experience uses text-to-speech (expo-speech) to read the `commentary` field aloud rather than pre-recorded audio.

### Source spreadsheet

`nz_points_of_interest.xlsx` in the workspace root is the original source data. The JSON files were generated from it.

---

---

## PART 3 — Features & Screens Implemented

### Navigation structure (aotearoa-app)

`AppNavigator.js` (70 lines) sets up a bottom tab navigator with 5 tabs, plus a native stack for the detail screen:

```
BottomTabs
├── Explore (MapScreen)
├── Attractions (AttractionsScreen)
├── Itinerary (ItineraryScreen)
├── Stay (AccommodationsScreen)
└── Guide (TourGuideScreen)

Stack (overlaid)
└── AttractionDetail (AttractionDetailScreen)
```

### Screen-by-screen breakdown

**1. SplashScreen (130 lines)**
- Full-screen animated hero with `splash-bg.png` background
- Fade-in app title "Aotearoa" with tagline
- "Begin Exploring" CTA button navigates to the main tabs
- Uses `Animated.Value` for fade effects

**2. MapScreen — "Explore" tab (150 lines)**
- Full-screen `react-native-maps` MapView centered on NZ (-41.0, 173.5)
- Color-coded markers for all attractions, colored by category
- Horizontal scrollable category filter chips at the top
- Tapping a marker shows a bottom action card with: name, short description, "Details" button, "Add to Itinerary" button
- Tapping background dismisses the card
- Callout press navigates to AttractionDetailScreen
- Uses `PROVIDER_DEFAULT` (Apple Maps on iOS, Google on Android)

**3. AttractionsScreen — "Attractions" tab (81 lines)**
- Search bar (text input) filtering across name, short description, and tags
- FlatList of attraction cards
- Each card shows: colored left stripe (category color), name, region name, tags as grey pills
- Tap card navigates to AttractionDetailScreen
- Uses `useMemo` for filtering (but no debounce)

**4. AttractionDetailScreen (212 lines)**
- Full scrollable detail view for a single attraction
- Top section: category color banner, name, region
- Commentary box with headphones icon and "Listen" button
- "Listen" triggers `expo-speech` to read the `commentary` field aloud
- Stop button to cancel speech
- "Add to Itinerary" / "Remove from Itinerary" toggle button
- "More like this" section: horizontal carousel of up to 6 attractions in the same category
- "Get Directions" button opens native maps app with lat/lng

**5. ItineraryScreen — "Itinerary" tab (182 lines)**
- Shows all user-added attractions in order
- Up/down arrow buttons to reorder stops
- Each card shows: name, region, duration
- Remove button (trash icon) per item
- Footer stats: total stops, total activity hours, estimated driving distance (km), estimated drive time
- "Open Route in Maps" button generates a multi-stop Google Maps URL with all waypoints
- Distance uses haversine formula (straight-line); drive time assumes 75 km/h average
- State persisted to AsyncStorage under key `@aotearoa/itinerary`

**6. AccommodationsScreen — "Stay" tab (77 lines)**
- Horizontal filter chips for accommodation type (Hotel, Motel, Holiday Park, Lodge)
- FlatList of accommodation cards
- Each card shows: name, type pill, region, price (NZD/night), star rating
- No detail screen for accommodations (tap does nothing beyond the card)

**7. TourGuideScreen — "Guide" tab (86 lines)**
- FlatList of all attractions with play button
- Tap play icon triggers `expo-speech` to read the commentary
- Currently playing item is highlighted
- Stop button to cancel speech
- Simple list UI — no grouping by region or category

### Additional screens in qiwiosity mobile (not in aotearoa-app)

| Screen | Lines | What it adds |
|--------|-------|-------------|
| OfflineScreen | — | Download region audio packs for offline use; shows download progress |
| SearchScreen | — | Dedicated search with advanced filtering |
| SettingsScreen | — | User preferences: audio length (headline/standard), autoplay toggle |

### Contexts (state management)

**ItineraryContext (60 lines, both apps)**
- React Context + `useReducer` with actions: ADD, REMOVE, REORDER, HYDRATE
- Persists to AsyncStorage on every change
- Hydrates on app mount
- Provides: `items`, `addItem()`, `removeItem()`, `reorderItem()`

**NarrationContext (qiwiosity only)**
- Manages currently playing audio/speech
- Provides: current POI, play/pause/stop, playback state

**PreferencesContext (qiwiosity only)**
- User settings: preferred audio length, autoplay enabled
- Persists to AsyncStorage

### Hooks (qiwiosity only)

| Hook | Purpose |
|------|---------|
| `useGeofence` | Watches device GPS, triggers narration when entering a POI's `trigger_radius_m` |
| `useLocationPermission` | Requests and manages location permission state |
| `useNarration` | Controls expo-speech / audio playback lifecycle |

### Components (qiwiosity only)

| Component | Purpose |
|-----------|---------|
| `NowPlayingStrip` | Mini player bar on tab navigator showing current narration |

### Utilities

| File | Purpose | Both apps? |
|------|---------|-----------|
| `geo.js` | `haversine()` distance, `totalDistanceKm()`, `estimateDrivingHours()` (75 km/h) | Yes |
| `directions.js` | Opens native maps with single or multi-stop directions | Yes |
| `audio.js` | Download/cache MP3 files from backend | Qiwiosity only |
| `contentCache.js` | Fetch and persist content JSON from API for offline use | Qiwiosity only |

### Backend API endpoints (qiwiosity, 199 lines)

| Method | Path | Returns |
|--------|------|---------|
| GET | `/healthz` | `{ status: "ok" }` |
| GET | `/v1/regions` | Array of regions with POI counts |
| GET | `/v1/regions/:id` | Single region + all its POIs |
| GET | `/v1/pois` | Flat array of all POIs (matches mobile data shape) |
| GET | `/v1/pois/:id` | Single POI with resolved script |
| GET | `/v1/manifest` | Content version hash (SHA256), region/POI/accommodation counts |
| GET | `/v1/accommodations` | Filtered list (query: region, type, minPrice, maxPrice) |
| GET | `/v1/accommodations/:id` | Single accommodation |
| GET | `/v1/regions/:id/accommodations` | Accommodations for a specific region |
| GET/static | `/v1/audio/:file` | Serves MP3 files with 1-day cache header |

### Browser prototype

`aotearoa-app/prototype.html` (~18,500 lines) is a self-contained HTML file with:
- Leaflet.js map with OpenStreetMap tiles
- All 767 attractions and 382 accommodations embedded as inline JSON
- Sidebar with search, category filters, region filters, accommodation type filters
- Color-coded markers with popups
- Responsive layout
- Web Speech API for audio commentary
- Fully functional without any server

---

---

## PART 4 — Design System & Brand

### Theme (identical in both apps)

Both `aotearoa-app/src/theme.js` and `qiwiosity/mobile/src/theme.js` are identical files exporting four objects:

**Colors:**
```
primary:     #15888A  (teal — main brand color, from logo)
primaryDark: #0E5F5F  (deep teal — used in wordmark)
primaryDeep: #083D3D  (darkest teal — splash background, shadows)
accent:      #E07B3C  (warm orange — CTA buttons, highlights)
bg:          #F5F3EF  (warm stone — page backgrounds)
surface:     #FFFFFF  (white — cards, modals)
text:        #1A1A1A  (near-black — body text)
muted:       #6B6B6B  (grey — captions, secondary text)
border:      #E5E1D8  (warm grey — dividers, card borders)
danger:      #C62828  (red — delete, errors)
success:     #2E7D32  (green — confirmations)
```

**Spacing scale:** xs(4), sm(8), md(12), lg(16), xl(24), xxl(32)

**Border radius:** sm(6), md(10), lg(16), pill(999)

**Typography:**
- Title: 22px, bold (700)
- Heading: 17px, semibold (600)
- Body: 14px, regular
- Caption: 12px, muted color

### Category colors (used on map markers and card stripes)

These are defined in `categories.json`, separate from the theme:
```
Māori:     #C0392B (red)
Heritage:  #4527A0 (purple)
Nature:    #2E7D32 (green)
Culture:   #2C6FAD (blue)
Food:      #B71C1C (dark red)
Wildlife:  #00695C (teal)
Adventure: #E65100 (orange)
Journey:   #37474F (slate)
```

### Brand assets

**`aotearoa-app/assets/`:**
- `logo.png` — Full Qiwiosity logo (wordmark + speech bubble icon)
- `logo-mark.png` — Icon-only version of the logo
- `splash-bg.png` (1.8 MB) — Hero background image for the mobile splash screen
- `splash-bg-website.png` (3 MB) — Larger variant for the browser prototype

**`logo/`** (workspace root):
- 10 PNG files — logo concept explorations generated via ChatGPT (dated 18-19 April 2026)

**`Qiwiosity_Logo_Brief_and_Prompts.md`** — Detailed logo design brief describing the brand identity: teal speech-bubble with a kiwi bird silhouette, representing "curious storytelling about New Zealand."

### Brand identity

The name "Qiwiosity" = Kiwi + Curiosity. The visual language is warm, inviting, and culturally respectful — teal as a nod to NZ's waters, orange accents for energy and adventure, stone/cream backgrounds for warmth.

### What's NOT in place

- No custom fonts (uses system defaults)
- No dark mode theme variant (though `app.json` has `userInterfaceStyle: "automatic"`)
- No app icon or adaptive icon designed (referenced in `app.json` but files don't exist)
- No formal splash screen asset (the file `splash.png` referenced in `app.json` is not present — the app uses a custom SplashScreen component instead)
- Inline styles throughout screens rather than shared StyleSheet components

---

---

## PART 5 — Known Issues & Technical Debt

### Performance

1. **No FlatList optimization.** All 767 attractions render without `getItemLayout`, `windowSize`, `maxToRenderPerBatch`, or `initialNumToRender`. This will cause jank on lower-end Android devices.

2. **No search debounce.** AttractionsScreen re-filters the full dataset on every keystroke. Should debounce by 200-300ms.

3. **Haversine distance is inaccurate.** Itinerary driving estimates use straight-line distance at a flat 75 km/h. NZ roads are winding — actual times can be 2-3x longer. Users will not trust these estimates.

4. **Prototype HTML is 18,500 lines.** All data is inlined. This is fine as a dev prototype but would need to be restructured for production web use.

### Architecture

5. **Two codebases, neither complete.** The aotearoa-app has better UI; the qiwiosity monorepo has better architecture. Neither is the "real" app yet. This needs to be resolved before shipping.

6. **No reusable components.** The `src/components/` directory is empty. All UI is defined inline within screen files. Attraction cards, accommodation cards, filter chips, and audio controls are all duplicated.

7. **No TypeScript, no prop-types.** Zero type safety anywhere. All function signatures are untyped.

8. **No tests.** No unit tests, integration tests, or e2e tests exist.

9. **No linting.** No ESLint config, no Prettier config, no pre-commit hooks.

10. **Backend reads JSON from disk on every request.** Fine at low scale but will need caching or a real database if traffic grows.

### Missing features that users will expect

11. **~~No images.~~** ✅ FIXED 26 April — POI images from Wikimedia are now rendered as hero images on AttractionDetailScreen, thumbnails on attraction cards, and in the "More like this" carousel. 4,603 images covering 1,911 POIs are bundled via `poi_images.json`.

12. **No user accounts or authentication.** Itineraries are device-local only. No cross-device sync, no sharing.

13. **~~No accommodation detail screen.~~** ✅ FIXED 26 April — AccommodationDetailScreen now shows property details, pricing, rating, directions, and a "Book online" deep link. Wired into navigation from AccommodationsScreen, MapScreen, and ItineraryScreen.

14. **No user location on map.** The map doesn't show where the user is — critical for a travel app.

15. **Missing accommodation types.** No hostels/backpackers, Airbnb/holiday homes, glamping, campgrounds, or farm stays. These are core to NZ tourism.

16. **Thin content categories.** Food & Wine has only 15 POIs, Adventure has 7, Scenic Journeys has 6. These categories feel empty.

### Code quality

17. **No error handling in directions.** If map link fails, user gets a generic Alert. No graceful fallback.

18. **No loading states.** Data renders instantly from bundled JSON, but if the app moves to API-fetched data, there are no loading skeletons or spinners.

19. **No error boundaries.** A crash in one screen will crash the entire app.

20. **No accessibility.** Zero `accessibilityLabel`, `accessibilityRole`, or screen reader support.

21. **Missing app assets.** `app.json` references `icon.png`, `adaptive-icon.png`, `splash.png`, and `favicon.png` but these files don't exist in the assets folder.

### Data quality notes

22. **All qiwiosity POIs have `content_status: "draft"`.** No content has been marked as reviewed/published.

23. **Only 4 audio files exist** (2 Napier POIs × 2 lengths). The rest of the audio experience is text-to-speech.

---

---

## PART 6 — Recommended Next Steps (Prioritized)

The data is in good shape (767–1,100 POIs, 382 accommodations, 19 regions). Adding more content provides diminishing returns now. The biggest gains come from improving the experience around the existing content.

### TIER 1 — Do next (high impact, moderate effort)

**A. Add images to attractions and accommodations**
Why: Travel is visual. Text-only cards feel like a database, not a travel app. One hero image per POI transforms the experience.
How: Add an `image_url` field to each POI/accommodation JSON. Options include Unsplash API (free, good NZ coverage), Wikimedia Commons, or curating original photos. Update AttractionDetailScreen and card components to display images.
Effort: Medium (data enrichment + UI changes).

**B. Optimize FlatList performance**
Why: 767+ items without virtualization causes scroll jank.
How: Add `getItemLayout`, `initialNumToRender: 15`, `maxToRenderPerBatch: 10`, `windowSize: 5`. Add debounce (300ms) to search input.
Effort: Small (a few hours).

**C. Show user location on map**
Why: Table stakes for a travel app. Users need to see where they are relative to attractions.
How: `expo-location` is already a dependency. Add `showsUserLocation={true}` to MapView, request permission on mount.
Effort: Small.

**D. Build an accommodation detail screen**
Why: Currently tapping an accommodation does nothing. Users expect to see details and a way to book.
How: Create AccommodationDetailScreen mirroring AttractionDetailScreen. Add deep links to Booking.com or Google Maps for the property.
Effort: Small-Medium.

### TIER 2 — Important for a real launch

**E. Consolidate into one codebase**
Why: Maintaining two apps is unsustainable. The qiwiosity monorepo is the better long-term architecture.
How: Migrate aotearoa-app's polished screen UI into qiwiosity/mobile. Use qiwiosity's backend for content delivery. Keep the aotearoa-app data as a fallback bundle.
Effort: Medium-Large.

**F. Real routing distances**
Why: Haversine at 75 km/h is misleading for NZ's winding roads.
How: Integrate a routing API — OSRM (free, self-hosted), Mapbox Directions, or Google Directions API. Cache common route segments.
Effort: Medium.

**G. Extract reusable components**
Why: DRY principle. Card components, filter chips, and audio controls are duplicated across screens.
How: Create `src/components/` with: AttractionCard, AccommodationCard, CategoryChip, AudioPlayer, SearchBar.
Effort: Small-Medium.

**H. Fill content gaps**
Why: Food & Wine (15), Adventure (7), Journey (6) feel empty. No hostels/backpackers in accommodations.
How: Add 20-30 more POIs in thin categories. Add hostel, glamping, campground, and holiday home accommodation types.
Effort: Medium (content creation).

### TIER 3 — Before public launch

**I. User accounts and cloud sync**
Why: Itineraries die when the app is deleted. Users want cross-device access.
How: Firebase Auth + Firestore, or Supabase. Store itineraries server-side.
Effort: Large.

**J. Offline support**
Why: Many NZ attractions are in areas with no cell coverage.
How: Pre-download region data + map tiles. The qiwiosity version has plumbing for this in `contentCache.js` and `audio.js`.
Effort: Large.

**K. Accessibility**
Why: Legal and ethical requirement for public apps.
How: Add `accessibilityLabel` and `accessibilityRole` to all interactive elements. Test with VoiceOver/TalkBack.
Effort: Medium.

**L. App icons, splash, and store assets**
Why: Can't publish without them.
How: Design proper app icon from the Qiwiosity logo. Create splash screen asset. Prepare App Store / Play Store screenshots and metadata.
Effort: Medium.

**M. Weather and seasonal info**
Why: NZ weather varies dramatically by region and season. Helps trip planning.
How: Integrate a weather API (OpenWeatherMap, MetService NZ). Show conditions per region or POI.
Effort: Medium.

### What NOT to do yet

- Don't add more POI data beyond filling the thin categories — 767-1,100 is plenty
- Don't build social features (reviews, photos, sharing) — get the core experience right first
- Don't integrate payments or bookings natively — deep links to existing platforms are sufficient for now
- Don't build a web version from scratch — the prototype.html works as a demo; focus on mobile

---

---

## PART 7 — File Map & Key Paths

All paths are relative to the workspace root (`Tourism map/`).

### Workspace root

```
Tourism map/
├── aotearoa-app/                    ← Working MVP (Expo 50, RN 0.73)
├── qiwiosity/                       ← Advanced monorepo (Expo 54, RN 0.81)
├── logo/                            ← Logo concept PNGs (10 files)
├── Qiwiosity_Blueprint.docx         ← Product vision document
├── Qiwiosity_Execution_Plan.docx    ← Development roadmap document
├── Aotearoa_Guide_Blueprint.docx    ← Earlier vision doc
├── Aotearoa_Guide_Execution_Plan.docx ← Earlier roadmap
├── Qiwiosity_Logo_Brief_and_Prompts.md ← Brand/logo design brief
├── nz_points_of_interest.xlsx       ← Source POI spreadsheet
├── build_blueprint.js               ← Script that generated blueprint docx
├── build_execution_plan.js          ← Script that generated plan docx
├── package.json                     ← Root package (for docx build scripts)
└── HANDOVER.md                      ← This document
```

### aotearoa-app/ (MVP)

```
aotearoa-app/
├── App.js                           ← Entry point
├── app.json                         ← Expo config (bundle ID: nz.aotearoa.app)
├── package.json                     ← Dependencies (Expo 50, RN 0.73.6)
├── prototype.html                   ← Standalone browser prototype (~18,500 lines)
├── assets/
│   ├── logo.png                     ← Full Qiwiosity logo
│   ├── logo-mark.png                ← Icon-only logo
│   ├── splash-bg.png                ← Mobile splash background (1.8 MB)
│   └── splash-bg-website.png        ← Web splash background (3 MB)
└── src/
    ├── theme.js                     ← Colors, spacing, radius, typography
    ├── context/
    │   └── ItineraryContext.js       ← Itinerary state (add/remove/reorder/persist)
    ├── data/
    │   ├── attractions.json          ← 767 POIs
    │   ├── accommodations.json       ← 382 accommodations
    │   ├── categories.json           ← 8 categories with colors/icons
    │   └── regions.json              ← 19 regions with bounds
    ├── navigation/
    │   └── AppNavigator.js           ← Bottom tabs + stack navigator
    ├── screens/
    │   ├── SplashScreen.js           ← Animated landing (130 lines)
    │   ├── MapScreen.js              ← Interactive map with filters (150 lines)
    │   ├── AttractionsScreen.js      ← Searchable POI list (81 lines)
    │   ├── AttractionDetailScreen.js ← POI detail + audio + itinerary (212 lines)
    │   ├── ItineraryScreen.js        ← Trip planner with routing (182 lines)
    │   ├── AccommodationsScreen.js   ← Filterable stays list (77 lines)
    │   └── TourGuideScreen.js        ← Audio tour list (86 lines)
    └── utils/
        ├── geo.js                    ← Haversine distance, drive time estimates
        └── directions.js             ← Open native maps for directions
```

### qiwiosity/ (Monorepo)

```
qiwiosity/
├── package.json                     ← Workspaces: mobile, backend, tools
├── mobile/
│   ├── index.js                     ← Entry point
│   ├── app.json                     ← Expo config
│   ├── package.json                 ← Dependencies (Expo 54, RN 0.81.5, React 19)
│   └── src/
│       ├── theme.js                 ← Same theme as aotearoa-app
│       ├── components/
│       │   └── NowPlayingStrip.js   ← Mini player bar on tab nav
│       ├── context/
│       │   ├── ItineraryContext.js   ← Same as aotearoa-app
│       │   ├── NarrationContext.js   ← Audio playback state
│       │   └── PreferencesContext.js ← User settings (audio length, autoplay)
│       ├── hooks/
│       │   ├── useGeofence.js       ← GPS watch → trigger narration at POIs
│       │   ├── useLocationPermission.js ← Location permission flow
│       │   └── useNarration.js      ← Speech/audio playback lifecycle
│       ├── navigation/
│       │   └── AppNavigator.js      ← Tabs + stack (adds Offline, Search, Settings)
│       ├── screens/
│       │   ├── SplashScreen.js
│       │   ├── MapScreen.js
│       │   ├── AttractionsScreen.js
│       │   ├── AttractionDetailScreen.js
│       │   ├── ItineraryScreen.js
│       │   ├── AccommodationsScreen.js
│       │   ├── TourGuideScreen.js
│       │   ├── OfflineScreen.js     ← Region audio download manager
│       │   ├── SearchScreen.js      ← Advanced search
│       │   └── SettingsScreen.js    ← Preferences UI
│       └── utils/
│           ├── geo.js
│           ├── directions.js
│           ├── audio.js             ← Download/cache MP3s from backend
│           └── contentCache.js      ← Fetch/persist content JSON for offline
├── backend/
│   ├── package.json                 ← Express 4.19, CORS
│   └── src/
│       └── server.js                ← API server (199 lines, port 4000)
├── content/
│   ├── poi/
│   │   ├── index.json               ← Region index
│   │   ├── auckland.json            ← 62 POIs (one file per region, 19 total)
│   │   └── ... (18 more region files)
│   ├── accommodations/
│   │   ├── index.json               ← Accommodation index
│   │   ├── auckland.json            ← 20 accommodations (one per region, 19 total)
│   │   └── ... (18 more region files)
│   └── audio/
│       ├── napier-bluff-hill.headline.mp3
│       ├── napier-bluff-hill.standard.mp3
│       ├── napier-marine-parade.headline.mp3
│       └── napier-marine-parade.standard.mp3
└── tools/
    └── lint-content.js              ← Validates content JSON structure
```

### Key data shapes (quick reference)

**Attraction:** `{ id, name, region, lat, lng, category, tags[], duration_hours, short, commentary }` (+ `trigger_radius_m`, `content_status` in qiwiosity)

**Accommodation:** `{ id, name, region, lat, lng, type, price_nzd_per_night, rating, short }`

**Region:** `{ id, name, island, lat, lng, description, bounds: { north, south, east, west } }`

**Category:** `{ id, label, icon, color }`

### AsyncStorage keys

- `@aotearoa/itinerary` — Persisted itinerary items (array of attraction objects)

### Environment / run commands

| What | Command | Port |
|------|---------|------|
| aotearoa-app | `cd aotearoa-app && npx expo start` | 8081 |
| qiwiosity mobile | `cd qiwiosity && npm --workspace mobile run start` | 8081 |
| qiwiosity backend | `cd qiwiosity && npm --workspace backend run dev` | 4000 |
| Content lint | `cd qiwiosity && npm run lint:content` | — |

---

*End of handover document.*
