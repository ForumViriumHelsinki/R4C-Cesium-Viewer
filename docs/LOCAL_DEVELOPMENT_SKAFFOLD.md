# Local Development with Skaffold

This guide covers local Kubernetes development using Skaffold with persistent services.

## Overview

The project uses a split configuration for efficient local development:

- **`skaffold-services.yaml`** - Persistent backend services (PostgreSQL, pygeoapi)
- **`skaffold.yaml`** - Frontend application with hot reload

This separation allows you to keep database and API services running while rapidly iterating on the frontend.

## Quick Start

```bash
# 1. Deploy persistent services (run once)
skaffold run -f skaffold-services.yaml --port-forward

# 2. Develop frontend with hot reload
skaffold dev --port-forward
```

## Workflow Details

### Step 1: Deploy Persistent Services

Start PostgreSQL and pygeoapi services that persist between development sessions:

```bash
skaffold run -f skaffold-services.yaml --port-forward
```

This deploys:

- PostgreSQL with PostGIS extension
- pygeoapi OGC API server
- Database migrations

Wait for all pods to be ready:

```bash
kubectl get pods -n regions4climate -w
```

### Step 2: Import Production Data (Optional)

If you need production data for testing, see [DATABASE_IMPORT.md](DATABASE_IMPORT.md) for instructions on importing a database dump.

Quick version:

```bash
# Download dump from GCS
gsutil cp gs://regions4climate/database-export tmp/database-export.sql

# Import into local database
kubectl exec -i -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate < tmp/database-export.sql
```

### Step 3: Develop the Frontend

Start the frontend with hot reload:

```bash
skaffold dev --port-forward
```

This:

- Builds and deploys the frontend container
- Watches for file changes and automatically rebuilds
- Port-forwards to localhost
- Cleans up the frontend on exit (services remain)

Access the application at: http://localhost:4173

### Step 4: Clean Up

When finished with development:

```bash
# Stop frontend (Ctrl+C in skaffold dev terminal)

# Remove services when no longer needed
skaffold delete -f skaffold-services.yaml
```

## Alternative: Full Stack Development

If you prefer to deploy everything together (services are destroyed on exit):

```bash
skaffold dev --profile=local-with-services --port-forward
```

This is simpler but requires redeploying services and re-importing data each session.

## Port Forwarding

Default port forwards when using `--port-forward`:

| Service    | Local Port | Description                            |
| ---------- | ---------- | -------------------------------------- |
| Frontend   | 4173       | Vue application                        |
| PostgreSQL | 5432       | Database (if needed for direct access) |
| pygeoapi   | 80         | OGC API endpoints                      |

## Useful Commands

### Check Service Status

```bash
# All pods
kubectl get pods -n regions4climate

# Service endpoints
kubectl get svc -n regions4climate

# Pod logs
kubectl logs -f -n regions4climate deployment/pygeoapi
kubectl logs -f -n regions4climate postgresql-0
```

### Database Access

```bash
# Interactive psql session
kubectl exec -it -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate

# Run a query
kubectl exec -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate -c "SELECT COUNT(*) FROM building;"
```

### Restart Services

```bash
# Restart pygeoapi
kubectl rollout restart deployment/pygeoapi -n regions4climate

# Restart PostgreSQL (caution: may cause brief downtime)
kubectl rollout restart statefulset/postgresql -n regions4climate
```

## Troubleshooting

### Services Not Connecting

Verify the frontend ConfigMap uses internal Kubernetes DNS:

```bash
kubectl get configmap r4c-cesium-viewer-config -n regions4climate -o yaml
```

Should show: `VITE_PYGEOAPI_HOST: "pygeoapi"`

### Database Connection Issues

Check PostgreSQL is ready:

```bash
kubectl exec -n regions4climate postgresql-0 -- pg_isready
```

### Migration Job Failed

Check migration logs:

```bash
kubectl logs -n regions4climate job/dbmate-migration
```

### pygeoapi Errors

Check pygeoapi logs for configuration issues:

```bash
kubectl logs -f -n regions4climate deployment/pygeoapi
```

Common issues:

- Missing environment variables (check `DB_PASSWORD_MED_IREN`)
- Database not ready (migrations not complete)

## Database Credentials

| Parameter       | Value                  |
| --------------- | ---------------------- |
| Database        | `regions4climate`      |
| Username        | `regions4climate_user` |
| Password        | `regions4climate_pass` |
| Host (internal) | `postgresql`           |
| Port            | `5432`                 |
