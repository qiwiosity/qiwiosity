const env = (typeof process !== 'undefined' && process.env) || {};

function trimTrailingSlash(value) {
  return String(value || '').replace(/\/$/, '');
}

export const CONTENT_SUPABASE_URL = trimTrailingSlash(
  env.EXPO_PUBLIC_CONTENT_SUPABASE_URL ||
  'https://hauksnqehzaxuoeaezji.supabase.co'
);

export const CONTENT_SUPABASE_ANON_KEY =
  env.EXPO_PUBLIC_CONTENT_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhhdWtzbnFlaHpheHVvZWFlemppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2Njg2NjEsImV4cCI6MjA5MjI0NDY2MX0.jaxhd4xgDwfO5POCTFI9G0M66Ev9vykcs6gPAZSiZSo';

export const AUTH_SUPABASE_URL = trimTrailingSlash(
  env.EXPO_PUBLIC_AUTH_SUPABASE_URL ||
  env.EXPO_PUBLIC_SUPABASE_URL ||
  'https://osulujkdeuukilchfath.supabase.co'
);

export const AUTH_SUPABASE_ANON_KEY =
  env.EXPO_PUBLIC_AUTH_SUPABASE_ANON_KEY ||
  env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9zdWx1amtkZXV1a2lsY2hmYXRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNDc0MTcsImV4cCI6MjA5MzgyMzQxN30.Ery8n0yWMgRINn4MTSkW1tTv7t8oRZU9LTUuGiMmXiU';

export const SERVER_API_BASE = trimTrailingSlash(
  env.EXPO_PUBLIC_SERVER_API_BASE ||
  'https://qiwiosity-production.up.railway.app'
);

export function getContentApiBase() {
  const runtimeBase =
    typeof globalThis !== 'undefined' ? globalThis.QIWIOSITY_API_BASE : null;

  return trimTrailingSlash(
    runtimeBase ||
    env.EXPO_PUBLIC_CONTENT_API_BASE ||
    'https://api.qiwiosity.nz'
  );
}
