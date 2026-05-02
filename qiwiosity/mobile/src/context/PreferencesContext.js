import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * User preferences, persisted to AsyncStorage and shared across screens.
 *
 *   audioLength       'headline' | 'standard'   - default narration length
 *   driveMode         boolean                   - background geofencing on?
 *   voice             'apple-default' | 'warm-nz' | 'bundled-mp3'
 *   units             'metric' | 'imperial'     - (Hint for distance strings)
 *   storyAutoPlay     boolean                   - play on geofence enter?
 *   homeRegion        string | null             - e.g. 'hawkes-bay'
 */

const STORAGE_KEY = '@qiwiosity/preferences';

const initial = {
  loaded: false,
  audioLength: 'standard',
  driveMode: false,
  voice: 'bundled-mp3',
  units: 'metric',
  storyAutoPlay: true,
  homeRegion: 'hawkes-bay',
};

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { ...state, ...action.prefs, loaded: true };
    case 'set':
      return { ...state, [action.key]: action.value };
    case 'reset':
      return { ...initial, loaded: true };
    default:
      return state;
  }
}

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', prefs: raw ? JSON.parse(raw) : {} }))
      .catch(() => dispatch({ type: 'hydrate', prefs: {} }));
  }, []);

  useEffect(() => {
    if (!state.loaded) return;
    const { loaded, ...toPersist } = state;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist)).catch(() => {});
  }, [state]);

  const api = {
    ...state,
    set: (key, value) => dispatch({ type: 'set', key, value }),
    reset: () => dispatch({ type: 'reset' }),
  };

  return <PreferencesContext.Provider value={api}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used inside PreferencesProvider');
  return ctx;
}
