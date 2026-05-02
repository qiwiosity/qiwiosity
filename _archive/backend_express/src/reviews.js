/**
 * reviews.js — Qiwiosity POI Review Service
 *
 * Fetches reviews from Google Places API and generates an AI overview
 * using the Anthropic API. Results are cached in-memory for 24 hours
 * to minimise API calls.
 *
 * Requires env vars:
 *   GOOGLE_PLACES_API_KEY  — Google Cloud project key with Places API enabled
 *   ANTHROPIC_API_KEY      — Anthropic API key (claude-3-haiku-20240307 or better)
 *
 * If either key is absent the function returns a graceful "unavailable" response
 * rather than throwing, so the mobile UI can show a friendly fallback.
 */

const https = require('https');

// ─── Simple in-memory cache ────────────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const cache = new Map(); // key: poi_id → { data, expires }

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) { cache.delete(key); return null; }
  return entry.data;
}

function setCached(key, data) {
  cache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────
function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try { resolve(JSON.parse(body)); }
        catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
      });
    }).on('error', reject);
  });
}

function httpPost(hostname, path, headers, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const req = https.request(
      { hostname, path, method: 'POST', headers: { ...headers, 'Content-Length': Buffer.byteLength(payload) } },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`JSON parse error: ${e.message}`)); }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

// ─── Google Places helpers ─────────────────────────────────────────────────

/**
 * Find the Google Place ID for a POI using its name + NZ location context.
 * Uses the Places Text Search endpoint.
 */
async function findPlaceId(poi, apiKey) {
  const query = encodeURIComponent(`${poi.name} New Zealand`);
  const fields = 'place_id,name,formatted_address';
  const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${query}&inputtype=textquery&fields=${fields}&locationbias=circle:500000@-41.2865,174.7762&key=${apiKey}`;
  const result = await httpGet(url);
  if (result.status !== 'OK' || !result.candidates?.length) return null;
  return result.candidates[0].place_id;
}

/**
 * Fetch place details (rating, review count, top reviews) for a given place ID.
 */
async function fetchPlaceDetails(placeId, apiKey) {
  const fields = 'name,rating,user_ratings_total,reviews';
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${apiKey}`;
  const result = await httpGet(url);
  if (result.status !== 'OK' || !result.result) return null;
  return result.result;
}

// ─── Anthropic AI overview ─────────────────────────────────────────────────

/**
 * Generate a concise AI overview of a POI based on its Google reviews.
 * Returns a 2–3 sentence synthesis highlighting what visitors love (and
 * any consistent caveats), written in an informative but warm tone.
 */
async function generateAiOverview(poi, placeDetails, apiKey) {
  const reviews = (placeDetails.reviews || []).slice(0, 8);
  if (!reviews.length) return null;

  const reviewText = reviews
    .map((r, i) => `Review ${i + 1} (${r.rating}★): "${r.text}"`)
    .join('\n\n');

  const prompt = `You are helping visitors discover the best of New Zealand. Based on the following real visitor reviews for "${poi.name}" in ${poi.region}, write a concise 2–3 sentence AI overview that:
- Highlights what visitors consistently love about this place
- Mentions any standout experiences or tips
- Notes any consistent caveats or things to be aware of (only if present)
- Is warm, informative, and honest — not promotional fluff

Write ONLY the overview paragraph. No headings, no bullet points, no preamble.

Reviews:
${reviewText}`;

  const response = await httpPost(
    'api.anthropic.com',
    '/v1/messages',
    {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    {
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }
  );

  return response?.content?.[0]?.text?.trim() || null;
}

// ─── Public API ────────────────────────────────────────────────────────────

/**
 * Get reviews and AI overview for a POI.
 *
 * @param {object} poi  — POI object from the content JSON
 * @returns {object}    — { available, rating, review_count, ai_overview, reviews, attribution }
 */
async function getReviewsForPoi(poi) {
  // Return cached result if fresh
  const cached = getCached(poi.id);
  if (cached) return cached;

  const googleKey = process.env.GOOGLE_PLACES_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!googleKey || !anthropicKey) {
    return {
      available: false,
      reason: 'Review service not configured. Set GOOGLE_PLACES_API_KEY and ANTHROPIC_API_KEY.',
    };
  }

  try {
    // 1. Find the Google Place ID
    const placeId = poi.google_place_id || await findPlaceId(poi, googleKey);
    if (!placeId) {
      return { available: false, reason: 'Place not found on Google Maps.' };
    }

    // 2. Fetch place details + reviews
    const details = await fetchPlaceDetails(placeId, googleKey);
    if (!details) {
      return { available: false, reason: 'Could not load place details.' };
    }

    // 3. Generate AI overview if we have reviews
    const aiOverview = details.reviews?.length
      ? await generateAiOverview(poi, details, anthropicKey)
      : null;

    // 4. Shape the response
    const topReviews = (details.reviews || [])
      .slice(0, 4)
      .map((r) => ({
        author: r.author_name,
        rating: r.rating,
        text: r.text?.slice(0, 280) + (r.text?.length > 280 ? '…' : ''),
        time: r.relative_time_description,
        profile_photo: r.profile_photo_url || null,
      }));

    const result = {
      available: true,
      place_id: placeId,
      rating: details.rating || null,
      review_count: details.user_ratings_total || 0,
      ai_overview: aiOverview,
      reviews: topReviews,
      attribution: 'Reviews sourced from Google Maps',
    };

    setCached(poi.id, result);
    return result;

  } catch (err) {
    console.error(`[reviews] Error fetching reviews for ${poi.id}:`, err.message);
    return { available: false, reason: 'Review service temporarily unavailable.' };
  }
}

module.exports = { getReviewsForPoi };
