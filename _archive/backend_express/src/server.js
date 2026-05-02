/**
 * Qiwiosity API — minimal Express skeleton.
 *
 * Serves content authored in ../content/ to the mobile app so we can
 * ship script updates without rebuilding the app binary. Stateless;
 * reads the JSON files on disk on each request (cheap — they're small
 * and the filesystem cache handles the rest).
 *
 * Endpoints:
 *   GET /healthz               liveness
 *   GET /v1/regions            list of region summaries + counts
 *   GET /v1/regions/:id        single region with its POIs (full schema)
 *   GET /v1/pois               flat list across every region (phone-app
 *                              shape — mirrors mobile/src/data/attractions.json)
 *   GET /v1/pois/:id           single POI + resolved script contents
 *   GET /v1/manifest           content version hash + counts; phone uses
 *                              this to decide whether to re-fetch
 *   GET /v1/audio/:file        static audio served from ../content/audio/
 *
 * Run:  npm --workspace backend run dev
 */

const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const dotenv = require('dotenv');
const { getReviewsForPoi } = require('./reviews');

// Load .env from the project root (parent of backend/)
dotenv.config({ path: path.resolve(__dirname, '..', '..', 'tools', '.env') });

const CONTENT_ROOT = path.resolve(__dirname, '..', '..', 'content');
const POI_DIR = path.join(CONTENT_ROOT, 'poi');
const ACCOM_DIR = path.join(CONTENT_ROOT, 'accommodations');
const SCRIPT_DIR = path.join(CONTENT_ROOT, 'scripts');
const AUDIO_DIR = path.join(CONTENT_ROOT, 'audio');

const app = express();
app.use(cors());
app.use(express.json());

// -------- helpers -----------------------------------------------------------

