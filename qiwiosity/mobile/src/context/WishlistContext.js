/**
 * WishlistContext — Cloud-synced wishlist from the Chrome extension + mobile.
 *
 * This is separate from MyListsContext (which is local-only).
 * WishlistContext syncs with Supabase so items saved from the Chrome
 * extension appear here, and items saved from the app appear in the extension.
 *
 * Requires the user to be authenticated via Supabase Auth.
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../lib/supabase';

const WishlistContext = createContext(null);

export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, visited: 0, unvisited: 0, matched_to_poi: 0 });
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const appState = useRef(AppState.currentState);

  // ── Auth listener ───────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => subscription?.unsubscribe();
  }, []);

  // ── Fetch wishlist when session changes ─────────────────
  useEffect(() => {
    if (session) {
      fetchWishlist();
      fetchStats();
    } else {
      setItems([]);
      setStats({ total: 0, visited: 0, unvisited: 0, matched_to_poi: 0 });
      setLoading(false);
    }
  }, [session]);

  // ── Refresh on app foreground ───────────────────────────
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current.match(/inactive|background/) && nextState === 'active' && session) {
        fetchWishlist();
        fetchStats();
      }
      appState.current = nextState;
    });
    return () => sub?.remove();
  }, [session]);

  // ── Data fetching ───────────────────────────────────────

  const fetchWishlist = useCallback(async (page = 1) => {
    if (!session) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlist_full')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .range((page - 1) * 50, page * 50 - 1);

      if (error) throw error;
      setItems(data || []);
    } catch (err) {
      console.warn('[Wishlist] fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [session]);

  const fetchStats = useCallback(async () => {
    if (!session) return;
    try {
      const { count: total } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id);

      const { count: visited } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .eq('is_visited', true);

      const { count: matched } = await supabase
        .from('wishlist_items')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)
        .not('poi_id', 'is', null);

      setStats({
        total: total || 0,
        visited: visited || 0,
        unvisited: (total || 0) - (visited || 0),
        matched_to_poi: matched || 0,
      });
    } catch (err) {
      console.warn('[Wishlist] stats error:', err.message);
    }
  }, [session]);

  // ── Mutations ───────────────────────────────────────────

  const addItem = useCallback(async ({ title, url, place_name, description, thumbnail_url, source_site, region, country, lat, lng, tags, notes }) => {
    if (!session) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('wishlist_items')
      .insert({
        user_id: session.user.id,
        title,
        url,
        place_name,
        description,
        thumbnail_url,
        source_site: source_site || 'mobile',
        region,
        country: country || 'New Zealand',
        lat,
        lng,
        tags: tags || [],
        notes,
        saved_from: 'mobile',
      })
      .select()
      .single();

    if (error) throw error;

    setItems(prev => [data, ...prev]);
    setStats(prev => ({ ...prev, total: prev.total + 1, unvisited: prev.unvisited + 1 }));
    return data;
  }, [session]);

  const removeItem = useCallback(async (id) => {
    if (!session) return;

    const { error } = await supabase
      .from('wishlist_items')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) throw error;

    const removed = items.find(i => i.id === id);
    setItems(prev => prev.filter(i => i.id !== id));
    setStats(prev => ({
      ...prev,
      total: prev.total - 1,
      visited: removed?.is_visited ? prev.visited - 1 : prev.visited,
      unvisited: removed?.is_visited ? prev.unvisited : prev.unvisited - 1,
    }));
  }, [session, items]);

  const toggleVisited = useCallback(async (id) => {
    if (!session) return;

    const item = items.find(i => i.id === id);
    if (!item) return;

    const newVisited = !item.is_visited;
    const updates = {
      is_visited: newVisited,
      visited_at: newVisited ? new Date().toISOString() : null,
    };

    const { error } = await supabase
      .from('wishlist_items')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) throw error;

    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    setStats(prev => ({
      ...prev,
      visited: newVisited ? prev.visited + 1 : prev.visited - 1,
      unvisited: newVisited ? prev.unvisited - 1 : prev.unvisited + 1,
    }));
  }, [session, items]);

  const updateNotes = useCallback(async (id, notes) => {
    if (!session) return;

    const { error } = await supabase
      .from('wishlist_items')
      .update({ notes })
      .eq('id', id)
      .eq('user_id', session.user.id);

    if (error) throw error;
    setItems(prev => prev.map(i => i.id === id ? { ...i, notes } : i));
  }, [session]);

  // ── Queries ─────────────────────────────────────────────

  const isInWishlist = useCallback((url) => {
    return items.some(i => i.url === url);
  }, [items]);

  const getMatchedPOIs = useCallback(() => {
    return items.filter(i => i.poi_id).map(i => i.poi_id);
  }, [items]);

  // ── Context value ───────────────────────────────────────

  const api = {
    // State
    items,
    stats,
    loading,
    isAuthenticated: !!session,
    user: session?.user || null,

    // Actions
    addItem,
    removeItem,
    toggleVisited,
    updateNotes,
    refresh: fetchWishlist,

    // Queries
    isInWishlist,
    getMatchedPOIs,
  };

  return <WishlistContext.Provider value={api}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
