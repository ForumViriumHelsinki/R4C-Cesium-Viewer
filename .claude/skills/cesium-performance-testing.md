# CesiumJS Performance Testing

Performance optimization patterns and constraints for testing CesiumJS applications with Playwright.

## Core Performance Issue: Continuous 60fps Rendering

### The Problem

By default, CesiumJS renders continuously at 60fps (even when nothing changes):

```javascript
// Default Cesium behavior
viewer.clock.shouldAnimate = true; // ❌ Renders every frame
// Result: 60 renders/second = 3600 renders/minute
```

**Impact on Tests**:

- UI elements appear "unstable" to Playwright
- Stability checks fail because pixels constantly change
- Click/interaction timing becomes unreliable
- Increased CPU usage (100%+) during test runs
- False negatives from Playwright's actionability checks

**Error Manifestations**:

- `locator.click: Element is not stable` - Retried many times
- `expect(locator).toBeVisible failed` - Element "moves" during check
- Test flakiness and intermittent failures
- Timeouts waiting for "stable" state

### The Solution: Request Render Mode

Stop continuous rendering and only render on explicit requests:

```javascript
// In cesium-fixture.ts setup
viewer.clock.shouldAnimate = false; // Stop animation loop
viewer.scene.requestRenderMode = true; // Only render when requested
viewer.scene.maximumRenderTimeChange = Infinity; // Don't auto-render on time change
```

**Benefits**:

- Stable pixel state between interactions
- Playwright stability checks pass reliably
- ~70% reduction in CPU usage during tests
- Faster test execution (less retry overhead)
- More deterministic test behavior

**Reference**: `tests/fixtures/cesium-fixture.ts:610-613`

## WebGL Resource Constraints

### Critical Constraint: Sequential Execution Only

**Must maintain** `workers: 1` in playwright.config.ts:

```typescript
// playwright.config.ts
{
  workers: 1, // CRITICAL - WebGL resource limit
  fullyParallel: false
}
```

**Why**:

- WebGL contexts are limited per system (typically 16-32)
- Each Cesium viewer requires multiple WebGL contexts
- Parallel test execution exhausts WebGL context pool
- Results in: `Failed to create WebGL context` errors
- Browser crashes or GPU driver issues

**Never**:

- Increase workers count
- Enable fullyParallel
- Run multiple test files simultaneously
- Use parallel sharding

**Do**:

- Run tests sequentially file-by-file
- Use focused testing for faster iteration (`npm run test:layer-controls`)
- Leverage fail-fast mode (`--max-failures=1`) for development

## Graphics Quality Preset for Testing

### Performance Preset Configuration

Apply low-quality graphics settings to speed up rendering:

```typescript
// In cesium-fixture.ts
await cesiumPage.evaluate(() => {
	const graphicsStore = window.$app?.config?.globalProperties?.$pinia?.state?.value?.graphics;
	if (graphicsStore) {
		graphicsStore.applyQualityPreset('performance');
	}
});
```

**Performance Preset Settings**:

- Lower texture resolution
- Reduced shadow quality
- Simplified terrain rendering
- Faster tile loading
- Less detailed 3D buildings

**Impact**:

- 40-50% faster Cesium initialization
- Lower memory footprint
- Reduced GPU load
- **No impact on accessibility test accuracy** (tests focus on UI, not visuals)

**Reference**: `tests/fixtures/cesium-fixture.ts:678-693`

## Fixture Initialization Optimization

### CI vs Local Strategy

**CI Environment** (Mock Cesium):

```typescript
// Fast mock injection - no WebGL
if (process.env.CI) {
	await page.addInitScript(() => {
		// Inject mock Cesium (464 lines)
		window.Cesium = {
			/* mock implementation */
		};
	});
}
// Init time: ~2-3 seconds
```

**Local Development** (Real Cesium):

```typescript
// Real WebGL initialization with optimizations
if (!process.env.CI) {
	await page.goto('/');
	await waitForCesiumReady(page, 60000);
	// Apply performance optimizations
	viewer.scene.requestRenderMode = true;
}
// Init time: ~10-15 seconds (with optimizations)
// Without optimizations: ~30-40 seconds
```

**Trade-offs**:

- CI: Faster, but doesn't catch WebGL-specific issues
- Local: Slower, but tests real rendering behavior
- Both: Apply performance presets to balance speed/accuracy

## Timeout Configuration for Performance

### Recommended Timeout Values

```typescript
// playwright.config.ts
{
  actionTimeout: 5000,      // Keep tight for fast feedback
  navigationTimeout: 10000,  // Cesium takes time to initialize
  timeout: 20000,           // Per-test timeout
  expect: {
    timeout: 5000           // Assertion timeout
  }
}
```

**Rationale**:

