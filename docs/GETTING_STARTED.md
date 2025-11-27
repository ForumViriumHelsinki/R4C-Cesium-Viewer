# Getting Started with R4C Cesium Viewer

Complete guide for setting up and running the R4C Cesium Viewer locally.

## Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** with Kubernetes enabled
- **Skaffold** - [Installation guide](https://skaffold.dev/docs/install/)
- **dbmate** - [Installation guide](https://github.com/amacneil/dbmate#installation)
- **PostgreSQL client tools** (for `psql` and `pg_isready`)

## Quick Start Options

### Option 1: Full Stack Development (Recommended)

Deploy everything in containers with hot reload:

```bash
# 1. Clone and setup
git clone <repository-url>
cd R4C-Cesium-Viewer
cp .env.example .env

# 2. Deploy full stack
skaffold dev --port-forward

# 3. Initialize database (in another terminal)
./scripts/init-local-db.sh
```

Access at: **http://localhost:4173**

### Option 2: Services Only + Local Frontend (Faster Iteration)

Backend in containers, frontend with Vite dev server:

```bash
# 1. Deploy backend services
skaffold run -p services-only --port-forward

# 2. Initialize database
./scripts/init-local-db.sh

# 3. Run frontend locally (in another terminal)
npm run dev
```

Access at: **http://localhost:5173**

This approach provides faster frontend iteration with Vite's hot module replacement.

## Development Profiles

### Full Stack (Default)

```bash
skaffold dev --port-forward
```

**Deploys:**

- PostgreSQL with PostGIS
- pygeoapi OGC API server
- Database migrations
- Frontend application

**Features:**

- Watches for file changes and rebuilds automatically
- Port-forwards frontend to localhost:4173
- Cleans up all resources on exit (Ctrl+C)

### Services Only

```bash
skaffold run -p services-only --port-forward
```

**Deploys:**

- PostgreSQL with PostGIS
- pygeoapi OGC API server
- Database migrations

**Port Forwards:**

- PostgreSQL: localhost:5432
- pygeoapi: localhost:5000

Run frontend separately: `npm run dev`

## Database Setup

### Environment Variables

```bash
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate"
```

### Database Initialization

The `init-local-db.sh` script handles:

1. Waiting for PostgreSQL to be ready
2. Running database migrations
3. Optionally seeding with test data

```bash
./scripts/init-local-db.sh
# Answer 'y' when prompted to seed data
```

### Manual Database Operations

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

### Test Data Seeding

After migrations, populate with realistic mock data:

```bash
# Install Python dependencies
pip install -r scripts/requirements-seeding.txt

# Seed with test data (100 records)
python3 scripts/seed-dev-data.py --clear-first --num-records 100
```

This creates realistic Helsinki-area data for all major tables including buildings, trees, heat exposure, demographics, and more.

See [database/SEEDING.md](./database/SEEDING.md) for detailed options.

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   R4C Webapp    │    │    pygeoapi     │    │   PostgreSQL    │
│  (Your Code)    │───▶│   (OGC API)     │───▶│   + PostGIS     │
│  Port: 80/5173  │    │   Port: 80/5000 │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Database Schema

- **regions4climate** - Main database with R4C data
- **med_iren** - Secondary database for NDVI and environmental data

### pygeoapi Collections

All collections from `configmap.yaml` are available locally:

- `adaptation_landcover`, `hsy_buildings`, `coldarea`, `tree`, `vegetation`, etc.

## Importing Production Data (Optional)

For testing with real production data:

```bash
# Download dump from GCS
gsutil cp gs://regions4climate/database-export tmp/database-export.sql

# Import into local database
kubectl exec -i -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate < tmp/database-export.sql
```

See [database/IMPORT.md](./database/IMPORT.md) for complete instructions.

## Available Commands

### Development

```bash
npm run dev          # Start development server (http://localhost:5173)
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Testing

```bash
# Accessibility tests
npm run test:accessibility
npm run test:layer-controls      # Single file (fast iteration)

# Performance tests
npm run test:performance:monitor
npm run test:performance:check

# Interactive mode
npx playwright test --ui

# Test report
npm run test:accessibility:report
```

See [core/TESTING.md](./core/TESTING.md) for comprehensive testing documentation.

### Docker/Kubernetes

```bash
# Check service status
kubectl get pods -n regions4climate
kubectl get svc -n regions4climate

# View logs
kubectl logs -f -n regions4climate deployment/pygeoapi
kubectl logs -f -n regions4climate postgresql-0

# Restart services
kubectl rollout restart deployment/pygeoapi -n regions4climate

# Database access
kubectl exec -it -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate
```

## Troubleshooting

### PostgreSQL Won't Start

```bash
# Check pod status
kubectl get pods -n regions4climate

# Check logs
kubectl logs -n regions4climate postgresql-0

# Common fix: Delete PVC and redeploy
kubectl delete pvc data-postgresql-0
skaffold delete
skaffold dev --port-forward
```

### pygeoapi Can't Connect

```bash
# Verify database is ready
kubectl port-forward svc/postgresql 5432:5432 &
psql postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate -c "SELECT 1;"

# Check pygeoapi logs
kubectl logs -f -n regions4climate deployment/pygeoapi

# Restart pygeoapi
kubectl rollout restart deployment/pygeoapi -n regions4climate
```

### Migration Failures

```bash
# Test database connection
./scripts/init-local-db.sh

# Verbose migration output
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:5432/regions4climate"
dbmate up -v
```

### Port Conflicts

```bash
# Use different port for PostgreSQL
kubectl port-forward svc/postgresql 15432:5432
export DATABASE_URL="postgres://regions4climate_user:regions4climate_pass@localhost:15432/regions4climate"
```

### Frontend Connection Issues

Verify ConfigMap uses correct service names:

```bash
kubectl get configmap r4c-cesium-viewer-config -n regions4climate -o yaml
```

Should show: `VITE_PYGEOAPI_HOST: "pygeoapi"` (for containerized frontend)

For local frontend (`npm run dev`), use `localhost:5000` or proxy configuration.

## Clean Up

```bash
# Stop full stack (Ctrl+C in skaffold dev terminal)

# Delete services-only deployment
skaffold delete -p services-only

# Delete default deployment
skaffold delete

# Complete reset (including data)
skaffold delete
kubectl delete pvc --all -n regions4climate
```

## Performance Tips

1. **Resource limits** are configured in `k8s/deployment.yaml`
2. **Pre-pull images**: `docker pull postgis/postgis:15-3.3`
3. **Allocate sufficient memory** to Docker Desktop (8GB+ recommended)
4. **Use SSD storage** for better PostgreSQL performance

## Project Structure

```
R4C-Cesium-Viewer/
├── src/                    # Vue 3 application source
│   ├── components/         # Vue components
│   ├── pages/              # Page-level components
│   ├── stores/             # Pinia state stores
│   └── services/           # Business logic services
├── tests/                  # Playwright end-to-end tests
├── db/                     # Database migrations (dbmate)
├── k8s/                    # Kubernetes manifests
├── scripts/                # Utility scripts
└── docs/                   # Documentation
```

## Next Steps

1. **Explore the codebase** - See [architecture/ARCHITECTURE_DIAGRAM.md](./architecture/ARCHITECTURE_DIAGRAM.md)
2. **Run tests** - See [core/TESTING.md](./core/TESTING.md)
3. **Understand state management** - Check Pinia stores in `src/stores/`
4. **Review database schema** - See `db/schema.sql` and [database/](./database/)

## Getting Help

- Check [docs/](./docs/) for comprehensive documentation
- Review [core/TEST_INFRASTRUCTURE_LEARNINGS.md](./core/TEST_INFRASTRUCTURE_LEARNINGS.md) for testing best practices
- See [database/QUERY_OPTIMIZATION.md](./database/QUERY_OPTIMIZATION.md) for performance tips

## Related Documentation

- [core/TESTING.md](./core/TESTING.md) - Testing strategies and commands
- [core/PERFORMANCE_MONITORING.md](./core/PERFORMANCE_MONITORING.md) - Performance regression monitoring
- [database/IMPORT.md](./database/IMPORT.md) - Importing production data
- [database/SEEDING.md](./database/SEEDING.md) - Database seeding with mock data
- [architecture/ARCHITECTURE_DIAGRAM.md](./architecture/ARCHITECTURE_DIAGRAM.md) - System architecture
