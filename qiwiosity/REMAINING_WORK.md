# Qiwiosity — Remaining Work

> Last updated: May 2026  
> Quick wins from wishlist have been completed. This document covers all outstanding features.

---

## ✅ COMPLETED (latest batch — Phase 4)

- **[NEW] Stay tab: Accommodation sort chips** — Default / ★ Rating / $ Low / $ High; `setAccomSort()` / `renderAccomSortChips()`
- **[NEW] Stay tab: Budget filter chips** — Any / Budget / Mid / Luxury; `setAccomBudget()` / `renderAccomBudgetChips()`
- **[NEW] Stay tab: Near Me distance sort + badge** — accom cards sorted by distance when Near Me active
- **[NEW] Stay tab: "Open in Maps ↗" + Directions** buttons in accommodation popup
- **[NEW] Share accommodation** — "📤 Share" in accom popup; builds `?accom=<id>` URL; Web Share API or clipboard fallback; `shareAccom(id)`
- **[NEW] Deep-link ?accom=** — Boot handler: switches to Stay tab, pans map, opens accom popup
- **[NEW] duplicateStop(id)** — "⧉ Dup" button on expanded plan stop cards; clones stop into same day
- **[NEW] Move to Day dropdown** — `<select>` on expanded plan stop cards
- **[NEW] shuffleDayStops(day)** — "🔀 Shuffle" in Plan stats + keyboard shortcut Z; Fisher-Yates shuffle within active day
- **[NEW] Undo last stop removal** — "↩ Undo" inline in toast for 6s; `undoLastRemoval()` + keyboard shortcut U
- **[NEW] Save/favourite toggle on plan stop card** — ♡/❤ button on expanded cards; re-renders sidebar
- **[NEW] Plan stats: avg stop rating** — ★ X.X row computed from rated stops in itinerary
- **[NEW] Plan stats: regions visited** — unique region count row in stats
- **[NEW] Region filter active highlight** — Clicked region in sidebar gets teal border + pill; filter applied to `renderAttractions()`; second click clears; clearAllFilters also clears it; KB shortcut C
- **[NEW] Keyboard shortcuts Z (shuffle) + U (undo)** — Wired into global keydown handler + shown in ? overlay
- **[NEW] Saved tab: Add all to trip button** — `addAllSavedToTrip()` adds all saved POIs to current trip
- **[NEW] Saved tab: Rating badge + In trip indicator** on wishlist cards
- **[NEW] Coords copy button** — `📋 Coords` in POI popup copies lat/lng to clipboard
- **[NEW] Review count** `(N)` shown next to rating in POI popup hero-meta
- **[NEW] Back-to-top** sticky button in sidebar (appears after 200px scroll)

## ✅ COMPLETED (previous batch)

- **[NEW] Per-stop notes** — "📝 Note" button on each expanded itinerary stop card; textarea stores note on the stop object; note preview shown below stop name in collapsed card; `toggleStopNote()` / `saveStopNote()`; persisted via localStorage itinerary save
- **[NEW] Rating filter** — "★ Min rating" chip row in Explore sidebar (Any / 3.5+ / 4.0+ / 4.5+); filters `renderAttractions()` by `a.reviews.rating`; `_minRating` state; `renderRatingFilter()` / `setMinRating()`
- **[NEW] Sort control** — "Sort" chip row in Explore sidebar (Default / ★ Rating / A–Z); sorts filtered list in `renderAttractions()`; overridden by Near Me distance sort; `_sortMode` state; `renderSortChips()` / `setSortMode()`
- **[NEW] Attraction counter** — "Showing X of 2,453 places" line in Explore sidebar, updates on every filter change; turns teal when filtering is active; `#attractionCounter` element updated in `renderAttractions()`
- **[NEW] switchView() / switchTab()** — Programmatic tab switching helpers wrapping the tab click event; keyboard shortcuts E/P/S now work correctly
- **[NEW] Dark mode keyboard shortcut fix** — `D` key now properly toggles `toggleDarkMode()` and syncs the checkbox
- **[NEW] Print / Export trip** — "🖨 Print / Export" button in Plan stats; opens a new window with formatted print-ready HTML itinerary (day-by-day tables, stop notes column, totals header, Qiwiosity branding); auto-triggers browser print dialog; `printTrip()`
- **[NEW] Itinerary persistence** — Trip itinerary auto-saves to `localStorage` (`qw_itinerary`) on every add/remove/reorder/note/day-move; restored after Supabase data loads with a toast; `saveItineraryToStorage()` / `restoreItineraryFromStorage()`
- **[NEW] Wishlist export** — "📋 Export" button in Saved Places sidebar; opens a print-ready HTML list with all saved places (name, region, type, rating, short description); `exportWishlist()`

## ✅ COMPLETED (earlier)

- **[NEW] Surprise Me / Discover** — "🎲 Surprise Me" teal button in Explore sidebar; picks from top-rated (≥4.0) or top-30% POIs; avoids last-20 repeats via `_surpriseHistory`; pans map + opens popup + toast
- **[NEW] Region POI counts** — Each region in sidebar shows a teal pill with live count from ATTRACTIONS data
- **[NEW] Trip Cost Estimator** — "💰 Cost estimate" collapsible row in Plan stats; estimates fuel, activity fees, accommodation, food; shows low–high NZD range
- **[NEW] Near Me — Geolocation** — "📍 Near Me" toggle; browser geolocation; blue dot marker; distance sort; distance badge in POI popup
- **[NEW] Recently Viewed strip** — Horizontal scrollable chip strip; tracks last 12 tapped POIs in localStorage
- **[NEW] POI Detail Full-Screen Overlay** — "📖 More" button; full-screen overlay with hero, gallery, commentary, tags, affiliate links
- **[NEW] Search Autocomplete** — Dropdown suggestions as user types; top 6 matches highlighted
- **[NEW] PWA Manifest + Meta Tags** — `manifest.json`, Apple meta tags, OG tags
- Premium splash screen, dark mode, 5 voice personas, ElevenLabs integration
- Wishlist / saved places, affiliate links, audio commentary, admin panel
- AI Trip Generator (3-step wizard), Community Voices (EchoVerse)
- Marker clustering, in-app directions, decision mode, compare sheet
- First-time onboarding, map style switcher, keyboard shortcuts overlay

---

## 🟡 LOWER PRIORITY / FUTURE FEATURES

### 5. User Accounts
**What's needed:**
- Sign up / login (email, Google, Apple)
- Saved itineraries, wishlists, settings sync across devices
- Different access levels (traveller vs admin)

### 6. Social & Sharing (extended)
**What's needed:**
- Share itinerary / POI to social media (WhatsApp, Instagram, etc.)
- Travel diary: save own photos, group by trip, add journal notes, video diary
- Collaborate: invite others to join a trip, meet at stops

### 7. CarPlay / Android Auto Integration
**What's needed:**
- Voice command navigation ("Take me to Hobbiton")
- Full CarPlay UI (simplified for driving)
- Auto-commentary during drives

### 8. Admin Panel Enhancements
**What's needed:**
- Review and approve/reject new POI submissions
- Edit existing POIs (images, description, GPS coords, category)
- Bulk import / CSV upload
- Image management

---

## 🔵 TECHNICAL DEBT

- Google Maps `Marker` is deprecated — migrate to `AdvancedMarkerElement`
- GPS coordinates on some POIs are inaccurate — need audit
- ElevenLabs voice key stored in localStorage only — should be server-side for production
- Community Voices audio stored as base64 in localStorage — migrate to cloud storage for production