- Lower timeouts catch issues faster
- Cesium optimizations make tight timeouts viable
- If tests timeout, fix the root cause (don't increase timeouts)

### Avoid Timeout Increases

❌ **BAD**: Masking performance issues

```typescript
await page.waitForSelector('#map', { timeout: 60000 }); // Why so long?
```

✅ **GOOD**: Fix the root cause

```typescript
// Ensure Cesium initialized with optimizations
await waitForCesiumReady(page, 10000); // Fast with requestRenderMode
await page.waitForSelector('#map', { timeout: 5000 });
```

## Cesium Readiness Detection

### waitForCesiumReady Helper

```typescript
async function waitForCesiumReady(page, timeout = 60000) {
	await page.waitForFunction(
		() => {
			const viewer = window.viewer;
			return (
				viewer && viewer.scene && viewer.scene.globe && viewer.scene.globe.tilesLoaded === true
			);
		},
		{ timeout }
	);
}
```

**What it checks**:

- Viewer instance exists
- Scene initialized
- Globe tiles loaded (map visible)

**Reference**: `tests/fixtures/cesium-fixture.ts:734`

## Overlay Rendering Performance

### Problem: Vuetify Overlays Block Interaction

Vuetify overlays (dialogs, loading spinners) can remain in DOM even when hidden:

```html
<!-- Still in DOM but hidden -->
<div
	class="v-overlay v-overlay--active"
	style="display: none;"
>
	...
</div>
```

**Impact**:

- Playwright thinks overlay is still active
- Clicks fail with "element is obscured" errors
- waitForOverlaysToClose times out

### Solution: CSS Injection + Wait

```typescript
// Force hide overlays via CSS (more reliable than DOM check)
await page.addStyleTag({
	content: `
    .v-overlay--active { display: none !important; }
    .v-dialog--active { display: none !important; }
    .loading-overlay { display: none !important; }
  `,
});

await page.waitForTimeout(500); // Let CSS apply and animations settle
```

**Reference**: `tests/fixtures/cesium-fixture.ts:707-731`

## Performance Benchmarks

### Target Metrics

| Metric                   | Before Optimization | After Optimization | Target |
| ------------------------ | ------------------- | ------------------ | ------ |
| **CPU Usage**            | ~100%               | ~30%               | <50%   |
| **Test Duration**        | 17.5 min            | 5-8 min            | ≤5 min |
| **Fixture Init (CI)**    | 30-40s              | 2-3s               | <5s    |
| **Fixture Init (Local)** | 45-65s              | 10-15s             | <20s   |
| **Per-Test Overhead**    | 8-9s                | 3-5s               | <5s    |

### Measuring Performance

```bash
# Time full suite
time npm run test:accessibility

# Time single file
time npm run test:layer-controls

# Profile with Chrome DevTools (local only)
npm run test:accessibility:watch
# Then use Chrome DevTools Performance panel
```

## Common Performance Issues

### Issue 1: Cesium Tiles Not Loading

**Symptom**: Tests timeout waiting for Cesium

**Cause**: Network issues or missing terrain/imagery data

**Fix**:

```typescript
// Increase tile cache size
viewer.scene.globe.tileCacheSize = 200; // Default: 100

// Or use mock terrain provider in tests
viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
```

### Issue 2: Memory Leaks Between Tests

**Symptom**: Tests slow down over time, eventual crash

**Cause**: Cesium viewer not properly destroyed

**Fix**:

```typescript
// In cesium-fixture.ts cleanup
test.afterEach(async ({ cesiumPage }) => {
	if (cesiumPage.viewer) {
		cesiumPage.viewer.destroy();
		cesiumPage.viewer = null;
	}
	// Force garbage collection (if available)
	if (global.gc) {
		global.gc();
	}
});
```

**Reference**: `tests/fixtures/cesium-fixture.ts:760-786`

### Issue 3: Animations Interfering with Tests

**Symptom**: Click actions fail, elements "move"

**Cause**: Cesium camera animations or time-based updates

**Fix**:

```typescript
// Disable all animations
viewer.clock.shouldAnimate = false;
viewer.scene.screenSpaceCameraController.enableRotate = false;
viewer.scene.screenSpaceCameraController.enableZoom = false;
viewer.camera.cancelFlight(); // Stop any in-progress camera movement
```

## Monitoring and Debugging

### Performance Traces

Enable detailed performance traces:

```typescript
// playwright.config.ts
{
  use: {
    trace: 'retain-on-first-failure', // Captures performance timeline
  }
}
```

View trace:

```bash
npm run test:accessibility:report
# Click on failed test → View trace
```

### Console Performance Logs

```typescript
test('performance monitoring', async ({ page }) => {
	page.on('metrics', (metrics) => {
		console.log('CPU Usage:', metrics.TaskDuration);
		console.log('JS Heap:', metrics.JSHeapUsedSize);
	});

	// Run test...
});
```

### Cesium Performance Stats

```typescript
// Enable Cesium FPS display
viewer.scene.debugShowFramesPerSecond = true;

// Log render statistics
console.log('Tiles rendered:', viewer.scene.globe.tilesRendered);
console.log('Entities:', viewer.entities.values.length);
```

## Best Practices Summary

1. **Always use requestRenderMode** - Eliminates 90% of stability issues
2. **Never increase workers** - WebGL constraint is hardware-limited
3. **Apply performance preset** - Faster init, no impact on test accuracy
4. **Keep tight timeouts** - Catches real performance problems early
5. **Destroy viewers properly** - Prevents memory leaks
6. **Use focused testing** - Fast iteration during development
7. **Profile when needed** - Use traces to identify bottlenecks

## Resources

- **CesiumJS Performance Guide**: https://cesium.com/learn/cesiumjs/ref-doc/Scene.html#requestRenderMode
- **WebGL Context Limits**: https://webglstats.com/
- **Playwright Performance**: https://playwright.dev/docs/test-best-practices#test-performance
- **Test Patterns**: `.claude/skills/test-pattern-library.md`
