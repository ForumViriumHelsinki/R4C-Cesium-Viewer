# Kubernetes Manifests for Local Development

This directory contains plain Kubernetes manifests for local development with Skaffold.

## Overview

The application deployment uses plain Kubernetes manifests for easier local development and testing. Production deployments should use proper Helm charts or other production-ready deployment methods.

## Files

### Core Application Manifests

- `serviceaccount.yaml` - Service account for the application
- `configmap.yaml` - Environment configuration (non-sensitive)
- `secrets.yaml` - Secrets for API keys and Sentry configuration
- `deployment.yaml` - Main application deployment
- `service.yaml` - ClusterIP service
- `ingress.yaml` - Ingress for local access

### Database Migration

- `migration-secret.yaml` - Credentials for database migrations
- `migration-job.yaml` - Kubernetes Job for running database migrations

### PostgreSQL Database

- `postgresql-secret.yaml` - PostgreSQL credentials and database configuration
- `postgresql-configmap.yaml` - PostgreSQL initialization scripts (PostGIS extensions, database setup)
- `postgresql-service.yaml` - PostgreSQL headless service and ClusterIP service
- `postgresql-statefulset.yaml` - PostgreSQL StatefulSet using official postgis/postgis image

### Additional Services

- `pygeoapi-deployment.yaml` - PyGeoAPI service deployment
- `database-seeding-job.yaml` - Database seeding job
- `db-test-job.yaml` - Database testing job

## Usage

### Recommended: Use Makefile

The easiest way to run locally is via the Makefile:

```bash
make dev       # Local frontend + K8s services (fast iteration)
make dev-full  # All in containers (closer to production)
make stop      # Stop everything
```

Services persist on Ctrl+C. See the main [README.md](../README.md) for details.

### Direct Skaffold (Advanced)

#### services-only Profile

Run backend services only (for use with local `npm run dev`):

```bash
skaffold run -p services-only --port-forward
```

Deploys: PostgreSQL, pygeoapi, migrations

#### frontend-only Profile

Run frontend only (assumes services-only is already running):

```bash
skaffold dev -p frontend-only --port-forward
```

#### Default Profile

Full stack (all services + frontend):

```bash
skaffold dev --port-forward
```

**Note:** Direct `skaffold dev` cleans up on exit. Use `skaffold run` or Makefile commands for persistent services.

### Environment Variables

The following environment variables can be configured:

**ConfigMap (`configmap.yaml`):**

- `VITE_PYGEOAPI_HOST` - PyGeoAPI host (defaults to `pygeoapi.dataportal.fi`)

**Secrets (`secrets.yaml`):**

