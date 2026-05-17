# Qiwiosity — Remaining Work

> Last updated: May 2026
> Working through full backlog systematically.

---

## ✅ COMPLETED (Phase 9: Multi-Language)

- **8 languages supported** — English, Te Reo Māori, 中文 (Simplified Chinese), 日本語, 한국어, Deutsch, Français, Español
- **Translation dictionary + helpers** — `LANG_DICT`, `t(key, fallback)`, `applyLang()`, `setLang(code)`, `initLang()`
- **Settings → 🌐 Language** — Dropdown switcher with flag emojis, auto-detects from `navigator.language` on first visit, persists to localStorage `qw_lang`
- **Translated UI surfaces** (60+ keys per language × 8 languages = ~500 translations):
  - Splash screen (headline, subtitle, 4 feature cards, "Begin Exploring" button)
  - Top tabs (Explore / Stay / Plan / Compare / Saved)
  - **Explore view** — Categories heading, search placeholder
  - **Stay view** — title + search placeholder
  - **Plan view** — Starting point label & placeholder, Generate AI Trip, Driving Mode, "Show nearby attractions on map" toggle, Quick templates section + 3 template names
  - **Compare view** — title, intro paragraph, group toolbar chips (By Category / By Region / All together)
  - **Saved view** — title + empty-state heading & description (rendered via `t()` for dynamic re-render)
  - **Settings panel** — all 5 section headings + Dark Mode label/description + Language section
  - **POI popup action row** — Add to Itinerary, In Itinerary, More, Save, Drive, Similar, Share, Compare buttons (rendered via `t()` so they update on language switch)
  - **POI popup booking strip** — "Book on Viator", "GetYourGuide", "Book tours · earn us a small commission", "Find nearby stays" (Viator/GetYourGuide brand names kept; verbs translated)
  - **AI Trip Planner modal** (full 3-step flow) — Title, subtitle, all 3 step labels, all 3 panel titles & subtitles, every field label (Days / Travellers / Adults / Children / Starting From / Round Trip / Ending In / Interests / Travel Pace / Budget / Accommodation / Special notes), notes textarea placeholder, loading text, "Load into Planner" / "Regenerate" / "Back" / "Next" buttons
  - **Travel Diary editor** — Title, Visited on, Photos, "No photos yet" empty state, Journal entry label, journal placeholder, Save/Cancel buttons
- **Settings-level language control** — Translation stays centralised in Settings so users choose their preferred app language once instead of seeing translate controls on every POI
- **`data-i18n` / `data-i18n-ph` attributes** — declarative system so future strings can be added by tagging the markup
- **Re-application strategy** — `applyLang()` runs at script-parse time, again on `DOMContentLoaded`, and after every language switch; dynamic content (popups) uses `t()` directly inside templates so it re-renders correctly
- **HTML `lang` attribute** — set automatically so screen readers and browsers know the active language

## ✅ COMPLETED (Phase 8: Authorisation Pass)

- **[NEW] ElevenLabs server proxy** — `/api/tts` endpoint in `server.js`; uses `ELEVENLABS_API_KEY` env var; client falls back to server when no local key set; `/api/tts/status` exposes availability
- **[NEW] Admin Tools tab** — Combined moderation queue, GPS audit, CSV upload, image management, server status
- **[NEW] Moderation queue** — User-submitted POIs (from Add POI form or CSV) appear in `qw_pending_pois` localStorage; Approve injects into live ATTRACTIONS, Reject removes
- **[NEW] GPS audit** — Detects POIs outside NZ bounding box (lat -47.5..-34, lng 166..179), suspicious clusters (within 50m), and duplicate names; click-to-jump to POI editor
- **[NEW] Bulk CSV upload** — Admin Tools file picker; validates required columns (name/region/category/lat/lng); queues for moderation; downloadable template button
- **[NEW] Image management dashboard** — POIs with no images / only 1 image; click-to-jump list of top 20 needing photos
- **[NEW] Real Add-POI submission** — `submitAdminPoi()` reads form, validates, queues to moderation (was previously a no-op toast)
- **[NEW] Social share menu** — `showShareMenu()` modal with WhatsApp, X, Facebook, Email, SMS, Copy, + native share fallback; replaces previous one-shot share calls
- **[NEW] Travel Diary** — Per-stop photos (FileReader + canvas compression to 800px JPEG @ 0.78) + journal text + visited date; localStorage `qw_diary`; 📔 Diary button on expanded stop cards; "📔 Diary" Plan tab button opens print-ready full-trip journal in a new window

