# R4C-Cesium-Viewer

R4C user interface Vue3 interface with Vite and Cesium

## Run with Vite

```
npm run dev
```
The application should now be running at [http://localhost:5173](http://localhost:5173).

## Run with Docker

```
docker compose up
```
The application should now be running at [http://localhost:4173](http://localhost:4173).

## Run with Skaffold

### Frontend Only
```bash
skaffold dev --port-forward
```

### Full Stack (with PostgreSQL + pygeoapi)
```bash
skaffold dev --profile=local-with-services
```

For detailed local development setup including database migrations and mock data seeding, see [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md).

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

Run tests:
```
npx playwright test
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

- [Local Development Guide](./LOCAL_DEVELOPMENT.md) - Complete setup with PostgreSQL + pygeoapi
- [Database Migrations](./db/README.md) - Schema management with dbmate
- [Database Seeding](./docs/DATABASE_SEEDING.md) - Mock data for testing
- [pygeoapi Integration](./db/PYGEOAPI_ALIGNMENT.md) - API endpoint documentation

## Sentry

- [Source Maps with Vite](https://docs.sentry.io/platforms/javascript/sourcemaps/uploading/vite/)
- [Vue.js Integration](https://docs.sentry.io/platforms/javascript/guides/vue/)
- [Pinia Store Monitoring](https://docs.sentry.io/platforms/javascript/guides/vue/features/pinia/)
