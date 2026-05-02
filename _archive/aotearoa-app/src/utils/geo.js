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
