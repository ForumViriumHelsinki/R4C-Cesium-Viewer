# Database Migration Management with dbmate

This directory contains database schema management using [dbmate](https://github.com/amacneil/dbmate) for the R4C Cesium Viewer project.

## Overview

We use dbmate to manage database schema migrations for the **regions4climate** PostgreSQL database. This provides:
- ✅ Version-controlled schema changes
- ✅ Reproducible database setup
- ✅ Safe rollback capabilities
- ✅ Team coordination for schema changes
- ✅ Integration with pygeoapi collections

## Directory Structure

```
db/
├── migrations/                    # Migration files
│   └── 20241225000001_initial_schema.sql
├── schema-regions4climate.sql     # Original schema dump (reference)
├── .dbmate.env                   # dbmate configuration
├── README.md                     # This file
└── PYGEOAPI_ALIGNMENT.md         # Database-pygeoapi mapping
```

## Quick Start

### 1. Environment Setup

Copy the example environment file and configure your database connection:

```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 2. Database Connection

Set your database URL in `.env`:
```bash
DATABASE_URL=postgres://username:password@localhost:5432/regions4climate
```

For Google Cloud SQL with cloud-sql-proxy (production):
```bash
DATABASE_URL=postgres://username:password@127.0.0.1:5432/regions4climate
```

### 3. Apply Migrations

```bash
# Apply all pending migrations
dbmate up

# Check migration status
dbmate status
```

## Common Commands

### Migration Management
```bash
# Create a new migration
dbmate new add_new_feature

# Apply migrations
dbmate up

# Rollback last migration
dbmate rollback

# Check current status
dbmate status

# Dump current schema
dbmate dump > db/schema-current.sql
```

### Database Management
```bash
# Create database (if needed)
dbmate create

# Drop database (careful!)
dbmate drop

# Wait for database to be ready
dbmate wait
```

## Rollback Procedures

### Understanding dbmate Rollbacks

Each migration consists of two sections that are essential for rollback functionality:
- `-- migrate:up`: Applied when running migrations forward
- `-- migrate:down`: Applied when rolling back migrations

### Basic Rollback Commands

```bash
# Rollback the last applied migration
dbmate rollback

# Check migration status before and after rollback
dbmate status

# Rollback multiple migrations (run command multiple times)
dbmate rollback
dbmate rollback

# Re-apply migrations after testing rollback
dbmate up
```

### Safe Rollback Practices

#### 1. **Pre-Rollback Checks**
```bash
# Always check current migration status first
dbmate status

# Review what will be rolled back
cat db/migrations/$(ls -1 db/migrations | tail -1)
```

#### 2. **Data Loss Prevention**
- **WARNING**: Rollbacks that drop tables will lose all data in those tables
- Always backup critical data before rolling back destructive migrations
- Consider using transactions for complex rollbacks

#### 3. **Production Rollback Procedure**
```bash
# 1. Create a database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Check current status
dbmate status

# 3. Perform rollback
dbmate rollback

# 4. Verify rollback
dbmate status

# 5. Test application functionality
# If issues arise, restore from backup:
# psql $DATABASE_URL < backup_TIMESTAMP.sql
```

#### 4. **Rollback Testing in CI**
The CI workflow includes automated rollback testing:
```yaml
# From .github/workflows/database-migrations.yml
- name: Test rollback
  run: |
    dbmate up        # Apply migrations
    dbmate rollback  # Test rollback
    dbmate up        # Re-apply to ensure idempotency
```

#### 5. **Emergency Rollback**
For urgent production rollbacks:
```bash
# Rollback with logging
dbmate rollback 2>&1 | tee rollback_$(date +%Y%m%d_%H%M%S).log

# If automated rollback fails, manual SQL execution may be needed
# Extract the down migration SQL and run manually:
psql $DATABASE_URL -f emergency_rollback.sql
```

### Rollback Considerations by Migration Type

#### **Index Operations**
- Use `CONCURRENTLY` to avoid locking (already implemented in our migrations)
- Rollbacks are generally safe but may impact query performance

#### **Table Drops**
- Most destructive type of rollback
- Always backup data first
- Consider adding safety checks:
```sql
-- migrate:down
DO $$
BEGIN
  IF (SELECT COUNT(*) FROM table_name) > 0 THEN
    RAISE EXCEPTION 'Cannot rollback: table contains data';
  END IF;
END $$;
DROP TABLE IF EXISTS table_name;
```

#### **Data Migrations**
- May not be fully reversible
- Document any data transformations that cannot be undone
- Consider keeping backups of transformed data

## Creating New Migrations

### 1. Generate Migration File
```bash
dbmate new descriptive_migration_name
```

### 2. Edit Migration File
```sql
-- migrate:up
CREATE TABLE public.new_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    geom GEOMETRY(Point, 4326)
);

