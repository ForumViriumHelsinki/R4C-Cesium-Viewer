# Architecture

## Technology Stack

- **Vue 3** with Composition API
- **Vite** for build tooling and development server
- **CesiumJS** for 3D globe and mapping functionality
- **Pinia** for state management
- **Vuetify 4** (MD1 blueprint) for UI components
- **D3.js** for data visualization charts
- **Playwright** for end-to-end testing

## State Management (Pinia Stores)

| Store                    | Purpose                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `globalStore.js`         | Main application state, view modes, selections, click processing with pending navigation |
| `buildingStore.js`       | Building-specific data and selection                                                     |
| `toggleStore.js`         | UI toggle states, layer visibility, postal code navigation lifecycle hooks               |
| `socioEconomicsStore.js` | Socioeconomic data visualization state                                                   |
| `heatExposureStore.js`   | Heat exposure data and calculations                                                      |
| `backgroundMapStore.js`  | Background map layer management                                                          |
| `propsStore.js`          | Property and building attribute data                                                     |
| `urlStore.js`            | URL state management for deep linking                                                    |

## Main Pages

| Component           | Purpose                                     |
| ------------------- | ------------------------------------------- |
| `CesiumViewer.vue`  | Core 3D map interface using CesiumJS        |
| `ControlPanel.vue`  | Navigation drawer with filters and controls |
| `Building.vue`      | Building-specific detail view               |
| `Helsinki.vue`      | Helsinki-specific data views                |
| `CapitalRegion.vue` | Capital region overview                     |

## Services Layer

| Service                      | Purpose                                                 |
| ---------------------------- | ------------------------------------------------------- |
| `datasource.js`              | Data source management for Cesium                       |
| `wms.js`                     | Web Map Service integration                             |
| `featurepicker.js`           | Entity selection, navigation orchestration              |
| `camera.js`                  | Camera controls and positioning                         |
| `urbanheat.js`               | Urban heat island data processing                       |
| `building/index.js`          | Building service facade                                 |
| `building/buildingLoader.js` | Building data loading with request lifecycle management |
| `populationgrid.js`          | Population grid data handling                           |
| `postalCodeLoader.js`        | Postal code data loading with parallel strategy         |

## Key Features

- Multi-scale visualization (Capital Region → Postal Code → Building)
- Heat exposure analysis and visualization
- Building energy efficiency and tree coverage analysis
- Socioeconomic data overlays
- Time-series data with temporal controls
- 3D building visualization with detailed attributes

## Theme Configuration

Vuetify theme is configured in `src/main.js` via `createVuetify()`:

- **Dark/light detection**: `prefers-color-scheme` media query
- **Dark theme overrides**: Custom `surface` and `background` colors for glassmorphic overlays
- **Component defaults**: `VTextField`, `VSelect` (compact/outlined), `VSlider` (primary), `VTooltip` (bottom)
- **SCSS overrides**: `src/styles/settings.scss` (wired via `vite.config.js`)

All UI colors use `--v-theme-*` CSS variables — see `code-quality.md` CSS Theming section.

## Icons

Material Design Icons render as **inline SVG paths** via a custom Vuetify iconset (`src/plugins/mdiIconset.js`), not the MDI webfont — #821 removed the render-blocking CDN font (~339 KB CSS + ~394 KB woff2) from the critical path. The iconset re-exports Vuetify's `mdi-svg` aliases (for component internals like dropdowns/clear buttons) and maps the app's `mdi-*` names to `@mdi/js` paths via the generated `src/plugins/mdiPaths.js`. `main.js` registers it as the `mdi` set; call sites are unchanged (`<v-icon icon="mdi-foo">`).

- **Adding/removing an icon**: use it as `mdi-foo` as usual, then run `node scripts/generate-mdi-iconset.mjs` to regenerate the path map. The generator scans `src/`, validates each name against `@mdi/js`, and **fails loudly** on an unmappable name — add an `OVERRIDES` entry for renamed icons (e.g. `mdi-building` → `mdiOfficeBuilding`). A missing icon renders blank, so never hand-edit `mdiPaths.js`.
- **E2E selectors**: the iconset preserves the original `mdi-*` class on the `.v-icon` element, so `.mdi-refresh` / `.mdi-arrow-left` / etc. locators keep matching — the font classes are _not_ gone.

## Cesium Render Mode

`graphicsStore.requestRenderMode` defaults to `true` and is propagated to the live `viewer.scene.requestRenderMode` via the `r4c-request-render-mode` feature flag (wired in `App.vue` after `featureFlagStore.refreshFlags()`). The graphics service `$subscribe` watcher also propagates runtime toggles from `GraphicsQuality.vue` to the live scene.

When RRM is on, Cesium only re-renders when something changes (camera move, entity update, imagery load); when off, the scene re-renders every animation frame at ~60 FPS. On a 3D globe with terrain + buildings + WMS imagery the difference is roughly one CPU core and a hot dGPU — keep RRM on unless a specific feature genuinely needs continuous rendering, and explicitly call `viewer.scene.requestRender()` at any mutation site that would otherwise be visually invisible under RRM (existing camera/entity/imagery hooks already do this).

