# Qiwiosity — Database Consolidation Plan

**Date:** 20 April 2026  
**Author:** Roydon + Claude  
**Status:** Proposal

---

## 1. The Problem: Three Projects, Five Copies of the Same Data

Right now your data lives in **5 separate places** across what are essentially **3 different projects** that grew organically:

| # | Location | Format | What's in it |
|---|----------|--------|-------------|
| 1 | `nz_points_of_interest.xlsx` | Excel spreadsheet | 1,100 POIs — the original "master list" |
| 2 | `aotearoa-app/src/data/` | 5 flat JSON files | 1,100 POIs + 382 accommodations + categories + regions + images — bundled into the old app |
| 3 | `qiwiosity/content/` | 40+ region-split JSON files + scripts + audio | Same 1,100 POIs + 382 accommodations, but split by region with extra metadata (content_status, scripts, approach_bearing) |
| 4 | `qiwiosity/mobile/src/data/` | 5 flat JSON files | Near-identical copy of #2, bundled into the new mobile app |
| 5 | `qiwiosity/backend/` | No database — reads #3 from disk on every request | Express API that serves the content folder |

### What's Actually Duplicated

**POIs (1,100 records)** exist in all 5 places. The core fields (id, name, lat, lng, category, tags, etc.) are identical across all copies. But each copy has drifted slightly:

- The **spreadsheet** has `cultural_review_required` and `sources_to_check` columns that don't appear in the app data
- The **qiwiosity/content** version adds `content_status`, `scripts` references, and `approach_bearing_deg` that the apps don't have
- The **aotearoa-app** and **qiwiosity/mobile** versions are almost identical but their accommodations data has started to diverge
- The **backend** has no database of its own — it just reads the content folder's JSON files into memory on every request

**Accommodations (382 records)** exist in 3 places with identical schemas but potentially diverging values.

**Categories (8)** and **Regions (19)** are consistent everywhere but defined redundantly.

**Images** (poi_images.json) exist in 2 places — identical copies.

### Why This is a Problem

1. **No single source of truth.** If you update a POI description, you'd need to update it in up to 5 places.
2. **Schema fragmentation.** Some fields only exist in some copies (content_status, scripts, cultural_review_required).
3. **No real database.** The backend reads flat files from disk on every API call — no indexing, no queries, no relationships.
4. **Two separate apps.** `aotearoa-app` (the original prototype) and `qiwiosity/mobile` (the newer rebuild) both bundle their own static copies of the data, meaning they can't receive updates without a new app release.

---

## 2. The Unified Database Design

### Recommended Technology: **Supabase (PostgreSQL)**

Why Supabase over other options:

- **Free tier** covers your current data volume (~1,500 records) with room to grow to 50,000+
- **PostgreSQL** gives you proper relational queries, full-text search, and PostGIS for geospatial queries (find POIs within X km)
- **Built-in REST API** (PostgREST) — your mobile app and website can query it directly without a custom backend
- **Built-in Auth** — when you add user accounts, reviews, favourites, itineraries
- **Real-time subscriptions** — push content updates to connected apps instantly
- **Row-level security** — public read, admin write, user-specific data
- **Edge Functions** — replace your Express backend for things like the review AI synthesis
- **Dashboard** — edit data in a spreadsheet-like UI (replaces your Excel workflow)

### Database Schema

