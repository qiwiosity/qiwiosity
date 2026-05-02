#!/usr/bin/env bash
#
# aa-smoke-test.sh — sanity checks for the Android Auto build.
#
# Run from the repo root (or qiwiosity/). Exits non-zero on the first
# problem so CI can gate on it. This is a static smoke test — it does
# NOT launch the DHU; for that see ANDROID_AND_ANDROID_AUTO_SETUP.md.
#
# Usage:
#   bash tools/aa-smoke-test.sh            # basic checks
#   bash tools/aa-smoke-test.sh --build    # also run ./gradlew assembleDebug
#   bash tools/aa-smoke-test.sh --dhu      # also launch DHU after basic checks
#

set -euo pipefail

# Colours when running interactively, nothing when piped/CI.
if [[ -t 1 ]]; then
  RED=$'\e[31m'; GREEN=$'\e[32m'; YELLOW=$'\e[33m'; RESET=$'\e[0m'
else
  RED=""; GREEN=""; YELLOW=""; RESET=""
fi

fail() { echo "${RED}✗ $*${RESET}" >&2; exit 1; }
ok()   { echo "${GREEN}✓ $*${RESET}"; }
warn() { echo "${YELLOW}! $*${RESET}"; }

# --- locate project root --------------------------------------------------

# Walk up until we find a qiwiosity/mobile directory.
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ ! -d "$ROOT/mobile" ]]; then
  # Fallback: maybe we're inside qiwiosity/tools already and the repo
  # layout is qiwiosity/mobile, or we're at the outer repo root.
  if [[ -d "$ROOT/qiwiosity/mobile" ]]; then
    ROOT="$ROOT/qiwiosity"
  fi
fi
MOBILE="$ROOT/mobile"
[[ -d "$MOBILE" ]] || fail "Can't find qiwiosity/mobile from $ROOT"

echo "Root:   $ROOT"
echo "Mobile: $MOBILE"
echo ""

# --- 1. Plugin files present ---------------------------------------------

PLUGIN_DIR="$MOBILE/plugins/withAndroidAuto"
[[ -d "$PLUGIN_DIR" ]] || fail "Plugin dir missing: $PLUGIN_DIR"

for f in index.js app.plugin.js README.md \
         android/res/xml/automotive_app_desc.xml \
         android/res/values/styles.xml \
         android/kotlin/QiwiosityCarAppService.kt \
         android/kotlin/QiwiosityCarSession.kt \
         android/kotlin/POIStore.kt \
         android/kotlin/QiwiosityAudioPlayer.kt \
         android/kotlin/QiwiosityMediaService.kt \
         android/kotlin/CarLocationProvider.kt \
         android/kotlin/NearbyMapScreen.kt \
         android/kotlin/RegionsScreen.kt \
         android/kotlin/RegionDetailScreen.kt \
         android/kotlin/CategoriesScreen.kt \
         android/kotlin/CategoryDetailScreen.kt \
         android/kotlin/NowPlayingScreen.kt; do
  [[ -f "$PLUGIN_DIR/$f" ]] || fail "Missing plugin file: $f"
done
ok "All plugin source files present"

# --- Branded drawables present --------------------------------------------

expected_drawables=(
  ic_qw_nearby ic_qw_regions ic_qw_categories ic_qw_nowplaying
  ic_qw_heritage ic_qw_culture ic_qw_nature ic_qw_food_wine
  ic_qw_wildlife ic_qw_adventure
)
for d in "${expected_drawables[@]}"; do
  [[ -f "$PLUGIN_DIR/android/res/drawable/$d.xml" ]] \
    || fail "Missing branded drawable: $d.xml"
done
ok "All 10 branded vector drawables present"

# --- 2. Plugin index.js parses as valid JS --------------------------------

if command -v node >/dev/null 2>&1; then
  node --check "$PLUGIN_DIR/index.js" \
    || fail "index.js has a syntax error"
  ok "index.js parses"
else
  warn "node not on PATH — skipped JS syntax check"
fi

# --- 3. app.json registers the plugin ------------------------------------

grep -q '"./plugins/withAndroidAuto"' "$MOBILE/app.json" \
  || fail "app.json does not list ./plugins/withAndroidAuto in plugins[]"
ok "app.json registers withAndroidAuto"

# --- 4. attractions.json is resolvable ------------------------------------

ATTR="$MOBILE/src/data/attractions.json"
[[ -f "$ATTR" ]] || fail "attractions.json missing at $ATTR"
if command -v node >/dev/null 2>&1; then
  node -e "require('$ATTR')" >/dev/null 2>&1 \
    || fail "attractions.json is not valid JSON"
  ok "attractions.json parses"
