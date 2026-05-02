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

// Expo public env vars (set in app.json extra or via EAS)
const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://hauksnqehzaxuoeaezji.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdWtzbnFlaHpheHVvZWFlemppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Njg2NjEsImV4cCI6MjA5MjI0NDY2MX0.jaxhd4xgDwfO5POCTFI9G0M66Ev9vykcs6gPAZSiZSo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export default supabase;
