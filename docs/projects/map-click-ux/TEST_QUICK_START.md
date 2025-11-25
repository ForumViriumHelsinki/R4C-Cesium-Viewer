# Map Click Loading Overlay Tests - Quick Start

## Test File

**Location:** `/tests/e2e/map-click-feedback.spec.ts`
**Tests:** 39 comprehensive test cases
**Size:** 985 lines of well-documented test code

## Run All Tests

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts
```

## Run by Category

### Immediate Feedback (4 tests)

Tests overlay appearance timing and display:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Immediate Visual"
```

### Stage Progression (3 tests)

Tests loading → animating → complete transitions:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Loading Stage"
```

### Cancel Functionality (4 tests)

Tests ESC key and button cancellation:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Cancel"
```

### Error Handling (5 tests)

Tests error display and retry capability:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Error"
```

### Accessibility (7 tests)

Tests ARIA, keyboard, screen reader support:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Accessibility"
```

### Performance (4 tests)

Tests timing, animations, resource cleanup:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Performance"
```

### Multi-Click (3 tests)

Tests rapid and overlapping interactions:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Multi-Click"
```

### Mobile/Responsive (3 tests)

Tests viewport and responsive behavior:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Mobile"
```

### Edge Cases (4 tests)

Tests error conditions and unusual scenarios:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Edge Cases"
```

### Cleanup (2 tests)

Tests teardown and resource cleanup:

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "Cleanup"
```

## Debug & Development

### Interactive UI Mode

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts --ui
```

Click through tests, inspect elements, see execution live.

### Single Test

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "should display loading overlay within"
```

### Watch Mode (requires --ui)

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts --ui --watch
```

### With Browser Visible

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts --headed
```

### Specific Browser

```bash
# Just Chromium
npx playwright test tests/e2e/map-click-feedback.spec.ts --project=chromium

# Just Firefox
npx playwright test tests/e2e/map-click-feedback.spec.ts --project=firefox

# Just WebKit
npx playwright test tests/e2e/map-click-feedback.spec.ts --project=webkit
```

## View Results

### HTML Report

```bash
# Generate report from latest run
npx playwright test tests/e2e/map-click-feedback.spec.ts --reporter=html

# Open in browser
npx playwright show-report
```

### Command Line Summary

Tests print performance metrics to console:

```
[Performance] Map click feedback appeared in 45ms
[Performance] Click interaction completed in 234ms
```

## Test Coverage Summary

| Test Suite           | Count  | Coverage                                 |
| -------------------- | ------ | ---------------------------------------- |
| Immediate Feedback   | 4      | Visual appearance, timing, content       |
| Stage Progression    | 3      | Loading lifecycle transitions            |
| Cancel Functionality | 4      | ESC key, button, view restoration        |
| Error Handling       | 5      | Errors, retry, network timeouts          |
| Accessibility        | 7      | ARIA, keyboard, screen readers, contrast |
| Performance          | 4      | Timing, animations, resource cleanup     |
| Multi-Click          | 3      | Rapid clicks, overlapping interactions   |
| Mobile/Responsive    | 3      | Viewports, resize, z-index               |
| Edge Cases           | 4      | Missing data, slow networks, reset       |
| Cleanup              | 2      | Stale overlays, event listener cleanup   |
| **TOTAL**            | **39** | **Comprehensive coverage**               |

## What Gets Tested

### Functionality

- Overlay appears when clicking postal codes
- Shows postal code name
- Displays progress indicators
- Shows stage-appropriate text ("Loading", "Animating", "Complete")
- Progress bar appears during animation
- Overlay stays visible throughout processing

### Interaction

- ESC key cancels animation
- Cancel button is clickable
- Camera position restores on cancel
- Multiple rapid clicks handled
- Clicks during overlay display work correctly

### Error Handling

- Error messages display
- Retry button appears
- Retry works after failure
- Network timeouts handled gracefully
- Retry count tracked

### Accessibility (WCAG 2.1)

- ARIA role and attributes present
- aria-live region announces changes
- Keyboard navigation works
- Focus indicators visible
- Color contrast adequate
- Reduced motion respected
- Button labels descriptive

### Performance

- Overlay visible < 100ms (target)
- No frame drops (< 200ms average)
- No main thread blocking
- Resources cleaned up properly

### Mobile

- Works on mobile viewport (375x667)
- Works on tablet viewport (768x1024)
- Z-index keeps overlay on top
- Overlay readable on small screens

## Key Test Patterns

### Check Store State

```typescript
const storeState = await cesiumPage.evaluate(() => {
	const store = (window as any).useGlobalStore?.();
	if (store?.clickProcessingState) {
		return {
			isProcessing: store.clickProcessingState.isProcessing,
			stage: store.clickProcessingState.stage,
			error: store.clickProcessingState.error,
		};
	}
	return null;
});
```

### Click Map and Check Overlay

```typescript
const canvas = cesiumPage.locator('canvas').first();
await canvas.click({ position: { x: 400, y: 300 } });

