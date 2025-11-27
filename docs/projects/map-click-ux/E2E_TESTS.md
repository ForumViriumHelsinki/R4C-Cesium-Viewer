# Map Click Loading Overlay E2E Test Suite

## Overview

Comprehensive end-to-end test suite for the Map Click Loading Overlay feature in the R4C Cesium Viewer. This test suite validates the immediate visual feedback system that appears when users click on postal code areas on the map.

**Test File Location:** `/tests/e2e/map-click-feedback.spec.ts`

**Total Tests:** 40+ test cases across 10 test suites

**Technologies:**

- Playwright for end-to-end testing
- Cesium fixture for mock Cesium initialization
- Test helpers for accessibility and interaction patterns
- Multi-browser support (Chromium, Firefox, WebKit)

## Feature Coverage

The test suite comprehensively validates:

1. **Immediate Visual Feedback** - Overlay appears within 100ms of map click
2. **Stage Progression** - Transitions through loading → animating → complete states
3. **Cancel Functionality** - ESC key and button click cancellation
4. **Error Handling** - Graceful error display and retry capability
5. **Accessibility** - ARIA attributes, keyboard navigation, screen reader support
6. **Performance** - Interaction timing, resource cleanup, smooth animations
7. **Mobile Responsiveness** - Viewport sizing and responsive behavior
8. **Edge Cases** - Error states, network conditions, state management

## Test Organization

### 1. Immediate Visual Feedback (4 tests)

Validates that the overlay appears quickly and displays appropriate information:

```typescript
cesiumTest('should display loading overlay within 100ms of map click @performance');
cesiumTest('should show postal code name in overlay');
cesiumTest('should display progress indicator while loading');
cesiumTest('should display stage-appropriate text');
```

**Key Validations:**

- Overlay visibility within tight performance window
- Postal code name display
- Progress circular indicator presence
- Stage-appropriate text ("Loading Postal Code", "Moving Camera", "Almost Ready")

### 2. Loading Stage Progression (3 tests)

Verifies correct state transitions through the loading lifecycle:

```typescript
cesiumTest('should transition through loading stages');
cesiumTest('should show progress bar during animation');
cesiumTest('should maintain visible overlay while processing');
```

**Key Validations:**

- Stage text changes appropriately
- Progress linear bar appears during animation
- Overlay remains visible throughout processing

### 3. Cancel Functionality (4 tests)

Tests camera animation cancellation and view restoration:

```typescript
cesiumTest('should show cancel button during animation stage');
cesiumTest('should support ESC key to cancel animation');
cesiumTest('should support cancel button click');
cesiumTest('should restore camera view on cancel');
```

**Key Validations:**

- Cancel button visibility during animation
- ESC key handling
- Button click cancellation
- Camera position/orientation restoration

### 4. Error Handling and Retry (5 tests)

Comprehensive error scenario testing:

```typescript
cesiumTest('should display error message on load failure');
cesiumTest('should show retry button on error');
cesiumTest('should support retry after error');
cesiumTest('should track retry count');
cesiumTest('should handle network timeouts gracefully');
```

**Key Validations:**

- Error alert display
- Retry button visibility and functionality
- Retry count tracking in store
- Graceful handling of slow networks (3+ second delays)

### 5. Accessibility Features (7 tests)

Full accessibility compliance validation:

```typescript
cesiumTest('should have proper ARIA attributes');
cesiumTest('should announce stage changes to screen readers');
cesiumTest('should have keyboard-accessible cancel button');
cesiumTest('should support keyboard navigation in error state');
cesiumTest('should provide adequate color contrast');
cesiumTest('should respect prefers-reduced-motion');
cesiumTest('should provide descriptive button labels');
```

**Key Validations:**

- ARIA role, aria-live, aria-atomic attributes
- Screen reader announcements via aria-live regions
- Keyboard focus and navigation
- Color contrast compliance
- Reduced motion media query support
- Descriptive accessible labels

### 6. Performance Metrics (4 tests)

Performance monitoring and optimization validation:

