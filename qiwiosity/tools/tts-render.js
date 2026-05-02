#!/usr/bin/env node
/**
 * Qiwiosity — TTS render pipeline
 *
 * Reads scripts from ../content/scripts/*.md, sends them to ElevenLabs,
 * writes MP3s to ../content/audio/<poi_id>.<length>.mp3.
 *
 * Zero external dependencies — uses only Node built-ins so this runs
 * out of the box once the user adds their API key.
 *
 * Usage (see ./README.md for full docs):
 *   node tts-render.js                         render new scripts
 *   node tts-render.js --dry-run               show what would be done
 *   node tts-render.js --force                 re-render everything
 *   node tts-render.js --only <poi_id>         filter by POI id
 *   node tts-render.js --voice <alias|id>      override default voice
 */

import { readFile, writeFile, readdir, mkdir, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ROOT = resolve(__dirname, '..');
const SCRIPTS_DIR = join(ROOT, 'content', 'scripts');
const AUDIO_DIR = join(ROOT, 'content', 'audio');
const ENV_FILE = join(__dirname, '.env');

// Named voice aliases — map friendly names to ElevenLabs voice IDs.
// These are the public default voices anyone with an account can use.
//
// Non-American options (better fit for a NZ tour guide):
//   dave       British male, conversational
//   fin        Irish male, sailor-ish
//   charlotte  British/Swedish female, calm
//   daniel     British male, news/narration
//   lily       British female, warm
//
// American options (fallback / variety):
//   rachel, adam, brian, domi, bella, antoni, josh, sam
//
// To add another: go to elevenlabs.io/app/voice-library, find one you like,
// copy its Voice ID, and add a line below. Or just pass the raw ID via --voice.
const VOICES = {
  // Qiwiosity default narrator voice.
  liam: 'VEWZvLXUrFL3O7dUnBSW',
  // British / Irish
  dave: 'CYw3kZ02Hs0563khs1Fj',
  fin: 'D38z5RcWu1voky8WS1ja',
  charlotte: 'XB0fDUnXU5powFXDhCwa',
  daniel: 'onwK4e9ZLuTAKqWW03F9',
  lily: 'pFZP5JQG7iQjIQuC4Bku',
  // American
  rachel: '21m00Tcm4TlvDq8ikWAM',
  adam: 'pNInz6obpgDQGcFmaJgB',
  brian: 'nPczCjzI2devNBz1zQrb',
  domi: 'AZnzlk1XvdvUeBnXmlld',
  bella: 'EXAVITQu4vr4xnSDxMAC',
  antoni: 'ErXwobaYiN019PkySvjV',
  josh: 'TxGEqnHWrfWFTfGW9XjX',
  sam: 'yoZ06aMxZJJ28mfd3POQ',
};

// Short Qiwiosity-flavoured phrase used by --preview so you can audition
// voices without burning through your full script budget.
const PREVIEW_TEXT =
  "Welcome to Hawke's Bay. This is your Qiwiosity tour guide. In a moment, " +
  "we'll pass Napier's Marine Parade — home to one of the world's great " +
  "collections of Art Deco architecture, rebuilt after the 1931 earthquake.";

const DEFAULT_VOICE = 'liam';
const DEFAULT_MODEL = 'eleven_multilingual_v2';

// ---- CLI parsing -----------------------------------------------------------

function parseArgs(argv) {
  const args = {
    dryRun: false,
    force: false,
    preview: false,
    only: null,
    length: null,
    voice: null,
    model: null,
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--force') args.force = true;
    else if (a === '--preview') args.preview = true;
    else if (a === '--only') args.only = argv[++i];
    else if (a === '--length') args.length = argv[++i];
    else if (a === '--voice') args.voice = argv[++i];
    else if (a === '--model') args.model = argv[++i];
    else if (a === '-h' || a === '--help') {
      console.log(helpText());
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

function helpText() {
  return `Qiwiosity TTS render
Usage: node tts-render.js [options]

  --dry-run              Show what would be rendered; no API calls, no files written
  --force                Re-render even if MP3 already exists
  --only <poi_id>        Only render scripts for this POI
  --length <h|s>         Only render this length (headline | standard)
  --voice <alias|id>     Override default voice (default: ${DEFAULT_VOICE})
  --model <name>         ElevenLabs model (default: ${DEFAULT_MODEL})
  --preview              Render a short sample phrase to audition a voice
                         (writes _preview.<voice>.mp3, skips all scripts)
  -h, --help             This message

Voice aliases: ${Object.keys(VOICES).join(', ')}
Or pass any ElevenLabs voice ID from elevenlabs.io/app/voice-library.
`;
}

// ---- .env loader (dependency-free) -----------------------------------------

async function loadEnv() {
  if (!existsSync(ENV_FILE)) return {};
  const raw = await readFile(ENV_FILE, 'utf8');
  const env = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

// ---- Script parsing --------------------------------------------------------

/**
 * Parse a script .md file:
 *   ---
 *   poi_id: ...
 *   length: ...
 *   status: ...
 *   ---
 *
 *   # Title
 *
 *   narration body across one or more paragraphs
 *
 *   ---
 *
 *   **Voice direction:** ...   <-- ignored
 */
function parseScript(filename, raw) {
  const meta = {};
  let body = raw;

  // Frontmatter
  const fmMatch = raw.match(/^---\s*\n([\s\S]*?)\n---\s*\n/);
  if (fmMatch) {
    for (const line of fmMatch[1].split('\n')) {
      const eq = line.indexOf(':');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      const val = line.slice(eq + 1).trim();
      meta[key] = val;
    }
    body = raw.slice(fmMatch[0].length);
  }

  // Drop content after the first standalone `---` separator (voice direction / fact-check)
  const sepIdx = body.search(/\n\s*---\s*\n/);
  if (sepIdx !== -1) body = body.slice(0, sepIdx);

  // Drop the first H1 heading line (`# Title — length (duration)`)
  body = body.replace(/^\s*#\s+.*$/m, '').trim();

  // Strip trailing/leading blank lines and any HTML comments
  body = body
    .replace(/<!--[\s\S]*?-->/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter((l, i, arr) => !(l === '' && arr[i - 1] === ''))
    .join('\n')
    .trim();

  return {
    filename,
    meta,
    body,
    poi_id: meta.poi_id,
    length: meta.length,
    status: meta.status || 'unknown',
    charCount: body.length,
  };
}

// ---- ElevenLabs API --------------------------------------------------------

function callElevenLabs({ apiKey, voiceId, model, text }) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      text,
      model_id: model,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.15,
        use_speaker_boost: true,
      },
    });

    const req = https.request(
      {
        method: 'POST',
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'audio/mpeg',
          'Content-Length': Buffer.byteLength(body),
        },
      },
      (res) => {
        if (res.statusCode !== 200) {
          const chunks = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const errBody = Buffer.concat(chunks).toString('utf8');
            reject(
              new Error(`ElevenLabs ${res.statusCode}: ${errBody.slice(0, 300)}`)
            );
          });
          return;
        }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ---- Main ------------------------------------------------------------------

function resolveVoice(aliasOrId) {
  if (!aliasOrId) return VOICES[DEFAULT_VOICE];
  if (VOICES[aliasOrId.toLowerCase()]) return VOICES[aliasOrId.toLowerCase()];
  // Treat anything else as a raw voice ID.
  return aliasOrId;
}

async function main() {
  const args = parseArgs(process.argv);
  const env = await loadEnv();

  const apiKey = env.ELEVENLABS_API_KEY || process.env.ELEVENLABS_API_KEY;
  const voiceAlias =
    args.voice || env.ELEVENLABS_VOICE || process.env.ELEVENLABS_VOICE || DEFAULT_VOICE;
  const model =
    args.model || env.ELEVENLABS_MODEL || process.env.ELEVENLABS_MODEL || DEFAULT_MODEL;
  const voiceId = resolveVoice(voiceAlias);

  if (!existsSync(SCRIPTS_DIR)) {
    console.error(`Scripts dir not found: ${SCRIPTS_DIR}`);
    process.exit(1);
  }

  await mkdir(AUDIO_DIR, { recursive: true });

  // --- Preview mode: render a short sample phrase and exit ---------------
  if (args.preview) {
    console.log(`Qiwiosity TTS preview`);
    console.log(`  Voice:  ${voiceAlias} (${voiceId})`);
    console.log(`  Model:  ${model}`);
    console.log(`  Chars:  ${PREVIEW_TEXT.length}`);
    console.log('');
    if (args.dryRun) {
      console.log('(dry run) would render preview to content/audio/_preview.' +
        voiceAlias + '.mp3');
      return;
    }
    if (!apiKey) {
      console.error('ERROR: ELEVENLABS_API_KEY is not set. See tools/.env.example.');
      process.exit(1);
    }
    const outPath = join(AUDIO_DIR, `_preview.${voiceAlias}.mp3`);
    process.stdout.write('  rendering preview… ');
    try {
      const audio = await callElevenLabs({ apiKey, voiceId, model, text: PREVIEW_TEXT });
      await writeFile(outPath, audio);
      console.log(`OK (${(audio.length / 1024).toFixed(0)} KB)`);
      console.log(`  → ${outPath}`);
      console.log('\nOpen that file in your media player. If you like it, run:');
      console.log(`  node tts-render.js --voice ${voiceAlias}`);
    } catch (err) {
      console.log('FAILED');
      console.error(`  ${err.message}`);
      process.exit(1);
    }
    return;
  }

  const files = (await readdir(SCRIPTS_DIR)).filter((f) => f.endsWith('.md'));
  if (files.length === 0) {
    console.error('No .md scripts found in', SCRIPTS_DIR);
    process.exit(1);
  }

  const scripts = [];
  for (const f of files) {
    const raw = await readFile(join(SCRIPTS_DIR, f), 'utf8');
    scripts.push(parseScript(f, raw));
  }

  // --length accepts h/headline or s/standard
  const wantLength = args.length
    ? args.length.startsWith('h')
      ? 'headline'
      : args.length.startsWith('s')
      ? 'standard'
      : args.length
    : null;

  // Filter
  const selected = scripts.filter((s) => {
    if (args.only && s.poi_id !== args.only) return false;
    if (wantLength && s.length !== wantLength) return false;
    return true;
  });

  console.log(`Qiwiosity TTS render`);
  console.log(`  Voice:    ${voiceAlias} (${voiceId})`);
  console.log(`  Model:    ${model}`);
  console.log(`  Dry run:  ${args.dryRun ? 'yes' : 'no'}`);
  console.log(`  Scripts:  ${scripts.length} total, ${selected.length} to render`);
  console.log('');

  let totalChars = 0;
  let rendered = 0;
  let skipped = 0;

  for (const s of selected) {
    if (!s.poi_id || !s.length) {
      console.warn(`! ${s.filename}: missing poi_id or length in frontmatter, skipping`);
      continue;
    }
    const outName = `${s.poi_id}.${s.length}.mp3`;
    const outPath = join(AUDIO_DIR, outName);
    const exists = existsSync(outPath);

    const label = `${s.poi_id}.${s.length}`.padEnd(40);
    const charLabel = `${s.charCount} chars`.padStart(10);

    if (exists && !args.force) {
      console.log(`  ${label} ${charLabel}  exists, skipping`);
      skipped++;
      continue;
    }

    totalChars += s.charCount;

    if (args.dryRun) {
      console.log(`  ${label} ${charLabel}  would render`);
      continue;
    }

    if (!apiKey) {
      console.error(
        '\nERROR: ELEVENLABS_API_KEY is not set. Add it to tools/.env or pass it in the environment.\n' +
          'See tools/.env.example.'
      );
      process.exit(1);
    }

    process.stdout.write(`  ${label} ${charLabel}  rendering… `);
    try {
      const audio = await callElevenLabs({
        apiKey,
        voiceId,
        model,
        text: s.body,
      });
      await writeFile(outPath, audio);
      rendered++;
      console.log(`OK (${(audio.length / 1024).toFixed(0)} KB → ${outName})`);
    } catch (err) {
      console.log(`FAILED`);
      console.error(`    ${err.message}`);
    }
  }

  console.log('');
  if (args.dryRun) {
    console.log(
      `Dry-run summary: ${selected.length} scripts, ~${totalChars} characters total`
    );
  } else {
    console.log(
      `Done: ${rendered} rendered, ${skipped} skipped existing, ${totalChars} characters used`
    );
    if (rendered) {
      console.log(`Audio written to: ${AUDIO_DIR}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
