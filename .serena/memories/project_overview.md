# R4C-Cesium-Viewer Project Overview

## Purpose

Vue 3 climate data visualization application using CesiumJS for 3D mapping and geospatial data display. Part of the Regions4Climate project for Helsinki Region Environmental Services (HSY).

## Tech Stack

### Frontend

- **Vue 3** with Composition API
- **Vite 7** for build tooling (ES modules)
- **CesiumJS** for 3D globe and mapping
- **Pinia** for state management
- **Vuetify 3** for UI components
- **D3.js** for data visualization charts
- **TypeScript** (partial adoption)

### Backend/Services

- **PostgreSQL** with PostGIS for spatial data
- **PyGeoAPI** for geo data API
- **dbmate** for database migrations

### Testing

- **Playwright** for E2E and accessibility testing
- **Vitest** for unit/integration tests
- **@vue/test-utils** for component testing

### Development

- **Skaffold** for local Kubernetes development
- **Docker/OrbStack** for containerization
- **Biome** for linting and formatting

## Project Structure

```
src/
├── components/     # Vue components
├── composables/    # Vue composition functions
├── constants/      # Application constants
├── pages/          # Page-level components
├── services/       # Business logic and API services
├── stores/         # Pinia state stores
├── utils/          # Utility functions
└── views/          # View components

tests/
├── e2e/           # Playwright E2E tests
│   └── accessibility/  # Accessibility-focused tests
├── unit/          # Vitest unit tests
├── integration/   # Vitest integration tests
├── performance/   # Performance tests
├── fixtures/      # Test fixtures
├── helpers/       # Test utilities
└── mocks/         # Mock data

k8s/               # Kubernetes manifests for local dev
db/migrations/     # dbmate database migrations
deploy/            # Production deployment values
```

## Key Features

- Multi-scale visualization (Capital Region → Postal Code → Building)
- Heat exposure analysis and visualization
- Building energy efficiency and tree coverage analysis
- Socioeconomic data overlays
- Time-series data with temporal controls
- 3D building visualization with detailed attributes

## Data Sources

- Helsinki Region Environmental Services (HSY)
- Statistics Finland postal code data (Paavo)
- Various environmental monitoring systems
