import { Platform, Linking, Alert } from 'react-native';

/**
 * Open the native maps app with driving directions to a single destination.
 * Falls back to Google Maps universal URL if the native scheme isn't available.
 */
export async function openDirectionsTo(attraction) {
  if (!attraction || attraction.lat == null || attraction.lng == null) return;
  const { lat, lng, name } = attraction;
  const label = encodeURIComponent(name || 'Destination');

  // Prefer the native maps scheme for a more polished feel.
  const nativeUrl = Platform.select({
    ios: `maps://?daddr=${lat},${lng}&dirflg=d&q=${label}`,
    android: `google.navigation:q=${lat},${lng}`,
  });
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;

  try {
    if (nativeUrl) {
      const supported = await Linking.canOpenURL(nativeUrl);
      if (supported) {
        await Linking.openURL(nativeUrl);
        return;
      }
    }
    await Linking.openURL(webUrl);
  } catch (err) {
    Alert.alert('Could not open maps', 'Please check that a maps app is installed.');
  }
}

/**
 * Open a multi-stop driving route using Google Maps (supports waypoints).
 * Expects `stops` = array of { lat, lng, name }.
 */
export async function openDirectionsForTrip(stops) {
  if (!stops || stops.length === 0) return;
  if (stops.length === 1) return openDirectionsTo(stops[0]);

  const last = stops[stops.length - 1];
  const waypoints = stops
    .slice(0, -1)
    .map((s) => `${s.lat},${s.lng}`)
    .join('|');
  const url =
    `https://www.google.com/maps/dir/?api=1` +
    `&destination=${last.lat},${last.lng}` +
    `&travelmode=driving` +
    (waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '');

  try {
    await Linking.openURL(url);
  } catch (err) {
    Alert.alert('Could not open maps', 'Please check that a maps app is installed.');
  }
}
