import React, { createContext, useContext, useEffect, useReducer } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@aotearoa/itinerary';

const ItineraryContext = createContext(null);

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
    case 'reorder':
      return { ...state, items: action.items };
    case 'clear':
      return { ...state, items: [] };
    default:
      return state;
  }
}

export function ItineraryProvider({ children }) {
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
    add: (item) => dispatch({ type: 'add', item }),
    remove: (id) => dispatch({ type: 'remove', id }),
    reorder: (items) => dispatch({ type: 'reorder', items }),
    clear: () => dispatch({ type: 'clear' }),
    has: (id) => state.items.some((x) => x.id === id),
  };

  return <ItineraryContext.Provider value={api}>{children}</ItineraryContext.Provider>;
}

export function useItinerary() {
  const ctx = useContext(ItineraryContext);
  if (!ctx) throw new Error('useItinerary must be used inside ItineraryProvider');
  return ctx;
}
