# tools/

Internal tooling. Keep it tiny, keep it re-runnable.

## TTS pipeline (`tts-render.js`)

Reads scripts from `qiwiosity/content/scripts/*.md`, sends them to ElevenLabs, writes MP3s to `qiwiosity/content/audio/`.

### One-time setup

1. Sign up at [elevenlabs.io](https://elevenlabs.io) — the free tier gives ~10k characters/month.
2. Create an API key at [Settings → API Keys](https://elevenlabs.io/app/settings/api-keys).
3. Copy the template and fill in the key:

   ```bash
   cd qiwiosity/tools
   cp .env.example .env
   # open .env and paste your key after ELEVENLABS_API_KEY=
   ```

### Usage

From `qiwiosity/tools/`:

```bash
# Dry-run — show what would be generated, no API calls, no files written
node tts-render.js --dry-run

# Render all scripts whose MP3s don't already exist
node tts-render.js

# Force re-render everything
node tts-render.js --force

# Render a single POI (by id)
node tts-render.js --only napier-marine-parade

# Override the default voice
node tts-render.js --voice adam
```

npm shortcuts (from repo root):

```bash
npm --workspace tools run tts:dry
npm --workspace tools run tts
npm --workspace tools run tts:force
```

### How it picks what to render

- Reads every `.md` file under `qiwiosity/content/scripts/`.
- Parses YAML-style frontmatter at the top of the file (between `---` fences).
- Extracts the narration body — the text after the first H1 heading, stopping at the next standalone `---` line (which in our format separates script body from voice direction / fact-check notes).
- Writes MP3 to `content/audio/<poi_id>.<length>.mp3`.
- Skips files that already exist unless `--force`.

### Voice presets

| Alias | ElevenLabs voice | Character |
|-------|-----------------|-----------|
| `rachel` (default) | Rachel | Clear, warm, female |
| `adam` | Adam | Mature, deep, male |
| `brian` | Brian | Storyteller, male |
| `domi` | Domi | Confident, female |
| `bella` | Bella | Soft, female |
| `antoni` | Antoni | Warm, youngish, male |

You can also pass a raw ElevenLabs voice ID: `--voice 21m00Tcm4TlvDq8ikWAM`.

### Where MP3s go

`qiwiosity/content/audio/<poi_id>.<length>.mp3`

The mobile app reads from its own bundle; for Stage A, a future helper in `tools/sync-audio-to-mobile.js` will copy these into `mobile/assets/audio/`. For this week, just manually copy them over once you're happy with the output:

```bash
cp ../content/audio/*.mp3 ../mobile/assets/audio/
```

### Cost expectations

ElevenLabs bills per character of output text (not per second of audio). Rough guide:

- Headline script (~150 chars) = ~15s audio
- Standard script (~900 chars) = ~90s audio
- Six Hawke's Bay scripts × both lengths = ~6,300 characters ≈ fits the free tier twice over.

If you're rendering Stage A's full 20-POI set with both lengths: ~21,000 characters/month. Still inside the $5/mo Starter tier.
