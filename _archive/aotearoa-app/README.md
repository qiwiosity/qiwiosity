# Aotearoa — Ultimate New Zealand Travel App

A React Native (Expo) app for exploring Aotearoa / New Zealand, building travel itineraries, and listening to curated audio commentary at every stop.

## What's in this scaffold

```
aotearoa-app/
├── App.js                          # Root: providers + navigation
├── app.json                        # Expo config (permissions, bundle IDs)
├── package.json                    # Dependencies
├── babel.config.js
├── prototype.html                  # Interactive browser prototype (run this TODAY)
├── assets/                         # Icons, splash (add your own)
└── src/
    ├── theme.js                    # Colours, spacing, typography
    ├── context/
    │   └── ItineraryContext.js     # Global itinerary state + AsyncStorage persist
    ├── navigation/
    │   └── AppNavigator.js         # Bottom tabs + nested stacks
    ├── utils/
    │   └── geo.js                  # Haversine distance, drive-time estimates
    ├── data/
    │   ├── attractions.json        # 33 hand-curated POIs with tour-guide commentary
    │   ├── accommodations.json     # Sample lodging across price tiers
    │   ├── regions.json            # 17 NZ tourism regions
    │   └── categories.json         # Category definitions + colours
    └── screens/
        ├── MapScreen.js            # Map with category filter chips
        ├── AttractionsScreen.js    # Searchable list view
        ├── AttractionDetailScreen.js  # Detail + audio commentary
        ├── ItineraryScreen.js      # Your trip, drive-time totals
        ├── AccommodationsScreen.js # Stay options with filters
        └── TourGuideScreen.js      # Audio-first commentary playlist
```

## Try it right now (prototype.html)

The fastest way to see the concept in action — open `prototype.html` directly in your browser. It's a single file that includes all the data inline and uses Leaflet for the map:

- Click any pin → see details, commentary, add to itinerary
- "Listen" uses the browser's built-in speech synthesis to read the commentary out loud
- Switch to the "Plan" tab → load a pre-built template (North Classic / South Epic / Adventure)
- Switch to the "Stay" tab → overlay accommodations on the map

## Run the React Native app

The Expo scaffold is ready but hasn't been installed. In a terminal:

```bash
cd aotearoa-app
npm install
npx expo start
```

Then scan the QR with Expo Go on iOS/Android, or press `w` for the web build.

Requirements: Node 18+, Expo Go app on your device.

## Core data model

Every attraction has:

| Field | Meaning |
|---|---|
| `id` | URL-safe slug |
| `name` | Display name (often with Te Reo Māori dual name) |
| `region` | FK to regions.json |
| `lat, lng` | Map coordinates |
| `category` | FK to categories.json |
| `tags` | Free-text descriptors for search |
| `duration_hours` | Suggested time on site — used for itinerary totals |
| `short` | One-line teaser |
| `commentary` | Voice-over ready tour-guide script |

## Tour-guide commentary

Each attraction has a `commentary` field — a short, voice-over-ready paragraph that:

- Delivers one memorable fact or piece of history
- Gives one practical insider tip (best time, what to book, hidden gotchas)
- Sounds like a knowledgeable friend, not a travel brochure

In the mobile app this is piped through `expo-speech`. In the browser prototype it uses the Web Speech API. Both are zero-cost placeholders — later you can swap to ElevenLabs or OpenAI TTS for studio-quality voices, localised per language.

## Roadmap — what to build next

Near-term
- Real icon/splash assets (currently placeholder paths)
- Replace `react-native-maps` default tiles with Mapbox for better NZ styling
- User location marker + "nearby attractions" radius
- Offline pack: pre-download tiles and commentary audio per region
- Deep links from itinerary to Google/Apple Maps driving directions

Medium-term
- Accommodation booking integration (Booking.com or hotels API)
- DOC hut availability API (New Zealand Department of Conservation has a public API)
- Weather overlay (MetService for NZ)
- Share itinerary via link

Longer-term
- User auth (Firebase/Supabase) so itineraries sync across devices
- Community reviews + photos
- AI-generated itineraries from natural language ("10 days, South Island, loves wine and easy hikes")
- Premium tier: high-quality voiced commentary + offline packs

## Design direction

- **Palette:** Deep pounamu green (#0B4F3C), warm pohutukawa orange (#E07B3C), soft stone bg (#F5F3EF)
- **Voice:** Warm, informed, locally-grounded. Knows where the good coffee is.
- **Principle:** Respect for tangata whenua — use te reo Māori place names first where appropriate, tell Māori stories where the site has Māori significance.

## License & data notes

All attraction data in this scaffold is hand-authored for this prototype and safe to edit freely. For a production launch you'll want to add proper attribution to iSite/NZ Tourism/DOC where their data is reused.
