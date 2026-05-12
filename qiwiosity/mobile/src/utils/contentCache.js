/**
 * Offline content cache.
 *
 * The mobile app ships with a bundled copy of attractions.json, so the
 * base experience works offline from first launch. This cache is the
 * update channel: on launch we call /v1/manifest; if the version hash
 * has changed, we pull /v1/pois and write it to AsyncStorage. Screens
 * read from AsyncStorage first, falling back to the bundled file.
 *
 *   await hydrateFromNetwork();       // run on app start, safe offline
 *   const list = await getAttractions(); // drop-in replacement for the JSON import
 *
 * This stays dependency-free; no extra libs beyond AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import bundled from '../data/attractions.json';
import DataService from '../lib/dataService';
import { getContentApiBase } from '../lib/config';

const KEY_POIS     = '@qiwiosity/cache/pois.json';
const KEY_MANIFEST = '@qiwiosity/cache/manifest.json';
const KEY_REGION_AUDIO = '@qiwiosity/cache/region-audio';

const SHIP_BLOCKLIST_RE = /\b(?:PLACEHOLDER|do not ship)\b/i;

function isShipBlockedPoi(poi) {
  const text = [
    poi.name,
    poi.short,
    poi.commentary,
    poi.audio_story,
  ].filter(Boolean).join(' ');

  return SHIP_BLOCKLIST_RE.test(text);
}

function filterShippablePois(pois) {
  return Array.isArray(pois) ? pois.filter(poi => !isShipBlockedPoi(poi)) : [];
}

export function getApiBase() {
  return getContentApiBase();
}

export async function getAttractions() {
  // Prefer DataService (Supabase-backed) cache first
  try {
    const data = await DataService.getAttractions();
    if (data && data.length > 0) return data;
  } catch {}
  // Legacy fallback: check old cache key
  try {
    const raw = await AsyncStorage.getItem(KEY_POIS);
    if (raw) return filterShippablePois(JSON.parse(raw));
  } catch {}
  return filterShippablePois(bundled);
}

export async function getCachedManifest() {
  try {
    const raw = await AsyncStorage.getItem(KEY_MANIFEST);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function hydrateFromNetwork({ timeoutMs = 4000 } = {}) {
  const base = getApiBase();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const mRes = await fetch(`${base}/v1/manifest`, { signal: ctrl.signal });
    if (!mRes.ok) throw new Error(`manifest http ${mRes.status}`);
    const manifest = await mRes.json();

    const cached = await getCachedManifest();
    if (cached && cached.version === manifest.version) {
      // Nothing changed. Quick exit.
      return { status: 'unchanged', manifest };
    }

    const pRes = await fetch(`${base}/v1/pois`, { signal: ctrl.signal });
    if (!pRes.ok) throw new Error(`pois http ${pRes.status}`);
    const pois = filterShippablePois(await pRes.json());

    await AsyncStorage.setItem(KEY_POIS, JSON.stringify(pois));
    await AsyncStorage.setItem(KEY_MANIFEST, JSON.stringify(manifest));
    return { status: 'updated', manifest, count: pois.length };
  } catch (err) {
    // Offline / network error — that's fine, we just stay on the bundled
    // or previously-cached data.
    return { status: 'offline', error: err?.message };
  } finally {
    clearTimeout(timer);
  }
}

// --- Region-level audio pre-caching ----------------------------------------
// Users about to drive rural NZ can pre-cache a region's audio so Drive
// Mode works without signal. We download every MP3 referenced in a
// region's POIs into expo-file-system's documentDirectory, then remember
// the list in AsyncStorage.

export async function precacheRegionAudio(regionId, { onProgress } = {}) {
  let FileSystem;
  try {
    FileSystem = require('expo-file-system/legacy');
  } catch {
    try { FileSystem = require('expo-file-system'); } catch { return { ok: false, reason: 'fs-missing' }; }
  }

  const base = getApiBase();
  let manifest;
  try {
    const res = await fetch(`${base}/v1/manifest`);
    manifest = await res.json();
  } catch {
    return { ok: false, reason: 'offline' };
  }

  const pois = await getAttractions();
  const regionPois = pois.filter((p) => p.region === regionId);
  const wanted = regionPois.flatMap((p) => [
    `${p.id}.headline.mp3`,
    `${p.id}.standard.mp3`,
  ]).filter((f) => manifest.audio.includes(f));

  const dir = `${FileSystem.documentDirectory}audio/`;
  try { await FileSystem.makeDirectoryAsync(dir, { intermediates: true }); } catch {}

  let done = 0;
  for (const filename of wanted) {
    const target = `${dir}${filename}`;
    const info = await FileSystem.getInfoAsync(target).catch(() => ({ exists: false }));
    if (!info.exists) {
      const url = `${base}/v1/audio/${filename}`;
      await FileSystem.downloadAsync(url, target).catch(() => {});
    }
    done += 1;
    if (onProgress) onProgress({ done, total: wanted.length, filename });
  }

  const list = await AsyncStorage.getItem(KEY_REGION_AUDIO);
  const cached = list ? JSON.parse(list) : {};
  cached[regionId] = { files: wanted, at: Date.now() };
  await AsyncStorage.setItem(KEY_REGION_AUDIO, JSON.stringify(cached));

  return { ok: true, count: wanted.length };
}

export async function getCachedRegions() {
  const raw = await AsyncStorage.getItem(KEY_REGION_AUDIO);
  return raw ? JSON.parse(raw) : {};
}

export async function clearRegionAudio(regionId) {
  let FileSystem;
  try {
    FileSystem = require('expo-file-system/legacy');
  } catch {
    try { FileSystem = require('expo-file-system'); } catch { return; }
  }
  const raw = await AsyncStorage.getItem(KEY_REGION_AUDIO);
  if (!raw) return;
  const cached = JSON.parse(raw);
  const region = cached[regionId];
  if (!region) return;
  for (const filename of region.files) {
    const target = `${FileSystem.documentDirectory}audio/${filename}`;
    await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => {});
  }
  delete cached[regionId];
  await AsyncStorage.setItem(KEY_REGION_AUDIO, JSON.stringify(cached));
}
