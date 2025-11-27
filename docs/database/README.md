# Database Documentation

This directory contains database-related documentation for the R4C Cesium Viewer project.

## Contents

- [IMPORT.md](./IMPORT.md) - Importing production database dumps for local development
- [SEEDING.md](./SEEDING.md) - Database setup and seeding procedures with mock data
- [QUERY_OPTIMIZATION.md](./QUERY_OPTIMIZATION.md) - Database query optimization and troubleshooting slow queries

## Quick Reference

### Local Database Connection

```bash
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate"
```

### Common Operations

```bash
# Apply migrations
dbmate up

# Seed with test data
python3 scripts/seed-dev-data.py --clear-first --num-records 100

# Connect to database
psql "$DATABASE_URL"
```

## Database Structure

The project uses two main databases:

- **regions4climate** - Main database with R4C data (buildings, trees, heat exposure)
- **med_iren** - Secondary database for NDVI and environmental data

## Performance Optimizations

The project includes comprehensive database optimizations:

- Spatial indexes (GIST) for all geometry columns
- Composite indexes for common query patterns
- Covering indexes for index-only scans
- Materialized view management with automated refresh

See [QUERY_OPTIMIZATION.md](./QUERY_OPTIMIZATION.md) for details.

## Related Documentation

- [../GETTING_STARTED.md](../GETTING_STARTED.md) - Local development setup with database services
- [../../db/README.md](../../db/README.md) - Schema management with dbmate
