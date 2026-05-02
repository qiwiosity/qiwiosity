import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@qiwiosity/compare';

const CompareContext = createContext(null);

const initial = { items: [], loaded: false };

function reducer(state, action) {
  switch (action.type) {
    case 'hydrate':
      return { items: action.items || [], loaded: true };
    case 'add':
      if (state.items.some((x) => x.id === action.item.id)) return state;
      return { ...state, items: [...state.items, action.item] };
    case 'remove':
      return { ...state, items: state.items.filter((x) => x.id !== action.id) };
    case 'clear':
      return { ...state, items: [] };
    default:
      return state;
  }
}

export function CompareProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initial);

  // hydrate from storage
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => dispatch({ type: 'hydrate', items: raw ? JSON.parse(raw) : [] }))
      .catch(() => dispatch({ type: 'hydrate', items: [] }));
  }, []);

  // persist
  useEffect(() => {
    if (!state.loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state.items)).catch(() => {});
  }, [state.items, state.loaded]);

  const api = {
    items: state.items,
    count: state.items.length,
    add: (item) =>
      dispatch({
        type: 'add',
        item: {
          id: item.id,
          name: item.name,
          region: item.region || item.region_id,
          category: item.category || item.category_id,
          duration_hours: item.duration_hours,
          short: item.short,
          tags: item.tags || [],
          lat: item.lat,
          lng: item.lng,
          review_rating: item.review_rating,
          itemType: item.itemType || 'poi',
          // accommodation-specific
          type: item.type,
          price_range: item.price_range,
        },
      }),
    remove: (id) => dispatch({ type: 'remove', id }),
    clear: () => dispatch({ type: 'clear' }),
    has: (id) => state.items.some((x) => x.id === id),
    toggle: (item) => {
      if (state.items.some((x) => x.id === item.id)) {
        dispatch({ type: 'remove', id: item.id });
        return false; // was removed
      }
      dispatch({
        type: 'add',
        item: {
          id: item.id,
          name: item.name,
          region: item.region || item.region_id,
          category: item.category || item.category_id,
          duration_hours: item.duration_hours,
          short: item.short,
          tags: item.tags || [],
          lat: item.lat,
          lng: item.lng,
          review_rating: item.review_rating,
          itemType: item.itemType || 'poi',
          type: item.type,
          price_range: item.price_range,
        },
      });
      return true; // was added
    },
  };

  return <CompareContext.Provider value={api}>{children}</CompareContext.Provider>;
}

export function useCompare() {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error('useCompare must be used inside CompareProvider');
  return ctx;
}
