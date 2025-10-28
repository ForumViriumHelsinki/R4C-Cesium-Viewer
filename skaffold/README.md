# Skaffold Kubernetes Manifests

This directory contains plain Kubernetes manifests for local development with Skaffold.

## Overview

The application deployment has been simplified from Helm charts to plain Kubernetes manifests for easier local development and testing. The Helm chart in the `helm/` directory is still used for production deployments.

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

### Additional Services
- `pygeoapi-deployment.yaml` - PyGeoAPI service deployment
- `database-seeding-job.yaml` - Database seeding job
- `db-test-job.yaml` - Database testing job
- `postgresql-values.yaml` - Values for PostgreSQL Helm chart (used in profiles)

## Usage

### Basic Development

Run the basic application without services:

```bash
skaffold dev --port-forward
```

This deploys only the R4C Cesium Viewer frontend application.

### With Full Services

Run with PostgreSQL database and other services:

```bash
skaffold dev --profile=local-with-services --port-forward
```

This deploys:
- PostgreSQL with PostGIS (via Helm chart)
- Database migrations
- R4C Cesium Viewer application
- PyGeoAPI service

### Environment Variables

The following environment variables can be configured:

**ConfigMap (`configmap.yaml`):**
- `VITE_PYGEOAPI_HOST` - PyGeoAPI host (defaults to `pygeoapi.dataportal.fi`)

**Secrets (`secrets.yaml`):**
- `VITE_DIGITRANSIT_KEY` - Digitransit API key
- `SENTRY_AUTH_TOKEN` - Sentry authentication token
- `SENTRY_DSN` - Sentry DSN for error tracking

To set these values for local development, you can either:

1. Edit `skaffold/secrets.yaml` directly (not recommended for sensitive values)
2. Create a Kubernetes secret before running Skaffold:
   ```bash
   kubectl create secret generic r4c-cesium-viewer-secrets \
     --from-literal=VITE_DIGITRANSIT_KEY="your-key" \
     --from-literal=SENTRY_AUTH_TOKEN="your-token" \
     --from-literal=SENTRY_DSN="your-dsn"
   ```

### Database Migration Credentials

For the `local-with-services` profile, database migration credentials are set in `migration-secret.yaml`. Default values:
- Database user password: `regions4climate_pass`
- Admin password: `postgres`

## Differences from Helm

The main differences from the Helm deployment:

1. **No templating** - All values are plain YAML, making it easier to understand and debug
2. **Fixed naming** - Resources use consistent names (e.g., `r4c-cesium-viewer`) instead of generated names
3. **Direct configuration** - Environment variables and settings are directly in the manifests
4. **Simpler deployment** - No Helm hooks or complex templating logic

## Production Deployment

Production deployments still use the Helm chart in the `helm/` directory, which provides:
- Flexible configuration through values files
- Helm hooks for migrations
- Integration with existing CI/CD pipelines
- Advanced features like HPA, resource limits, etc.

This separation allows:
- Simple, straightforward local development with plain manifests
- Robust, configurable production deployments with Helm
- Easier identification of issues caused by Helm templating vs. application code
