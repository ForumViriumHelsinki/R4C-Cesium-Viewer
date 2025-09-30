# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Build and Development
- `npm run dev` - Start development server (accessible at http://localhost:5173)
- `npm run build` - Build for production
- `npm run preview` - Preview production build (http://localhost:4173)
- `npm run lint` - Run ESLint to check code quality

### Testing
- `npx playwright test` - Run all tests
- `npx playwright test --ui` - Run tests in interactive UI mode
- `npx playwright test --headed` - Run tests in headed browsers

### Docker/Kubernetes
- `docker compose up` - Run with Docker (http://localhost:4173)
- `skaffold dev --port-forward` - Run with Skaffold for Kubernetes development
- `skaffold dev --profile=local-with-services --port-forward` - Full local development with database
- `skaffold test -p migration-test` - Test database migrations
- `skaffold delete` - Clean up Skaffold deployments

## Architecture Overview

This is a Vue 3 climate data visualization application using CesiumJS for 3D mapping and geospatial data display.

### Core Technologies
- **Vue 3** with Composition API
- **Vite** for build tooling and development server
- **CesiumJS** for 3D globe and mapping functionality
- **Pinia** for state management
- **Vuetify** for UI components
- **D3.js** for data visualization charts
- **Playwright** for end-to-end testing

### Application Structure

#### State Management (Pinia Stores)
- `globalStore.js` - Main application state, view modes, current selections
- `buildingStore.js` - Building-specific data and selection
- `toggleStore.js` - UI toggle states and layer visibility
- `socioEconomicsStore.js` - Socioeconomic data visualization state
- `heatExposureStore.js` - Heat exposure data and calculations
- `backgroundMapStore.js` - Background map layer management
- `propsStore.js` - Property and building attribute data
- `urlStore.js` - URL state management for deep linking

#### Main Pages
- `CesiumViewer.vue` - Core 3D map interface using CesiumJS
- `ControlPanel.vue` - Navigation drawer with filters and controls
- `Building.vue` - Building-specific detail view
- `Helsinki.vue` - Helsinki-specific data views
- `CapitalRegion.vue` - Capital region overview

#### Services Layer
- `datasource.js` - Data source management for Cesium
- `wms.js` - Web Map Service integration
- `featurepicker.js` - Entity selection and picking
- `camera.js` - Camera controls and positioning
- `urbanheat.js` - Urban heat island data processing
- `building.js` - Building data and 3D visualization
- `populationgrid.js` - Population grid data handling

### Key Features
- Multi-scale visualization (Capital Region → Postal Code → Building)
- Heat exposure analysis and visualization
- Building energy efficiency and tree coverage analysis
- Socioeconomic data overlays
- Time-series data with temporal controls
- 3D building visualization with detailed attributes

### Development Proxy Configuration
The application uses multiple proxy endpoints in development:
- `/pygeoapi` - Finland's geo data portal
- `/paavo` - Statistics Finland postal code data
- `/wms/proxy` - HSY (Helsinki Region Environmental Services) map services
- `/digitransit` - Public transport API
- `/terrain-proxy` - Helsinki 3D terrain data

### Data Sources
Primary data from Helsinki Region Environmental Services (HSY), Statistics Finland, and various environmental monitoring systems for climate resilience research.

## Database Performance Optimizations

The project includes comprehensive database optimizations implemented via dbmate migrations:

**Performance Features:**
- Spatial indexes (GIST) for all geometry columns
- Composite indexes for common query patterns
- Covering indexes for index-only scans
- Materialized view management with automated refresh functions
- Query-specific optimizations for building and tree data

**New Migrations Added:**
- `20250626114521_optimize_tree_f_performance.sql` - Tree data query optimization
- `20250807114107_optimize_building_table_performance.sql` - Building table indexes
- `20250807123455_add_spatial_indexes.sql` - Spatial query optimization
- `20250807124619_setup_materialized_view_management.sql` - MV refresh automation
- `20250808064619_optimize_materialized_view_indexes.sql` - MV query optimization

## Available MCP Tools

### Context7 Documentation Integration
Claude has access to Context7 MCP for fetching up-to-date library documentation:
- **Vue 3 Documentation** (`/vuejs/docs`) - Official Vue 3 docs with 1500+ code examples
- **Vue Cesium** (`/zouyaoji/vue-cesium`) - Vue 3 components for CesiumJS with 800+ examples
- **Vuetify** (`/vuetifyjs/vuetify`) - Vue component framework with 475+ examples
- **Pinia** - State management documentation
- **D3.js** - Data visualization library docs

Use Context7 to access current best practices, API references, and code examples directly from official sources when implementing features or solving issues.

### Language Server Protocol (LSP)
Enhanced code analysis capabilities:
- Real-time diagnostics and error detection
- Code completion and IntelliSense
- Hover information for functions and variables
- Code actions and refactoring suggestions
