/**
 * Unified Data Service for Qiwiosity.
 *
 * This replaces all direct imports of ../data/*.json files.
 * It provides a simple API that:
 *   1. Tries Supabase first (live data)
 *   2. Falls back to AsyncStorage cache (offline)
 *   3. Falls back to bundled JSON files (first launch, no network)
 *
 * Usage:
 *   import { DataService } from '../lib/dataService';
 *
 *   const pois = await DataService.getAttractions();
 *   const regions = await DataService.getRegions();
 *   const categories = await DataService.getCategories();
 *   const accommodations = await DataService.getAccommodations();
 *   const images = await DataService.getPoiImages(poiId);
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { contentSupabase } from './supabase';

// Bundled fallback data (ships with the app binary)
import bundledAttractions from '../data/attractions.json';
import bundledRegions from '../data/regions.json';
import bundledCategories from '../data/categories.json';
import bundledAccommodations from '../data/accommodations.json';

// Cache keys
const CACHE = {
  ATTRACTIONS: '@qiwiosity/db/attractions',
  REGIONS: '@qiwiosity/db/regions',
  CATEGORIES: '@qiwiosity/db/categories',
  ACCOMMODATIONS: '@qiwiosity/db/accommodations',
  LAST_SYNC: '@qiwiosity/db/lastSync',
};

// How often to re-fetch from Supabase (1 hour)
const SYNC_INTERVAL_MS = 60 * 60 * 1000;
const SHIP_BLOCKLIST_RE = /\b(?:PLACEHOLDER|do not ship)\b/i;

// In-memory cache for the current session
let memCache = {};

// ── Internal helpers ─────────────────────────────────────

async function getCached(key) {
  // Check memory first
  if (memCache[key]) return memCache[key];
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const data = JSON.parse(raw);
      memCache[key] = data;
      return data;
    }
  } catch {}
  return null;
}

async function setCache(key, data) {
  memCache[key] = data;
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn('Cache write failed:', e.message);
  }
}

/**
 * Paginated Supabase fetch — automatically fetches ALL rows from a table.
 * Supabase caps responses at 1,000 rows per request regardless of the limit
 * parameter, so we fetch in pages of 1,000 and concatenate the results.
 */
async function fetchFromSupabase(table, options = {}) {
  const { select = '*', order, filters } = options;
  const PAGE_SIZE = 1000;
  let allRows = [];
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    let query = contentSupabase.from(table).select(select);

    if (filters) {
      for (const [col, val] of Object.entries(filters)) {
        query = query.eq(col, val);
      }
    }

    if (order) {
      query = query.order(order.column, { ascending: order.ascending ?? true });
    }

    query = query.range(offset, offset + PAGE_SIZE - 1);

    const { data, error } = await query;
    if (error) throw error;

    allRows = allRows.concat(data || []);
    hasMore = (data || []).length === PAGE_SIZE;
    offset += PAGE_SIZE;
  }

  return allRows;
}

// ── Public API ───────────────────────────────────────────

function isShipBlockedPoi(poi) {
  const text = [
    poi.name,
    poi.short,
    poi.commentary,
    poi.audio_story,
  ].filter(Boolean).join(' ');

  return SHIP_BLOCKLIST_RE.test(text);
}

function filterShippablePois(pois) {
  return Array.isArray(pois) ? pois.filter(poi => !isShipBlockedPoi(poi)) : [];
}

