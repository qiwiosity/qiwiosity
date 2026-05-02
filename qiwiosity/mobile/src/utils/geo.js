// Simple haversine distance (km)
export function haversine(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Raw-coords variant used by the geofence loop — metres, not km — since
 * trigger radii are expressed in metres in the POI schema.
 */
export function distanceMeters(lat1, lng1, lat2, lng2) {
  return haversine({ lat: lat1, lng: lng1 }, { lat: lat2, lng: lng2 }) * 1000;
}

export function totalDistanceKm(stops) {
  let d = 0;
  for (let i = 1; i < stops.length; i++) d += haversine(stops[i - 1], stops[i]);
  return Math.round(d);
}

// Very rough driving time estimate - NZ roads are slow
export function estimateDrivingHours(distanceKm) {
  const avgSpeed = 75; // km/h
  return Math.round((distanceKm / avgSpeed) * 10) / 10;
}

/**
 * Optimise stop order using nearest-neighbour heuristic with 2-opt
 * improvement — a fast, good-enough TSP solver for trip planning.
 * Returns a new array with the same items in optimised order.
 */
export function optimiseRoute(stops) {
  if (stops.length <= 2) return [...stops];

  // ── Build distance matrix ──────────────────────────────────────────
  const n = stops.length;
  const dist = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => haversine(stops[i], stops[j])),
  );

  // ── Nearest-neighbour from every possible start, keep the best ────
  let bestOrder = null;
  let bestDist = Infinity;

  for (let start = 0; start < n; start++) {
    const visited = new Set([start]);
    const order = [start];
    let cur = start;

    while (order.length < n) {
      let nearest = -1;
      let nearDist = Infinity;
      for (let j = 0; j < n; j++) {
        if (!visited.has(j) && dist[cur][j] < nearDist) {
          nearDist = dist[cur][j];
          nearest = j;
        }
      }
      order.push(nearest);
      visited.add(nearest);
      cur = nearest;
    }

    // Total path length
    let d = 0;
    for (let i = 1; i < order.length; i++) d += dist[order[i - 1]][order[i]];
    if (d < bestDist) {
      bestDist = d;
      bestOrder = order;
    }
  }

  // ── 2-opt improvement pass ─────────────────────────────────────────
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let j = i + 2; j < n; j++) {
        const a = bestOrder[i], b = bestOrder[i + 1];
        const c = bestOrder[j], d2 = bestOrder[(j + 1) % n];
        const before = dist[a][b] + dist[c][d2 === undefined ? a : d2];
        const after = dist[a][c] + dist[b][d2 === undefined ? a : d2];
        if (after < before - 0.01) {
          // Reverse segment between i+1 and j
          bestOrder.splice(i + 1, j - i, ...bestOrder.slice(i + 1, j + 1).reverse());
          improved = true;
        }
      }
    }
  }

  return bestOrder.map((i) => stops[i]);
}
