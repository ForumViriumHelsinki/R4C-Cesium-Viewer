# R4C Cesium Viewer Documentation

Comprehensive documentation for the R4C Cesium Viewer project - a Vue 3 climate data visualization application using CesiumJS for 3D mapping and geospatial data display.

## Getting Started

**New to the project?** Start here:

- [GETTING_STARTED.md](./GETTING_STARTED.md) - Complete setup guide for local development

Quick commands:

```bash
# Full stack development
skaffold dev --port-forward

# Services + local frontend (faster iteration)
skaffold run -p services-only --port-forward
npm run dev
```

## Core Documentation

Essential development documentation:

- [core/TESTING.md](./core/TESTING.md) - Testing strategies, test categories, and how to run tests
- [core/PERFORMANCE_MONITORING.md](./core/PERFORMANCE_MONITORING.md) - Performance regression monitoring
- [core/FEATURE_FLAGS.md](./core/FEATURE_FLAGS.md) - Feature flag system
- [core/TEST_INFRASTRUCTURE_LEARNINGS.md](./core/TEST_INFRASTRUCTURE_LEARNINGS.md) - Testing best practices

Quick test commands:

```bash
npm run test:accessibility              # Run all accessibility tests
npm run test:layer-controls             # Single file (fast iteration)
npx playwright test --ui                # Interactive mode
npm run test:performance:check          # Check for performance regressions
```

## Database

Database setup, seeding, and optimization:

- [database/IMPORT.md](./database/IMPORT.md) - Importing production database dumps
- [database/SEEDING.md](./database/SEEDING.md) - Database seeding with mock data
- [database/QUERY_OPTIMIZATION.md](./database/QUERY_OPTIMIZATION.md) - Query optimization and troubleshooting

Quick database commands:

```bash
./scripts/init-local-db.sh              # Initialize database with migrations
python3 scripts/seed-dev-data.py        # Seed with test data
dbmate up                               # Apply migrations
psql "$DATABASE_URL"                    # Connect to database
```

## Architecture

System design and component structure:

- [architecture/ARCHITECTURE_DIAGRAM.md](./architecture/ARCHITECTURE_DIAGRAM.md) - System architecture diagrams and overview

The application follows a layered architecture:

- **UI Layer** - Vue 3 components with Composition API
- **State Management** - Pinia stores for application state
- **Service Layer** - Business logic and CesiumJS interactions
- **Data Layer** - pygeoapi (OGC API) and PostgreSQL + PostGIS

## Active Projects

Current development initiatives:

### [projects/map-click-ux/](./projects/map-click-ux/)

Map Click UX Improvement - Enhanced user experience for map interactions

**Status:** Phase 2 Complete ✓

Key documents:

- [PRD.md](./projects/map-click-ux/PRD.md) - Product requirements
- [TEST_COVERAGE.md](./projects/map-click-ux/TEST_COVERAGE.md) - Comprehensive test documentation

### [projects/building-visualization/](./projects/building-visualization/)

Building Visualization - 3D building rendering and data display

**Status:** Planning Phase

- [PRD.md](./projects/building-visualization/PRD.md) - Product requirements

## Features

Documentation for individual application features:

- [features/cold-areas/](./features/cold-areas/) - Cold area visualization and analysis
- [features/hsy-trees/](./features/hsy-trees/) - HSY tree data integration
- [features/landcover-to-parks/](./features/landcover-to-parks/) - Land cover to parks conversion
- [features/socioeconomics/](./features/socioeconomics/) - Socioeconomic data visualization

## Investigations

Debugging investigations and technical deep-dives:

- [investigations/tree-rendering/](./investigations/tree-rendering/) - Tree rendering issues, DataClone errors, toggle problems

## Archive

Historical documentation and completed investigations:

- [archive/VIEWPORT_LOADING_FIX.md](./archive/VIEWPORT_LOADING_FIX.md) - Viewport loading fix (completed)
- [archive/KNIP_ANALYSIS.md](./archive/KNIP_ANALYSIS.md) - Unused code analysis (completed)
- [archive/sensors-satellite-comparison/](./archive/sensors-satellite-comparison/) - Sensor vs satellite data comparison

## CI/CD & Workflows

GitHub Actions and deployment:

- [workflows/](./workflows/) - GitHub Actions workflow examples and configurations

## Technology Stack

### Core Technologies

