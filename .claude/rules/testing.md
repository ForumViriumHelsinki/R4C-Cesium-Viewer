# Testing

## Framework

Playwright for E2E testing, Vitest for unit tests. Chrome/Chromium only — Firefox, WebKit, and Safari are not tested (WebGL/Cesium requires Chromium engine).

## Fixture Selection

| Test needs Cesium?         | Use fixture                        | Import                                                    |
| -------------------------- | ---------------------------------- | --------------------------------------------------------- |
| No (page title, static UI) | `test` from `test-fixture`         | `import { test } from '../fixtures/test-fixture'`         |
| Yes (canvas, viewer, map)  | `cesiumTest` from `cesium-fixture` | `import { cesiumTest } from '../fixtures/cesium-fixture'` |

`cesiumTest` provides `cesiumPage` which is already navigated, modal dismissed, and Cesium initialized with retry logic. Do not duplicate this setup manually with `page.goto('/')`, `dismissModalIfPresent()`, or `waitForCesiumReady()`.

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

## Cesium & Store Global Variables

The app exposes Cesium and Pinia state on `window` in E2E mode (`VITE_E2E_TEST=true`):

| Variable             | Set by                       | Contains                                                                                                       |
| -------------------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `window.__cesium`    | `useViewerInitialization.js` | Cesium module                                                                                                  |
| `window.__viewer`    | `useViewerInitialization.js` | Cesium.Viewer instance                                                                                         |
| `window.Cesium`      | NOT set by app               | Only set by CI mock fixture                                                                                    |
| `window.globalStore` | `src/main.js`                | Live Pinia globalStore reference                                                                               |
| `window.__perfStats` | `src/utils/perfStats.js`     | Perf counters (limiter queue-wait, cache hit/miss/bytes, requestRender count); `reset()` zeroes between trials |

Test helpers must check `window.__cesium || window.Cesium` — never just `window.Cesium`.

The store property is `postalcode` (lowercase), not `postalCode`. Reading from the store:

```typescript
const state = await page.evaluate(() => {
	const s = (window as any).globalStore;
	return { level: s.level, postalcode: s.postalcode, view: s.view };
});
```

## Mocking Cesium Entity Properties

Production reads entity properties via the public `ConstantProperty.getValue()` (see
`architecture.md` "Reading Cesium Entity Properties"). Unit-test mocks must therefore
expose a `getValue()` method — a raw `_value` field throws
`entity.properties?.x?.getValue is not a function` the moment the code is migrated.

```js
// ✅ mock the public surface (real Cesium ConstantProperty)
properties: {
	_measurement: {
		getValue: () => ({ temp_air: 23.5 });
	}
}

// ❌ couples to the private field; breaks once the code uses .getValue()
properties: {
	_measurement: {
		_value: {
			temp_air: 23.5;
		}
	}
}
```

This is the test-side half of the public-API migration (commits `91a2721`, `0bf0224`):
when a service switches a property read to `.getValue()`, its mock flips from
`{ _value: v }` to `{ getValue: () => v }` in the same commit.

## Deterministic Drilling Without Cesium Picks

`AccessibilityTestHelpers.drillToLevel` accepts `{ method: 'click' | 'store' }`. Use `'store'` when:

- Running in CI with the mock Cesium fixture (polygon picking is unreliable).
- Testing race conditions or rapid-click coordination — the store method lets you fire two transitions inside one `page.evaluate` tick.
- The journey doesn't actually need to validate the click→pick→entity path; it just needs the destination level.

```typescript
// Click path — exercises CesiumViewer.vue → FeaturePicker → store
await helpers.drillToLevel('postalCode', '00100');

// Store path — deterministic, faster, no Cesium dependency
await helpers.drillToLevel('postalCode', '00100', { method: 'store' });
```

## Canvas Selector

Use `#cesiumContainer canvas` instead of bare `canvas` — multiple canvas elements exist on the page (Cesium widget canvas, compass canvas, etc.). Bare `canvas` causes strict mode violations.

