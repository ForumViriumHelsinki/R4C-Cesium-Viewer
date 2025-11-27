#!/bin/bash
# ==============================================================================
# Restore Production Database from GCS Dump to Local PostgreSQL
# ==============================================================================
# This script downloads the latest production database dump from GCS and
# restores it to your local PostgreSQL instance for testing.
#
# Prerequisites:
#   - gcloud CLI authenticated (run: gcloud auth login)
#   - PostgreSQL running locally or via Docker/Kubernetes
#   - Appropriate GCS bucket read permissions
#
# Usage:
#   ./scripts/restore-from-gcs-dump.sh
#   ./scripts/restore-from-gcs-dump.sh --dump-date 2025-01-15
#   ./scripts/restore-from-gcs-dump.sh --local-file /path/to/dump.dump
# ==============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GCS_BUCKET="${GCS_BUCKET:-fvh-database-dumps}"
DUMP_PREFIX="${DUMP_PREFIX:-regions4climate}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-regions4climate}"
DB_USER="${DB_USER:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-postgres}"

# Parse command line arguments
DUMP_DATE=""
LOCAL_FILE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --dump-date)
      DUMP_DATE="$2"
      shift 2
      ;;
    --local-file)
      LOCAL_FILE="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --dump-date DATE      Restore specific dump (format: YYYY-MM-DD)"
      echo "  --local-file PATH     Use local dump file instead of downloading from GCS"
      echo "  --help                Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  GCS_BUCKET            GCS bucket name (default: fvh-database-dumps)"
      echo "  DUMP_PREFIX           Dump file prefix (default: regions4climate)"
      echo "  DB_HOST               PostgreSQL host (default: localhost)"
      echo "  DB_PORT               PostgreSQL port (default: 5432)"
      echo "  DB_NAME               Database name (default: regions4climate)"
      echo "  DB_USER               Database user (default: postgres)"
      echo "  DB_PASSWORD           Database password (default: postgres)"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}🗄️  Production Database Restore Utility${NC}"
echo "========================================"
echo ""

# Set PostgreSQL environment variables
export PGHOST="$DB_HOST"
export PGPORT="$DB_PORT"
export PGUSER="$DB_USER"
export PGPASSWORD="$DB_PASSWORD"
export PGDATABASE="postgres"  # Connect to postgres db first

# Check prerequisites
echo -e "${BLUE}🔍 Checking prerequisites...${NC}"

if ! command -v psql &> /dev/null; then
  echo -e "${RED}❌ psql not found. Please install PostgreSQL client tools.${NC}"
  exit 1
fi

if [ -z "$LOCAL_FILE" ] && ! command -v gsutil &> /dev/null; then
  echo -e "${RED}❌ gsutil not found. Please install Google Cloud SDK.${NC}"
  echo "   Visit: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# Test database connection
if ! psql -c "SELECT 1;" > /dev/null 2>&1; then
  echo -e "${RED}❌ Cannot connect to PostgreSQL at ${DB_HOST}:${DB_PORT}${NC}"
  echo "   Please check your database is running and credentials are correct."
  exit 1
fi

echo -e "${GREEN}✅ All prerequisites satisfied${NC}"
echo ""

# Download or use local dump
DUMP_FILE=""
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

if [ -n "$LOCAL_FILE" ]; then
  echo -e "${BLUE}📁 Using local dump file: ${LOCAL_FILE}${NC}"
  if [ ! -f "$LOCAL_FILE" ]; then
    echo -e "${RED}❌ Local file not found: ${LOCAL_FILE}${NC}"
    exit 1
  fi
  cp "$LOCAL_FILE" "$TEMP_DIR/dump.dump"
  DUMP_FILE="$TEMP_DIR/dump.dump"
  DUMP_DATE=$(echo "$LOCAL_FILE" | grep -oP '\d{4}-\d{2}-\d{2}' || echo "unknown")