```typescript
cesiumTest('should measure interaction time');
cesiumTest('should maintain smooth animation transitions');
cesiumTest('should load overlay without blocking main thread');
cesiumTest('should cleanup resources after overlay closes');
```

**Key Validations:**

- Performance.mark/measure tracking
- Frame timing analysis
- Main thread blocking checks
- Resource cleanup verification

### 7. Multi-Click Scenarios (3 tests)

Tests behavior with rapid or overlapping user interactions:

```typescript
cesiumTest('should handle rapid successive clicks');
cesiumTest('should handle click during overlay display');
cesiumTest('should preserve state consistency across clicks');
```

**Key Validations:**

- Rapid click handling without errors
- Overlapping interaction management
- Store state consistency

### 8. Mobile and Responsive Behavior (3 tests)

Tests responsiveness across different viewport sizes:

```typescript
cesiumTest('should display overlay on mobile viewport');
cesiumTest('should handle viewport resize during overlay display');
cesiumTest('should maintain z-index above other elements');
```

**Key Validations:**

- Mobile (375x667) viewport support
- Viewport resize handling
- Z-index layering (>= 1000)

### 9. Edge Cases and Error States (4 tests)

Tests unusual or error conditions:

```typescript
cesiumTest('should handle missing postal code data gracefully');
cesiumTest('should handle store state reset correctly');
cesiumTest('should handle Cesium viewer not being initialized');
cesiumTest('should handle very slow network conditions');
```

**Key Validations:**

- Missing data handling
- Store reset behavior
- Missing viewer initialization
- Very slow network (3+ second delays)

### 10. Teardown and Cleanup (2 tests)

Tests proper cleanup after interactions:

```typescript
cesiumTest('should not leave stale overlays after navigation');
cesiumTest('should cleanup event listeners on unmount');
```

**Key Validations:**

- Single overlay instance constraint
- Event listener cleanup
- Store state consistency

## Running the Tests

### All Tests

```bash
npm run test:e2e
# or
npx playwright test tests/e2e/map-click-feedback.spec.ts
```

### By Category

```bash
# Accessibility tests only
npx playwright test tests/e2e/map-click-feedback.spec.ts --grep "Accessibility"

# Performance tests only
npx playwright test tests/e2e/map-click-feedback.spec.ts --grep "Performance"

# Error handling tests
npx playwright test tests/e2e/map-click-feedback.spec.ts --grep "Error"

# Mobile tests
npx playwright test tests/e2e/map-click-feedback.spec.ts --grep "Mobile"

# Cancel functionality
npx playwright test tests/e2e/map-click-feedback.spec.ts --grep "Cancel"
```

### With Filters

```bash
# Run only chromium browser
npx playwright test tests/e2e/map-click-feedback.spec.ts --project=chromium

# Run in headed mode (see browser)
npx playwright test tests/e2e/map-click-feedback.spec.ts --headed

# Run with UI mode for debugging
npx playwright test tests/e2e/map-click-feedback.spec.ts --ui

# Run single test
npx playwright test tests/e2e/map-click-feedback.spec.ts -g "should display loading overlay"
```

### With Reporter

```bash
# HTML report (saved to playwright-report/)
npx playwright test tests/e2e/map-click-feedback.spec.ts --reporter=html

# View latest report
npx playwright show-report
```

## Test Tags

Tests use tags for selective execution and organization:

- `@e2e` - End-to-end test (all tests have this)
- `@interaction` - User interaction test
- `@accessibility` - Accessibility feature
- `@performance` - Performance metric test

Filter by tags using grep patterns:

```bash
# All accessibility tests
npx playwright test --grep "@accessibility"

# All performance tests
npx playwright test --grep "@performance"

# Tests matching multiple tags
npx playwright test --grep "@accessibility.*@e2e"
```

## Key Implementation Details

### Fixture Setup

Tests use the `cesiumTest` fixture which:

- Initializes mock Cesium for CI environments
- Pre-initializes the viewer
- Cleans up resources after each test
- Handles both real and mock Cesium

### Helper Utilities