export const DataService = {

  /**
   * Sync all data from Supabase → local cache.
   * Call this on app start. Safe to call offline (no-ops gracefully).
   */
  async sync({ force = false } = {}) {
    try {
      if (!force) {
        const lastSync = await AsyncStorage.getItem(CACHE.LAST_SYNC);
        if (lastSync && Date.now() - parseInt(lastSync) < SYNC_INTERVAL_MS) {
          return { status: 'fresh' };
        }
      }

      const [attractions, regions, categories, accommodations] = await Promise.all([
        fetchFromSupabase('pois', { order: { column: 'name' } }),
        fetchFromSupabase('regions', { order: { column: 'name' } }),
        fetchFromSupabase('categories'),
        fetchFromSupabase('accommodations', { order: { column: 'name' } }),
      ]);

      // Reshape POIs to match the existing app data format
      const shapedAttractions = attractions.filter(p => !isShipBlockedPoi(p)).map(p => ({
        id: p.id,
        name: p.name,
        region: p.region_id,
        lat: p.lat,
        lng: p.lng,
        category: p.category_id,
        tags: p.tags || [],
        trigger_radius_m: p.trigger_radius_m,
        duration_hours: p.duration_hours,
        short: p.short,
        commentary: p.commentary,
        audio_story: p.audio_story,
        suggested_voice_tone: p.suggested_voice_tone,
        reviews: p.review_rating ? {
          rating: p.review_rating,
          summary: p.review_summary,
        } : undefined,
      }));

      // Reshape accommodations
      const shapedAccom = accommodations.map(a => ({
        id: a.id,
        name: a.name,
        region: a.region_id,
        lat: a.lat,
        lng: a.lng,
        type: a.type,
        price_nzd_per_night: a.price_nzd_per_night,
        rating: a.rating,
        short: a.short,
      }));

      // Reshape regions
      const shapedRegions = regions.map(r => ({
        id: r.id,
        name: r.name,
        island: r.island,
        lat: r.lat,
        lng: r.lng,
        description: r.description,
        bounds: {
          north: r.bounds_north,
          south: r.bounds_south,
          east: r.bounds_east,
          west: r.bounds_west,
        },
        poi_count: shapedAttractions.filter(a => a.region === r.id).length,
      }));

      // Filter out 'wildlife' category (merged into 'nature')
      const shapedCategories = categories.filter(c => c.id !== 'wildlife');

      await Promise.all([
        setCache(CACHE.ATTRACTIONS, shapedAttractions),
        setCache(CACHE.REGIONS, shapedRegions),
        setCache(CACHE.CATEGORIES, shapedCategories),
        setCache(CACHE.ACCOMMODATIONS, shapedAccom),
      ]);

      await AsyncStorage.setItem(CACHE.LAST_SYNC, String(Date.now()));

      return {
        status: 'synced',
        counts: {
          attractions: shapedAttractions.length,
          regions: shapedRegions.length,
          categories: categories.length,
          accommodations: shapedAccom.length,
        },
      };
    } catch (err) {
      // Offline or Supabase not configured yet — totally fine
      console.log('DataService sync skipped:', err.message);
      return { status: 'offline', error: err.message };
    }
  },

  /**
   * Get all attractions (POIs).
   * Returns cached data, falling back to bundled JSON.
   */
  async getAttractions() {
    const cached = await getCached(CACHE.ATTRACTIONS);
    return filterShippablePois(cached || bundledAttractions);
  },

  /**
   * Get a single attraction by ID.
   */
  async getAttraction(id) {
    const all = await this.getAttractions();
    return all.find(a => a.id === id) || null;
  },

  /**
   * Get all regions.
   */
  async getRegions() {
    const cached = await getCached(CACHE.REGIONS);
    return cached || bundledRegions;
  },

  /**
   * Get all categories.
   * Wildlife is merged into nature — filter it out at runtime.
   */
  async getCategories() {
    const cached = await getCached(CACHE.CATEGORIES);
    const cats = cached || bundledCategories;
    return cats.filter(c => c.id !== 'wildlife');
  },

  /**
   * Get all accommodations.
   */
  async getAccommodations() {
    const cached = await getCached(CACHE.ACCOMMODATIONS);
    return cached || bundledAccommodations;
  },

  /**
   * Get images for a specific POI (fetches from Supabase on demand).
   */
  async getPoiImages(poiId) {
    try {
      const { data, error } = await contentSupabase
        .from('poi_images')
        .select('image_url, display_order')
        .eq('poi_id', poiId)
        .order('display_order');
      if (error) throw error;
      return data.map(d => d.image_url);
    } catch {
      // Fall back to bundled poi_images.json if available
      try {
        const bundledImages = require('../data/poi_images.json');
        return bundledImages.attractions?.[poiId] || [];
      } catch {
        return [];
      }
    }
  },

  /**
   * Get scripts for a specific POI.
   */
  async getPoiScripts(poiId) {
    try {
      const { data, error } = await contentSupabase
        .from('poi_scripts')
        .select('*')
        .eq('poi_id', poiId);
      if (error) throw error;
      return data;
    } catch {
      return [];
    }
  },

  /**
   * Clear all cached data (for debugging / settings).
   */
  async clearCache() {
    memCache = {};
    await Promise.all(
      Object.values(CACHE).map(key => AsyncStorage.removeItem(key))
    );
  },
};

export default DataService;