else
  # Find and download from GCS
  echo -e "${BLUE}📦 Searching GCS bucket: gs://${GCS_BUCKET}${NC}"

  if [ -n "$DUMP_DATE" ]; then
    # Download specific date
    GCS_PATH="gs://${GCS_BUCKET}/${DUMP_PREFIX}-${DUMP_DATE}.dump"
    echo -e "${BLUE}🔍 Looking for dump from ${DUMP_DATE}...${NC}"

    if ! gsutil ls "$GCS_PATH" > /dev/null 2>&1; then
      echo -e "${RED}❌ Dump not found: ${GCS_PATH}${NC}"
      exit 1
    fi

    LATEST_DUMP="$GCS_PATH"
  else
    # Find latest dump
    echo -e "${BLUE}🔍 Finding latest dump...${NC}"
    LATEST_DUMP=$(gsutil ls -l "gs://${GCS_BUCKET}/${DUMP_PREFIX}*.dump" | \
                  grep -v TOTAL | \
                  sort -k2 -r | \
                  head -1 | \
                  awk '{print $3}')

    if [ -z "$LATEST_DUMP" ]; then
      echo -e "${RED}❌ No dump files found in gs://${GCS_BUCKET}/${DUMP_PREFIX}*.dump${NC}"
      exit 1
    fi
  fi

  echo -e "${GREEN}✅ Found: ${LATEST_DUMP}${NC}"
  DUMP_DATE=$(echo "$LATEST_DUMP" | grep -oP '\d{4}-\d{2}-\d{2}' || echo "unknown")
  echo -e "${BLUE}📅 Dump date: ${DUMP_DATE}${NC}"

  # Download
  echo -e "${BLUE}⬇️  Downloading from GCS...${NC}"
  gsutil -m cp "$LATEST_DUMP" "$TEMP_DIR/dump.dump"
  DUMP_FILE="$TEMP_DIR/dump.dump"

  DUMP_SIZE=$(du -h "$DUMP_FILE" | cut -f1)
  echo -e "${GREEN}✅ Downloaded ${DUMP_SIZE}${NC}"
fi

# Warning and confirmation
echo ""
echo -e "${YELLOW}⚠️  WARNING: This will DROP and RECREATE the database '${DB_NAME}'${NC}"
echo -e "${YELLOW}   All existing data will be lost!${NC}"
echo ""
read -p "Continue? (yes/no): " -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
  echo -e "${BLUE}Cancelled by user.${NC}"
  exit 0
fi

# Drop and recreate database
echo -e "${BLUE}🗑️  Dropping existing database...${NC}"
psql -c "DROP DATABASE IF EXISTS $DB_NAME;" || true

echo -e "${BLUE}🆕 Creating fresh database...${NC}"
psql -c "CREATE DATABASE $DB_NAME;"

echo -e "${BLUE}🔌 Enabling PostGIS extensions...${NC}"
PGDATABASE="$DB_NAME" psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"
PGDATABASE="$DB_NAME" psql -c "CREATE EXTENSION IF NOT EXISTS postgis_topology;"

# Restore
echo ""
echo -e "${BLUE}📥 Restoring database...${NC}"
echo -e "${YELLOW}⏱️  This may take several minutes...${NC}"

# Use pg_restore with parallel jobs for faster restore
# --no-owner and --no-acl prevent permission issues with Cloud SQL users
PGDATABASE="$DB_NAME" pg_restore \
  --dbname="$DB_NAME" \
  --no-owner \
  --no-acl \
  --jobs=4 \
  --verbose \
  "$DUMP_FILE"

echo -e "${GREEN}✅ Database restored successfully${NC}"

# Verify
echo ""
echo -e "${BLUE}🔍 Verifying restore...${NC}"
TABLE_COUNT=$(PGDATABASE="$DB_NAME" psql -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';")
echo -e "${GREEN}📊 Restored ${TABLE_COUNT} tables${NC}"

# Analyze for query optimization
echo -e "${BLUE}📊 Analyzing tables...${NC}"
PGDATABASE="$DB_NAME" psql -c "ANALYZE;" > /dev/null

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎉 Database restore completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}Database:${NC} ${DB_NAME}"
echo -e "${BLUE}Host:${NC} ${DB_HOST}:${DB_PORT}"
echo -e "${BLUE}Dump date:${NC} ${DUMP_DATE}"
echo -e "${BLUE}Tables:${NC} ${TABLE_COUNT}"
echo ""
echo -e "${BLUE}Connection string:${NC}"
echo "  postgres://${DB_USER}:***@${DB_HOST}:${DB_PORT}/${DB_NAME}"
echo ""