## API Mock Safety

**Never intercept localhost in catch-all route handlers.** The WMS mock fallback `page.route('**/*')` will match Vite dev server module requests if URL substring matching is used carelessly:

```typescript
// ❌ WRONG: Catches http://localhost:5173/src/services/wms.js
page.route('**/*', (route) => {
	if (route.request().url().includes('wms')) {
		return route.fulfill({ body: TRANSPARENT_PNG });
	}
	return route.continue();
});

// ✅ CORRECT: Skip localhost, only intercept external requests
page.route('**/*', (route) => {
	const url = route.request().url();
	if (url.includes('localhost') || url.includes('127.0.0.1')) {
		return route.continue();
	}
	if (url.includes('/wms')) {
		return route.fulfill({ body: TRANSPARENT_PNG });
	}
	return route.continue();
});
```

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

## Icon Selectors (`.mdi-*`)

Icons render as inline SVG (custom `mdi-svg` iconset — see `architecture.md`), but the iconset **preserves the `mdi-*` class on the `.v-icon` element**, so existing icon locators keep working:

```typescript
page.getByRole('button').filter({ has: page.locator('.mdi-refresh') });
```

Locating a control by its `mdi-*` class is reliable. A brand-new icon must be regenerated into the path map (`node scripts/generate-mdi-iconset.mjs`) or it renders blank.

## Accessibility Specs Require Data

Most `tests/e2e/accessibility/*` specs are tagged `@requires-database` — they drill to postal-code / building levels that need seeded data, and the reset/back/compass controls only mount once data loads. Without a database they skip or fail, so **red accessibility/E2E checks locally (or on a config-only PR) are usually environmental, not a regression**. Notes:

- DB-free subset: `just dev-mock` + `just test-e2e-mock` (sets `SKIP_REQUIRES_DATABASE=true`).
- `camera-controls.spec.ts` is `cesiumDescribe.skip`-ed at the source — it always reports 0/skipped.
- Setting `window.globalStore.level` alone does **not** mount the postal-code view; the data load gates the render. Use `AccessibilityTestHelpers.drillToLevel(..., { method: 'store' })` for deterministic level changes.

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

## Vitest-Driven Playwright Suites (`tests/performance/`)

`tests/performance/load.test.ts` is a **Vitest** suite that drives a real Chromium via the `playwright` Node library directly — it does **not** use the Playwright test runner or the `cesium-fixture`. That hybrid has gotchas the rest of the E2E suite (Playwright-runner specs) never hits. When editing or adding tests here:

| Trap                 | Playwright-runner spec                | Vitest-driven suite                                                                                                                                                                         |
| -------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Visibility assert    | `await expect(locator).toBeVisible()` | **No `toBeVisible` matcher** — use `expect(await locator.isVisible()).toBe(true)`                                                                                                           |
| Memory / heap        | `page.metrics()`                      | **No `page.metrics()`** (Puppeteer-only) — `page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0)` (Chromium-only, works under SwiftShader)                                 |
| Response timing      | `response.timing()`                   | **No `response.timing()`** (Puppeteer-only) — use `response.request().timing()` if ever needed                                                                                              |
| Server               | `webServer` auto-starts               | **No auto-start** — a preview/dev server must already be running (`just test-performance` handles this)                                                                                     |
| Modal dismissal      | `cesiumPage` fixture dismisses it     | **Must dismiss manually** — replicate `removeBlockingOverlays` (see below)                                                                                                                  |
| Per-test time budget | spec timeout                          | bounded by the **global `testTimeout` (10s)** — a test whose own threshold (e.g. `SESSION_DURATION` 45s) exceeds it needs an explicit per-test timeout: `it('…', async () => { … }, 60000)` |

**`networkidle` never settles on the Cesium map.** The 3D globe streams tiles continuously, so `page.waitForLoadState('networkidle')` hangs until it times out. Use `'load'` instead. If you must bound a `networkidle` wait, cap it **below** the 10s test timeout (`TEST_TIMEOUTS.ELEMENT_SCROLL` = 3s) and `.catch(() => {})` so the catch actually fires.

