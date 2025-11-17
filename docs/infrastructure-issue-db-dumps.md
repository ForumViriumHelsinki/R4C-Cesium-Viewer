# Infrastructure Repository Issue: Automated PostgreSQL Dumps

**This file contains the issue description to be created in your infrastructure repository.**

---

## Title

Configure automated weekly PostgreSQL dumps to GCS for E2E testing

## Labels

`enhancement`, `database`, `automation`, `terraform`

## Description

### Overview

We need to configure automated weekly database dumps from production PostgreSQL to a GCS bucket to support E2E testing with production-like data without connecting to live production systems.

### Requirements

- **Schedule**: Weekly dumps (suggested: Sunday 2 AM UTC to minimize production impact)
- **Target Bucket**: `fvh-database-dumps`
- **Naming Convention**: `regions4climate-YYYY-MM-DD.sql.gz`
- **Compression**: gzip (for efficient storage and transfer)
- **Retention Policy**: Keep last 4 weeks (automatic cleanup of older dumps)
- **Source Database**: `regions4climate` production PostgreSQL instance
- **Format**: Plain SQL dump (compatible with `pg_dump` and `psql`)

### Implementation Approach

Use Terraform to configure the following GCP resources:

#### 1. GCS Bucket for Dumps

```terraform
resource "google_storage_bucket" "db_dumps" {
  name     = "fvh-database-dumps"
  location = "EU"  # Adjust based on your production DB location

  # Uniform bucket-level access
  uniform_bucket_level_access {
    enabled = true
  }

  # Lifecycle rule to automatically delete old dumps
  lifecycle_rule {
    condition {
      age = 28  # Delete dumps older than 4 weeks
    }
    action {
      type = "Delete"
    }
  }

  # Versioning disabled (we rely on dated filenames)
  versioning {
    enabled = false
  }

  labels = {
    purpose     = "database-backups"
    environment = "production"
    retention   = "4-weeks"
  }
}
```

#### 2. Service Account for Dump Operations

```terraform
resource "google_service_account" "db_dump" {
  account_id   = "regions4climate-db-dump"
  display_name = "Database Dump Service Account"
  description  = "Service account for automated PostgreSQL dumps"
}

# Grant write access to GCS bucket
resource "google_storage_bucket_iam_member" "db_dump_writer" {
  bucket = google_storage_bucket.db_dumps.name
  role   = "roles/storage.objectCreator"
  member = "serviceAccount:${google_service_account.db_dump.email}"
}

# Grant Cloud SQL access (if using Cloud SQL)
resource "google_project_iam_member" "cloudsql_client" {
  project = var.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.db_dump.email}"
}
```

#### 3. Cloud Run Service for Dump Execution

```terraform
resource "google_cloud_run_service" "db_dump" {
  name     = "regions4climate-db-dump"
  location = var.region

  template {
    spec {
      service_account_name = google_service_account.db_dump.email

      containers {
        image = "gcr.io/${var.project_id}/db-dump:latest"

        env {
          name  = "DB_HOST"
          value = var.db_host  # Cloud SQL connection name or IP
        }

        env {
          name  = "DB_NAME"
          value = "regions4climate"
        }

        env {
          name  = "GCS_BUCKET"
          value = google_storage_bucket.db_dumps.name
        }

        env {
          name = "DB_PASSWORD"
          value_from {
            secret_key_ref {
              name = google_secret_manager_secret.db_password.secret_id
              key  = "latest"
            }
          }
        }

        resources {
          limits = {
            cpu    = "2000m"
            memory = "2Gi"
          }
        }
      }

      timeout_seconds = 1800  # 30 minutes
    }
  }

  traffic {
    percent         = 100
    latest_revision = true
  }
}
```

#### 4. Cloud Scheduler Job