CREATE INDEX idx_new_table_geom ON public.new_table USING GIST (geom);

-- migrate:down
DROP TABLE IF EXISTS public.new_table;
```

### 3. Test Migration
```bash
# Apply migration
dbmate up

# Test rollback
dbmate rollback

# Re-apply
dbmate up
```

## Best Practices

### Migration Guidelines

1. **Always include both up and down migrations**
2. **Use IF EXISTS/IF NOT EXISTS** where appropriate
3. **Add spatial indexes** for geometry columns
4. **Test migrations thoroughly** before deploying
5. **Keep migrations focused** - one logical change per migration

### PostGIS Considerations

When working with spatial data:
```sql
-- Create table with geometry column
CREATE TABLE public.spatial_table (
    id SERIAL PRIMARY KEY,
    name TEXT,
    geom GEOMETRY(Point, 4326)  -- Specify geometry type and SRID
);

-- Add spatial index
CREATE INDEX idx_spatial_table_geom ON public.spatial_table USING GIST (geom);

-- Add constraints if needed
ALTER TABLE public.spatial_table 
    ADD CONSTRAINT enforce_srid_geom 
    CHECK (ST_SRID(geom) = 4326);
```

### pygeoapi Integration

When adding new tables that will be exposed via pygeoapi:

1. **Ensure proper column naming**:
   - `id` or appropriate primary key for `id_field`
   - `geom` for spatial column (can be customized in pygeoapi config)

2. **Update pygeoapi configuration** (`configmap.yaml`):
   ```yaml
   new_collection:
     type: collection
     title: New Collection
     providers:
       - type: feature
         name: PostgreSQL
         data:
           host: ${DB_HOST}
           dbname: ${DB_NAME_R4C}
           user: ${DB_USER}
           password: ${DB_PASSWORD}
         id_field: id
         table: new_table_name
         geom_field: geom
   ```

3. **Test the endpoint** after deployment

## CI/CD Integration

Migrations are automatically applied in the deployment pipeline:

```yaml
# Example CI/CD step
- name: Apply database migrations
  run: |
    dbmate wait
    dbmate up
```

## Testing Migrations with Skaffold

We've integrated database migration testing with Skaffold's native testing capabilities:

### Local Testing
```bash
# Test migrations using Skaffold (requires running PostgreSQL)
skaffold test -p migration-test

# Run full development environment with services
skaffold dev --profile=local-with-services --port-forward

# Test migrations as part of the development workflow
skaffold run -p migration-test
```

### How It Works
- **Test Profile**: The `migration-test` profile in `skaffold.yaml` sets up a PostgreSQL instance and runs migration tests
- **Isolated Testing**: Tests run against temporary test databases, leaving your main database untouched
- **File Watching**: During `skaffold dev`, tests automatically re-run when migration files change
- **Container-based**: Tests run inside the same `db-init` container used for production migrations

### Test Configuration
The test setup includes:
- PostgreSQL with PostGIS extensions
- All database migration files
- Comprehensive up/down migration testing
- Automated cleanup of test databases

## Troubleshooting

### Common Issues

**Connection refused**:
- Check database credentials in `.env`
- Ensure cloud-sql-proxy is running (production)
- Verify network connectivity

**Migration failed**:
```bash
# Check current state
dbmate status

# Manual rollback if needed
dbmate rollback

# Fix migration file and retry
dbmate up
```

**Schema drift**:
```bash
# Compare current schema with expected
dbmate dump > db/schema-current.sql
diff db/schema-regions4climate.sql db/schema-current.sql
```

### Recovery Procedures

If migrations get out of sync:

1. **Backup your data** first!
2. Check current migration state: `dbmate status`
3. Manual intervention may be needed to sync `schema_migrations` table
4. Consult with team before making manual changes

## Team Workflow

### Coordination with pygeoapi

1. **Schema changes** → Update migrations
2. **Test locally** with development database
3. **Update pygeoapi config** if exposing new collections
4. **Create pull request** with both database and pygeoapi changes
5. **Deploy** migrations before pygeoapi updates

### Code Review Checklist

- [ ] Migration has both up and down sections
- [ ] Spatial indexes added for geometry columns
- [ ] pygeoapi config updated if needed
- [ ] Migration tested locally
- [ ] No hardcoded values or credentials
- [ ] Proper error handling in complex migrations

## Related Documentation

- [dbmate Documentation](https://github.com/amacneil/dbmate)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [pygeoapi Documentation](https://docs.pygeoapi.io/)
- [Database-pygeoapi Alignment](./PYGEOAPI_ALIGNMENT.md)