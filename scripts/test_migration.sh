#!/bin/bash

# Test database migration script
# This script tests the migration on a temporary database

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
TEST_DB_NAME="r4c_migration_test_$(date +%s)"
ORIGINAL_DATABASE_URL="$DATABASE_URL"

if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}ERROR: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL in .env file or environment"
    exit 1
fi

# Extract connection details (handle different URL formats)
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:/?]*\).*/\1/p')
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)[/?].*/\1/p')

# Default to PostgreSQL standard port if not found
if [ -z "$DB_PORT" ]; then
    DB_PORT="5432"
fi

echo -e "${YELLOW}🧪 Testing database migrations${NC}"
echo "Test database: $TEST_DB_NAME"
echo "Database host: $DB_HOST"
echo "Database port: $DB_PORT"
echo "Database user: $DB_USER"

# Create test database URL
export DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/$TEST_DB_NAME?sslmode=disable"

cleanup() {
    echo -e "${YELLOW}🧹 Cleaning up test database${NC}"
    export DATABASE_URL="$ORIGINAL_DATABASE_URL"
    ADMIN_DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/postgres?sslmode=disable"
    psql "$ADMIN_DATABASE_URL" -c "DROP DATABASE IF EXISTS \"$TEST_DB_NAME\";" 2>/dev/null || true
}

# Set up cleanup on exit
trap cleanup EXIT

# Create test database
echo -e "${YELLOW}📋 Creating test database${NC}"
# For PostgreSQL service, use postgres database as admin connection
ADMIN_DATABASE_URL="postgres://$DB_USER:$DB_PASS@$DB_HOST:$DB_PORT/postgres?sslmode=disable"
psql "$ADMIN_DATABASE_URL" -c "CREATE DATABASE \"$TEST_DB_NAME\";"

# Test migration up
echo -e "${YELLOW}⬆️  Testing migration up${NC}"
if dbmate up; then
    echo -e "${GREEN}✅ Migration up successful${NC}"
else
    echo -e "${RED}❌ Migration up failed${NC}"
    exit 1
fi

# Verify tables exist
echo -e "${YELLOW}🔍 Verifying table creation${NC}"
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

if [ "$TABLE_COUNT" -gt 20 ]; then
    echo -e "${GREEN}✅ Tables created successfully ($TABLE_COUNT tables)${NC}"
else
    echo -e "${RED}❌ Expected more tables, only found $TABLE_COUNT${NC}"
    exit 1
fi

# Test pygeoapi-relevant tables
echo -e "${YELLOW}🗺️  Verifying pygeoapi-relevant tables${NC}"
PYGEOAPI_TABLES=(
    "adaptation_landcover"
    "hki_travel_time_r4c_f"
    "nature_area_f"
    "other_nature_r4c"
    "r4c_coldspot"
    "tree_building_distance"
    "tree_f"
    "urban_heat_building_f"
)

for table in "${PYGEOAPI_TABLES[@]}"; do
    if psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
        echo -e "${GREEN}  ✅ $table${NC}"
    else
        echo -e "${RED}  ❌ $table missing${NC}"
        exit 1
    fi
done

# Test migration down
echo -e "${YELLOW}⬇️  Testing migration down${NC}"
if dbmate rollback; then
    echo -e "${GREEN}✅ Migration down successful${NC}"
else
    echo -e "${RED}❌ Migration down failed${NC}"
    exit 1
fi

# Verify cleanup
REMAINING_TABLES=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')

if [ "$REMAINING_TABLES" -eq 0 ]; then
    echo -e "${GREEN}✅ Rollback cleaned up successfully${NC}"
else
    echo -e "${YELLOW}⚠️  $REMAINING_TABLES tables remain after rollback${NC}"
fi

# Re-apply for final verification
echo -e "${YELLOW}🔄 Re-applying migration for final verification${NC}"
if dbmate up; then
    echo -e "${GREEN}✅ Re-application successful${NC}"
else
    echo -e "${RED}❌ Re-application failed${NC}"
    exit 1
fi

echo -e "${GREEN}🎉 All migration tests passed!${NC}"
