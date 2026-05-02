import React, { createContext, useContext } from 'react';
import useNarration from '../hooks/useNarration';

/**
 * App-wide narration controller. Hoisting it to context lets the tab-bar
 * Now Playing strip and per-screen play buttons share a single player
 * instance — otherwise every screen mount would create its own, and
 * tapping play on one would leave another still playing.
 */
const NarrationContext = createContext(null);

export function NarrationProvider({ children }) {
  const api = useNarration();
  return <NarrationContext.Provider value={api}>{children}</NarrationContext.Provider>;
}

export function useSharedNarration() {
  const ctx = useContext(NarrationContext);
  if (!ctx) throw new Error('useSharedNarration must be used inside NarrationProvider');
  return ctx;
}
