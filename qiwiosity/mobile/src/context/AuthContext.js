import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const ensureProfile = useCallback(async (userId, user) => {
    try {
      // 1. Try to load existing profile
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setProfile(data);
        return;
      }

      // 2. No profile exists — create one
      const handle =
        user?.user_metadata?.handle ||
        'user_' + userId.replace(/-/g, '').slice(0, 8);

      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: userId, handle })
        .select()
        .single();

      if (insertErr) {
        console.error('[Auth] profile insert failed:', insertErr.message, insertErr.code, insertErr.details);
        // Set local fallback so UI isn't blank
        setProfile({ id: userId, handle, created_at: new Date().toISOString(), _local: true });
        return;
      }

      if (created) {
        setProfile(created);
        return;
      }
    } catch (err) {
      console.error('[Auth] ensureProfile exception:', err.message);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      if (s) ensureProfile(s.user.id, s.user).finally(() => mounted && setLoading(false));
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, s) => {
      if (!mounted) return;
      setSession(s);
      if (s) {
        await ensureProfile(s.user.id, s.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, [ensureProfile]);

  const signUp = useCallback(async (email, password, handle) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { handle } },
    });
    if (error) throw error;
    return data;
  }, []);

  const signIn = useCallback(async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!session) throw new Error('Not authenticated');
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select()
      .single();
    if (error) throw error;
    setProfile(data);
    return data;
  }, [session]);

  const refreshProfile = useCallback(() => {
    if (session) return ensureProfile(session.user.id, session.user);
  }, [session, ensureProfile]);

  // Community user ID derived from auth UUID (format: u_<32 hex chars>)
  const communityUserId = session
    ? 'u_' + session.user.id.replace(/-/g, '')
    : null;

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAuthenticated: !!session,
    communityUserId,
    signUp,
    signIn,
    signOut,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
