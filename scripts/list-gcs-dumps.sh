#!/bin/bash
# ==============================================================================
# List Available Production Database Dumps in GCS
# ==============================================================================
# This script lists all available production database dumps in the GCS bucket
# with size and date information.
#
# Prerequisites:
#   - gcloud CLI authenticated (run: gcloud auth login)
#   - Read access to the GCS bucket
#
# Usage:
#   ./scripts/list-gcs-dumps.sh
#   ./scripts/list-gcs-dumps.sh --limit 5
# ==============================================================================

set -e

# Colors for output
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
GCS_BUCKET="${GCS_BUCKET:-fvh-database-dumps}"
DUMP_PREFIX="${DUMP_PREFIX:-regions4climate}"
LIMIT=10

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --limit)
      LIMIT="$2"
      shift 2
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --limit N    Show only the N most recent dumps (default: 10)"
      echo "  --help       Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  GCS_BUCKET   GCS bucket name (default: fvh-database-dumps)"
      echo "  DUMP_PREFIX  Dump file prefix (default: regions4climate)"
      exit 0
      ;;
    *)
      echo -e "${YELLOW}Unknown option: $1${NC}"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

echo -e "${BLUE}📦 GCS Database Dumps${NC}"
echo "========================================"
echo -e "${BLUE}Bucket:${NC} gs://${GCS_BUCKET}"
echo -e "${BLUE}Prefix:${NC} ${DUMP_PREFIX}"
echo ""

# Check prerequisites
if ! command -v gsutil &> /dev/null; then
  echo -e "${YELLOW}❌ gsutil not found. Please install Google Cloud SDK.${NC}"
  echo "   Visit: https://cloud.google.com/sdk/docs/install"
  exit 1
fi

# List dumps
echo -e "${BLUE}🔍 Fetching dump list...${NC}"
echo ""

DUMPS=$(gsutil ls -l "gs://${GCS_BUCKET}/${DUMP_PREFIX}*.sql.gz" 2>/dev/null | grep -v TOTAL || true)

if [ -z "$DUMPS" ]; then
  echo -e "${YELLOW}⚠️  No dump files found matching: ${DUMP_PREFIX}*.sql.gz${NC}"
  echo ""
  echo "Expected file naming format:"
  echo "  ${DUMP_PREFIX}-YYYY-MM-DD.sql.gz"
  echo "  Example: ${DUMP_PREFIX}-2025-01-15.sql.gz"
  exit 0
fi

# Parse and display dumps
echo -e "${GREEN}Available Dumps:${NC}"
echo "----------------------------------------"
printf "%-12s %-15s %s\n" "DATE" "SIZE" "GCS PATH"
echo "----------------------------------------"

echo "$DUMPS" | sort -k2 -r | head -n "$LIMIT" | while read -r size date time path; do
  filename=$(basename "$path")
  dump_date=$(echo "$filename" | grep -oP '\d{4}-\d{2}-\d{2}' || echo "unknown")

  # Convert size to human readable if it's in bytes
  if [[ $size =~ ^[0-9]+$ ]]; then
    if command -v numfmt &> /dev/null; then
      size=$(numfmt --to=iec-i --suffix=B $size)
    else
      # Fallback for systems without numfmt
      if [ $size -gt 1073741824 ]; then
        size="$(($size / 1073741824))GB"
      elif [ $size -gt 1048576 ]; then
        size="$(($size / 1048576))MB"
      elif [ $size -gt 1024 ]; then
        size="$(($size / 1024))KB"
      else
        size="${size}B"
      fi
    fi
  fi

  printf "%-12s %-15s %s\n" "$dump_date" "$size" "$filename"
done

echo "----------------------------------------"
echo ""
echo -e "${BLUE}💡 To restore a specific dump:${NC}"
echo "   ./scripts/restore-from-gcs-dump.sh --dump-date YYYY-MM-DD"
echo ""
echo -e "${BLUE}💡 To restore the latest dump:${NC}"
echo "   ./scripts/restore-from-gcs-dump.sh"
echo ""