```
┌─────────────────────────────────────────────────────────────┐
│                        REGIONS                               │
│─────────────────────────────────────────────────────────────│
│  id              TEXT  PRIMARY KEY   (e.g. "auckland")       │
│  name            TEXT               ("Auckland / Tāmaki…")   │
│  island          TEXT               ("North" | "South")      │
│  lat             FLOAT                                       │
│  lng             FLOAT                                       │
│  description     TEXT                                        │
│  bounds_north    FLOAT                                       │
│  bounds_south    FLOAT                                       │
│  bounds_east     FLOAT                                       │
│  bounds_west     FLOAT                                       │
│  created_at      TIMESTAMPTZ                                 │
│  updated_at      TIMESTAMPTZ                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                          POIS                                │
│─────────────────────────────────────────────────────────────│
│  id                    TEXT  PRIMARY KEY  ("auckland-sky…")   │
│  name                  TEXT                                   │
│  region_id             TEXT  FK → regions.id                  │
│  category_id           TEXT  FK → categories.id               │
│  lat                   FLOAT                                  │
│  lng                   FLOAT                                  │
│  location              GEOGRAPHY(POINT)  (PostGIS, auto)     │
│  tags                  TEXT[]  (PostgreSQL array)              │
│  trigger_radius_m      INT                                    │
│  duration_hours        FLOAT                                  │
│  short                 TEXT                                    │
│  commentary            TEXT                                    │
│  audio_story           TEXT   (inline narration script)        │
│  suggested_voice_tone  TEXT                                    │
│  approach_bearing_deg  FLOAT  (nullable)                      │
│  content_status        TEXT   DEFAULT 'draft'                  │
│  cultural_review_req   BOOLEAN DEFAULT false                   │
│  sources_to_check      TEXT   (nullable)                       │
│  review_rating         FLOAT                                   │
│  review_summary        TEXT                                    │
│  created_at            TIMESTAMPTZ                             │
│  updated_at            TIMESTAMPTZ                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ 1:many
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        POI_SCRIPTS                            │
│─────────────────────────────────────────────────────────────│
│  id              SERIAL  PRIMARY KEY                         │
│  poi_id          TEXT  FK → pois.id                           │
│  length          TEXT  ("headline" | "standard")              │
│  target_seconds  INT                                          │
│  narration_text  TEXT  (the actual script body)                │
│  voice_direction TEXT                                          │
│  fact_check      TEXT                                          │
│  status          TEXT  DEFAULT 'draft_v1'                      │
│  author          TEXT                                          │
│  created_at      TIMESTAMPTZ                                  │
│  updated_at      TIMESTAMPTZ                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                        POI_AUDIO                             │
│─────────────────────────────────────────────────────────────│
│  id              SERIAL  PRIMARY KEY                         │
│  poi_id          TEXT  FK → pois.id                           │
│  length          TEXT  ("headline" | "standard")              │
│  file_url        TEXT  (Supabase Storage URL)                 │
│  voice_name      TEXT  (e.g. "rachel")                        │
│  duration_secs   FLOAT                                        │
│  generated_at    TIMESTAMPTZ                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       POI_IMAGES                             │
│─────────────────────────────────────────────────────────────│
│  id              SERIAL  PRIMARY KEY                         │
│  poi_id          TEXT  FK → pois.id                           │
│  image_url       TEXT                                         │
│  source          TEXT  DEFAULT 'wikimedia'                    │
│  display_order   INT                                          │
│  created_at      TIMESTAMPTZ                                  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                       CATEGORIES                             │
│─────────────────────────────────────────────────────────────│
│  id              TEXT  PRIMARY KEY  ("adventure")             │
│  label           TEXT  ("Adventure & Adrenaline")             │
│  icon            TEXT  ("rocket-outline")                     │
│  color           TEXT  ("#E65100")                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                     ACCOMMODATIONS                           │
│─────────────────────────────────────────────────────────────│
│  id                    TEXT  PRIMARY KEY                      │
│  name                  TEXT                                    │
│  region_id             TEXT  FK → regions.id                   │
│  lat                   FLOAT                                   │
│  lng                   FLOAT                                   │
│  location              GEOGRAPHY(POINT)  (PostGIS, auto)      │
│  type                  TEXT  ("hotel"|"motel"|"holiday-park"…) │
│  price_nzd_per_night   INT                                     │
│  rating                FLOAT                                   │
│  short                 TEXT                                     │
│  created_at            TIMESTAMPTZ                              │
│  updated_at            TIMESTAMPTZ                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    REGION_IMAGES                              │
│─────────────────────────────────────────────────────────────│
│  id              SERIAL  PRIMARY KEY                         │
│  region_id       TEXT  FK → regions.id                        │
│  image_url       TEXT                                         │
│  display_order   INT                                          │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                  CATEGORY_IMAGES                              │
│─────────────────────────────────────────────────────────────│
│  id              SERIAL  PRIMARY KEY                         │
│  category_id     TEXT  FK → categories.id                     │
│  image_url       TEXT                                         │
│  display_order   INT                                          │
└─────────────────────────────────────────────────────────────┘
```

### Future Tables (when you add user features)

