/**
 * Supabase clients for the Qiwiosity mobile app.
 *
 * `supabase` is the auth/community client. `contentSupabase` is the
 * read-only content catalogue client. Both use public anon keys; RLS
 * and table policies decide what each client can access.
 *
 * To configure:
 *   1. Set EXPO_PUBLIC_AUTH_SUPABASE_URL / EXPO_PUBLIC_AUTH_SUPABASE_ANON_KEY
 *      and EXPO_PUBLIC_CONTENT_SUPABASE_URL / EXPO_PUBLIC_CONTENT_SUPABASE_ANON_KEY
 *      in your app.json → extra, or in .env with expo-constants.
 *   2. Fallback values live in ./config.js for local development.
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  AUTH_SUPABASE_ANON_KEY,
  AUTH_SUPABASE_URL,
  CONTENT_SUPABASE_ANON_KEY,
  CONTENT_SUPABASE_URL,
} from './config';

const isWeb = Platform.OS === 'web';

export const supabase = createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
  auth: {
    storage: isWeb ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isWeb,
  },
});

export const contentSupabase = createClient(CONTENT_SUPABASE_URL, CONTENT_SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

export default supabase;
