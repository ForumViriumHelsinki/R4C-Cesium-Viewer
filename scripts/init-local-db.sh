#!/bin/bash

# Initialize local database with migrations for skaffold development
# This script sets up the database schema using dbmate

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Initializing local database for development${NC}"

# Configuration for local development
LOCAL_DB_HOST="localhost"
LOCAL_DB_PORT="5432"
LOCAL_DB_USER="regions4climate_user"
LOCAL_DB_PASS="regions4climate_pass"
LOCAL_DB_NAME_R4C="regions4climate"
LOCAL_DB_NAME_MED_IREN="med_iren"

# Set database URL for regions4climate
export DATABASE_URL="postgres://$LOCAL_DB_USER:$LOCAL_DB_PASS@$LOCAL_DB_HOST:$LOCAL_DB_PORT/$LOCAL_DB_NAME_R4C"

echo -e "${YELLOW}📡 Waiting for PostgreSQL to be ready...${NC}"

# Wait for PostgreSQL to be ready
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if pg_isready -h "$LOCAL_DB_HOST" -p "$LOCAL_DB_PORT" -U "$LOCAL_DB_USER" 2>/dev/null; then
        echo -e "${GREEN}✅ PostgreSQL is ready${NC}"
        break
    fi

    if [ $attempt -eq $max_attempts ]; then
        echo -e "${RED}❌ PostgreSQL not ready after $max_attempts attempts${NC}"
        echo "Make sure PostgreSQL is running and accessible at $LOCAL_DB_HOST:$LOCAL_DB_PORT"
        exit 1
    fi

    echo -e "${YELLOW}   Attempt $attempt/$max_attempts - waiting...${NC}"
    sleep 2
    ((attempt++))
done

# Check if database exists, if not wait a bit more for initialization
echo -e "${YELLOW}🔍 Checking database existence...${NC}"
if ! psql "$DATABASE_URL" -c "SELECT 1;" &>/dev/null; then
    echo -e "${YELLOW}   Database not ready yet, waiting for initialization...${NC}"
    sleep 10
fi

# Run migrations for regions4climate database
echo -e "${YELLOW}⬆️  Running migrations for regions4climate database...${NC}"

if dbmate up; then
    echo -e "${GREEN}✅ Migrations applied successfully${NC}"
else
    echo -e "${RED}❌ Migration failed${NC}"
    exit 1
fi

# Verify key tables exist
echo -e "${YELLOW}🔍 Verifying key tables...${NC}"

KEY_TABLES=(
    "adaptation_landcover"
    "r4c_coldspot"
    "tree_f"
    "urban_heat_building_f"
    "r4c_hsy_building_current"
)

for table in "${KEY_TABLES[@]}"; do
    if psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$table';" | grep -q 1; then
        echo -e "${GREEN}  ✅ $table${NC}"
    else
        echo -e "${RED}  ❌ $table missing${NC}"
        exit 1
    fi
done

# Display connection information
echo -e "${BLUE}📋 Database setup complete!${NC}"
echo -e "${BLUE}Connection details:${NC}"
echo -e "  Host: $LOCAL_DB_HOST:$LOCAL_DB_PORT"
echo -e "  Database: $LOCAL_DB_NAME_R4C"
echo -e "  User: $LOCAL_DB_USER"
echo -e "  URL: $DATABASE_URL"
echo ""
echo -e "${BLUE}🗺️  pygeoapi should now be able to connect to the database${NC}"
echo -e "${BLUE}🌐 Access your application at: http://localhost (once skaffold is running)${NC}"

# Optional: Show table count
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE';" | tr -d ' ')
echo -e "${GREEN}📊 Database contains $TABLE_COUNT tables${NC}"

# Check if we should seed data
echo -e "${YELLOW}🌱 Would you like to populate the database with mock data for testing? (y/N)${NC}"
read -r SEED_DATA

if [[ "$SEED_DATA" =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}🌱 Seeding database with mock data...${NC}"

    # Check if Python script exists
    if [ -f "./db/scripts/seed-dev-data.py" ]; then
        # Install required Python packages if not already installed
        python3 -c "import psycopg2" 2>/dev/null || {
            echo -e "${YELLOW}📦 Installing required Python packages...${NC}"
            pip install psycopg2-binary || pip3 install psycopg2-binary
        }

        # Run the seeding script
        python3 ./db/scripts/seed-dev-data.py --database-url "$DATABASE_URL" --clear-first --num-records 100

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Mock data seeded successfully${NC}"

            # Show some sample data
            echo -e "${BLUE}📋 Sample data counts:${NC}"
            psql "$DATABASE_URL" -c "
                SELECT
                    'adaptation_landcover' as table_name, COUNT(*) as records
                FROM adaptation_landcover
                UNION ALL
                SELECT 'r4c_coldspot', COUNT(*) FROM r4c_coldspot
                UNION ALL
                SELECT 'tree_f', COUNT(*) FROM tree_f
                UNION ALL
                SELECT 'hsy_building_heat', COUNT(*) FROM hsy_building_heat
                ORDER BY table_name;
            "
        else
            echo -e "${RED}❌ Failed to seed mock data${NC}"
        fi
    else
        echo -e "${RED}❌ Seeding script not found at ./db/scripts/seed-dev-data.py${NC}"
    fi
else
    echo -e "${BLUE}ℹ️  Skipping mock data seeding${NC}"
    echo -e "${BLUE}ℹ️  You can run it later with: python3 ./db/scripts/seed-dev-data.py${NC}"
fi
