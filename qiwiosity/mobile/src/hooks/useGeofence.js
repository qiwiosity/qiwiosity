import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { distanceMeters } from '../utils/geo';
// Bundled fallback for the background task (can't use React context)
import bundledAttractions from '../data/attractions.json';

/**
 * useGeofence
 *
 * Starts a background location watch that fires a callback the first time
 * the user enters any POI's trigger radius. One trigger per POI per
 * "session" (resets when the user leaves and re-enters, or when the
 * session is cleared).
 *
 * We deliberately avoid expo-location's native geofence regions because:
 *   - iOS caps region monitoring at 20 simultaneous regions.
 *   - Once we add more POIs, we'd have to juggle which 20 are active.
 * A simple distance check against all POIs in JS, driven by the location
 * watch stream, scales trivially into the thousands before CPU matters.
 *
 * Usage:
 *   useGeofence(({ attraction, distance }) => {
 *     narration.toggle(attraction);
 *   });
 */

const TASK_NAME = 'QIWIOSITY_BACKGROUND_LOCATION';

/**
 * @param {Function} onEnter - callback when user enters a POI radius
 * @param {Array} attractions - POI array from useData() context
 */
export default function useGeofence(onEnter, attractions) {
  // Fall back to bundled data if attractions not provided
  const poisRef = useRef(attractions || bundledAttractions);
  poisRef.current = attractions || bundledAttractions;
  const firedRef = useRef(new Set()); // POI ids already triggered this "session"
  const watcherRef = useRef(null);
  const callbackRef = useRef(onEnter);
  callbackRef.current = onEnter;

  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') return;

      // Foreground watcher — ticks every 5s or every 20m, whichever comes first.
      watcherRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
          distanceInterval: 20,
        },
        (pos) => {
          if (cancelled) return;
          const { latitude, longitude } = pos.coords;
          evaluate(latitude, longitude, firedRef, callbackRef, poisRef);
        }
      );
    };

    start();

    return () => {
      cancelled = true;
      if (watcherRef.current) {
        watcherRef.current.remove();
        watcherRef.current = null;
      }
    };
  }, []);

  return {
    /** Clear the fired set so already-visited POIs can trigger again. */
    reset: () => {
      firedRef.current.clear();
    },
    /** Mark a POI as "played" without actually entering its radius. */
    markFired: (poiId) => {
      firedRef.current.add(poiId);
    },
  };
}

function evaluate(lat, lng, firedRef, callbackRef, poisRef) {
  const pois = poisRef ? poisRef.current : bundledAttractions;
  for (const a of pois) {
    if (firedRef.current.has(a.id)) continue;
    const d = distanceMeters(lat, lng, a.lat, a.lng);
    if (d <= (a.trigger_radius_m || 400)) {
      firedRef.current.add(a.id);
      try {
        callbackRef.current && callbackRef.current({ attraction: a, distance: d });
      } catch (err) {
        console.warn('[useGeofence] handler threw:', err?.message);
      }
      // Don't break — unusual, but two overlapping POIs could legitimately
      // both be relevant in rare spots. Let the handler decide.
    }
  }
}

// ---------------------------------------------------------------------------
// Background task — registered at module load so background location updates
// are handled even if no screen is mounted (e.g., phone is locked, CarPlay
// is showing). The task evaluates the same geofence list and posts a local
// notification / passes the POI to the native CarPlay audio player via the
// MPNowPlayingInfoCenter bridge once background-playable audio is wired up.
// ---------------------------------------------------------------------------

// Guard: TaskManager.defineTask may throw in Expo Go where background
// tasks aren't fully supported. Wrap in try/catch so the module still loads.
try { if (!TaskManager.isTaskDefined(TASK_NAME)) {
  TaskManager.defineTask(TASK_NAME, async ({ data, error }) => {
    if (error) {
      console.warn('[geofence-bg] task error:', error.message);
      return;
    }
    const { locations } = data || {};
    if (!locations || !locations.length) return;
    const pos = locations[locations.length - 1];
    const { latitude, longitude } = pos.coords;

    // In the background we can't touch React state. The safest thing is to
    // persist a "pending narration" event to AsyncStorage and let the next
    // foreground tick pick it up.
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      for (const a of bundledAttractions) {
        const d = distanceMeters(latitude, longitude, a.lat, a.lng);
        if (d <= (a.trigger_radius_m || 400)) {
          const key = `@qiwiosity/bg-trigger/${a.id}`;
          const already = await AsyncStorage.getItem(key);
          if (!already) {
            await AsyncStorage.setItem(key, JSON.stringify({
              id: a.id,
              at: Date.now(),
              distance: d,
            }));
          }
        }
      }
    } catch (e) {
      // async-storage not present — silent.
    }
  });
}
} catch (e) {
  console.log('[geofence] Background task registration skipped (Expo Go):', e.message);
}

/**
 * startBackgroundGeofencing()
 *
 * Call once after the user accepts background permission — usually from a
 * "Drive mode" toggle on the Map screen. Idempotent.
 */
export async function startBackgroundGeofencing() {
  try {
    const { status: fg } = await Location.getForegroundPermissionsAsync();
    if (fg !== 'granted') return false;
    const { status: bg } = await Location.getBackgroundPermissionsAsync();
    if (bg !== 'granted') {
      const req = await Location.requestBackgroundPermissionsAsync();
      if (req.status !== 'granted') return false;
    }

    const already = await Location.hasStartedLocationUpdatesAsync(TASK_NAME);
    if (already) return true;

    await Location.startLocationUpdatesAsync(TASK_NAME, {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: 15_000,
      distanceInterval: 50,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Qiwiosity is listening for stories',
        notificationBody: 'We\'ll play commentary when you\'re near a point of interest.',
        notificationColor: '#15888A',
      },
      pausesUpdatesAutomatically: false,
    });

    return true;
  } catch (e) {
    console.warn('[geofence] Background geofencing unavailable (Expo Go):', e.message);
    return false;
  }
}

export async function stopBackgroundGeofencing() {
  const already = await Location.hasStartedLocationUpdatesAsync(TASK_NAME).catch(() => false);
  if (already) {
    await Location.stopLocationUpdatesAsync(TASK_NAME);
  }
}