- `VITE_DIGITRANSIT_KEY` - Digitransit API key
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_DSN` - Sentry DSN for error tracking

To set these values for local development, you can either:

1. Edit `k8s/secrets.yaml` directly (not recommended for sensitive values)
2. Create a Kubernetes secret before running Skaffold:
   ```bash
   kubectl create secret generic r4c-cesium-viewer-secrets \
     --from-literal=VITE_DIGITRANSIT_KEY="your-key" \
     --from-literal=SENTRY_AUTH_TOKEN="your-token" \
     --from-literal=SENTRY_DSN="your-dsn"
   ```
3. Use environment variables with `envsubst` (requires manual setup)

**Note:** The current manifests deploy empty secrets by default. You need to set these values manually for full functionality.

### Database Migration Credentials

For the `local-with-services` profile, database migration credentials are set in `migration-secret.yaml`.

⚠️ **Security Warning:** The default credentials in `migration-secret.yaml` are for LOCAL DEVELOPMENT ONLY:

- Database user password: `regions4climate_pass`
- Admin password: `postgres`

**DO NOT** use these credentials in production or commit custom credentials to git. For production deployments, create a separate secret with secure credentials.

## Benefits of Plain Manifests

Using plain Kubernetes manifests for local development provides:

1. **No templating** - All values are plain YAML, making it easier to understand and debug
2. **Fixed naming** - Resources use consistent names (e.g., `r4c-cesium-viewer`) instead of generated names
3. **Direct configuration** - Environment variables and settings are directly in the manifests
4. **Simpler deployment** - No Helm hooks or complex templating logic
5. **Easier troubleshooting** - Helps identify whether issues are Helm-specific or application-related

## Technical Details

### Container Port Configuration

The application uses Vite's preview server which runs on **port 4173**:

- Container exposes port 4173
- Service maps external port 80 to container port 4173
- This matches the production build behavior (`npm run preview`)

### Resource Limits

The deployment includes sensible resource limits for local development:

- **Limits:** 500m CPU, 512Mi memory
- **Requests:** 100m CPU, 128Mi memory

These can be adjusted based on your local environment's available resources.

## PostgreSQL Data Persistence

The PostgreSQL deployment uses a PersistentVolumeClaim (PVC) for data storage:

- **Data persists** across `make stop`, `skaffold delete`, and pod restarts
- **Data persists** when deleting the deployment
- To completely reset the database:

  ```bash
  # Using Makefile (recommended)
  make db-reset

  # Or manually
  make stop
  kubectl delete pvc postgresql-data -n regions4climate
  make dev
  ```

**Note:** This is useful when you want to test initialization scripts from scratch or reset to a clean state.

## Common Issues

### Migration Job Troubleshooting

#### Re-running Migrations

Unlike Helm deployments with hooks, the migration Job must be manually deleted and recreated if you need to re-run migrations:

```bash
kubectl delete job r4c-cesium-viewer-migration -n regions4climate
make dev  # or: skaffold run -p services-only --port-forward
```

The Job has `ttlSecondsAfterFinished: 300` set, so completed jobs are automatically cleaned up after 5 minutes.

#### Migration Job Failed

If the migration job fails, you can check the logs to diagnose the issue:

```bash
# View logs from the migration job
kubectl logs job/r4c-cesium-viewer-migration

# View logs from the init container (PostgreSQL readiness check)
kubectl logs job/r4c-cesium-viewer-migration -c wait-for-postgres

# Describe the job to see events
kubectl describe job r4c-cesium-viewer-migration
```

**Common failure causes:**

1. **PostgreSQL not ready** - The init container waits for PostgreSQL to be ready. If it's taking too long, check PostgreSQL status:

   ```bash
   kubectl get pods -l app.kubernetes.io/name=postgresql
   kubectl logs -l app.kubernetes.io/name=postgresql
   ```

2. **Database credentials incorrect** - Verify the migration secret is correct:

   ```bash
   kubectl get secret r4c-cesium-viewer-migration-secret -o yaml
   ```

3. **Migration files not found** - The dbmate image needs access to migration files. Ensure your Skaffold configuration mounts the migrations directory correctly.

4. **PostGIS extension error** - If the admin user doesn't have superuser privileges, the PostGIS extension creation may fail. This is usually fine if the extensions already exist.

#### Debugging Migration Job

To run an interactive shell in the same environment as the migration job:

```bash
# Run a debug pod with the same configuration
kubectl run dbmate-debug --rm -it \
  --image=amacneil/dbmate:v2.13.0 \
  --env="DATABASE_URL=postgres://regions4climate_user:regions4climate_pass@postgresql:5432/regions4climate?sslmode=disable" \
  -- sh

# Inside the pod, you can run dbmate commands manually:
# dbmate status
# dbmate up
# psql $DATABASE_URL
```

#### Migration Job Stuck

If the job appears stuck in a pending or running state:

1. Check if the PostgreSQL dependency is available:

   ```bash
   kubectl get svc postgresql
   ```

2. Delete the stuck job and retry:

   ```bash
   kubectl delete job r4c-cesium-viewer-migration --force --grace-period=0
   ```

3. If problems persist, check the backoff limit (set to 10 in the job). The job will fail permanently after 10 retry attempts.
