/**
 * getPoiImage — returns hero image URL(s) for any POI (attraction or accommodation).
 *
 * Lookup hierarchy:
 *   1. Specific curated image(s) for this POI id
 *   2. Region-level landscape fallback
 *   3. Category / type fallback
 *   4. Global default (Mount Cook)
 *
 * Attraction entries in poi_images.json are now string[] (3-5 images).
 * Use getAttractionImage() for a single URL (thumbnail / hero cover),
 * or getAttractionImages() to get the full gallery array.
 *
 * All images are served from Wikimedia Commons Special:FilePath — no API key
 * required, fully open-licensed.
 */

import poiImages from '../data/poi_images.json';

/* ── Internal helpers ─────────────────────────────────────────────── */

/** Normalise an attraction entry to always return an array of URLs. */
function _attractionArray(entry) {
  if (!entry) return null;
  return Array.isArray(entry) ? entry : [entry];
}

/** Pick the best single URL from an attraction entry (first element). */
function _attractionFirst(entry) {
  const arr = _attractionArray(entry);
  return arr ? arr[0] : null;
}

/* ── Public API ───────────────────────────────────────────────────── */

/**
 * Get a SINGLE hero image URL for an attraction (for thumbnails / list cards).
 * @param {object} attraction - attraction record from attractions.json
 * @returns {string} HTTPS image URL
 */
export function getAttractionImage(attraction) {
  if (!attraction) return poiImages.categories.default;

  // 1. Specific POI
  const specific = _attractionFirst(poiImages.attractions[attraction.id]);
  if (specific) return specific;

  // 2. Region fallback
  const regionKey = attraction.region?.toLowerCase().replace(/_/g, '-');
  const regionImg = poiImages.regions[regionKey];
  if (regionImg) return regionImg;

  // 3. Category fallback
  const catKey = (attraction.category || '').toLowerCase();
  return (
    poiImages.categories[catKey] ||
    poiImages.categories[catKey.replace(/-/g, '')] ||
    poiImages.categories.default
  );
}

/**
 * Get the FULL gallery array of image URLs for an attraction (detail screen).
 * Always returns at least one URL.
 * @param {object} attraction - attraction record from attractions.json
 * @returns {string[]} Array of HTTPS image URLs (1–5 entries)
 */
export function getAttractionImages(attraction) {
  if (!attraction) return [poiImages.categories.default];

  // 1. Specific POI gallery
  const arr = _attractionArray(poiImages.attractions[attraction.id]);
  if (arr && arr.length > 0) return arr;

  // 2. Region fallback (wrap in array)
  const regionKey = attraction.region?.toLowerCase().replace(/_/g, '-');
  const regionImg = poiImages.regions[regionKey];
  if (regionImg) return [regionImg];

  // 3. Category fallback
  const catKey = (attraction.category || '').toLowerCase();
  const catImg =
    poiImages.categories[catKey] ||
    poiImages.categories[catKey.replace(/-/g, '')] ||
    poiImages.categories.default;
  return [catImg];
}

/**
 * Get image URL for an accommodation.
 * @param {object} accommodation - accommodation record from accommodations.json
 * @returns {string} HTTPS image URL
 */
export function getAccommodationImage(accommodation) {
  if (!accommodation) return poiImages.accommodationTypes.default;

  // 1. Region landscape (shows the destination, not just a generic hotel room)
  const regionKey = accommodation.region?.toLowerCase().replace(/_/g, '-');
  const regionImg = poiImages.regions[regionKey];
  if (regionImg) return regionImg;

  // 2. Accommodation type
  const typeKey = (accommodation.type || '').toLowerCase();
  return poiImages.accommodationTypes[typeKey] || poiImages.accommodationTypes.default;
}

/**
 * Generic fallback for any POI (duck-typed — works for either).
 */
export function getPoiImage(poi) {
  if (!poi) return poiImages.categories.default;
  // Attractions have a `category` field; accommodations have a `type` field.
  return poi.category !== undefined
    ? getAttractionImage(poi)
    : getAccommodationImage(poi);
}