Tests leverage `AccessibilityTestHelpers` for:

- Scroll-before-interact pattern
- Checkbox/toggle interaction with retry
- Element stabilization waiting
- Consistent test timing

### State Verification

Tests verify store state using:

```typescript
const storeState = await cesiumPage.evaluate(() => {
	const store = (window as any).useGlobalStore?.();
	if (store && store.clickProcessingState) {
		return {
			isProcessing: store.clickProcessingState.isProcessing,
			stage: store.clickProcessingState.stage,
			error: store.clickProcessingState.error,
			retryCount: store.clickProcessingState.retryCount,
		};
	}
	return null;
});
```

## Performance Benchmarks

### Expected Performance Metrics

1. **Immediate Feedback**: < 100ms from click to overlay visible
2. **Stage Transitions**: < 500ms between stage changes
3. **Frame Timing**: < 200ms average frame time
4. **Animation Duration**: < 3 seconds total interaction time
5. **Resource Cleanup**: < 100 DOM elements after cleanup

### Performance Tests

The suite includes specific performance validations:

- `@performance` tagged tests measure actual timing
- Frame time analysis over multiple iterations
- Main thread blocking detection
- Resource leak detection

## Accessibility Compliance

### WCAG 2.1 Coverage

1. **Perceivable**
   - Adequate color contrast (verified via computed styles)
   - Text labels for all interactive elements

2. **Operable**
   - Keyboard navigation support (Tab, Enter, Escape)
   - Focus indicators
   - No keyboard traps
   - Timeout handling

3. **Understandable**
   - Clear, descriptive button labels
   - Consistent UI patterns
   - Stage text clearly indicates progress

4. **Robust**
   - ARIA roles and attributes
   - Screen reader compatibility
   - Semantic HTML structure

### Specific ARIA Features Tested

- `role="status"` - Announces loading status
- `aria-live="polite"` - Announces stage changes without interrupting
- `aria-atomic="true"` - Announces entire overlay content
- `role="alert"` - Announces errors assertively
- `aria-label` - Accessible button labels

## Mobile Testing

### Tested Viewports

1. **Mobile (375x667)**
   - iPhone SE / 8 size
   - Touch interaction support
   - Readable overlay card size

2. **Tablet (768x1024)**
   - iPad size
   - Large screen handling
   - Landscape orientation

3. **Desktop (1920x1080)**
   - Standard desktop
   - Large screen handling

### Mobile-Specific Validations

- Overlay card width > 100px on mobile
- Z-index positioning above all other elements
- Touch-friendly button sizing
- Viewport-relative positioning

## Error Simulation

### Tested Error Scenarios

1. **Network Failures**
   - Route interception with `route.abort('failed')`
   - Timeout simulation (3-5 second delays)
   - Partial data loading

2. **State Errors**
   - Missing Cesium viewer
   - Uninitialized store
   - Reset state validation

3. **User Actions During Error**
   - Retry button interaction
   - Navigation during error state
   - State restoration

## Continuous Integration

### CI-Specific Configuration

1. **Mock Cesium Usage**
   - In CI environments, tests use mock Cesium to avoid WebGL issues
   - Mock provides camera controls and entity management
   - Real Cesium used in local development

2. **Extended Timeouts**
   - CI uses longer timeouts (60s vs 30s for local)
   - Network latency accommodation
   - Prevents flaky failures

3. **Headless Mode**
   - Tests run in headless by default
   - Can override with `--headed` for debugging
   - Screenshot on failure (configured in playwright.config.ts)

## Debugging Tips

### Run Specific Test

```bash
npx playwright test -g "should display loading overlay within 100ms"
```

### Run with UI Mode

```bash
npx playwright test tests/e2e/map-click-feedback.spec.ts --ui
```

### Debug in VS Code

Add to `.vscode/launch.json`:

```json
{
	"type": "node",
	"request": "launch",
	"name": "Playwright Debug",
	"runtimeExecutable": "${workspaceFolder}/node_modules/.bin/playwright",
	"runtimeArgs": ["test", "--debug", "${file}"],
	"console": "integratedTerminal"
}
```