## ✅ COMPLETED (Phase 7)

- Top Picks chips: image thumbnail + category + ★rating + "✓ in trip" badge
- Plan stats: Top region row, "saved-not-in-trip" nudge with "Add all" button
- Saved tab: region summary + filter buttons + sort chips + CSV export
- POI popup hero `📷 N` image-count badge + "⚖ Compare" button on detail
- Compare cards: region + "+ Trip" / 📖 Detail buttons; sorted by rating; excludes self
- Stay tab: 72px thumbnail image; Save button in info window; clickable nearby-stay strip in plan day
- Admin: Activity tab with Data Quality cards (no images / no rating / no commentary)
- printTrip: ★ Rating column added
- addToItinerary: toast confirmation + assigns active day
- surpriseMe: 70% region-aware

## ✅ COMPLETED (earlier phases — see git log)

- Phase 4: accom sort/budget chips, Near Me distance sort, share accom, deep-link `?accom=`, duplicateStop, Move to Day, shuffleDayStops, undoLastRemoval, save toggle on plan stop, plan stats avg rating + regions visited, region filter highlight, kb shortcuts Z/U/C, addAllSavedToTrip, coords copy, review count, back-to-top
- Phase 3: per-stop notes, rating filter, sort control, attraction counter, switchView/switchTab helpers, dark-mode kb shortcut fix, printTrip, itinerary persistence, exportWishlist
- Phase 2: Surprise Me, region POI counts, Trip Cost Estimator, Near Me geolocation, Recently Viewed, POI Detail overlay, search autocomplete, PWA manifest
- Phase 1: splash, dark mode, 5 voice personas, ElevenLabs, wishlist, affiliate links, audio commentary, AI Trip Generator, Community Voices (EchoVerse), marker clustering, in-app directions, decision mode, compare sheet, onboarding, map style switcher, kb shortcuts overlay

---

## 🟡 REMAINING — REQUIRES BACKEND / OUT OF SCOPE FOR HTML PROTOTYPE

### User Accounts & Cloud Sync
Needs: auth provider (Supabase Auth / Google / Apple / Email), users table, RLS policies, sync logic for itinerary/wishlist/diary across devices. Currently everything is localStorage. Would require a substantial backend phase.

### CarPlay / Android Auto
Needs a native iOS/Android wrapper (React Native, Capacitor, or native shells). Cannot be done in a single-file HTML prototype.

### Travel Diary — Cloud Photo Storage
Currently photos are stored as base64 in localStorage (compressed to 800px JPEG, ~40-100KB each). For production, migrate to S3/Supabase Storage with presigned URLs.

### Admin: Production Persistence
Moderation approvals currently inject into in-memory ATTRACTIONS (lost on reload). For production, approve/reject must POST to a Supabase function that writes to the `pois` table.

---

## 🔵 TECHNICAL DEBT (acknowledged, low-priority for prototype)

- Google Maps `Marker` is deprecated — migrate to `AdvancedMarkerElement` (warning is informational; existing markers continue to work). Migration touches ~10 sites and requires the `marker` library to be loaded.
- GPS coordinates on some POIs are inaccurate — **NOW VISIBLE in Admin → Tools → GPS Audit** (out-of-bounds + suspicious-pair detection)
- Community Voices audio stored as base64 in localStorage — would migrate to cloud storage for production
