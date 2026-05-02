# Qiwiosity — Remaining Work

> Last updated: May 2026  
> Quick wins from wishlist have been completed. This document covers all outstanding features.

---

## ✅ COMPLETED

- Premium splash screen
- Dark mode (toggle in Settings)
- 5 named voice personas (Kiri / James / Aroha / Sam / Grace)
- ElevenLabs AI voice integration + Web Speech API fallback
- Settings modal (voice, speed, dark mode, ElevenLabs key, affiliate IDs)
- Wishlist / saved places with ♡ button and ❤ Saved tab
- Affiliate links: Booking.com, Wotif, Viator, GetYourGuide
- Audio commentary player per POI
- Annoying intro voice removed (speech cancelled on load)
- Settings cog — no more green circle, now flat icon
- Category filter — true multi-toggle (click any combo on/off; "All" resets)
- Directions keep user in-app — no more jumping to Google Maps externally
- Decision results — "＋ Add to Itinerary" button for winners
- Popup action button text overflow — fixed with ellipsis clipping
- "Qiwiosity" removed as a screen label — now logo-only in header
- **[NEW] Itinerary Section Redesign** — multi-day tabs, collapsible stop cards, drive time rows, up/down reorder, drag-and-drop reorder, audio/details/drive actions per stop, collapsible stats, Add Day button, Move to Day
- **[NEW] In-app trip routing** — Google DirectionsService draws full-day route polyline in-app, shows distance + time toast
- **[NEW] POI Popup Redesign** — wider (360px), taller hero (260px), audio strip with "🔊 Play Audio Guide" button and voice name, action buttons in clean bottom row
- **[NEW] Decision Mode enhancements** — VS cards now show hero images, price, rating, and inline 🔊 Audio button per option
- **[NEW] Compare Sheet + Find Similar Nearby** — Compare button opens a sheet offering "Add this place only" OR "Find similar nearby" with 25/50/100/All NZ radius picker
- **[NEW] First-Time Onboarding** — 4-slide animated bottom-sheet shown on first visit, localStorage "don't show again", Skip + Next/Finish buttons
- **[NEW] Community Voices (EchoVerse)** — Location-based audio memory layer: visitors record short audio stories at any POI using MediaRecorder API; base64 stored in localStorage keyed by POI id; "Hear Stories" tab shows all memory cards with ▶ play + progress bar; "Leave a Memory" tab has animated record button, timer, preview, name/anonymous toggle, 9-tag picker; POI popup shows "🎙 Community Voices" strip with voice count badge

---

## 🔴 HIGH PRIORITY / CRITICAL

### 1. Map Integration — Type-In Start Location
**What's still needed:**
- Type-in "starting location" when geolocation is denied
- Store journey start/end point (e.g. arrive Auckland, depart Christchurch)
- Round-trip mode
- Navigate function on itinerary map uses stored start/end point

### 2. Itinerary Map — Numbered Pin Click
**What's needed:**
- Click a numbered stop pin on the plan map → show that POI details in the sidebar
- Dragging a numbered pin on the map to reorder (complex — lower priority)

---

## 🟠 MEDIUM PRIORITY

### 3. Audio Commentary Options
**What's needed:**
- Short version (~30 sec) and full version (2–3 min) per POI
- Auto-play driving commentary: when user is travelling between stops, play contextual commentary about the route and region
- Commentary tailored to user interests (history / nature / Māori culture)

### 4. Full AI Itinerary Generator
**What's needed:**
- Input form: arrival/departure dates, number of people, ages, interests, budget, accommodation preference, constraints
- AI generates a day-by-day itinerary with stops, drive times, accommodation suggestions
- User can tweak generated itinerary

---

## 🟡 LOWER PRIORITY / FUTURE FEATURES

### 5. User Accounts
**What's needed:**
- Sign up / login (email, Google, Apple)
- Saved itineraries, wishlists, settings sync across devices
- Different access levels (traveller vs admin)

### 6. Social & Sharing
**What's needed:**
- Share itinerary / POI to social media
- Travel diary: save own photos, group by trip, add journal notes, video diary
- Collaborate: invite others to join a trip, meet at stops

### 7. CarPlay / Android Auto Integration
**What's needed:**
- Voice command navigation ("Take me to Hobbiton")
- Full CarPlay UI (simplified for driving)
- Auto-commentary during drives

### 8. Admin Panel
**What's needed:**
- Review and approve/reject new POI submissions
- Add new POIs via standardised template
- Edit existing POIs (images, description, GPS coords, category)
- Bulk import / CSV upload
- Image management

---

## 🔵 TECHNICAL DEBT

- Google Maps `Marker` is deprecated — migrate to `AdvancedMarkerElement`
- GPS coordinates on some POIs are inaccurate — need audit
- App load speed — lazy-load POI images, paginate/cluster markers
- ElevenLabs voice key stored in localStorage only — should be server-side for production