```
USERS              → Supabase Auth (built-in)
USER_FAVOURITES    → user_id + poi_id
USER_REVIEWS       → user_id + poi_id + rating + text
ITINERARIES        → user_id + name + dates
ITINERARY_STOPS    → itinerary_id + poi_id + day + order
OFFLINE_SYNC_LOG   → track what each device has downloaded
```

### Key Design Decisions

**PostGIS `location` column:** Auto-computed from lat/lng via a database trigger. This lets you run queries like "find all POIs within 5km of this point" in milliseconds — essential for the geofence/proximity features.

**Scripts as a separate table:** Right now scripts are markdown files on disk. Moving them into `poi_scripts` means: the API can serve them directly, you can track authoring status per script, and the TTS pipeline can query "all scripts with status=approved that don't have audio yet."

**Images as a separate table:** The current poi_images.json nests 5 URLs per POI inside one giant JSON blob. A proper `poi_images` table with `display_order` is more flexible and queryable.

**Tags as a PostgreSQL array:** Rather than a separate tags/join table (overkill for your use case), `TEXT[]` lets you store `{"sailing", "harbour", "commercial"}` directly and query with `@>` (contains) operator.

---

## 3. How Everything Connects After Consolidation

```
                    ┌──────────────────┐
                    │   SUPABASE DB    │
                    │   (PostgreSQL)   │
                    │                  │
                    │  regions         │
                    │  categories      │
                    │  pois            │
                    │  poi_scripts     │
                    │  poi_audio       │
                    │  poi_images      │
                    │  accommodations  │
                    │  region_images   │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
     ┌────────────┐  ┌────────────┐  ┌────────────┐
     │  WEBSITE   │  │ MOBILE APP │  │   TOOLS    │
     │  (Next.js  │  │ (Expo /    │  │            │
     │   or HTML) │  │  React     │  │ tts-render │
     │            │  │  Native)   │  │ reviews.js │
     │ Reads from │  │            │  │ admin UI   │
     │ Supabase   │  │ Reads from │  │            │
     │ REST API   │  │ Supabase   │  │ Writes to  │
     │            │  │ REST API   │  │ Supabase   │
     │            │  │ + offline  │  │            │
     │            │  │   cache    │  │            │
     └────────────┘  └────────────┘  └────────────┘
```

**One database, three consumers.** No more syncing JSON files between folders.

---

## 4. What to Keep, What to Retire

| Current Asset | Decision | Reason |
|---------------|----------|--------|
| `nz_points_of_interest.xlsx` | **RETIRE** → import into Supabase, then archive | Supabase dashboard replaces the spreadsheet for editing |
| `aotearoa-app/` | **RETIRE** entire folder | This was the v1 prototype. `qiwiosity/mobile` is the active app |
| `qiwiosity/content/poi/*.json` | **RETIRE** → import into Supabase `pois` table | Database replaces region-split JSON files |
| `qiwiosity/content/accommodations/*.json` | **RETIRE** → import into Supabase `accommodations` table | Same |
| `qiwiosity/content/scripts/*.md` | **RETIRE** → import into Supabase `poi_scripts` table | Narration text goes in DB; voice direction + fact-check as columns |
| `qiwiosity/content/audio/*.mp3` | **MIGRATE** → upload to Supabase Storage | Audio files referenced by URL in `poi_audio` table |
| `qiwiosity/mobile/src/data/*.json` | **REPLACE** → app fetches from Supabase API + local cache | No more bundled static data |
| `qiwiosity/backend/` | **RETIRE** the Express server | Supabase REST API + Edge Functions replace it entirely |
| `qiwiosity/tools/tts-render.js` | **KEEP + MODIFY** → read scripts from DB, write audio to Storage | Still needed for the ElevenLabs pipeline |
| `qiwiosity/tools/populate-reviews.cjs` | **KEEP + MODIFY** → write reviews into DB | Still needed for Google Places integration |
| `qiwiosity/old content/` | **DELETE** | Superseded audio files with no unique data |

---

## 5. Step-by-Step Migration Plan

### Phase 1: Set Up Supabase (Day 1)

