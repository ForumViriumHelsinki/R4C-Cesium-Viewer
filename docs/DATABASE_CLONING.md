# Database Cloning Guide

This guide explains how to clone production database dumps for local development and E2E testing, ensuring you can test against realistic data without impacting production systems.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Usage](#usage)
  - [Skaffold E2E Profile](#skaffold-e2e-profile)
  - [Manual Restore](#manual-restore)
  - [Listing Available Dumps](#listing-available-dumps)
- [GCS Bucket Setup](#gcs-bucket-setup)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

## Overview

The database cloning system provides automated and manual methods to restore production database dumps to local development environments:

- **Automated**: Kubernetes Job that downloads latest dump from GCS during Skaffold deployment
- **Manual**: Shell scripts for on-demand restore operations
- **Isolated**: No connection to production database during testing
- **Scheduled**: Weekly automated dumps from production (configured in infrastructure repo)

### Benefits

✅ **Safe Testing**: Test against production-like data without risk to live systems
✅ **Reproducible**: Consistent data state for E2E tests
✅ **Automated**: Integrated into Skaffold development workflow
✅ **Flexible**: Manual restore options for custom workflows
✅ **Versioned**: Access historical dumps by date

## Quick Start

### Prerequisites

1. **GCS Access**: Ensure you have read access to the `fvh-database-dumps` bucket
2. **Authentication**: Run `gcloud auth login` to authenticate with Google Cloud
3. **Local PostgreSQL**: Either via Docker, Kubernetes, or native installation

### Start E2E Environment with Production Data

```bash
# Start full environment with cloned production data
skaffold dev -p e2e-with-prod-data --port-forward

# The deployment will:
# 1. Start PostgreSQL with PostGIS
# 2. Download latest production dump from GCS
# 3. Restore dump to local database
# 4. Start pygeoapi and application
```

### Manual Restore

```bash
# Restore latest production dump
./scripts/restore-from-gcs-dump.sh

# Restore specific date
./scripts/restore-from-gcs-dump.sh --dump-date 2025-01-15

# Use local dump file
./scripts/restore-from-gcs-dump.sh --local-file /path/to/dump.dump
```

## Architecture

### Data Flow

```
┌─────────────────────┐
│ Production Database │
│  (Cloud SQL / RDS)  │
└──────────┬──────────┘
           │ Weekly scheduled dump
           │ (configured in infrastructure)
           ↓
┌─────────────────────┐
│   GCS Bucket        │
│ fvh-database-dumps  │
│                     │
│ ├─ regions4climate- │
│ │  2025-01-07.dump  │
│ ├─ regions4climate- │
│ │  2025-01-14.dump  │
│ └─ regions4climate- │
│    2025-01-21.dump  │
└──────────┬──────────┘
           │ Download on demand
           ↓
┌─────────────────────┐
│ Local PostgreSQL    │
│ (Docker/K8s/Native) │
│                     │
│ Database:           │
│  regions4climate    │
└─────────────────────┘
```

### Components

#### Kubernetes Job: `db-clone-from-gcs-job.yaml`

Automated restore job that:

- Waits for PostgreSQL to be ready
- Downloads latest dump from GCS using `gsutil`
- Restores dump using `pg_restore` with parallel jobs (4 workers)
- Drops and recreates local database
- Verifies critical tables exist
- Sets proper ownership and permissions
- Runs ANALYZE for query optimization

**Format:** Uses PostgreSQL custom format (`.dump`) which provides:

- Parallel restore with `-j` flag for faster performance
- Selective table restore capability
- Better compression than gzipped SQL
- Ability to list contents with `pg_restore -l`
- Built-in format verification

#### Scripts

- **`scripts/restore-from-gcs-dump.sh`**: Interactive manual restore with safety confirmations
- **`scripts/list-gcs-dumps.sh`**: List available dumps with dates and sizes

#### Skaffold Profile: `e2e-with-prod-data`

Pre-configured deployment profile that includes:

- PostgreSQL StatefulSet with PostGIS
- Database clone job from GCS
- pygeoapi with database connection
- Application frontend

## Usage

### Skaffold E2E Profile

The `e2e-with-prod-data` profile provides a complete isolated environment:

```bash
# Start development environment with prod data
skaffold dev -p e2e-with-prod-data --port-forward

# Run and exit (for CI/CD)
skaffold run -p e2e-with-prod-data

# Delete environment
skaffold delete -p e2e-with-prod-data
```

**What happens:**

1. PostgreSQL starts in Kubernetes
2. Database clone job downloads latest dump
3. Dump is restored (may take 5-15 minutes depending on size)
4. pygeoapi connects to restored database
5. Frontend starts and connects to pygeoapi
6. Ready for E2E testing!

**Monitoring progress:**

```bash
# Watch job status
kubectl get jobs -n regions4climate -w

# View restore logs
kubectl logs -n regions4climate job/db-clone-from-gcs -f

# Check database is ready
kubectl exec -n regions4climate postgresql-0 -- psql -U postgres -d regions4climate -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
```

### Manual Restore

For local development outside Kubernetes:

```bash
# List available dumps
./scripts/list-gcs-dumps.sh

# Output:
# Available Dumps:
# ----------------------------------------
# DATE         SIZE            GCS PATH
# ----------------------------------------
# 2025-01-21   245MiB          regions4climate-2025-01-21.dump
# 2025-01-14   243MiB          regions4climate-2025-01-14.dump
# 2025-01-07   241MiB          regions4climate-2025-01-07.dump

# Restore latest
./scripts/restore-from-gcs-dump.sh

# Restore specific date
./scripts/restore-from-gcs-dump.sh --dump-date 2025-01-14

# Use local file (useful for air-gapped environments)
./scripts/restore-from-gcs-dump.sh --local-file ~/downloads/regions4climate-2025-01-14.dump
```

**Configuration via environment variables:**

```bash
# Override defaults
export GCS_BUCKET="my-custom-bucket"
export DB_HOST="localhost"
export DB_PORT="5432"
export DB_NAME="regions4climate"
export DB_USER="postgres"
export DB_PASSWORD="mypassword"

./scripts/restore-from-gcs-dump.sh
```

### Listing Available Dumps

```bash
# Show 10 most recent dumps (default)
./scripts/list-gcs-dumps.sh

# Show 5 most recent
./scripts/list-gcs-dumps.sh --limit 5

# Custom bucket
GCS_BUCKET="other-bucket" ./scripts/list-gcs-dumps.sh
```

## GCS Bucket Setup

### Bucket Structure

Expected file naming convention:

```
fvh-database-dumps/
├── regions4climate-2025-01-07.dump
├── regions4climate-2025-01-14.dump
└── regions4climate-2025-01-21.dump
```

**Format:** `{DUMP_PREFIX}-YYYY-MM-DD.dump`

### Access Control

#### For Local Development

```bash
# Authenticate with gcloud
gcloud auth login

# Verify access
gsutil ls gs://fvh-database-dumps/
```

#### For Kubernetes (Workload Identity)

Production environments should use Workload Identity instead of service account keys:

1. **Create GCS service account** (in infrastructure repo):

   ```terraform
   resource "google_service_account" "db_clone" {
     account_id   = "db-clone-reader"
     display_name = "Database Clone Reader"
   }
   ```

2. **Grant bucket read access**:

   ```terraform
   resource "google_storage_bucket_iam_member" "db_clone" {
     bucket = "fvh-database-dumps"
     role   = "roles/storage.objectViewer"
     member = "serviceAccount:${google_service_account.db_clone.email}"
   }
   ```

3. **Enable Workload Identity binding**:

   ```terraform
   resource "google_service_account_iam_member" "workload_identity" {
     service_account_id = google_service_account.db_clone.name
     role               = "roles/iam.workloadIdentityUser"
     member             = "serviceAccount:${var.project_id}.svc.id.goog[regions4climate/database-clone-sa]"
   }
   ```

4. **Update Kubernetes ServiceAccount** in `k8s/serviceaccount.yaml`:

   ```yaml
   apiVersion: v1
   kind: ServiceAccount
   metadata:
     name: database-clone-sa
     namespace: regions4climate
     annotations:
       iam.gke.io/gcp-service-account: db-clone-reader@PROJECT_ID.iam.gserviceaccount.com
   ```

5. **Enable in job** `k8s/db-clone-from-gcs-job.yaml`:
   ```yaml
   spec:
     template:
       spec:
         serviceAccountName: database-clone-sa # Uncomment this line
   ```

### Scheduled Dump Creation

**Note**: Dump creation is handled in the **infrastructure repository** via Terraform and Cloud Scheduler.

See: [Infrastructure Repository Issue](#infrastructure-repo-issue) for configuration details.

## Troubleshooting

### Common Issues

#### "No dump files found"

**Symptoms:**

```
❌ No dump files found in gs://fvh-database-dumps/regions4climate*.dump
```

**Solutions:**

1. Verify bucket name: `gsutil ls gs://fvh-database-dumps/`
2. Check file naming matches expected format: `regions4climate-YYYY-MM-DD.dump`
3. Ensure dumps exist (infrastructure automation may not be configured yet)
4. Verify GCS permissions: `gsutil ls gs://fvh-database-dumps/`

#### "Access Denied" when downloading from GCS

**Symptoms:**

```
AccessDeniedException: 403 Forbidden
```

**Solutions:**

1. Re-authenticate: `gcloud auth login`
2. Verify you're using correct project: `gcloud config get-value project`
3. Request bucket access from infrastructure team
4. For Kubernetes: Verify Workload Identity is configured correctly

#### Job fails with "cannot connect to database"

**Symptoms:**

```
❌ Cannot connect to PostgreSQL at postgresql:5432
```

**Solutions:**

1. Check PostgreSQL is running: `kubectl get pods -n regions4climate`
2. Check PostgreSQL logs: `kubectl logs -n regions4climate postgresql-0`
3. Verify secret exists: `kubectl get secret -n regions4climate postgresql`
4. Increase init container wait time in `db-clone-from-gcs-job.yaml`

#### Restore takes too long / times out

**Symptoms:**

- Job timeout after 10+ minutes
- Large dumps (>1GB) fail to restore

**Solutions:**

1. Increase job timeout in `db-clone-from-gcs-job.yaml`:
   ```yaml
   spec:
     activeDeadlineSeconds: 3600 # 1 hour
   ```
2. Increase resource limits:
   ```yaml
   resources:
     limits:
       cpu: 2000m
       memory: 4Gi
   ```
3. Consider using persistent volume to cache downloads

#### Database exists but has no data

**Symptoms:**

- Database created successfully
- Table count is 0 or very low

**Solutions:**

1. Check restore logs for errors: `kubectl logs -n regions4climate job/db-clone-from-gcs`
2. Verify dump file isn't corrupted: Download locally and inspect with `gunzip -t`
3. Check dump was created correctly (see infrastructure repo issue)

### Debug Mode

Enable verbose logging in restore script:

```bash
# Add to scripts/restore-from-gcs-dump.sh
set -x  # Print each command
```

For Kubernetes job, view detailed logs:

```bash
kubectl logs -n regions4climate job/db-clone-from-gcs --all-containers=true
```

## Best Practices

### For Development

1. **Use the Skaffold profile** for consistent environments:

   ```bash
   skaffold dev -p e2e-with-prod-data --port-forward
   ```

2. **Delete and recreate regularly** to ensure fresh data:

   ```bash
   skaffold delete -p e2e-with-prod-data
   skaffold dev -p e2e-with-prod-data --port-forward
   ```

3. **Don't commit local data changes** - the database is ephemeral

### For E2E Testing

1. **Use specific dump dates** for reproducible tests:

   ```bash
   # In CI/CD, pin to specific date
   ./scripts/restore-from-gcs-dump.sh --dump-date 2025-01-14
   ```

2. **Verify data state before tests**:

   ```bash
   # Check critical tables exist and have data
   psql -c "SELECT COUNT(*) FROM r4c_hsy_building_current;"
   ```

3. **Clean up after tests** to save resources:
   ```bash
   skaffold delete -p e2e-with-prod-data
   ```

### For CI/CD

Example GitHub Actions workflow:

```yaml
name: E2E Tests with Production Data

on:
  schedule:
    - cron: '0 2 * * 1' # Weekly on Monday at 2am
  workflow_dispatch:

jobs:
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Google Cloud
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}

      - name: Start environment with prod data
        run: |
          skaffold run -p e2e-with-prod-data

      - name: Wait for database restore
        run: |
          kubectl wait --for=condition=complete --timeout=600s \
            job/db-clone-from-gcs -n regions4climate

      - name: Run E2E tests
        run: |
          npm run test:e2e

      - name: Cleanup
        if: always()
        run: |
          skaffold delete -p e2e-with-prod-data
```

### Security

1. **Never commit dumps to version control** - use `.gitignore`:

   ```gitignore
   *.dump
   dump-*.dump
   ```

2. **Use Workload Identity** in production clusters (not service account keys)

3. **Rotate dumps regularly** to limit exposure of old data

4. **Audit GCS access**:
   ```bash
   gcloud logging read "resource.type=gcs_bucket AND protoPayload.resourceName=projects/_/buckets/fvh-database-dumps" --limit 50
   ```

## Infrastructure Repo Issue

The following issue should be created in your infrastructure repository to configure automated weekly dumps:

**Title:** Configure automated weekly PostgreSQL dumps to GCS for E2E testing

**Description:**

> We need to configure automated weekly database dumps from production PostgreSQL to GCS bucket for E2E testing purposes.
>
> **Requirements:**
>
> - Schedule: Weekly dumps (suggested: Sunday 2 AM UTC to minimize impact)
> - Bucket: `fvh-database-dumps`
> - Naming: `regions4climate-YYYY-MM-DD.dump`
> - Compression: gzip
> - Retention: Keep last 4 weeks (automatic cleanup)
> - Database: `regions4climate` production instance
>
> **Implementation:**
> Use Terraform to configure Cloud Scheduler + Cloud Run job:
>
> 1. **Storage Bucket:**
>
>    ```terraform
>    resource "google_storage_bucket" "db_dumps" {
>      name     = "fvh-database-dumps"
>      location = "EU"
>
>      lifecycle_rule {
>        condition {
>          age = 28  # Delete dumps older than 4 weeks
>        }
>        action {
>          type = "Delete"
>        }
>      }
>    }
>    ```
>
> 2. **Cloud Scheduler Job:**
>
>    ```terraform
>    resource "google_cloud_scheduler_job" "db_dump" {
>      name        = "regions4climate-weekly-dump"
>      description = "Weekly PostgreSQL dump for E2E testing"
>      schedule    = "0 2 * * 0"  # Every Sunday at 2 AM UTC
>      time_zone   = "UTC"
>
>      http_target {
>        uri         = google_cloud_run_service.db_dump.status[0].url
>        http_method = "POST"
>        oidc_token {
>          service_account_email = google_service_account.db_dump.email
>        }
>      }
>    }
>    ```
>
> 3. **Cloud Run Service** (for dump execution):
>    - Container: Use official `postgres:15` image with gcloud SDK
>    - Command: `pg_dump` with compression
>    - Upload to GCS with date-stamped filename
>
> **Testing:**
>
> - Manual trigger: `gcloud scheduler jobs run regions4climate-weekly-dump`
> - Verify dump in bucket: `gsutil ls gs://fvh-database-dumps/`
> - Test restore: `./scripts/restore-from-gcs-dump.sh` (in app repo)
>
> **Related:**
>
> - Application repository PR: [link to this PR]
> - Database cloning documentation: `docs/DATABASE_CLONING.md`

## Related Documentation

- [Database Migration Management](../db/README.md)
- [Skaffold Deployment Guide](../CLAUDE.md#dockerkubernetes)
- [E2E Testing Guide](./TESTING.md)
