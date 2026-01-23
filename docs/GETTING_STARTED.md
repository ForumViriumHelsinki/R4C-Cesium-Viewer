# Getting Started with R4C Cesium Viewer

Complete guide for setting up and running the R4C Cesium Viewer locally.

## Prerequisites

- **Node.js** 18+ and npm
- **Docker Desktop** with Kubernetes enabled (for full stack mode)
- **Skaffold** - [Installation guide](https://skaffold.dev/docs/install/) (for full stack mode)
- **Bun** - [Installation guide](https://bun.sh/docs/installation) (for mock API mode)
- **dbmate** - [Installation guide](https://github.com/amacneil/dbmate#installation) (optional, for migrations)
- **PostgreSQL client tools** (for `psql` and `pg_isready`) (optional, for full stack mode)

## Quick Start

Choose your development mode based on what you need:

### Option 1: Mock API Mode (Fastest - No Database Required)

Perfect for frontend development. Uses synthetic data, no Kubernetes or PostgreSQL needed.

```bash
# 1. Clone and setup
git clone <repository-url>
cd R4C-Cesium-Viewer
npm install

# 2. Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# 3. Start development with mock API
make dev-mock
```

**Access at:** http://localhost:5173 (frontend) | http://localhost:5050 (mock API)

### Option 2: Full Stack Mode (Production-like)

Uses real PostgreSQL database and pygeoapi. Required for testing database queries or production data.

```bash
# 1. Clone and setup
git clone <repository-url>
cd R4C-Cesium-Viewer
cp .env.example .env
make setup

# 2. Start development
make dev

# 3. Seed database with test data (recommended)
make db-seed
```

**Access at:** http://localhost:5173 (frontend) | http://localhost:5000 (pygeoapi)

---

## Mock API Development Mode

The mock API server provides a lightweight alternative to the full Kubernetes stack. It serves synthetic GeoJSON data that mimics the real PyGeoAPI endpoints.

### When to Use Mock API

| Use Case                    | Mock API      | Full Stack            |
| --------------------------- | ------------- | --------------------- |
| Frontend UI development     | Recommended   | Overkill              |
| Component styling           | Recommended   | Overkill              |
| Testing data visualization  | Good          | Better for edge cases |
| Database query testing      | Not supported | Required              |
| Production bug reproduction | Not supported | Required              |

### Starting Mock API Mode

```bash
make dev-mock
```

This command:

1. Generates GeoJSON fixtures (if not already present)
2. Starts the Bun mock server on port 5050
3. Starts Vite dev server with auto-proxy to mock API
4. Stops mock server when you exit (Ctrl+C)

### How It Works

The mock server (`mock-api/server.ts`) is a lightweight Bun HTTP server that:

- Serves all 11 PyGeoAPI collections
- Supports query parameters (`postinumero`, `bbox`, `limit`, `koodi`, etc.)
- Returns GeoJSON FeatureCollections matching the real API format
- Auto-detected by Vite (no configuration needed)

**Auto-Detection:** When you run `npm run dev`, Vite automatically checks if the mock server is running on port 5050. If detected, it proxies `/pygeoapi` requests there instead of production.

### Customizing Mock Data

Control data density for different testing scenarios:

```bash
# Default: 50 buildings per postal code
make mock-generate

# More data for load testing
MOCK_DENSITY=100 make mock-generate

# Less data for faster startup
MOCK_DENSITY=20 make mock-generate

# Force regeneration
rm -rf mock-api/fixtures && make mock-generate
```

### Supported Collections

| Collection                 | Query Parameters                |
| -------------------------- | ------------------------------- |
| `hsy_buildings_optimized`  | `postinumero`, `bbox`, `limit`  |
| `heatexposure_optimized`   | `postinumero`, `limit`          |
| `urban_heat_building`      | `postinumero`, `limit`          |
| `tree`                     | `postinumero`, `koodi`, `limit` |
| `coldarea`                 | `posno`, `limit`                |
| `adaptation_landcover`     | `grid_id`, `bbox`, `limit`      |
| `tree_building_distance`   | `postinumero`, `limit`          |
| `othernature`              | `postinumero`, `limit`          |
| `hki_travel_time`          | `from_id`, `limit`              |
| `populationgrid`           | `limit`                         |
| `capitalregion_postalcode` | `limit`                         |

### Mock API Limitations

The mock server provides synthetic data sufficient for UI development, but with these differences from production:

1. **Data is synthetic** - Realistic structure but generated values
2. **Simplified geometry** - Buildings are rectangles, not actual footprints
3. **No WFS/external data** - All data served from local fixtures
4. **Faster responses** - No database queries, instant responses

See [mock-api/README.md](../mock-api/README.md) for complete mock server documentation.

---

## Database: Seeding vs Production Import

> **TL;DR:** Use `make db-seed` for local development. It takes 30-60 seconds vs 15-30 minutes for production import.

| Approach                  | Time          | Size     | Use Case                                   |
| ------------------------- | ------------- | -------- | ------------------------------------------ |
| **Mock API (fastest)**    | Instant       | ~10 MB   | Frontend development                       |
| **Seeding (recommended)** | 30-60 seconds | 10-50 MB | Local development, testing, CI             |
| Production import         | 15-30 minutes | ~18 GB   | Reproducing production bugs, data analysis |

### Quick Database Setup (Recommended)

```bash
# Start services
make dev

# In another terminal: seed with realistic mock data
make db-seed
```

The seeding script generates realistic Helsinki-area data for all major tables:

- Buildings, trees, and heat exposure data
- Postal code demographics (PAAVO data)
- Land cover and cold spot areas
- Urban heat data by postal code (`hki_urbanheat`)
- Automatically refreshes materialized views (`r4c_hsy_building_mat`, `r4c_postalcode_mat`) for API performance

**Options:**

```bash
make db-seed                    # Default: 100 records per table
make db-seed SEED_RECORDS=50    # Fewer records (faster)
make db-seed SEED_RECORDS=500   # More data for load testing
make db-seed-clean              # Clear existing data first, then seed
```

See [database/SEEDING.md](./database/SEEDING.md) for full documentation.

### Production Data Import (When Needed)

Only import production data when you specifically need it:

- Reproducing a production bug
- Testing with real-world data distributions
- Data analysis or reporting

```bash
# See export instructions
make help-db-export

# Import from tmp/ directory
make db-import
```

**Warning:** The production dump is ~18GB and takes 15-30 minutes to import.

See [database/IMPORT.md](./database/IMPORT.md) for complete instructions.

---

## Development Modes

### Option 1: Mock API (No Database Required)

Fastest option for frontend-only development:

```bash
make dev-mock
# Ctrl+C stops both mock server and frontend
```

| Service         | URL                   |
| --------------- | --------------------- |
| Frontend (Vite) | http://localhost:5173 |
| Mock PyGeoAPI   | http://localhost:5050 |

### Option 2: Local Frontend + K8s Services (Recommended for Full Stack)

Backend in Kubernetes, frontend with Vite for fast hot-reload:

```bash
make dev
# Ctrl+C stops frontend only, services keep running
# Run 'make dev' again to restart just the frontend
```

| Service         | URL                   |
| --------------- | --------------------- |
| Frontend (Vite) | http://localhost:5173 |
| pygeoapi        | http://localhost:5000 |
| PostgreSQL      | localhost:5432        |

### Option 3: Full Stack in Containers

Everything in containers (closer to production):

```bash
make dev-full
# Ctrl+C stops frontend container, services keep running
```

| Service          | URL                   |
| ---------------- | --------------------- |
| Frontend (nginx) | http://localhost:4173 |
| pygeoapi         | http://localhost:5000 |
| PostgreSQL       | localhost:5432        |

### Stopping Services

```bash
make stop           # Stop everything (DB data preserved)
make stop-frontend  # Stop frontend only, keep services running
make mock-stop      # Stop mock API server only
```

## Skaffold Profiles (Advanced)

For direct Skaffold usage without `make`:

### services-only

Backend services only (use with local frontend):

```bash
skaffold run -p services-only --port-forward
npm run dev  # In another terminal
```

### frontend-only

Frontend only (assumes services are running):

```bash
skaffold dev -p frontend-only --port-forward
```

### Default Profile

Full stack (all services + frontend):

```bash
skaffold dev --port-forward
```

**Note:** Direct Skaffold commands clean up on exit. Use `make dev` or `make dev-full` for persistent services.

## Database Operations

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

### Makefile Database Commands

```bash
make db-status      # Show connection info and table count
make db-migrate     # Run pending migrations
make db-seed        # Seed with test data (recommended)
make db-seed-clean  # Clear and re-seed
make db-import      # Import production dump from tmp/
make db-shell       # Open psql shell
make db-reset       # WARNING: Delete all data
```

## Service Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   R4C Webapp    │    │    pygeoapi     │    │   PostgreSQL    │
│  (Your Code)    │───▶│   (OGC API)     │───▶│   + PostGIS     │
│  Port: 80/5173  │    │   Port: 80/5000 │    │   Port: 5432    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

**Mock API Mode (Simplified):**

```
┌─────────────────┐    ┌─────────────────┐
│   R4C Webapp    │    │  Mock PyGeoAPI  │
│  (Your Code)    │───▶│   (Bun Server)  │
│  Port: 5173     │    │   Port: 5050    │
└─────────────────┘    └─────────────────┘
```

### Database Schema

- **regions4climate** - Main database with R4C data
- **med_iren** - Secondary database for NDVI and environmental data

### pygeoapi Collections

All collections from `configmap.yaml` are available locally:

- `adaptation_landcover`, `hsy_buildings`, `coldarea`, `tree`, `vegetation`, etc.

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

### Mock API Issues

```bash
# Check if mock server is running
curl http://localhost:5050/health

# Regenerate fixtures
rm -rf mock-api/fixtures
make mock-generate

# Manual start (for debugging)
cd mock-api && bun run dev
```

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
# Port 5050 in use (mock API)
PORT=5051 bun run mock-api/server.ts

# Port 5000 conflicts with AirPlay (macOS)
# The mock API uses 5050 specifically to avoid this

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
# Stop all services (DB data preserved)
make stop

# Stop frontend only, keep services running
make stop-frontend

# Stop mock API only
make mock-stop

# Complete reset (including data)
make stop
kubectl delete pvc --all -n regions4climate

# Or use direct Skaffold commands
skaffold delete -p services-only
skaffold delete -p frontend-only
skaffold delete
```

## Performance Tips

1. **Resource limits** are configured in `k8s/deployment.yaml`
2. **Pre-pull images**: `docker pull postgis/postgis:15-3.3`
3. **Allocate sufficient memory** to Docker Desktop (8GB+ recommended)
4. **Use SSD storage** for better PostgreSQL performance
5. **Use mock API** for fastest frontend iteration (no container overhead)

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
├── mock-api/               # Mock PyGeoAPI server (Bun)
│   ├── server.ts           # HTTP server
│   ├── generate.ts         # Fixture generator
│   └── fixtures/           # Generated GeoJSON data
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

- [mock-api/README.md](../mock-api/README.md) - Mock PyGeoAPI server documentation
- [core/TESTING.md](./core/TESTING.md) - Testing strategies and commands
- [core/PERFORMANCE_MONITORING.md](./core/PERFORMANCE_MONITORING.md) - Performance regression monitoring
- [database/SEEDING.md](./database/SEEDING.md) - Database seeding with mock data (recommended)
- [database/IMPORT.md](./database/IMPORT.md) - Importing production data (when needed)
- [architecture/ARCHITECTURE_DIAGRAM.md](./architecture/ARCHITECTURE_DIAGRAM.md) - System architecture