const loadingCard = cesiumPage.locator('.loading-card');
await expect(loadingCard).toBeVisible({ timeout: 500 });
```

### Verify Accessibility

```typescript
const loadingCard = cesiumPage.locator('.loading-card');
const role = await loadingCard.getAttribute('role');
const ariaLive = await loadingCard.getAttribute('aria-live');
expect(role).toMatch(/status|alert|region/);
expect(ariaLive).toMatch(/polite|assertive/);
```

### Test Performance

```typescript
const startTime = Date.now();
await canvas.click({ position: { x: 400, y: 300 } });
await expect(loadingCard).toBeVisible({ timeout: 500 });
const feedbackTime = Date.now() - startTime;
expect(feedbackTime).toBeLessThan(150); // Allow 50ms test overhead
```

## Common Commands

```bash
# Full run across all browsers
npx playwright test tests/e2e/map-click-feedback.spec.ts

# Quick run (chromium only)
npx playwright test tests/e2e/map-click-feedback.spec.ts --project=chromium

# With visual feedback
npx playwright test tests/e2e/map-click-feedback.spec.ts --headed

# Interactive debugging
npx playwright test tests/e2e/map-click-feedback.spec.ts --ui

# One specific test
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "should display loading"

# See what tests exist
npx playwright test tests/e2e/map-click-feedback.spec.ts --list

# Generate report
npx playwright test tests/e2e/map-click-feedback.spec.ts --reporter=html
npx playwright show-report
```

## Expected Behavior

### Happy Path

1. User clicks postal code area on map
2. Overlay appears almost instantly (< 100ms)
3. Shows postal code name and "Loading Postal Code" text
4. Progress circular spinner animates
5. Stage changes to "Moving Camera"
6. Progress linear bar shows animation progress
7. Stage changes to "Almost Ready"
8. Overlay closes or fades (depends on next action)

### With Cancel

1. During animation stage (step 5-6 above)
2. User presses ESC or clicks Cancel button
3. Animation stops immediately
4. Camera returns to previous position
5. Overlay closes cleanly

### With Error

1. Data loading fails
2. Error message displayed in alert
3. Retry button visible and clickable
4. User clicks Retry
5. Loading resumes
6. If successful, continues to step 7 above

## Test Fixtures

Tests use the **cesiumTest** fixture which:

- Initializes Cesium (mock in CI, real locally)
- Pre-loads the application
- Closes disclaimer popup
- Sets up performance mode
- Cleans up after each test

## Related Documentation

- **Full Details:** `/docs/E2E_MAP_CLICK_FEEDBACK_TESTS.md`
- **Component Code:** `/src/components/MapClickLoadingOverlay.vue`
- **Store Code:** `/src/stores/globalStore.js`
- **Feature Integration:** `/src/pages/CesiumViewer.vue`

## Success Indicators

Tests pass when:

- All 39 tests complete
- No failures or timeouts
- Accessibility checks pass
- Performance targets met (< 100ms feedback)
- Mobile tests pass
- No flaky tests
