/**
 * Supabase client for the Qiwiosity mobile app.
 *
 * Uses the PUBLIC anon key (safe for client-side code).
 * Row-Level Security on Supabase ensures read-only access.
 *
 * To configure:
 *   1. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY
 *      in your app.json → extra, or in .env with expo-constants.
 *   2. Or update the fallback values below during development.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Expo public env vars (set in app.json extra or via EAS)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://osulujkdeuukilchfath.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdWx1amtkZXV1a2lsY2hmYXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDc0MTcsImV4cCI6MjA5MzgyMzQxN30.Ery8n0yWMgRINn4MTSkW1tTv7t8oRZU9LTUuGiMmXiU';

const isWeb = Platform.OS === 'web';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

export default supabase;
