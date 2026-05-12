# Qiwiosity Chrome Extension — Setup Guide

## What This Does

A Chrome extension that adds a floating "Save to Qiwiosity" button to every webpage. When you find a travel destination on **YouTube**, **Instagram**, **Facebook**, **TikTok**, **Google Maps**, **TripAdvisor**, or any blog/website, click the button to save it to your Qiwiosity wishlist.

The extension auto-detects place names, regions, thumbnails, and tags from each site. Saved items sync to Supabase and appear in the mobile app's **Wishlist** tab.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  ANY WEBPAGE  (YouTube, Instagram, Facebook, blogs, etc.)    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  content.js + scrapers.js → floating button + panel  │    │
│  └────────────────────┬─────────────────────────────────┘    │
└───────────────────────│──────────────────────────────────────┘
                        │ chrome.runtime.sendMessage
                        ▼
              ┌─────────────────┐
              │  background.js  │  (service worker)
              │  Auth + API     │
              └────────┬────────┘
                       │ fetch
                       ▼
          ┌────────────────────────┐
          │  Supabase Edge Function│
          │  /functions/v1/wishlist│
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  wishlist_items table  │  ← auto-matches to POIs
          │  (+ user_profiles)    │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  Mobile App            │
          │  WishlistContext →     │
          │  SavedScreen           │
          └────────────────────────┘
```

## Step 1: Run the Database Migration

In your Supabase project SQL Editor, run:

```
database/migrations/003_wishlist.sql
```

This creates:
- `user_profiles` — auto-created on signup
- `wishlist_items` — stores saved places
- `wishlist_full` — view with POI details joined in
- Row Level Security policies
- Auto-POI-matching trigger (by location + name)

## Step 2: Deploy the Edge Function

```bash
# Install Supabase CLI if you haven't already
npm install -g supabase

# Login and link your project
supabase login
supabase link --project-ref YOUR_PROJECT_ID

# Deploy the wishlist function
supabase functions deploy wishlist
```

## Step 3: Enable Auth in Supabase

1. Go to **Authentication → Providers** in your Supabase dashboard
2. Enable **Email** provider (it should be on by default)
3. Optionally enable Google/Apple OAuth for easier sign-in

## Step 4: Configure the Extension

Edit `extension/background.js` and replace the config values:

```javascript
const CONFIG = {
  SUPABASE_URL: 'https://osulujkdeuukilchfath.supabase.co',     // ← your auth/community project URL
  SUPABASE_ANON_KEY: 'eyJ...',                                    // ← your anon key
  WISHLIST_FUNCTION_URL: 'https://osulujkdeuukilchfath.supabase.co/functions/v1/wishlist',
};
```

## Step 5: Install the Extension in Chrome

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `qiwiosity/extension/` folder
5. The Qiwiosity button appears on every page

## How It Works

### Site-Specific Scrapers

| Site | What it scrapes |
|------|----------------|
| YouTube | Video title, description, channel, thumbnail, hashtags |
| Instagram | Post caption, location tag, hashtags, image |
| Facebook | Post content, check-in location, image |
| Google Maps | Place name, address, rating, category, lat/lng from URL |
| TripAdvisor | Attraction name, rating, address, LD+JSON coordinates |
| TikTok | Caption, hashtags, thumbnail |
| Tourism NZ / DOC | Title, description, LD+JSON coordinates |
| Any other site | Title (h1 or og:title), description, og:image, LD+JSON location data |

### NZ Auto-Detection

The scrapers know 30+ NZ regions and 40+ landmarks. When you save a YouTube video about "Milford Sound kayaking", it auto-detects:
- **Place**: Milford Sound
- **Region**: Fiordland
- **Country**: New Zealand

### POI Matching

When a wishlist item is saved, a Postgres trigger tries to match it to an existing Qiwiosity POI by:
1. **Location** — if lat/lng is within 500m of a known POI
2. **Name** — exact name match as fallback

Matched items show "In App" badges and can navigate directly to the POI detail screen.

### Keyboard Shortcut

Press **Alt + Q** on any page to open the save panel.

## Mobile App Integration

Wishlist items appear in the app's `SavedScreen` alongside local lists. It shows:
- Stats bar (saved, to visit, visited, matched to app)
- Search and filter (all / to visit / visited / in app)
- Cards with thumbnails, source badges, and POI match indicators
- Pull-to-refresh syncs latest from Supabase
- Auto-refreshes when the app comes to foreground

## Files Created

```
extension/
  manifest.json          — Chrome Manifest V3 config
  background.js          — Service worker (auth + API)
  content.js             — Floating button + save panel
  content.css            — Panel styling
  popup.html             — Extension popup (login + dashboard)
  popup.js               — Popup logic
  lib/scrapers.js        — Site-specific place detection
  icons/                 — Extension icons (16, 48, 128px)

supabase/functions/wishlist/
  index.ts               — Edge Function API (CRUD)

database/migrations/
  003_wishlist.sql        — DB schema, RLS, triggers, views

mobile/src/context/
  WishlistContext.js      — Cloud-synced wishlist state

mobile/src/screens/
  SavedScreen.js          — saved places, local lists, and cloud wishlist summary
```
