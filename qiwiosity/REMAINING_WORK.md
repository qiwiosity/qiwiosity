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

### ✅ 1. Map Integration — Type-In Start Location
- "🟢 STARTING POINT" input at top of Plan sidebar with Google Places Autocomplete (NZ only)
- Stores `state.journeyStart { label, lat, lng }`; persists across tab switches
- Green "S" pin appears on the plan map at the chosen start location
- `openInAppTripRoute()` uses custom start as origin; route toast shows "From [city] · N stops · X km · Y min"
- ✕ clear button removes the start and resets the map

### ✅ 2. Itinerary Map — Numbered Pin Click → Sidebar Highlight
- Click any numbered stop pin → opens POI info popup AND scrolls the matching stop card into view in the sidebar
- Card flashes with a teal outline highlight for 1.4 seconds so the user can see which stop was tapped

---

## 🟠 MEDIUM PRIORITY

### ✅ 4. Full AI Itinerary Generator
- **3-step wizard overlay** — Step 1: When & Who; Step 2: Interests & Pace; Step 3: Stay & Route
- **Step 1** — Days slider (1–21), adults/children counters, starting region dropdown (all 19 NZ regions), round-trip toggle, optional end-region picker
- **Step 2** — Category interest chips (built from live CATEGORIES data), pace selector (Relaxed/Balanced/Active), budget selector (Budget/Mid-range/Luxury)
- **Step 3** — Accommodation preference chips (Camping/Hostel/B&B/Hotel/Luxury Resort), free-text notes, trip summary preview
- **Animated loading screen** — 5 progressive steps animate in over ~2.4s while algorithm runs
- **`buildAIItinerary(config)`** — Scores all 2,453 POIs by: interest category match (+10), star rating ×2, log(review_count), budget alignment (+2); builds route using greedy nearest-neighbor from start region with distance penalty that relaxes as trip progresses; accommodation matched by keyword proximity per day
- **Results screen** — Shows "Your N-Day NZ Adventure" with total stops, km, regions; collapsible day cards showing stop list + recommended accommodation + price per night; auto-expands Day 1; Regenerate button
- **"Load into Planner"** — Clears existing itinerary and loads all AI stops with correct day numbers, sets journey start point from chosen region, switches to Plan tab, shows route summary toast
- **"✨ Generate AI Trip" button** — Teal primary button at top of Plan sidebar opens the wizard

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
