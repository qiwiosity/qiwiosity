# Qiwiosity — Remaining Work

> Last updated: May 2026
> Working through full backlog systematically.

---

## ✅ COMPLETED (latest batch — Phase 8: Authorisation Pass)

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
