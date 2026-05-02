import { useCallback, useEffect, useState } from 'react';
import * as Location from 'expo-location';

/**
 * Request and track foreground location permission.
 *
 * Stage A only needs "while in use" — enough to show the user pin on the
 * map and test the geofence trigger interactively. Background location
 * will be opted into explicitly by the user in a later week, once the
 * geofencing engine is wired up.
 *
 * Returns:
 *   status        'undetermined' | 'granted' | 'denied'
 *   location      { lat, lng, accuracy, timestamp } | null
 *   loading       true while the initial fix is being acquired
 *   request()     triggers the native permission prompt
 */
export default function useLocationPermission() {
  const [status, setStatus] = useState('undetermined');
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchOnce = useCallback(async () => {
    try {
      setLoading(true);
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        timestamp: pos.timestamp,
      });
    } catch (err) {
      // Silent-fail on first run; surface via status if needed.
      console.warn('[useLocationPermission] getCurrentPosition failed:', err?.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const request = useCallback(async () => {
    const { status: next } = await Location.requestForegroundPermissionsAsync();
    setStatus(next);
    if (next === 'granted') await fetchOnce();
    return next;
  }, [fetchOnce]);

  // Check existing permission on mount. Don't prompt — screens do that on first interaction.
  useEffect(() => {
    (async () => {
      const { status: existing } = await Location.getForegroundPermissionsAsync();
      setStatus(existing);
      if (existing === 'granted') await fetchOnce();
    })();
  }, [fetchOnce]);

  return { status, location, loading, request };
}