else
  ok "attractions.json present (JSON validity not checked)"
fi

# --- 5. If android/ has been generated, deep-check the wiring -------------

ANDROID_DIR="$MOBILE/android"
if [[ -d "$ANDROID_DIR" ]]; then
  MANIFEST="$ANDROID_DIR/app/src/main/AndroidManifest.xml"
  [[ -f "$MANIFEST" ]] || fail "android/ exists but AndroidManifest.xml missing"

  grep -q "QiwiosityCarAppService" "$MANIFEST" \
    || fail "AndroidManifest.xml is missing QiwiosityCarAppService <service> — run 'npx expo prebuild --clean'"
  grep -q "automotive_app_desc"    "$MANIFEST" \
    || fail "AndroidManifest.xml is missing the automotive_app_desc meta-data — run 'npx expo prebuild --clean'"
  grep -q "androidx.car.app.category.POI" "$MANIFEST" \
    || fail "CarAppService missing POI intent-filter category"
  ok "AndroidManifest.xml has CarAppService + POI category + automotive_app_desc"

  ASSETS="$ANDROID_DIR/app/src/main/assets/attractions.json"
  [[ -f "$ASSETS" ]] || fail "attractions.json not copied to android assets — run 'npx expo prebuild --clean'"
  ok "attractions.json bundled into android/assets"

  # Kotlin sources dropped into the package path
  KTLIN_DIR="$ANDROID_DIR/app/src/main/java/nz/qiwiosity/app/carapp"
  [[ -d "$KTLIN_DIR" ]] \
    || fail "Kotlin sources not copied to $KTLIN_DIR — run 'npx expo prebuild --clean'"
  ktlin_count=$(ls "$KTLIN_DIR"/*.kt 2>/dev/null | wc -l | tr -d ' ')
  [[ "$ktlin_count" -ge 9 ]] \
    || fail "Expected ≥9 Kotlin files under $KTLIN_DIR, found $ktlin_count"
  ok "Kotlin sources present ($ktlin_count files)"

  # Branded drawables should be in the generated res/drawable/ too.
  GEN_DRAWABLE="$ANDROID_DIR/app/src/main/res/drawable"
  missing=0
  for d in "${expected_drawables[@]}"; do
    [[ -f "$GEN_DRAWABLE/$d.xml" ]] || { missing=1; break; }
  done
  [[ "$missing" -eq 0 ]] \
    || fail "Branded drawables missing from $GEN_DRAWABLE — run 'npx expo prebuild --clean'"
  ok "Branded drawables copied into res/drawable/"

  GRADLE="$ANDROID_DIR/app/build.gradle"
  grep -q "androidx.car.app:app" "$GRADLE" \
    || fail "app/build.gradle missing Car App Library dependency — re-run 'expo prebuild --clean'"
  ok "Gradle deps include androidx.car.app"
else
  warn "android/ not generated yet — run 'cd mobile && npx expo prebuild --clean' to enable the deep checks"
fi

# --- 6. Optional: gradle build -------------------------------------------

if [[ "${1:-}" == "--build" ]]; then
  [[ -d "$ANDROID_DIR" ]] || fail "android/ doesn't exist; can't build. Run expo prebuild first."
  echo ""
  echo "Running ./gradlew :app:assembleDebug (this can take a few minutes on a cold cache)…"
  (cd "$ANDROID_DIR" && ./gradlew :app:assembleDebug --console=plain) \
    || fail "gradle build failed"
  ok "gradle assembleDebug succeeded"
fi

# --- 7. Optional: launch the DHU -----------------------------------------

if [[ "${1:-}" == "--dhu" ]]; then
  command -v adb >/dev/null 2>&1 || fail "adb not on PATH"
  adb forward tcp:5277 tcp:5277 >/dev/null
  if   [[ -x "$HOME/Library/Android/sdk/extras/google/auto/desktop-head-unit" ]]; then
    DHU="$HOME/Library/Android/sdk/extras/google/auto/desktop-head-unit"
  elif [[ -x "${ANDROID_HOME:-}/extras/google/auto/desktop-head-unit" ]]; then
    DHU="$ANDROID_HOME/extras/google/auto/desktop-head-unit"
  else
    fail "Can't find DHU binary — install via SDK Manager → SDK Tools"
  fi
  echo "Launching DHU: $DHU"
  exec "$DHU"
fi

echo ""
ok "All smoke-test checks passed."
