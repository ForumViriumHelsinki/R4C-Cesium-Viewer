# Local Development with Skaffold

This guide covers local Kubernetes development using Skaffold.

## Overview

The project uses two main development workflows:

- **Full Stack (default)** - All services including frontend in containers
- **Services Only** - Backend services with local frontend development (faster iteration)

## Quick Start

### Full Stack Development (Recommended for most cases)

```bash
# Deploy everything with hot reload
skaffold dev --port-forward
```

Access the application at: http://localhost:4173

### Services Only + Local Frontend (Faster iteration)

```bash
# 1. Deploy backend services
skaffold run -p services-only --port-forward

# 2. Run frontend locally with hot reload
npm run dev
```

Access the application at: http://localhost:5173

## Workflow Details

### Full Stack Development

The default configuration deploys the complete stack:

```bash
skaffold dev --port-forward
```

This deploys:

- PostgreSQL with PostGIS extension
- pygeoapi OGC API server
- Database migrations
- Frontend application

Features:

- Watches for file changes and automatically rebuilds
- Port-forwards frontend to localhost:4173
- Cleans up all resources on exit (Ctrl+C)

### Services Only Development

For faster frontend iteration using local Vite dev server:

```bash
# Start backend services (persistent)
skaffold run -p services-only --port-forward
```

This deploys:

- PostgreSQL with PostGIS extension
- pygeoapi OGC API server
- Database migrations

Port forwards:

- PostgreSQL: localhost:5432
- pygeoapi: localhost:5000

Then run the frontend locally:

```bash
npm run dev
```

Access at: http://localhost:5173

### Import Production Data (Optional)

If you need production data for testing, see [DATABASE_IMPORT.md](DATABASE_IMPORT.md) for instructions on importing a database dump.

Quick version:

```bash
# Download dump from GCS
gsutil cp gs://regions4climate/database-export tmp/database-export.sql

# Import into local database
kubectl exec -i -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate < tmp/database-export.sql
```

### Clean Up

```bash
# Stop full stack (Ctrl+C in skaffold dev terminal)

# Or delete services-only deployment
skaffold delete -p services-only

# Delete default deployment (if used with skaffold run)
skaffold delete
```

## Port Forwarding

Default port forwards when using `--port-forward`:

### Full Stack (default)

| Service  | Local Port | Description     |
| -------- | ---------- | --------------- |
| Frontend | 4173       | Vue application |

### Services Only Profile

| Service    | Local Port | Description        |
| ---------- | ---------- | ------------------ |
| PostgreSQL | 5432       | Database access    |
| pygeoapi   | 5000       | OGC API endpoints  |

## Available Profiles

| Profile          | Description                                      |
| ---------------- | ------------------------------------------------ |
| (default)        | Full stack with frontend                         |
| `services-only`  | PostgreSQL + pygeoapi + migrations (no frontend) |
| `migration-test` | Test database migrations                         |

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
