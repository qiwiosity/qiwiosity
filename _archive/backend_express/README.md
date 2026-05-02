# Qiwiosity API

Stateless Express service that serves POI data + audio from
`../content/`. The mobile app ships with a baked-in copy of the same
content for offline operation, but checks this service for updates on
every launch so script improvements can be pushed without a release.

## Run locally

```bash
npm --workspace backend install
npm --workspace backend run dev    # node --watch src/server.js
```

Default port `4000`. Override with `PORT=5000`.

## Endpoints

- `GET /healthz`                 — liveness probe
- `GET /v1/manifest`             — content version hash + counts (POIs + accommodations)
- `GET /v1/regions`              — region summaries
- `GET /v1/regions/:id`          — full region + POIs
- `GET /v1/regions/:id/accommodations` — full accommodation list for a region
- `GET /v1/pois`                 — flat POI list (phone app shape)
- `GET /v1/pois/:id`             — single POI + resolved script contents
- `GET /v1/accommodations`       — flat accommodation list; query params: `region`, `type`, `min_price`, `max_price`
- `GET /v1/accommodations/:id`   — single accommodation
- `GET /v1/audio/<file>.mp3`     — static audio from `content/audio/`

## Deploy

Any Node 18+ host will work — Fly.io, Railway, Render, a droplet. The
service is stateless; put a CDN in front of `/v1/audio` for anything
serious. For early Stage A, a single region on Fly.io free tier is
enough.

## Roadmap

- Auth (Firebase ID tokens, header-based) once we have accounts.
- Write endpoints (`POST /v1/feedback`, `POST /v1/trip-log`) in Stage B.
- Edge cache via Cloudflare on `/v1/manifest` — trivial, deferred.
