/**
 * Audio source lookup.
 *
 * Metro (React Native's bundler) requires static `require()` calls for
 * bundled assets — it can't resolve a dynamic path. So we maintain a
 * hand-edited manifest mapping `<poi_id>.<length>` to the bundled asset.
 *
 * Workflow to add a new audio file:
 *   1. Drop `<poi_id>.<length>.mp3` into mobile/assets/audio/
 *   2. Add a line below.
 *   3. Rebuild. Metro will bundle the MP3 automatically.
 *
 * If a POI doesn't have a bundled MP3, `getAudioSource` returns null and
 * `useNarration` falls back to on-device TTS.
 */

// --- Audio manifest --------------------------------------------------------
// Every entry must be a static require() so Metro can resolve the asset at
// build time. To add a new POI:
//
//   1. Render the MP3:  cd tools && node tts-render.js --only <poi_id>
//   2. Copy it across:  copy content\audio\<poi_id>.*.mp3 mobile\assets\audio\
//   3. Add the matching lines below and reload Expo.
//
// Te Mata Peak and the Heretaunga intro are commented out until their
// MP3s are rendered.

const AUDIO_MANIFEST = {
  'napier-marine-parade.headline': require('../../assets/audio/napier-marine-parade.headline.mp3'),
  'napier-marine-parade.standard': require('../../assets/audio/napier-marine-parade.standard.mp3'),
  'napier-bluff-hill.headline':    require('../../assets/audio/napier-bluff-hill.headline.mp3'),
  'napier-bluff-hill.standard':    require('../../assets/audio/napier-bluff-hill.standard.mp3'),
  // 'te-mata-peak.headline':            require('../../assets/audio/te-mata-peak.headline.mp3'),
  // 'te-mata-peak.standard':            require('../../assets/audio/te-mata-peak.standard.mp3'),
  // 'napier-heretaunga-intro.headline': require('../../assets/audio/napier-heretaunga-intro.headline.mp3'),
  // 'napier-heretaunga-intro.standard': require('../../assets/audio/napier-heretaunga-intro.standard.mp3'),
};

export function getAudioSource(poiId, length = 'standard') {
  if (!poiId) return null;
  const preferred = AUDIO_MANIFEST[`${poiId}.${length}`];
  if (preferred) return preferred;
  // Fall back to the other length if the requested one isn't there.
  const fallback = AUDIO_MANIFEST[`${poiId}.${length === 'standard' ? 'headline' : 'standard'}`];
  return fallback || null;
}

export function hasBundledAudio(poiId, length = 'standard') {
  return Boolean(getAudioSource(poiId, length));
}
