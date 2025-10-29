#!/bin/sh
# Generate k8s secrets from templates with environment variable substitution
# Sets defaults for any unset variables

# Set defaults for application secrets (only if not already set)
export VITE_DIGITRANSIT_KEY="${VITE_DIGITRANSIT_KEY:-}"
export SENTRY_AUTH_TOKEN="${SENTRY_AUTH_TOKEN:-}"
export SENTRY_DSN="${SENTRY_DSN:-}"

# Set defaults for database migration (local development)
export DB_PASSWORD="${DB_PASSWORD:-regions4climate_pass}"
export DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-postgres}"

# Generate secrets.yaml for application
envsubst < k8s/secrets.yaml.tmpl > k8s/secrets.yaml

# Generate migration-secret.yaml for database
envsubst < k8s/migration-secret.yaml.tmpl > k8s/migration-secret.yaml

echo "✓ Generated k8s/secrets.yaml"
echo "✓ Generated k8s/migration-secret.yaml"