function readRegionFiles() {
  if (!fs.existsSync(POI_DIR)) return [];
  return fs.readdirSync(POI_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => {
      const raw = fs.readFileSync(path.join(POI_DIR, f), 'utf8');
      try { return JSON.parse(raw); } catch (e) {
        console.warn(`[api] failed to parse ${f}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

// Accommodations live in a separate, flatter directory structure. Same
// per-region pattern as POIs so the API can serve both from disk with
// identical caching behaviour.
function readAccomRegionFiles() {
  if (!fs.existsSync(ACCOM_DIR)) return [];
  return fs.readdirSync(ACCOM_DIR)
    .filter((f) => f.endsWith('.json') && f !== 'index.json')
    .map((f) => {
      const raw = fs.readFileSync(path.join(ACCOM_DIR, f), 'utf8');
      try { return JSON.parse(raw); } catch (e) {
        console.warn(`[api] failed to parse accommodation file ${f}: ${e.message}`);
        return null;
      }
    })
    .filter(Boolean);
}

function readScript(relPath) {
  if (!relPath) return null;
  const full = path.join(CONTENT_ROOT, relPath);
  if (!fs.existsSync(full)) return null;
  return fs.readFileSync(full, 'utf8');
}

function manifestHash(regions) {
  const h = crypto.createHash('sha256');
  for (const r of regions) h.update(JSON.stringify(r));
  return h.digest('hex').slice(0, 16);
}

// -------- routes ------------------------------------------------------------

app.get('/healthz', (req, res) => res.json({ ok: true, ts: Date.now() }));

app.get('/v1/regions', (req, res) => {
  const regions = readRegionFiles();
  res.json(regions.map((r) => ({
    id: r.region.id,
    name: r.region.name,
    island: r.region.island,
    centre: r.region.centre,
    bounds: r.region.bounds,
    description: r.region.description,
    poi_count: r.pois.length,
  })));
});

app.get('/v1/regions/:id', (req, res) => {
  const region = readRegionFiles().find((r) => r.region.id === req.params.id);
  if (!region) return res.status(404).json({ error: 'region_not_found' });
  res.json(region);
});

app.get('/v1/pois', (req, res) => {
  const regions = readRegionFiles();
  const flat = regions.flatMap((r) => r.pois.map((p) => ({
    id: p.id,
    name: p.name,
    region: p.region,
    lat: p.lat,
    lng: p.lng,
    category: p.category,
    tags: p.tags,
    trigger_radius_m: p.trigger_radius_m,
    duration_hours: p.duration_hours,
    short: p.short,
    commentary: p.commentary,
    reviews: p.reviews || null,
  })));
  res.json(flat);
});

app.get('/v1/pois/:id', (req, res) => {
  const regions = readRegionFiles();
  for (const r of regions) {
    const poi = r.pois.find((p) => p.id === req.params.id);
    if (poi) {
      const scripts = poi.scripts ? {
        headline: readScript(poi.scripts.headline),
        standard: readScript(poi.scripts.standard),
      } : null;
      return res.json({ ...poi, scripts_resolved: scripts });
    }
  }
  res.status(404).json({ error: 'poi_not_found' });
});

app.get('/v1/manifest', (req, res) => {
  const regions = readRegionFiles();
  const totalPois = regions.reduce((n, r) => n + r.pois.length, 0);
  const accoms = readAccomRegionFiles();
  const totalAccoms = accoms.reduce((n, r) => n + (r.accommodations || []).length, 0);
  res.json({
    version: manifestHash(regions),
    generated_at: new Date().toISOString(),
    region_count: regions.length,
    poi_count: totalPois,
    accommodation_count: totalAccoms,
    audio: fs.existsSync(AUDIO_DIR)
      ? fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.mp3'))
      : [],
  });
});

// -------- accommodation routes ----------------------------------------------
// Same shape as the POI routes so the mobile app can evolve from shipping a
// bundled JSON toward fetching from the API with minimal client changes.

// -------- reviews route --------------------------------------------------------
// GET /v1/pois/:id/reviews
// Returns AI overview + Google reviews for a single POI. Results are cached
// server-side for 24 h. Requires GOOGLE_PLACES_API_KEY + ANTHROPIC_API_KEY in env.

app.get('/v1/pois/:id/reviews', async (req, res) => {
  const regions = readRegionFiles();
  let poi = null;
  for (const r of regions) {
    const found = r.pois.find((p) => p.id === req.params.id);
    if (found) { poi = found; break; }
  }
  if (!poi) return res.status(404).json({ error: 'poi_not_found' });

  try {
    const reviews = await getReviewsForPoi(poi);
    res.json(reviews);
  } catch (err) {
    console.error('[api] reviews error:', err.message);
    res.status(500).json({ available: false, reason: 'Internal server error.' });
  }
});

// -------- accommodation routes ----------------------------------------------
// Same shape as the POI routes so the mobile app can evolve from shipping a
// bundled JSON toward fetching from the API with minimal client changes.

app.get('/v1/accommodations', (req, res) => {
  const { region, type, min_price, max_price } = req.query;
  const all = readAccomRegionFiles().flatMap((r) => r.accommodations || []);
  let out = all;
  if (region) out = out.filter((a) => a.region === region);
  if (type) out = out.filter((a) => a.type === type);
  if (min_price) out = out.filter((a) => a.price_nzd_per_night >= Number(min_price));
  if (max_price) out = out.filter((a) => a.price_nzd_per_night <= Number(max_price));
  res.json(out);
});

app.get('/v1/accommodations/:id', (req, res) => {
  const all = readAccomRegionFiles().flatMap((r) => r.accommodations || []);
  const hit = all.find((a) => a.id === req.params.id);
  if (!hit) return res.status(404).json({ error: 'accommodation_not_found' });
  res.json(hit);
});

app.get('/v1/regions/:id/accommodations', (req, res) => {
  const region = readAccomRegionFiles().find((r) => r.region && r.region.id === req.params.id);
  if (!region) return res.status(404).json({ error: 'region_not_found' });
  res.json(region);
});

if (fs.existsSync(AUDIO_DIR)) {
  app.use('/v1/audio', express.static(AUDIO_DIR, {
    maxAge: '1d',
    immutable: false,
  }));
}

// -------- startup -----------------------------------------------------------

const port = process.env.PORT || 4000;
app.listen(port, () => {
  console.log(`[qiwiosity-api] listening on :${port}`);
  console.log(`[qiwiosity-api] content root: ${CONTENT_ROOT}`);
});