```terraform
resource "google_cloud_scheduler_job" "db_dump" {
  name        = "regions4climate-weekly-dump"
  description = "Weekly PostgreSQL dump for E2E testing"
  schedule    = "0 2 * * 0"  # Every Sunday at 2 AM UTC
  time_zone   = "UTC"

  retry_config {
    retry_count = 3
    min_backoff_duration = "5s"
    max_backoff_duration = "1h"
  }

  http_target {
    uri         = "${google_cloud_run_service.db_dump.status[0].url}/dump"
    http_method = "POST"

    oidc_token {
      service_account_email = google_service_account.db_dump.email
    }

    body = base64encode(jsonencode({
      database = "regions4climate"
      prefix   = "regions4climate"
    }))
  }
}

# Allow Cloud Scheduler to invoke Cloud Run
resource "google_cloud_run_service_iam_member" "scheduler_invoker" {
  service  = google_cloud_run_service.db_dump.name
  location = google_cloud_run_service.db_dump.location
  role     = "roles/run.invoker"
  member   = "serviceAccount:${google_service_account.db_dump.email}"
}
```

#### 5. Container Image for Dump Script

Create `docker/db-dump/Dockerfile`:

```dockerfile
FROM postgres:15-alpine

# Install Google Cloud SDK
RUN apk add --no-cache python3 py3-pip curl && \
    curl -O https://dl.google.com/dl/cloudsdk/channels/rapid/downloads/google-cloud-sdk-alpine.tar.gz && \
    tar xzf google-cloud-sdk-alpine.tar.gz && \
    ./google-cloud-sdk/install.sh --quiet && \
    rm google-cloud-sdk-alpine.tar.gz

ENV PATH="/google-cloud-sdk/bin:${PATH}"

COPY dump.sh /usr/local/bin/dump.sh
RUN chmod +x /usr/local/bin/dump.sh

EXPOSE 8080
CMD ["/usr/local/bin/dump.sh"]
```

Create `docker/db-dump/dump.sh`:

```bash
#!/bin/sh
set -e

# Simple HTTP server for Cloud Run health checks
if [ "$1" = "serve" ]; then
  python3 -m http.server 8080
  exit 0
fi

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_NAME="${DB_NAME:-regions4climate}"
DB_USER="${DB_USER:-postgres}"
GCS_BUCKET="${GCS_BUCKET:-fvh-database-dumps}"
DUMP_DATE=$(date +%Y-%m-%d)
DUMP_FILE="${DUMP_PREFIX:-regions4climate}-${DUMP_DATE}.sql.gz"
TEMP_FILE="/tmp/${DUMP_FILE}"

echo "🗄️  Starting database dump..."
echo "Database: ${DB_NAME}"
echo "Target: gs://${GCS_BUCKET}/${DUMP_FILE}"

# Create dump with compression
echo "📦 Creating compressed dump..."
pg_dump \
  -h "${DB_HOST}" \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --no-owner \
  --no-acl \
  --verbose \
  | gzip > "${TEMP_FILE}"

DUMP_SIZE=$(du -h "${TEMP_FILE}" | cut -f1)
echo "✅ Dump created: ${DUMP_SIZE}"

# Upload to GCS
echo "⬆️  Uploading to GCS..."
gsutil -m cp "${TEMP_FILE}" "gs://${GCS_BUCKET}/${DUMP_FILE}"

echo "✅ Upload complete: gs://${GCS_BUCKET}/${DUMP_FILE}"

# Verify upload
if gsutil ls "gs://${GCS_BUCKET}/${DUMP_FILE}" > /dev/null 2>&1; then
  echo "✅ Verification successful"
else
  echo "❌ Verification failed"
  exit 1
fi

# Cleanup
rm -f "${TEMP_FILE}"

echo "🎉 Database dump completed successfully!"
echo "📅 Dump date: ${DUMP_DATE}"
echo "📦 Size: ${DUMP_SIZE}"
```

### Testing Plan

1. **Manual Trigger Test**:
   ```bash
   # Trigger scheduler job manually
   gcloud scheduler jobs run regions4climate-weekly-dump --project=PROJECT_ID

   # Verify dump was created
   gsutil ls gs://fvh-database-dumps/

   # Download and verify dump integrity
   gsutil cp gs://fvh-database-dumps/regions4climate-YYYY-MM-DD.sql.gz /tmp/
   gunzip -t /tmp/regions4climate-YYYY-MM-DD.sql.gz
   ```