**Floating map controls intercept canvas clicks.** Tests that `canvas.click()` at map coordinates collide with the nav drawer (`.control-panel`), camera/zoom/compass controls (`.camera-controls-container`, `.zoom-controls`, `.compass-assembly`), and the compact timeline — each swallows the click and Playwright retries for 30s. Inject a helper (mirroring `tests/fixtures/cesium-fixture.ts` `removeBlockingOverlays`) that removes the disclaimer dialog + scrims and sets `pointer-events: none` on those control containers, then call it after `waitForSelector('canvas')`.

**Software-rendering skip.** Headless Chromium (CI **and** local headless) uses SwiftShader, so GPU-bound metrics like FPS aren't representative. Detect and `ctx.skip()` at runtime:

```ts
it('…fps…', async (ctx) => {
	const renderer = await page.evaluate(() => {
		const gl = document.createElement('canvas').getContext('webgl');
		const ext = gl?.getExtension('WEBGL_debug_renderer_info');
		return ext ? (gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : '';
	});
	if (/swiftshader|llvmpipe|software/i.test(renderer)) {
		await page.close();
		ctx.skip();
		return;
	}
	// …real-GPU measurement…
});
```

The viewer is exposed as `window.__viewer` (double underscore, gated on `VITE_E2E_TEST`) — never `window.cesiumViewer`. The Performance Tests CI job runs **only on push-to-`main`, not on PRs**, and is not a merge gate, so a PR check won't catch breakage here — verify locally with `just test-performance`.

## No Wall-Clock Comparison Assertions in Unit Tests

Never assert that one implementation is faster than another by comparing
measured durations (`expect(newMs).toBeLessThan(oldMs)`). At small absolute
magnitudes (sub-15 ms), JIT warmup and GC noise on shared CI runners can make
the "slow" implementation win any single run — PR #874's benchmark failed CI
at 14.56 ms vs 14.07 ms exactly this way, despite a real 14× speedup on other
runs. Keep benchmark timings as informational `console.log` output and assert
correctness via behavior-equivalence checks instead. If a perf property must
be enforced, enforce it via the dedicated performance suite with baselines
(`tests/performance-baselines.json`), not inline unit assertions.

## Feature Flag Defaults Affect Test Assertions

The Pinia store defaults determine what's visible in tests without explicit setup:

| Store Default                                            | Impact                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------- |
| `statsIndex: 'heat_index'` (propsStore)                  | Climate Adaptation visible in grid view by default         |
| `coolingOptimizer: fallbackDefault: true` (flagMetadata) | Climate Adaptation enabled by default                      |
| `ndvi: fallbackDefault: true` (flagMetadata)             | NDVI toggle visible in **all** views (no view restriction) |

When writing `verifyPanelVisibility()` assertions, check store defaults rather than assuming elements need explicit activation.

## Regression-Contract Specs (Soft Assertions)

When a spec encodes contracts that are _known to be broken_ and tied to open issues — e.g. `tests/e2e/audit-2026-W19/user-journeys.spec.ts` — prefer `expect.soft()` over `expect()` for the broken assertions. Reserve hard `expect()` for structural pre/postconditions that must hold for the test to make sense.

```typescript
// Structural — bail if violated, test can't continue meaningfully
await expect(banner).toContainText(/Helsinki Keskusta|00100/i);

// Regression contract — soft so a single run surfaces *every* failure
expect
	.soft(await banner.textContent(), 'US-03 #711 — banner contains "undefined"')
	.not.toMatch(/\bundefined\b/i);
```

Benefits:

- One failing test reports every broken contract, not just the first — the report becomes a punch list.
- The test still fails (preserves regression-contract semantics).
- The message string carries the issue link, so failures are self-explanatory.

When the linked issue closes, **graduate the soft to a hard** `expect` so the next regression is loud. Don't leave soft assertions in place after their issue is fixed — they hide future regressions.

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
