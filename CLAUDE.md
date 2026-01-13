# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Makefile (Recommended)

Use `make` for the unified development experience:

```bash
make help        # Show all commands with current status
make dev-mock    # Mock API (fastest - no database/K8s required)
make dev         # Backend in K8s + local frontend (fast iteration)
make dev-full    # Everything in containers (closer to production)
make stop        # Stop all services
```

**Database commands:**

- `make db-status` - Show connection info and table count
- `make db-migrate` - Run pending migrations
- `make db-seed` - Seed with test data (recommended for local dev)
- `make db-import` - Import production dump from tmp/ (when needed)
- `make db-shell` - Open psql shell
- `make db-reset` - Drop and recreate database (requires confirmation)

**Testing:**

- `make test` - All tests
- `make test-quick` - Unit tests only
- `make test-e2e` - End-to-end tests

Database data persists across `make stop` and even `skaffold delete`. Only `make db-reset` explicitly wipes the data.

### Build and Development (Bun)

- `bun run dev` - Start development server (accessible at http://localhost:5173)
- `bun run build` - Build for production
- `bun run preview` - Preview production build (http://localhost:4173)
- `bun run lint` - Run Biome to check code quality

### Testing

See `docs/TESTING.md` for comprehensive testing documentation.
See `docs/PERFORMANCE_MONITORING.md` for performance regression monitoring.

**Quick commands:**

- `bun run test:layer-controls` - Run single accessibility test file (fast iteration)
- `bun run test:accessibility` - Run all accessibility tests
- `npx playwright test --ui` - Run tests in interactive UI mode
- `bun run test:accessibility:report` - View HTML test report

**Performance monitoring:**

- `bun run test:performance:monitor` - Run tests with performance tracking
- `bun run test:performance:check` - Check for performance regressions
- `bun run test:performance:baseline` - Generate new performance baselines

**Development workflow:** Use focused testing for 5-8x faster iteration during test fixes. See `.claude/commands/test-focused.md` for details.

**Testing by category (using tags):**

Tests are categorized with tags for selective execution:

- `npx playwright test --grep @accessibility` - Run accessibility tests
- `npx playwright test --grep @performance` - Run performance tests
- `npx playwright test --grep @e2e` - Run end-to-end tests
- `npx playwright test --grep @smoke` - Run smoke tests
- `npx playwright test --grep @wms` - Run WMS integration tests
- `npx playwright test --grep @unit` - Run unit tests (Vitest)
- `npx playwright test --grep @integration` - Run integration tests (Vitest)

Tags can be combined: `npx playwright test --grep "@accessibility.*@smoke"`

See `.claude/skills/test-categorization.md` for best practices on test organization and tagging.

### Docker/Kubernetes

See `docs/GETTING_STARTED.md` for comprehensive local development documentation.
See `docs/DATABASE_IMPORT.md` for importing production database dumps.

**Recommended: Use Makefile commands (services persist on Ctrl+C):**

```bash
make dev       # Local frontend + K8s services (fast iteration)
make dev-full  # All in containers (closer to production)
make stop      # Stop all services
```

**Direct Skaffold (cleans up on exit):**

- `skaffold run -p services-only --port-forward` - Backend services only
- `skaffold dev -p frontend-only --port-forward` - Frontend only (assumes services running)
- `skaffold dev --port-forward` - Full stack
- `skaffold dev -p e2e-with-prod-data --port-forward` - E2E testing with cloned production data
- `skaffold test -p migration-test` - Test database migrations

**Other:**

- `docker compose up` - Run with Docker (http://localhost:4173)

**Note**: Local development uses plain Kubernetes manifests in `k8s/` directory for simplicity.

See `docs/DATABASE_CLONING.md` for production database cloning for E2E testing.

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

## Component Architecture for Testing

Understanding the component hierarchy is critical for writing effective tests.

### Timeline Components by Navigation Level

| Level       | Component         | Selector                   | Notes                                                 |
| ----------- | ----------------- | -------------------------- | ----------------------------------------------------- |
| Start       | None              | -                          | No timeline at start level                            |
| Postal Code | `TimelineCompact` | `.timeline-compact`        | Has `d-none d-lg-flex` CSS (hidden < 1280px viewport) |
| Building    | `Timeline`        | `#heatTimeseriesContainer` | Only renders when "Building Heat Data" button clicked |

**Key Insight:** Tests must check DOM presence (`state: 'attached'`) for `.timeline-compact`, not visibility, due to responsive CSS hiding on smaller viewports.

### Building Selection Flow (FeaturePicker)

The building click-to-selection flow follows this path:

```
User Click on Cesium Canvas
    ↓
CesiumViewer.vue click handler
    - Filters drags (>5px movement threshold)
    - Debounces rapid clicks (500ms minimum interval)
    - Ignores clicks on control panel/timeline elements
    ↓
FeaturePicker.processClick(event)
    - Converts event coordinates to Cesium.Cartesian2
    ↓
FeaturePicker.pickEntity(windowPosition)
    - GUARD: Checks canvas dimensions (width/height > 0)
    - Uses viewer.scene.pick() to find entity
    - FILTER: Only processes entities with `_polygon` property
    ↓
FeaturePicker.handleFeatureWithProperties(entity)
    - At postal code level → handleBuildingFeature()
    ↓
Updates Pinia store (level='building')
EventBus emits 'showBuilding'
```

**Critical Guards in FeaturePicker:**

1. Canvas must have valid dimensions (silently ignores clicks otherwise)
2. Only polygon entities (with `_polygon` property) are selectable
3. Entity must be a `Cesium.Entity` instance with properties

### Testing Cesium Interactions

**Common Pitfalls:**

1. **Canvas Dimension Guard**: Clicks are silently ignored if canvas dimensions are 0 (transient rendering states)
2. **Building Entity Loading**: Buildings may not be loaded when tests attempt to click
3. **Hardcoded Coordinates**: Static pixel positions don't guarantee hitting buildings
4. **Viewport CSS**: Elements with `d-none d-lg-flex` are hidden on small viewports

**Best Practices for Building Selection Tests:**

```typescript
// 1. Wait for canvas to have valid dimensions
await page.waitForFunction(() => {
	const canvas = document.querySelector('#cesiumContainer canvas');
	return canvas && canvas.clientWidth > 0 && canvas.clientHeight > 0;
});

// 2. Wait for buildings to load in datasource
await page.waitForFunction(() => {
	const viewer = window.__viewer;
	if (!viewer?.dataSources) return false;
	const dataSources = viewer.dataSources._dataSources;
	return dataSources.some(
		(ds) => ds.name?.startsWith('Buildings ') && ds.entities?.values.length > 0
	);
});

// 3. Use DOM attachment checks for responsive-hidden elements
await expect(page.locator('.timeline-compact')).toBeAttached();
// NOT: toBeVisible() - fails on viewports < 1280px
```

### UI Element Text Selectors (Case-Sensitive)

Building level UI buttons use exact casing:

- `"Building Heat Data"` (not "Building heat data")
- `"Building Properties"` (not "Building properties")

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

## Project-Specific Claude Resources

### Slash Commands (`.claude/commands/`)

Repeatable workflows available as slash commands:

- `/test-focused [filename]` - Run single test file with fail-fast mode for rapid iteration
- `/test-debug [filename]` - Launch Playwright UI mode for visual debugging
- `/stack-review` - Comprehensive stack configuration review against latest best practices

### Skills (`.claude/skills/`)

Specialized knowledge repositories for common patterns:

- `test-pattern-library.md` - Proven patterns for fixing Playwright test failures
- `playwright-accessibility-testing.md` - Accessibility testing best practices
- `cesium-performance-testing.md` - CesiumJS performance optimization patterns
- `test-categorization.md` - Test organization and tag-based categorization
- `bun-lock-management.md` - Keeping bun.lock in sync with package.json

These skills are automatically available to Claude Code for reference when working on related tasks.
