# Database Import Guide

This guide covers importing production database dumps into local Skaffold development environment.

## Prerequisites

- [Cloud SQL Auth Proxy](https://cloud.google.com/sql/docs/postgres/sql-proxy) installed
- `gcloud` CLI authenticated with appropriate permissions
- Local Skaffold environment running (`skaffold dev` or `skaffold run`)

## Resource Requirements

The PostgreSQL StatefulSet is configured with resources suitable for importing large dumps:

- **Memory**: 2Gi request, 4Gi limit
- **CPU**: 1000m request, 2000m limit
- **Storage**: 25Gi PVC

## Export from Cloud SQL

### Option A: Custom Format via Cloud SQL Auth Proxy (Recommended)

Custom format enables parallel restore and selective import. Using `--auto-iam-authn` enables passwordless authentication via your GCP IAM identity.

```bash
# 1. Start Cloud SQL Auth Proxy with IAM authentication
cloud-sql-proxy --auto-iam-authn \
  fvh-project-containers-etc:europe-north1:fvh-postgres --port 5433 &

# 2. Wait for proxy to be ready
until nc -z 127.0.0.1 5433 2>/dev/null; do sleep 0.5; done
echo "Proxy ready"

# 3. Export with custom format (uses your IAM email as username)
pg_dump \
  -h 127.0.0.1 -p 5433 \
  -U "$(gcloud config get-value account)" \
  -d regions4climate \
  --format=custom \
  --no-owner \
  --no-acl \
  --compress=6 \
  -f tmp/regions4climate.dump

# 4. Stop proxy when done
pkill cloud-sql-proxy
```

**Note**: The `-U` username must match your IAM principal email. The command above uses `gcloud config get-value account` to automatically retrieve it.

**Custom format benefits:**

- Parallel restore with `-j` flag (faster)
- Selective restore (specific tables, schema-only, data-only)
- Better compression than gzipped SQL
- Can list contents with `pg_restore -l`
- Passwordless authentication via IAM

### Option B: Directory Format (Best for Large Databases)

Directory format creates one file per table, enabling parallel dump and easier recovery from interruptions.

```bash
# 1. Start Cloud SQL Auth Proxy with IAM authentication
cloud-sql-proxy --auto-iam-authn \
  fvh-project-containers-etc:europe-north1:fvh-postgres --port 5433 &

# 2. Wait for proxy to be ready
until nc -z 127.0.0.1 5433 2>/dev/null; do sleep 0.5; done
echo "Proxy ready"

# 3. Export with directory format and parallel jobs
pg_dump \
  -h 127.0.0.1 -p 5433 \
  -U "$(gcloud config get-value account)" \
  -d regions4climate \
  --format=directory \
  --no-owner \
  --no-acl \
  --jobs=4 \
  -f tmp/regions4climate-dir/

# 4. Stop proxy when done
pkill cloud-sql-proxy
```

**Directory format benefits:**

- Parallel dump with `-j` flag (faster than custom format dump)
- Each table stored as separate file
- Easier to recover from interruptions (re-dump specific tables)
- Can inspect individual table files

**If dump is interrupted**, re-dump only missing tables:

```bash
# List what was dumped
ls tmp/regions4climate-dir/

# Dump specific missing table
pg_dump \
  -h 127.0.0.1 -p 5433 \
  -U "$(gcloud config get-value account)" \
  -d regions4climate \
  --format=custom \
  --no-owner --no-acl \
  --table=public.missing_table_name \
  -f tmp/missing_table.dump
```

### Option C: gcloud sql export (Plain SQL)

Simpler but produces plain SQL without `--no-owner` support.

```bash
# Export to GCS bucket
gcloud sql export sql regions4climate \
  gs://fvh-project-containers-etc-backups/regions4climate-$(date +%Y%m%d).sql.gz \
  --database=regions4climate \
  --offload

# Download locally
gsutil cp gs://fvh-project-containers-etc-backups/regions4climate-*.sql.gz tmp/
gunzip tmp/regions4climate-*.sql.gz

# Filter problematic statements (GRANTs for non-existent users)
rg -v "^(GRANT|ALTER.*OWNER TO)" tmp/regions4climate-*.sql > tmp/clean.sql
```

## Import to Local Skaffold

### Via Port-Forward (Recommended)

The fastest method is to restore directly from your local machine using the port-forwarded PostgreSQL connection. This avoids copying large dump files into the pod.

```bash
# 1. Ensure services are running with port-forward
just dev
# Or: skaffold run --port-forward

# 2. Restore directly via port-forward (works for both custom and directory format)
PGPASSWORD=postgres pg_restore \
  -h localhost -p 5432 \
  -U postgres \
  -d regions4climate \
  --no-owner \
  --no-acl \
  --jobs=4 \
  --verbose \
  tmp/regions4climate-dir    # or tmp/regions4climate.dump
```

**Benefits:**

- No file copying required - restores directly from local filesystem
- Faster than kubectl cp for large dumps
- Progress visible in real-time
- Can be backgrounded with `&` for long restores

**Note:** Some "already exists" errors are expected for tables created by migrations. These are non-fatal.

### Via kubectl cp (Alternative)

If port-forwarding is unavailable, copy the dump into the pod first.

#### For Custom Format (.dump)

```bash
# 1. Ensure PostgreSQL is running with sufficient resources
skaffold delete  # Clean up any existing deployment
skaffold run --port-forward

# 2. Wait for PostgreSQL to be ready
kubectl wait --for=condition=ready pod/postgresql-0 -n regions4climate --timeout=120s

# 3. Copy dump into pod
kubectl cp tmp/regions4climate.dump regions4climate/postgresql-0:/tmp/

# 4. Restore with parallel jobs
kubectl exec -it postgresql-0 -n regions4climate -- pg_restore \
  -U postgres \
  -d regions4climate \
  --no-owner \
  --no-acl \
  --jobs=4 \
  --verbose \
  /tmp/regions4climate.dump

# 5. Clean up dump file from pod
kubectl exec -it postgresql-0 -n regions4climate -- rm /tmp/regions4climate.dump
```

#### For Directory Format

```bash
# 1. Ensure PostgreSQL is running
skaffold run --port-forward
kubectl wait --for=condition=ready pod/postgresql-0 -n regions4climate --timeout=120s

# 2. Copy directory into pod
kubectl cp tmp/regions4climate-dir/ regions4climate/postgresql-0:/tmp/regions4climate-dir/

# 3. Restore with parallel jobs
kubectl exec -it postgresql-0 -n regions4climate -- pg_restore \
  -U postgres \
  -d regions4climate \
  --no-owner \
  --no-acl \
  --jobs=4 \
  --verbose \
  /tmp/regions4climate-dir/

# 4. Clean up
kubectl exec -it postgresql-0 -n regions4climate -- rm -rf /tmp/regions4climate-dir/
```

### Restore Specific Tables

To restore only specific tables from a dump:

```bash
# List available tables in a dump
kubectl exec -it postgresql-0 -n regions4climate -- \
  pg_restore -l /tmp/regions4climate.dump | grep "TABLE"

# Restore specific table only
kubectl exec -it postgresql-0 -n regions4climate -- pg_restore \
  -U postgres \
  -d regions4climate \
  --no-owner --no-acl \
  --table=public.r4c_hsy_building \
  /tmp/regions4climate.dump
```

### For Plain SQL (.sql)

```bash
# Import via kubectl (slower, no parallel support)
kubectl exec -i postgresql-0 -n regions4climate -- \
  psql -U postgres -d regions4climate < tmp/clean.sql
```

## Troubleshooting

### Pausing/Resuming a Running Dump

If you need to temporarily pause a dump in progress (not recommended for extended periods):

```bash
# Pause the dump process
kill -STOP $(pgrep pg_dump)

# Resume the dump process
kill -CONT $(pgrep pg_dump)
```

**Note**: The server transaction stays open while paused. Don't pause for extended periods as this can cause issues.

If the dump is **interrupted** (not paused), you cannot resume it. Use directory format for large databases to minimize re-work - you can re-dump only the missing tables.

### Server Disconnects During Materialized View Refresh

If the connection drops during materialized view creation, refresh them manually:

```bash
kubectl exec -it postgresql-0 -n regions4climate -- psql -U postgres -d regions4climate -c "
  SET work_mem = '256MB';
  SET maintenance_work_mem = '1GB';
"

kubectl exec -it postgresql-0 -n regions4climate -- psql -U postgres -d regions4climate -c \
  "REFRESH MATERIALIZED VIEW r4c_hsy_building_mat;"

kubectl exec -it postgresql-0 -n regions4climate -- psql -U postgres -d regions4climate -c \
  "REFRESH MATERIALIZED VIEW r4c_postalcode_mat;"
```

### GRANT Errors for Non-Existent Users

Production dumps contain GRANTs for Cloud SQL users that don't exist locally:

- `cloudsqlsuperuser` (Cloud SQL internal)
- `pygeoapi@project.iam` (IAM service accounts)
- `user.name@domain.com` (IAM user accounts)

**Solutions:**

1. Use `--no-acl` with pg_restore (recommended)
2. Filter with ripgrep: `rg -v "^GRANT" dump.sql > clean.sql`
3. Ignore errors (they're non-fatal)

### PVC Size Issues

If you get storage errors, delete the existing PVC and let it recreate:

```bash
skaffold delete
kubectl delete pvc data-postgresql-0 -n regions4climate
skaffold run --port-forward
```

## Performance Tuning for Import

For faster imports, you can temporarily enable unsafe performance settings. Add to the PostgreSQL container env:

```yaml
- name: POSTGRES_INITDB_ARGS
  value: '-c fsync=off -c synchronous_commit=off -c full_page_writes=off'
```

**Warning:** These settings reduce durability. Only use for initial data loading, then restart with normal settings.

## Analyzing Dump Files

Quick analysis commands:

```bash
# Count tables
rg -c "CREATE TABLE" dump.sql

# Count materialized views
rg -c "CREATE MATERIALIZED VIEW" dump.sql

# Find GRANTs for specific users
rg "^GRANT.*TO" dump.sql | rg -o 'TO "[^"]+"' | sort -u

# List contents of custom format dump
pg_restore -l dump.dump | head -50

# Estimate data size per table
rg "^COPY public\." dump.sql | head -20
```