- **Vue 3** - Frontend framework with Composition API
- **Vite** - Build tooling and dev server
- **CesiumJS** - 3D globe and mapping
- **Pinia** - State management
- **Vuetify** - UI component framework
- **D3.js** - Data visualization
- **Playwright** - End-to-end testing

### Infrastructure

- **PostgreSQL + PostGIS** - Spatial database
- **pygeoapi** - OGC API server
- **Kubernetes** - Container orchestration
- **Skaffold** - Local development workflow
- **Docker** - Containerization

## Data Sources

Primary data from:

- **HSY** (Helsinki Region Environmental Services) - Buildings, trees, land cover
- **Statistics Finland** - Demographics and socioeconomic data
- **FMI** (Finnish Meteorological Institute) - Weather and climate data
- **Helsinki 3D** - Terrain and 3D city models

## Development Workflow

1. **Setup** - Follow [GETTING_STARTED.md](./GETTING_STARTED.md)
2. **Development** - Use `npm run dev` or `skaffold dev`
3. **Testing** - Write tests following [core/TESTING.md](./core/TESTING.md)
4. **Database** - Manage schema with dbmate migrations
5. **Performance** - Monitor with [core/PERFORMANCE_MONITORING.md](./core/PERFORMANCE_MONITORING.md)

## Key Features

- **Multi-scale visualization** - Capital Region → Postal Code → Building
- **Heat exposure analysis** - Urban heat island visualization
- **Building data** - Energy efficiency, tree coverage analysis
- **Socioeconomic overlays** - Demographics and economic data
- **Time-series data** - Temporal controls and historical data
- **3D visualization** - Building models with detailed attributes

## Project Structure

```
R4C-Cesium-Viewer/
├── src/
│   ├── components/         # Vue components
│   ├── pages/              # Page-level components (CesiumViewer, Building, etc.)
│   ├── stores/             # Pinia state stores
│   └── services/           # Business logic (datasource, wms, featurepicker, etc.)
├── tests/                  # Playwright end-to-end tests
│   └── accessibility/      # Accessibility test suites
├── db/
│   ├── migrations/         # Database migrations (dbmate)
│   └── schema.sql          # Current schema
├── k8s/                    # Kubernetes manifests
├── scripts/                # Utility scripts
│   ├── seed-dev-data.py    # Database seeding
│   └── init-local-db.sh    # Database initialization
└── docs/                   # This documentation
```

## Common Tasks

### Running Tests

```bash
# Run all accessibility tests
npm run test:accessibility

# Run single test file (fast iteration)
npm run test:layer-controls

# Interactive debugging
npx playwright test --ui

# Performance monitoring
npm run test:performance:monitor
npm run test:performance:check
```

### Database Management

```bash
# Initialize database
./scripts/init-local-db.sh

# Apply migrations
dbmate up

# Seed test data
python3 scripts/seed-dev-data.py --clear-first

# Connect to database
psql "$DATABASE_URL"
```

### Kubernetes Operations

```bash
# Check service status
kubectl get pods -n regions4climate

# View logs
kubectl logs -f -n regions4climate deployment/pygeoapi

# Restart service
kubectl rollout restart deployment/pygeoapi -n regions4climate

# Database access
kubectl exec -it -n regions4climate postgresql-0 -- \
  psql -U regions4climate_user -d regions4climate
```

## Contributing

When contributing to the project:

1. **Follow conventions** - See existing code patterns
2. **Write tests** - Especially for new features (see [core/TESTING.md](./core/TESTING.md))
3. **Document** - Update relevant docs in this directory
4. **Test performance** - Use performance monitoring tools
5. **Review database changes** - Ensure migrations are reversible

## Getting Help

- Browse this documentation directory
- Check [core/TEST_INFRASTRUCTURE_LEARNINGS.md](./core/TEST_INFRASTRUCTURE_LEARNINGS.md) for testing tips
- See [database/QUERY_OPTIMIZATION.md](./database/QUERY_OPTIMIZATION.md) for database performance
- Review [investigations/](./investigations/) for debugging strategies

## External Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [CesiumJS Documentation](https://cesium.com/learn/cesiumjs/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Playwright Documentation](https://playwright.dev/)
- [dbmate Documentation](https://github.com/amacneil/dbmate)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [pygeoapi Documentation](https://docs.pygeoapi.io/)
