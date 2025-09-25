#!/bin/bash
set -e

# Check if we're in test mode
if [ "${DB_INIT_MODE}" = "test" ]; then
    echo "Running in TEST mode - executing migration tests..."
    exec ./test_migration.sh
fi

echo "Starting database initialization..."
echo "DATABASE_URL: ${DATABASE_URL:-not set}"
echo "DBMATE_MIGRATIONS_DIR: ${DBMATE_MIGRATIONS_DIR:-not set}"

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
until pg_isready -h postgresql -p 5432 -U regions4climate_user; do
    echo "PostgreSQL is not ready yet. Waiting..."
    sleep 2
done
echo "PostgreSQL is ready!"

# Wait for PostGIS to be available in the regions4climate database
echo "Waiting for PostGIS extension to be available..."
max_attempts=30
attempt=1

while [ $attempt -le $max_attempts ]; do
    if psql "$DATABASE_URL" -t -c "SELECT PostGIS_version();" > /dev/null 2>&1; then
        POSTGIS_VERSION=$(psql "$DATABASE_URL" -t -c "SELECT PostGIS_version();" | tr -d ' ')
        echo "PostGIS is ready! Version: $POSTGIS_VERSION"
        break
    fi
    
    if [ $attempt -eq $max_attempts ]; then
        echo "ERROR: PostGIS not available after $max_attempts attempts"
        echo "Checking if PostGIS extension exists..."
        psql "$DATABASE_URL" -c "\dx" || true
        echo "Checking available geometry types..."
        psql "$DATABASE_URL" -c "SELECT typname FROM pg_type WHERE typname LIKE '%geometry%';" || true
        exit 1
    fi
    
    echo "PostGIS not ready yet. Attempt $attempt/$max_attempts - waiting..."
    sleep 3
    ((attempt++))
done

# Run database migrations
echo "Running database migrations..."
echo "Current working directory: $(pwd)"
echo "Checking migration files:"
ls -la db/migrations/ || echo "Migration directory not found"

if ! dbmate up; then
    echo "ERROR: Database migration failed"
    echo "Checking database connection..."
    psql "$DATABASE_URL" -c "SELECT version();" || echo "Database connection failed"
    exit 1
fi
echo "Database migrations completed successfully."

# Check if seed data needs to be loaded
echo "Checking if seed data needs to be loaded..."
SEED_CHECK=$(python3 -c "
import psycopg2
import os
try:
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    cur = conn.cursor()
    cur.execute('SELECT COUNT(*) FROM r4c_hsy_building_current;')
    count = cur.fetchone()[0]
    print(count)
    conn.close()
except Exception as e:
    print('0')  # Assume empty if error
")

if [ "$SEED_CHECK" = "0" ]; then
    echo "Database appears to be empty. Loading seed data..."
    
    # Check if seeding script exists
    if [ ! -f "db/scripts/seed-dev-data.py" ]; then
        echo "WARNING: Seeding script not found at db/scripts/seed-dev-data.py"
        echo "Skipping seed data loading."
    else
        echo "Running seeding script..."
        if ! python3 db/scripts/seed-dev-data.py --num-records 50 --clear-first; then
            echo "WARNING: Seed data loading failed, but continuing..."
        else
            echo "Seed data loading completed."
        fi
    fi
else
    echo "Database already contains data (${SEED_CHECK} buildings found). Skipping seed data loading."
fi

echo "Database initialization completed successfully."