2. **Application-side Restore Test** (in R4C-Cesium-Viewer repo):
   ```bash
   # Clone and restore the dump
   ./scripts/restore-from-gcs-dump.sh

   # Verify tables exist
   psql -d regions4climate -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';"
   ```

3. **E2E Integration Test**:
   ```bash
   # Start full environment with production data
   skaffold dev -p e2e-with-prod-data --port-forward

   # Run E2E tests
   npm run test:e2e
   ```

4. **Retention Policy Test**:
   - Create test dumps with backdated names
   - Verify automatic cleanup after 28 days
   - Check bucket lifecycle is working: `gsutil lifecycle get gs://fvh-database-dumps`

### Security Considerations

- ✅ Use Workload Identity (no service account keys)
- ✅ Encrypt dumps at rest (GCS default encryption)
- ✅ Restrict bucket access to minimal required permissions
- ✅ Use Secret Manager for database passwords (never in code)
- ✅ Audit logging enabled for bucket access
- ✅ Network-restricted Cloud SQL access (if applicable)

### Monitoring and Alerts

Configure alerting for dump failures:

```terraform
resource "google_monitoring_alert_policy" "db_dump_failure" {
  display_name = "Database Dump Failure"
  combiner     = "OR"

  conditions {
    display_name = "Cloud Scheduler Job Failed"

    condition_threshold {
      filter          = "resource.type=\"cloud_scheduler_job\" AND resource.labels.job_id=\"regions4climate-weekly-dump\" AND metric.type=\"logging.googleapis.com/user/job_failure\""
      duration        = "60s"
      comparison      = "COMPARISON_GT"
      threshold_value = 0
    }
  }

  notification_channels = [var.alert_notification_channel]
}
```

### Cost Estimate

**Monthly cost breakdown** (approximate):

- GCS storage: ~4GB × 4 weeks × $0.020/GB = **$0.32/month**
- Cloud Scheduler: 1 job × $0.10/month = **$0.10/month**
- Cloud Run invocations: 4 runs/month × $0.0000004/request = **$0.00/month** (within free tier)
- Cloud Run compute: 4 runs × 15min × $0.00002400/vCPU-second = **$0.86/month**
- Egress (if testing downloads): ~1GB × $0.12/GB = **$0.12/month**

**Total: ~$1.40/month** (may vary based on dump size and actual runtime)

### Rollback Plan

If automated dumps cause issues:

1. **Disable scheduler temporarily**:
   ```bash
   gcloud scheduler jobs pause regions4climate-weekly-dump
   ```

2. **Revert to manual dumps** if needed

3. **Re-enable after fixing**:
   ```bash
   gcloud scheduler jobs resume regions4climate-weekly-dump
   ```

### Success Criteria

- [ ] Dumps are created weekly on schedule
- [ ] Dumps are accessible in `gs://fvh-database-dumps/`
- [ ] Application team can successfully restore dumps locally
- [ ] E2E tests pass with cloned production data
- [ ] Retention policy automatically cleans up old dumps
- [ ] Monitoring alerts trigger on failures
- [ ] No production performance impact during dump operations

### Dependencies

- **Application Repository PR**: [Link to R4C-Cesium-Viewer PR with restore infrastructure]
- **Database Access**: Confirmed production DB credentials/access method
- **GCP Project**: Terraform deployment permissions

### Related Documentation

- Application repo: `docs/DATABASE_CLONING.md`
- Terraform modules: (to be documented in infrastructure repo)

### Questions for Infrastructure Team

1. **Database Connection**: Are we using Cloud SQL or external PostgreSQL?
2. **Region**: Which GCP region should the bucket be in?
3. **Existing Backups**: Do we already have backup mechanisms that this might conflict with?
4. **Notification Channel**: What notification channel should alerts use?
5. **Project ID**: Which GCP project should these resources be deployed to?

---

## Assignees

@infrastructure-team

## Related Issues

- Application repo: [Link to PR/issue]

---

**Copy this content and create an issue in your infrastructure repository.**
