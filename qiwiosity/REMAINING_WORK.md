# Qiwiosity — Remaining Work

> Last updated: May 2026  
> Quick wins from wishlist have been completed. This document covers all outstanding features.

---

## ✅ COMPLETED (this session + previous sessions)

- Premium splash screen
- Dark mode (toggle in Settings)
- 5 named voice personas (Kiri / James / Aroha / Sam / Grace)
- ElevenLabs AI voice integration + Web Speech API fallback
- Settings modal (voice, speed, dark mode, ElevenLabs key, affiliate IDs)
- Wishlist / saved places with ♡ button and ❤ Saved tab
- Affiliate links: Booking.com, Wotif, Viator, GetYourGuide
- Audio commentary player per POI
- **[NEW]** Annoying intro voice removed (speech cancelled on load)
- **[NEW]** Settings cog — no more green circle, now flat icon
- **[NEW]** Category filter — true multi-toggle (click any combo on/off; "All" resets)
- **[NEW]** Directions keep user in-app — no more jumping to Google Maps externally
- **[NEW]** Decision results — "＋ Add to Itinerary" button for winners
- **[NEW]** Popup action button text overflow — fixed with ellipsis clipping
- **[NEW]** "Qiwiosity" removed as a screen label — now logo-only in header

---

## 🔴 HIGH PRIORITY / CRITICAL

### 1. Itinerary Section Redesign
**What's wrong:** Top section is huge, middle list is too small, no collapse/expand, single-day only.  
**What's needed:**
- Collapse/expand each section by clicking its header
- Each POI card collapses/expands on click
- Audio button on each itinerary stop (not just Directions and Details)
- Multi-day support (Day 1, Day 2, Day 3 groups)
- Reorder stops via up/down buttons AND long-press drag
- Estimated drive time between each stop
- Compact the fixed bottom nav (5 tabs, no scrolling needed)

### 2. Map Integration — Stay In-App
**What's done:** Directions no longer open external apps.  
**What's still needed:**
- Type-in "starting location" when geolocation is denied
- Store journey start/end point (e.g. arrive Auckland, depart Christchurch)
- Round-trip mode
- Navigate function on itinerary map uses stored start/end point
- GPS coordinates accuracy review (some POI locations are off)

### 3. Itinerary Map — Drag and Drop Stops
**What's needed:**
- Numbered stops on the itinerary map (1, 2, 3…)
- Click a numbered stop pin → view that POI details
- Drag-and-drop to reorder stops on the map
- Reordering on map syncs with the list below

---

## 🟠 MEDIUM PRIORITY

### 4. POI Popup Redesign
**What's needed:**
- Hero image fills the full popup background (text overlaid on image)
- Larger popup — half to a third of screen height
- Audio section inside the popup (play commentary without leaving)
- Action buttons moved to the bottom row (currently right-side column)
- "Add to Itinerary" button prominent (already added, polish needed)

### 5. Remove Guide as a Standalone Tab
**What's needed:**
- Remove the Guide tab from the bottom nav (leaves 5 tabs: Explore, Stay, Plan, Compare, Saved)
- Integrate audio guide access directly on each POI (already partially there)
- Guide/audio on each itinerary stop (see #1 above)
- Fix bottom nav so it doesn't require scrolling (5 compact tabs)

### 6. Decision Mode Enhancements
**What's needed:**
- Show full POI info in each VS card: image, price, rating, description, audio
- Currently only shows name, category, duration, rating

### 7. Compare Screen — "Find Similar Nearby"
**What's needed:**
- From any POI popup, "Add to Compare" button should offer:
  - Add just this one POI
  - Find all similar POIs within X km (same category)
  - Find all nature/adventure/etc within X km

### 8. First-Time Onboarding Guide
**What's needed:**
- On first app open: short interactive tour of what each button/tab does
- Admin-editable (ideally a JSON/markdown file so content can be updated without code changes)
- "Don't show again" option

### 9. Audio Commentary Options
**What's needed:**
- Short version (~30 sec) and full version (2–3 min) per POI
- Auto-play driving commentary: when user is travelling between stops, play contextual commentary about the route and region
- Commentary tailored to user interests (history / nature / Māori culture)

---

## 🟡 LOWER PRIORITY / FUTURE FEATURES

### 10. Full AI Itinerary Generator
**What's needed:**
- Input form: arrival/departure dates, number of people, ages, interests, budget, accommodation preference, constraints
- AI generates a day-by-day itinerary with stops, drive times, accommodation suggestions
- User can tweak generated itinerary

### 11. User Accounts
**What's needed:**
- Sign up / login (email, Google, Apple)
- Saved itineraries, wishlists, settings sync across devices
- Different access levels (traveller vs admin)

### 12. Social & Sharing
**What's needed:**
- Share itinerary / POI to social media
- Travel diary: save own photos, group by trip, add journal notes, video diary
- Collaborate: invite others to join a trip, meet at stops

### 13. CarPlay / Android Auto Integration
**What's needed:**
- Voice command navigation ("Take me to Hobbiton")
- Full CarPlay UI (simplified for driving)
- Auto-commentary during drives

### 14. Admin Panel
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