### View Test Report

```bash
# Generate HTML report
npx playwright test tests/e2e/map-click-feedback.spec.ts --reporter=html

# Open report
npx playwright show-report
```

### Inspect Element Locators

In UI mode, use the element inspector to debug selectors:

1. Click the inspector icon in the UI toolbar
2. Hover over elements to see their selectors
3. Check what the test is actually finding

## Common Issues and Solutions

### Issue: "Overlay not visible within 100ms"

**Cause:** Test environment timing variance
**Solution:** Run locally with `--headed` to see actual timing

### Issue: "ARIA attributes not found"

**Cause:** Component props not applied to root element
**Solution:** Verify MapClickLoadingOverlay.vue has role, aria-live on v-overlay

### Issue: "ESC key doesn't work"

**Cause:** Event handler not attached to document or page
**Solution:** Ensure keyboard handlers are at correct scope

### Issue: "Mobile test fails on desktop"

**Cause:** Viewport-specific timing issues
**Solution:** Use `--project=chromium` to test specific browser

## Test Maintenance

### Regular Updates Needed

1. **Component Changes**
   - If MapClickLoadingOverlay.vue structure changes, update selectors
   - If stage names change, update validations
   - If new features added, add corresponding tests

2. **Store Structure Changes**
   - If globalStore.clickProcessingState structure changes, update state verification
   - If new state properties added, add corresponding tests

3. **Browser Version Updates**
   - Periodically run with newer Playwright/browser versions
   - Check for selector changes in Vuetify components
   - Verify ARIA attribute support

### Adding New Tests

Follow the existing pattern:

```typescript
cesiumTest('should [describe behavior]', async ({ cesiumPage }) => {
	// Setup
	const canvas = cesiumPage.locator('canvas').first();

	// Action
	await canvas.click({ position: { x: 400, y: 300 } });

	// Assert
	const overlay = cesiumPage.locator('.loading-card');
	await expect(overlay).toBeVisible({ timeout: 500 });
});
```

### Performance Baseline Updates

If performance expectations change:

1. Measure actual times: `console.log('[Performance] ...')`
2. Update timeout values in tests
3. Document reason for changes in commit message
4. Update this documentation

## Related Files

- **Component:** `/src/components/MapClickLoadingOverlay.vue`
- **Store:** `/src/stores/globalStore.js`
- **Feature Integration:** `/src/pages/CesiumViewer.vue`
- **Click Handler:** `/src/services/featurepicker.js`
- **Camera Control:** `/src/services/camera.js`

## Test Coverage Summary

| Category             | Tests  | Status       |
| -------------------- | ------ | ------------ |
| Immediate Feedback   | 4      | Complete     |
| Stage Progression    | 3      | Complete     |
| Cancel Functionality | 4      | Complete     |
| Error Handling       | 5      | Complete     |
| Accessibility        | 7      | Complete     |
| Performance          | 4      | Complete     |
| Multi-Click          | 3      | Complete     |
| Mobile/Responsive    | 3      | Complete     |
| Edge Cases           | 4      | Complete     |
| Cleanup              | 2      | Complete     |
| **Total**            | **39** | **Complete** |

## Success Criteria

Tests are successful when:

1. All 39 tests pass on all browsers (Chromium, Firefox, WebKit)
2. Accessibility tests verify WCAG 2.1 AA compliance
3. Performance tests confirm < 100ms feedback time
4. No flaky tests over 10 consecutive runs
5. Test execution completes in < 5 minutes
6. All error scenarios gracefully handled
7. Mobile viewport tests pass at all sizes

## Next Steps

To maintain and improve these tests:

1. Run full suite: `npm run test:e2e -- tests/e2e/map-click-feedback.spec.ts`
2. Review any failures with HTML report: `npx playwright show-report`
3. Debug specific tests with UI mode: `npx playwright test --ui`
4. Update selectors if component structure changes
5. Add new tests for new feature additions
6. Monitor performance trends over time
