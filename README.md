# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

## Environment Variables

Copy `.env.example` to `.env` and configure your environment variables:

```bash
cp .env.example .env
```

### PygeoAPI Configuration

The PygeoAPI host can be configured via environment variable:

- `VITE_PYGEOAPI_HOST`: The PygeoAPI host (default: `pygeoapi.dataportal.fi`)
  - For production hosts (without port), HTTPS protocol is used automatically
  - For localhost with port (e.g., `localhost:5000`), HTTP protocol is used automatically

For development, you can point to a local PygeoAPI instance:

```bash
VITE_PYGEOAPI_HOST=localhost:5000
```

## Quick Start

Choose your development mode:

### Fastest: Mock API (No Database Required)

Perfect for frontend development. No Kubernetes or PostgreSQL needed.

```bash
npm install
make dev-mock
```

**Available at:** http://localhost:5173 (frontend) | http://localhost:5050 (mock API)

### Full Stack: With Database

For testing with real database queries or production data.

```bash
# First time setup
cp .env.example .env
make setup

# Start development (services persist, frontend iterates)
make dev

# Seed with test data (recommended)
make db-seed
```

**Available at:** http://localhost:5173 (frontend) | http://localhost:5000 (pygeoapi)

## Development Modes

| Command         | Description                   | Frontend       | Backend               |
| --------------- | ----------------------------- | -------------- | --------------------- |
| `make dev-mock` | Mock API (no database)        | localhost:5173 | Mock server on :5050  |
| `make dev`      | Local frontend + K8s services | localhost:5173 | Persist on Ctrl+C     |
| `make dev-full` | All in containers             | localhost:4173 | Persist on Ctrl+C     |
| `make stop`     | Stop everything               | -              | Data preserved in PVC |

### make dev-mock (Fastest)

Uses a lightweight Bun server with synthetic GeoJSON data. No containers, no database:

```bash
make dev-mock
# Ctrl+C stops both mock server and frontend
```

The mock API:

- Serves all 11 PyGeoAPI collections
- Supports query parameters (`postinumero`, `bbox`, `limit`, etc.)
- Auto-detected by Vite (no configuration needed)

See [mock-api/README.md](./mock-api/README.md) for details.

### make dev (Recommended for Full Stack)

Backend services run in Kubernetes, frontend runs locally with Vite for fast hot-reload:

```bash
make dev
# Ctrl+C stops frontend only, services keep running
# Run again to restart just the frontend
```

### make dev-full

Everything runs in containers (closer to production):

```bash
make dev-full
# Ctrl+C stops frontend container, services keep running
```

### Other Options

```bash
# Stop all services
make stop

# Stop only frontend (keep services)
make stop-frontend

# Stop mock API
make mock-stop

# View all commands
make help
```

## Legacy Commands

These still work but `make` commands are preferred:

```bash
# Direct Vite (uses production pygeoapi)
npm run dev

# Docker Compose
docker compose up

# Direct Skaffold
skaffold dev --port-forward
```

For detailed setup including database migrations and mock data seeding, see [docs/GETTING_STARTED.md](./docs/GETTING_STARTED.md).

## Database Management

This project uses [dbmate](https://github.com/amacneil/dbmate) for database schema management with PostgreSQL + PostGIS.

### Quick Database Setup

```bash
# Initialize database with migrations and mock data
./scripts/init-local-db.sh
```

### Migration Commands

```bash
# Apply migrations
dbmate up

# Create new migration
dbmate new add_new_feature

# Check migration status
dbmate status
```

For complete database documentation, see [db/README.md](./db/README.md).

## Testing with Playwright

**Important:** E2E tests require `VITE_E2E_TEST=true` to expose the Cesium viewer to the test harness.

Start dev server with E2E mode, then run tests:

```bash
bun run dev:test  # Terminal 1: Start with E2E flag
npx playwright test  # Terminal 2: Run tests
```

Or use make (handles E2E flag automatically):

```bash
make test-e2e
```

Run tests in interactive UI mode:

```
npx playwright test --ui
```

Run tests in headed browsers (default: headless):

```
npx playwright test --headed
```

## Troubleshooting

```
skaffold delete
docker system --prune --all
```

## Project Documentation

- [Getting Started Guide](./docs/GETTING_STARTED.md) - Complete setup with all options
- [Mock API Documentation](./mock-api/README.md) - Lightweight development without database
- [Local Development Guide](./docs/LOCAL_DEVELOPMENT.md) - Complete setup with PostgreSQL + pygeoapi
- [Database Migrations](./db/README.md) - Schema management with dbmate
- [Database Seeding](./docs/DATABASE_SEEDING.md) - Mock data for testing
- [pygeoapi Integration](./db/PYGEOAPI_ALIGNMENT.md) - API endpoint documentation

## Sentry

- [Source Maps with Vite](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
- [Vue.js Integration](https://docs.sentry.io/platforms/javascript/guides/vue/)
- [Pinia Store Monitoring](https://docs.sentry.io/platforms/javascript/guides/vue/features/pinia/)
