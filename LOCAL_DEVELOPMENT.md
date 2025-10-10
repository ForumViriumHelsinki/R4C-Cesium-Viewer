# Local Development with Database Services

This guide explains how to run the complete R4C Cesium Viewer stack locally using Skaffold, including PostgreSQL with PostGIS and pygeoapi.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Kubernetes](https://kubernetes.io/docs/setup/) (Docker Desktop includes Kubernetes)
- [Skaffold](https://skaffold.dev/docs/install/)
- [Helm](https://helm.sh/docs/intro/install/)
- [dbmate](https://github.com/amacneil/dbmate#installation)
- [PostgreSQL client tools](https://www.postgresql.org/download/) (for `psql` and `pg_isready`)

## Quick Start

### 1. Setup Environment

```bash
# Copy environment template and configure
cp .env.example .env
# Edit .env with your credentials (or use defaults for local development)
```

### 2. Start with Database Services

```bash
# Deploy PostgreSQL, pygeoapi, and the webapp
skaffold dev --profile=local-with-services
```

This command will:

- ✅ Deploy PostgreSQL with PostGIS extensions
- ✅ Deploy pygeoapi configured to connect to PostgreSQL
- ✅ Build and deploy your R4C Cesium Viewer webapp
- ✅ Set up port forwarding and live reload

### 3. Initialize Database (in another terminal)

```bash
# Wait for PostgreSQL to be ready, then run migrations
./scripts/init-local-db.sh
```

### 4. Access Services

- **Webapp**: http://localhost (port forwarded by Skaffold)
- **pygeoapi**: http://localhost:8080 (port forward: `kubectl port-forward svc/pygeoapi 8080:80`)
- **PostgreSQL**: localhost:5432 (port forward: `kubectl port-forward svc/postgresql 5432:5432`)

## Development Profiles

### Default Profile (webapp only)

```bash
skaffold dev
```

Uses your existing helm chart configuration, connects to external services.

### Local Services Profile (full stack)

```bash
skaffold dev --profile=local-with-services
```

Deploys PostgreSQL + pygeoapi + webapp locally.

## Database Management

### Connection Details (Local)

```bash
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate"
```

### Common Database Operations

```bash
# Apply migrations
dbmate up

# Check migration status
dbmate status

# Create new migration
dbmate new add_new_feature

# Rollback last migration
dbmate rollback

# Connect to database directly
psql "$DATABASE_URL"
```

### Test Data Population

After migrations, you can populate the database with realistic mock data:

#### Automatic Seeding (Recommended)

The initialization script will offer to seed data automatically:

```bash
./scripts/init-local-db.sh
# Answer 'y' when prompted to seed data
```

#### Manual Seeding

```bash
# Install Python dependencies
pip install -r scripts/requirements-seeding.txt

# Seed with realistic test data
python3 scripts/seed-dev-data.py --clear-first --num-records 100
```

This creates realistic Helsinki-area data for all major tables including buildings, trees, heat exposure, demographics, and more.

For detailed seeding options and customization, see [DATABASE_SEEDING.md](docs/DATABASE_SEEDING.md).

## Service Architecture

The local development setup mirrors production:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   R4C Webapp    │    │    pygeoapi     │    │   PostgreSQL    │
│  (Your Code)    │───▶│   (OGC API)     │───▶│   + PostGIS     │
│  Port: 80       │    │   Port: 80      │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema

- **regions4climate**: Main database with R4C data
- **med_iren**: Secondary database (for NDVI and other data)

### pygeoapi Collections

All collections from `configmap.yaml` are available locally, including:

- `adaptation_landcover`
- `hsy_buildings`
- `coldarea`
- `tree`
- `vegetation`
- And more...

## Troubleshooting

### PostgreSQL Won't Start

```bash
# Check pod status
kubectl get pods

# Check logs
kubectl logs deployment/postgresql

# Common issue: PVC permissions
kubectl delete pvc data-postgresql-0
skaffold delete --profile=local-with-services
skaffold dev --profile=local-with-services
```

### pygeoapi Can't Connect to Database

```bash
# Check database is ready
kubectl port-forward svc/postgresql 5432:5432 &
psql postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate -c "SELECT 1;"

# Check pygeoapi logs
kubectl logs deployment/pygeoapi

# Restart pygeoapi
kubectl rollout restart deployment/pygeoapi
```

### Migration Failures

```bash
# Check database connection
./scripts/init-local-db.sh

# Manual migration debug
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate"
dbmate status
dbmate up -v  # verbose output
```

### Port Conflicts

```bash
# If ports are in use, use different ports
kubectl port-forward svc/postgresql 15432:5432  # Use port 15432 instead
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:15432/regions4climate"
```

## Advanced Usage

### Custom PostgreSQL Configuration

Edit `skaffold.yaml` to modify PostgreSQL settings:

```yaml
setValues:
  primary.extendedConfiguration: |
    shared_preload_libraries = 'postgis-3'
    max_connections = 200
    shared_buffers = 256MB
```

### Additional pygeoapi Configuration

The pygeoapi deployment uses your `configmap.yaml` file. To modify collections, edit that file and restart:

```bash
kubectl rollout restart deployment/pygeoapi
```

### Production-like Testing

To test with production-like resource constraints:

```bash
# Edit helm/values-local.yaml to reduce resources
resources:
  limits:
    cpu: 100m
    memory: 128Mi
```

## Integration with CI/CD

The migration testing from the GitHub Actions workflow can be run locally:

```bash
# Run the same tests as CI
./scripts/test_migration.sh
```

## Data Persistence

Local data persists in Kubernetes PVCs. To reset everything:

```bash
skaffold delete --profile=local-with-services
kubectl delete pvc --all
skaffold dev --profile=local-with-services
```

## Performance Tips

1. **Use resource limits** in `helm/values-local.yaml` to prevent resource contention
2. **Pre-pull images** with `docker pull postgis/postgis:15-3.3`
3. **Allocate sufficient memory** to Docker Desktop (8GB+ recommended)
4. **Use SSD storage** for better PostgreSQL performance

## Useful Scripts

The project includes several helpful scripts for development:

```bash
# Database initialization and migration
./scripts/init-local-db.sh

# Database seeding with mock data
./scripts/seed-dev-data.py

# Migration testing (same as CI)
./scripts/test_migration.sh

# Schema conversion utility
./scripts/convert_schema_to_migration.py
```

## Related Documentation

- [Database Seeding Guide](./docs/DATABASE_SEEDING.md) - Comprehensive mock data documentation
- [Database Migrations](./db/README.md) - Schema management with dbmate
- [pygeoapi Integration](./db/PYGEOAPI_ALIGNMENT.md) - API endpoint documentation
- [dbmate Documentation](https://github.com/amacneil/dbmate) - Official dbmate docs
- [PostGIS Documentation](https://postgis.net/documentation/) - Spatial database reference
- [pygeoapi Documentation](https://docs.pygeoapi.io/) - API framework documentation