1. Create a free Supabase project at [supabase.com](https://supabase.com)
2. Enable the PostGIS extension (`CREATE EXTENSION postgis;`)
3. Run the SQL migration to create all tables (I can generate this for you)
4. Set up Row-Level Security: public read on all tables, authenticated write for admin

### Phase 2: Import Data (Day 1–2)

1. **Merge the "superset" schema.** The qiwiosity/content POI files have the most complete data (all fields from all sources). Use these as the canonical import source.
2. **Import regions** (19 records) from `regions.json`
3. **Import categories** (8 records) from `categories.json`
4. **Import POIs** (1,100 records) from `qiwiosity/content/poi/*.json`, enriching with:
   - `cultural_review_required` from the spreadsheet
   - `sources_to_check` from the spreadsheet
   - All other fields from the content JSON
5. **Import accommodations** (382 records) from `qiwiosity/content/accommodations/*.json`
6. **Import images** from `poi_images.json` → one row per image in `poi_images` table (5,500 rows for POIs + region/category images)
7. **Import scripts** (50 markdown files) → parse frontmatter, extract narration body → `poi_scripts` table
8. **Upload audio** (4 MP3 files) → Supabase Storage bucket, record URLs in `poi_audio` table
9. **Verify counts match**: 19 regions, 8 categories, 1,100 POIs, 382 accommodations, ~5,500 images, 50 scripts, 4 audio files

### Phase 3: Update the Mobile App (Day 2–3)

1. Install `@supabase/supabase-js` in `qiwiosity/mobile`
2. Create a Supabase client config (`src/lib/supabase.ts`)
3. Replace static JSON imports with Supabase queries:
   - `attractions.json` → `supabase.from('pois').select('*')`
   - `accommodations.json` → `supabase.from('accommodations').select('*')`
   - `categories.json` → `supabase.from('categories').select('*')`
   - `regions.json` → `supabase.from('regions').select('*')`
   - `poi_images.json` → `supabase.from('poi_images').select('*').eq('poi_id', id)`
4. Add offline caching with `@react-native-async-storage/async-storage` — fetch on first launch, cache locally, sync delta on subsequent opens
5. Delete the static `src/data/` folder

### Phase 4: Build the Website (Day 3–5)

1. The website reads from the same Supabase project — same tables, same API
2. Use the Supabase JS client or direct REST calls
3. Server-side rendering can use the Supabase service key for faster queries

### Phase 5: Update Tools (Day 3–4)

1. **tts-render.js** — modify to:
   - Query `poi_scripts` table for scripts with status "approved" that have no corresponding `poi_audio` record
   - After generating audio, upload to Supabase Storage and insert into `poi_audio`
2. **populate-reviews.cjs** — modify to:
   - Query `pois` table for POIs needing review refresh
   - Write results back to `pois.review_rating` and `pois.review_summary`
3. **Reviews Edge Function** — migrate `backend/src/reviews.js` logic into a Supabase Edge Function (replaces the Express server entirely)

### Phase 6: Clean Up (Day 5)

1. Archive `aotearoa-app/` (zip it or move to an `_archive` folder)
2. Archive `nz_points_of_interest.xlsx`
3. Remove `qiwiosity/content/` JSON files (data now lives in DB)
4. Remove `qiwiosity/backend/` (replaced by Supabase)
5. Remove `qiwiosity/mobile/src/data/` (replaced by API calls)
6. Delete `qiwiosity/old content/`
7. Update `HANDOVER.md` with the new architecture

---

## 6. What You Gain

| Before | After |
|--------|-------|
| Edit a POI in 5 places | Edit once in Supabase dashboard, all apps see it instantly |
| No search capability | Full-text search + PostGIS proximity queries |
| 40+ JSON files to manage | One database with a visual dashboard |
| Custom Express backend to maintain | Zero backend code (Supabase handles API) |
| Apps ship with stale bundled data | Apps always have fresh data + offline cache |
| No user features possible | Ready for auth, favourites, reviews, itineraries |
| No content workflow | content_status field enables draft → review → published pipeline |

---

## 7. Immediate Next Steps

If you want to proceed, I can:

1. **Generate the complete SQL migration** — ready to paste into Supabase SQL editor
2. **Write the import script** — a Node.js script that reads all your current JSON/Excel files and inserts them into Supabase
3. **Create the Supabase client module** for the mobile app
4. **Migrate the Express backend** routes into Supabase Edge Functions

Just say the word and I'll start building.
