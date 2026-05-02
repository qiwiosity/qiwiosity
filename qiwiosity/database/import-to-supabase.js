#!/usr/bin/env node
/**
 * import-to-supabase.js
 *
 * Reads the canonical seed files and imports them into Supabase.
 *
 * Prerequisites:
 *   1. Create a Supabase project at https://supabase.com
 *   2. Run migrations/001_initial_schema.sql in the SQL Editor
 *   3. Copy your project URL and service_role key into .env
 *   4. npm install @supabase/supabase-js dotenv
 *
 * Usage:
 *   node import-to-supabase.js
 *   node import-to-supabase.js --clear   (delete all data first, then re-import)
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ── Config ───────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables. Create a .env file with:');
  console.error('   SUPABASE_URL=https://your-project.supabase.co');
  console.error('   SUPABASE_SERVICE_ROLE_KEY=eyJ...');
  console.error('\nSee .env.example for a template.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false },
});

const SEED_DIR = path.join(__dirname, 'seed');
const BATCH_SIZE = 200; // Supabase has a ~1000 row limit per insert

// ── Helpers ──────────────────────────────────────────────

function readSeed(filename) {
  const data = JSON.parse(fs.readFileSync(path.join(SEED_DIR, filename), 'utf-8'));
  console.log(`  📂 Read ${filename}: ${data.length} records`);
  return data;
}

async function batchInsert(table, rows, options = {}) {
  const { onConflict } = options;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    let query = supabase.from(table).insert(batch);
    if (onConflict) {
      query = supabase.from(table).upsert(batch, { onConflict });
    }
    const { error } = await query;
    if (error) {
      console.error(`  ❌ Error inserting into ${table} (batch ${Math.floor(i / BATCH_SIZE) + 1}):`, error.message);
      // Log first failing row for debugging
      if (batch[0]) console.error('    First row:', JSON.stringify(batch[0]).slice(0, 200));
      throw error;
    }
    inserted += batch.length;
  }

  console.log(`  ✓ ${table}: ${inserted} rows inserted`);
  return inserted;
}

async function clearTable(table) {
  const { error } = await supabase.from(table).delete().neq('id', '___never_match___');
  // For tables with serial id, use a different approach
  if (error) {
    const { error: err2 } = await supabase.from(table).delete().gte('id', 0);
    if (err2) {
      // Last resort: truncate via RPC if available
      console.warn(`  ⚠ Could not clear ${table}: ${err2.message}`);
    }
  }
  console.log(`  🗑️  Cleared ${table}`);
}

// ── Main ─────────────────────────────────────────────────

async function main() {
  const clearFirst = process.argv.includes('--clear');

  console.log('🚀 Qiwiosity — Supabase Import');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log(`   Mode: ${clearFirst ? 'CLEAR + IMPORT' : 'IMPORT (upsert)'}\n`);

  // Load all seed data
  console.log('📦 Loading seed files...');
  const regions = readSeed('regions.json');
  const categories = readSeed('categories.json');
  const pois = readSeed('pois.json');
  const accommodations = readSeed('accommodations.json');
  const poiImages = readSeed('poi_images.json');
  const regionImages = readSeed('region_images.json');
  const categoryImages = readSeed('category_images.json');
  const scripts = readSeed('poi_scripts.json');
  const audio = readSeed('poi_audio.json');

  // Clear if requested (reverse order due to foreign keys)
  if (clearFirst) {
    console.log('\n🗑️  Clearing existing data...');
    await clearTable('poi_audio');
    await clearTable('poi_scripts');
    await clearTable('poi_images');
    await clearTable('region_images');
    await clearTable('category_images');
    await clearTable('accommodations');
    await clearTable('pois');
    await clearTable('categories');
    await clearTable('regions');
  }

  // Insert in dependency order
  console.log('\n📥 Importing data...\n');

  // 1. Regions
  await batchInsert('regions', regions, { onConflict: 'id' });

  // 2. Categories
  await batchInsert('categories', categories, { onConflict: 'id' });

  // 3. POIs
  await batchInsert('pois', pois, { onConflict: 'id' });

  // 4. Accommodations
  await batchInsert('accommodations', accommodations, { onConflict: 'id' });

  // 5. POI Images (no natural unique key, skip upsert — use clear+insert)
  await batchInsert('poi_images', poiImages);

  // 6. Region Images
  await batchInsert('region_images', regionImages);

  // 7. Category Images
  await batchInsert('category_images', categoryImages);

  // 8. Scripts
  await batchInsert('poi_scripts', scripts.map(s => ({
    poi_id: s.poi_id,
    length: s.length,
    target_seconds: s.target_seconds,
    narration_text: s.narration_text,
    voice_direction: s.voice_direction,
    fact_check: s.fact_check,
    status: s.status,
    author: s.author,
  })));

  // 9. Audio
  await batchInsert('poi_audio', audio.map(a => ({
    poi_id: a.poi_id,
    length: a.length,
    file_url: a.file_url,
  })));

  // ── Verify ───────────────────────────────────────────

  console.log('\n🔍 Verifying counts...\n');

  const tables = ['regions', 'categories', 'pois', 'accommodations', 'poi_images', 'region_images', 'category_images', 'poi_scripts', 'poi_audio'];

  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`  ❌ ${table}: ${error.message}`);
    } else {
      console.log(`  ✓ ${table}: ${count} rows`);
    }
  }

  // ── Auto-sync bundled mobile data ────────────────────
  console.log('\n📱 Syncing bundled mobile data...\n');
  require('child_process').execSync(`node "${path.join(__dirname, 'sync-to-mobile.js')}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..'),
  });

  console.log('\n══════════════════════════════════════════');
  console.log('  IMPORT COMPLETE + MOBILE DATA SYNCED');
  console.log('══════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