## Bulk Entity Styling (grids, building sets)

Measured on the 6,710-entity stats grid (Wave-0 perf investigation, PR #880;
WO-3 report). Three findings that contradict the "obvious" optimizations:

1. **Mid-pass yields are the cliff, not the styling work.** Any
   `await`/`scheduler.yield()`/`requestIdleCallback` inside a styling loop
   releases an animation frame, and Cesium rebuilds entity materials on every
   frame while they mutate — O(N) rebuilds instead of one. Removing the
   per-batch yield took the 6,710-cell pass from 412 ms to 127 ms and removed
   the super-linear scaling. The same mechanism made the Helsinki heat merge
   take 11.7–137 s (PR #874): the cost was tens of thousands of untimed
   `requestIdleCallback` round-trips, not the merge CPU (single-digit ms).
2. **`entityCollection.suspendEvents()` alone does NOT stop the rebuilds** —
   each entity's `GeometryUpdater` subscribes to the entity's own
   `definitionChanged`, not the collection's `collectionChanged`. Suspend is
   still correct (batches collection events), but only helps once the pass is
   yield-free.
3. **Never mutate a shared color property in place** (`color.setValue()` /
   mutating a cached `Cesium.Color`): it pegs Cesium's
   `StaticGeometryColorBatch` and was measured to blow the pass to tens of
   seconds. Assign cached immutable `Color` instances per palette bucket
   instead (see the warning comment in `useGridStyling.js`).

Canonical pattern: single synchronous loop wrapped in
`suspendEvents()`/`resumeEvents()`, one `scene.requestRender()` at the end.
For yield-needing huge passes, yield coarsely (hundreds of items) with a
timeout-bounded idle callback — never per-N-features untimed.

## Reading Cesium Entity Properties

Read GeoJSON entity properties through the **public** API:
`entity.properties?.<name>?.getValue()` — not the private
`entity._properties?._<name>?._value`.

The two are runtime-equivalent: `entity.properties` is a getter returning the same
`PropertyBag` as `entity._properties`, and on that bag both `name` (getter) and
`_name` (backing field) resolve to the same `ConstantProperty`, whose public
`.getValue()` (the optional `time` arg is ignored for constant properties) returns
the same value as the private `._value`. The choice is about surface, not behavior.

Prefer the public form because:

- It **type-checks under `vue-tsc` with no cast** — `PropertyBag` indexing is `any`,
  so `entity.properties?.foo?.getValue()` passes. Reading `entity._properties` off a
  `Cesium.Entity` does not; that's what forced the `TreeEntity` cast removed in #838.
- The `_`-prefixed backing fields are private and can rename across Cesium versions.

When you migrate a read here, update its unit-test mock in the same change — see
`testing.md` "Mocking Cesium Entity Properties".

## Development Proxy Configuration

Proxy endpoints in development (`vite.config.js`):

| Endpoint         | Target                              |
| ---------------- | ----------------------------------- |
| `/pygeoapi`      | Finland's geo data portal           |
| `/paavo`         | Statistics Finland postal code data |
| `/wms/proxy`     | HSY map services                    |
| `/digitransit`   | Public transport API                |
| `/terrain-proxy` | Helsinki 3D terrain data            |

## Data Sources

Primary data from:

- Helsinki Region Environmental Services (HSY)
- Statistics Finland
- Environmental monitoring systems for climate resilience research

### Rate Limits Are Enforced at the Gateway, Not the Service

The "HSY buildings" tiles (`viewport_buildings_hsy_*`) are served by `pygeoapi.dataportal.fi`, not by `kartta.hsy.fi` — the layer name is historical. pygeoapi sits behind an Envoy Gateway `BackendTrafficPolicy` that enforces a per-source-IP rate limit. When debugging HTTP 429s on tile loads:

1. **Check the upstream service first** — `kubectl logs` the pygeoapi pod. If you see only 200s, the cap is being applied by the gateway before requests reach the service.
2. **Inspect the BackendTrafficPolicy** for the affected route — `kubectl get backendtrafficpolicy -n <ns> <name> -o yaml`. The `spec.rateLimit.local.rules` describe the per-IP budget.
3. **Distinguish "service overloaded" from "gateway rejecting"**: per-IP buckets mean one dev workstation can produce 940 429s in a session while the service itself is idle. In production each user has their own IP, so the effective limit is per-user, but bursts can still exceed a tight cap on initial viewport load (~30-50 tiles in 1-3 seconds).

The client-side per-host concurrency limiter (`src/services/hostConcurrencyLimiter.js`) caps in-flight count but does not throttle the request rate.

### HSY Outage Resilience Stack (PRs #877, #878)

HSY (`kartta.hsy.fi` behind an Azure App Gateway) returns 504s under load
instead of throttling, with ~20 s hangs, and is occasionally fully down. The
app survives this with two layers — keep both in mind when touching HSY paths:

- **nginx (`/wms/proxy`)**: `proxy_cache` with
  `proxy_cache_use_stale error timeout updating http_5xx` + `proxy_cache_lock`
  - short 3 s/10 s timeouts — a flaky/down HSY serves stale tiles instead of
    failing; `X-Cache-Status` header exposes HIT/MISS/STALE.
- **Client**: `src/services/hostCircuitBreaker.js` (sibling of the
  concurrency limiter — opens after consecutive failures, fast-fails during
  cooldown, half-opens to probe recovery), 12 s per-attempt fetch timeouts in
  `unifiedLoader.js` (must stay below the 20 s gateway hang so a hung request
  frees its 3-per-host slot), quiet-degrade `errorEvent` handling on HSY
  imagery layers (`landcover.js`), and a `serviceHealthStore`-driven snackbar
  gated on HSY host keys only.

Behavior is unchanged when HSY is healthy; never let an HSY request block app
init or navigation.

## deck.gl Renderer (experimental, behind flag)

The `r4c-deckgl-renderer` feature flag (default OFF everywhere; local
override via FeatureFlagsPanel) swaps the stats-grid view to a deck.gl 9.x
renderer (`src/components/DeckGlGridView.vue`, GeoJsonLayer choropleth + HSY
WMS via TileLayer in EPSG:3857). Spike verdict (PR #879): styling 17–29 ms vs
Cesium's 127 ms, ~half the memory, ~454 KB gz lazy chunk vs Cesium's 1.25 MB.

- **Lazy-load invariant**: deck.gl chunks must never appear in the entry
  bundle — `DeckGlGridView` is dynamically imported; check the build output
  if you touch its imports.
- **Shared palette**: both renderers consume `src/utils/gridColorMapping.js`
  (extracted from `useGridStyling.js`, which re-exports it for existing
  consumers). Never fork the color mapping — fix it in one place.

## Component Organization

### Size Guidelines

| Type          | Max Lines | Action if Exceeded                      |
| ------------- | --------- | --------------------------------------- |
| Vue Component | 400       | Extract composables or child components |
| Service File  | 300       | Split into focused modules              |
| Function      | 80        | Extract helper functions                |

### Refactoring Patterns

**Large Vue Components** → Extract composables:

```
src/composables/
├── useViewportLoading.js  # Viewport streaming logic
├── useCesiumEvents.js     # Event handling
└── useCameraControls.js   # Camera state
```

**Large Service Files** → Split into modules:

```
src/services/building/
├── index.js              # Re-exports
├── buildingLoader.js     # Data fetching
├── buildingFilter.js     # Filtering
└── buildingStyler.js     # Styling
```

**Complex Components** → Extract children:

```
src/components/MapControls/
├── MapControls.vue         # Parent
├── DataLayerControls.vue   # Child
└── VisualizationControls.vue # Child
```

### Utilities Directory

Extract reusable logic to utilities:

```
src/utils/
├── batchProcessor.js  # Batch processing
├── entityStyling.js   # Entity styling helpers
├── validators.js      # Input validation
└── logger.js          # Logging utility
```

## Navigation State Coordination

The application uses a three-phase pattern for robust state switching during navigation:

### 1. Request Cancellation

`BuildingLoader.cancelCurrentLoad()` aborts in-flight data loading requests:

```javascript
// In buildingLoader.js
cancelCurrentLoad() {
  if (this._abortController) {
    this._abortController.abort()
    this._abortController = null
  }
}

get activeLayerId() {
  return this._currentLayerId
}
```

**Integration points:**

- `featurepicker/index.js` - calls on reset and new navigation
- `App.vue` - calls when returning to start level
- `PostalCodeView.vue` - calls when navigating away
- `GridView.vue` - calls when switching views

### 2. Latest-Wins Navigation

`globalStore.pendingNavigation` queues the most recent user click to prevent dropped inputs:

```javascript
// State structure
clickProcessingState: {
	pendingNavigation: null; // { postalCode: string, postalCodeName: string }
}

// Actions
setPendingNavigation(navigation); // Queue a navigation request
clearPendingNavigation(); // Clear without processing
consumePendingNavigation(); // Get and clear pending navigation
```

**Flow:**

1. User clicks postal code A → starts loading
2. User clicks postal code B while A loads → B queued as pending, A cancelled
3. A completes/cancels → check for pending → navigate to B

### 3. Visibility Coordination

`toggleStore` hooks manage grid visibility during navigation level transitions:

```javascript
// State
_previousGrid250m: false  // Tracks grid state before entering postal code

// Hooks
onEnterPostalCode() {
  if (this.grid250m) {
    this._previousGrid250m = true
    this.grid250m = false  // Hide grid at postal code level
  }
}

onExitPostalCode() {
  if (this._previousGrid250m) {
    this.grid250m = true   // Restore grid when leaving postal code
    this._previousGrid250m = false
  }
}
```

**Integration points:**

- `featurepicker/index.js:324` - calls `onEnterPostalCode()` when entering postal code
- `App.vue:182` - calls `onExitPostalCode()` when returning to start
- `PostalCodeView.vue:302` - calls `onExitPostalCode()` when navigating away
- `GridView.vue:191` - calls `onExitPostalCode()` when switching views
