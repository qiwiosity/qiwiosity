#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════
#  Qiwiosity — Full Database Deploy
# ═══════════════════════════════════════════════════════════
#
#  One command to rule them all. This script:
#
#    1. Installs dependencies (if needed)
#    2. Merges all data sources into canonical seed files
#    3. Imports seed data to Supabase (cloud database)
#    4. Syncs bundled mobile data (attractions.json)
#
#  Usage:
#    ./deploy-database.sh              Full deploy (upsert)
#    ./deploy-database.sh --clear      Wipe Supabase + re-import everything
#    ./deploy-database.sh --sync-only  Just rebuild attractions.json (no Supabase)
#    ./deploy-database.sh --help       Show this help
#
# ═══════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_DIR="$SCRIPT_DIR/database"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

banner() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo -e "${BLUE}  Qiwiosity — Database Deploy${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
  echo ""
}

help() {
  banner
  echo "Usage: ./deploy-database.sh [option]"
  echo ""
  echo "Options:"
  echo "  (none)        Full deploy — merge, import to Supabase, sync mobile"
  echo "  --clear       Wipe Supabase first, then full deploy"
  echo "  --sync-only   Just rebuild attractions.json from seed (no Supabase)"
  echo "  --merge-only  Just merge sources into seed files (no import)"
  echo "  --help        Show this help"
  echo ""
  exit 0
}

# ── Parse args ────────────────────────────────────────────

MODE="full"
CLEAR_FLAG=""

for arg in "$@"; do
  case "$arg" in
    --clear)      CLEAR_FLAG="--clear" ;;
    --sync-only)  MODE="sync-only" ;;
    --merge-only) MODE="merge-only" ;;
    --help|-h)    help ;;
    *)            echo -e "${RED}Unknown option: $arg${NC}"; help ;;
  esac
done

banner

# ── Step 1: Dependencies ─────────────────────────────────

echo -e "${YELLOW}▸ Step 1: Checking dependencies...${NC}"

if [ ! -d "$DB_DIR/node_modules/@supabase" ] && [ "$MODE" != "sync-only" ]; then
  echo "  Installing @supabase/supabase-js and dotenv..."
  cd "$DB_DIR"
  npm init -y --silent 2>/dev/null || true
  npm install @supabase/supabase-js dotenv --silent
  cd "$SCRIPT_DIR"
  echo -e "  ${GREEN}✓ Dependencies installed${NC}"
else
  echo -e "  ${GREEN}✓ Dependencies OK${NC}"
fi

# ── Step 2: Merge sources ────────────────────────────────

if [ "$MODE" != "sync-only" ]; then
  echo ""
  echo -e "${YELLOW}▸ Step 2: Merging all data sources into seed files...${NC}"
  node "$DB_DIR/merge-all-sources.js"
  echo -e "  ${GREEN}✓ Seed files updated${NC}"
fi

# ── Step 3: Import to Supabase ───────────────────────────

if [ "$MODE" = "full" ] || [ "$MODE" = "full" -a -n "$CLEAR_FLAG" ]; then
  echo ""
  echo -e "${YELLOW}▸ Step 3: Importing to Supabase...${NC}"

  # Verify .env exists
  if [ ! -f "$DB_DIR/.env" ]; then
    echo -e "  ${RED}❌ No .env file found at $DB_DIR/.env${NC}"
    echo "  Create one with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
    exit 1
  fi

  node "$DB_DIR/import-to-supabase.js" $CLEAR_FLAG
  echo -e "  ${GREEN}✓ Supabase updated${NC}"

elif [ "$MODE" = "merge-only" ]; then
  echo ""
  echo -e "${YELLOW}▸ Skipping Supabase import (--merge-only)${NC}"
fi

# ── Step 4: Sync mobile bundle ───────────────────────────

if [ "$MODE" = "sync-only" ]; then
  echo ""
  echo -e "${YELLOW}▸ Syncing mobile bundle from seed data...${NC}"
  node "$DB_DIR/sync-to-mobile.js"
fi

# Note: in full/merge modes, sync is already triggered by merge and import scripts

# ── Done ─────────────────────────────────────────────────

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅  ALL DONE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "  What happened:"

case "$MODE" in
  full)
    echo "    • Merged all data sources → seed files"
    echo "    • Imported to Supabase (${CLEAR_FLAG:-upsert})"
    echo "    • Synced mobile attractions.json"
    ;;
  sync-only)
    echo "    • Synced mobile attractions.json from seed"
    ;;
  merge-only)
    echo "    • Merged all data sources → seed files"
    echo "    • Synced mobile attractions.json"
    ;;
esac

echo ""
