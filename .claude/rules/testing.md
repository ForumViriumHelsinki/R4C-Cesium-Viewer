# Testing

## Framework

Playwright for E2E testing, Vitest for unit tests.

## Commands

```bash
bun run test:layer-controls     # Single accessibility test (fast iteration)
bun run test:accessibility      # All accessibility tests
bunx playwright test --ui       # Interactive UI mode
bun run test:accessibility:report  # View HTML report
```

## Tag-Based Execution

Tests are categorized with tags:

```bash
bunx playwright test --grep @accessibility
bunx playwright test --grep @performance
bunx playwright test --grep @e2e
bunx playwright test --grep @smoke
bunx playwright test --grep @wms
```

Combine tags: `bunx playwright test --grep "@accessibility.*@smoke"`

## Component Architecture for Testing

### Timeline Components by Navigation Level

| Level       | Component         | Selector                   | Notes                                                 |
| ----------- | ----------------- | -------------------------- | ----------------------------------------------------- |
| Start       | None              | -                          | No timeline at start level                            |
| Postal Code | `TimelineCompact` | `.timeline-compact`        | Has `d-none d-lg-flex` CSS (hidden < 1280px viewport) |
| Building    | `Timeline`        | `#heatTimeseriesContainer` | Only renders when "Building Heat Data" button clicked |

**Key Insight:** Tests must check DOM presence (`state: 'attached'`) for `.timeline-compact`, not visibility, due to responsive CSS hiding on smaller viewports.

### Building Selection Flow (FeaturePicker)

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

**Critical Guards:**

1. Canvas must have valid dimensions (silently ignores clicks otherwise)
2. Only polygon entities (with `_polygon` property) are selectable
3. Entity must be a `Cesium.Entity` instance with properties

## Testing Cesium Interactions

**Common Pitfalls:**

1. **Canvas Dimension Guard**: Clicks silently ignored if canvas dimensions are 0
2. **Building Entity Loading**: Buildings may not be loaded when tests click
3. **Hardcoded Coordinates**: Static pixel positions don't guarantee hitting buildings
4. **Viewport CSS**: Elements with `d-none d-lg-flex` hidden on small viewports

**Best Practices:**

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

## UI Element Text Selectors

Building level UI buttons use exact casing:

- `"Building Heat Data"` (not "Building heat data")
- `"Building Properties"` (not "Building properties")

## Conditional Test Skip in Custom Fixtures

`cesiumTest.skip()` inside a test body (e.g., in a catch block) does **not** work — the test timeout kills the process before the skip executes. Use test-level skip instead:

```typescript
// ❌ WRONG: Skip inside catch — times out before reaching catch
cesiumTest('test name', async ({ cesiumPage }) => {
  try {
    await longRunningOperation()
  } catch {
    cesiumTest.skip() // Never reached if operation times out
  }
})

// ✅ CORRECT: Skip at test declaration level
cesiumTest.skip('test name — requires real Cesium entities', async ({ cesiumPage }) => {
  await longRunningOperation()
})

// ✅ CORRECT: Pre-check skip condition before expensive operations
cesiumTest('test name', async ({ cesiumPage }, testInfo) => {
  const hasEntities = await cesiumPage.evaluate(() => /* quick check */)
  if (!hasEntities) {
    testInfo.skip(true, 'No 3D entities available')
    return
  }
  await longRunningOperation()
})
```

## Feature Flag Defaults Affect Test Assertions

The Pinia store defaults determine what's visible in tests without explicit setup:

| Store Default                                            | Impact                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `statsIndex: 'heat_index'` (propsStore)                  | Climate Adaptation visible in grid view by default         |
| `coolingOptimizer: fallbackDefault: true` (flagMetadata) | Climate Adaptation enabled by default                      |
| `ndvi: fallbackDefault: true` (flagMetadata)             | NDVI toggle visible in **all** views (no view restriction) |

When writing `verifyPanelVisibility()` assertions, check store defaults rather than assuming elements need explicit activation.

## Navigation-Level Dependent UI Elements

Not all UI elements exist at all navigation levels:

| Element                       | Available At         | Component                            |
| ----------------------------- | -------------------- | ------------------------------------ |
| Reset button (`.mdi-refresh`) | postalCode, building | `GridView.vue`, `PostalCodeView.vue` |
| Back button                   | building             | `App.vue` toolbar                    |
| Timeline compact              | postalCode, building | `App.vue` (with `d-none d-lg-flex`)  |
| Building Analysis button      | postalCode           | `ControlPanel.vue`                   |
| Area/Building Properties      | postalCode/building  | `ControlPanel.vue`                   |

Always check element existence before interaction when the navigation level might vary.
