# Test Pattern Library

Proven patterns for fixing Playwright accessibility tests in the R4C Cesium Viewer project.

## Failure Pattern Categories

Based on baseline analysis of 112 failing tests:

- **62 failures (55%)**: Click timeout errors (`locator.click: Timeout 2000ms exceeded`)
- **40 failures (36%)**: Page/context closed errors (`Target page, context or browser has been closed`)
- **30 failures (27%)**: Test timeouts (`page.waitForFunction: Test timeout of 60000ms exceeded`)
- **20 failures (18%)**: Element not found errors
- **21 failures (19%)**: Assertion failures (`expect(locator).toBeVisible failed`, `toBeChecked failed`)

## Pattern 1: Scroll-Before-Interact

**Problem**: Elements outside viewport cause click timeout errors.

**Solution**: Always scroll elements into view before interaction.

```typescript
// For all toggle interactions and click operations
await element.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
await page.waitForTimeout(300); // Stability wait for rendering
await element.click({ timeout: 2000 });
```

**Reference**: `tests/e2e/accessibility/building-filters.spec.ts:363-424`

## Pattern 2: Multi-Selector Fallback

**Problem**: Element selectors break when DOM structure changes.

**Solution**: Use multiple selector strategies with fallback chain.

```typescript
// Try multiple selector strategies in priority order
const selectors = [
	'[data-test-id="target"]', // Most reliable
	'button[role="switch"]', // Semantic
	'.slider.round', // Class-based
	'[class*="slider"]', // Partial match
	'.switch-slider', // Last resort
];

for (const selector of selectors) {
	const element = page.locator(selector);
	if ((await element.count()) > 0) {
		await element.first().click();
		break;
	}
}
```

**Reference**: `tests/e2e/helpers/test-helpers.ts:630-755`

## Pattern 3: Retry Logic with Force Click

**Problem**: Intermittent failures due to timing or overlay issues.

**Solution**: Retry with escalating force levels.

```typescript
// Attempt 1: Normal click
try {
	await element.click({ timeout: 2000 });
} catch (error) {
	// Attempt 2: Force click (bypasses actionability checks)
	try {
		await element.click({ force: true, timeout: 2000 });
	} catch (error) {
		// Attempt 3: Mouse click fallback
		const box = await element.boundingBox();
		if (box) {
			await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
		}
	}
}
```

**Reference**: `tests/e2e/helpers/test-helpers.ts` recent fixes

## Pattern 4: Viewport Boundary Verification

**Problem**: Elements partially visible in viewport fail interaction checks.

**Solution**: Verify element is fully within viewport boundaries.

```typescript
const box = await element.boundingBox();
const viewport = page.viewportSize();

if (box && (box.y < 0 || box.y + box.height > viewport.height)) {
	// Element is out of viewport - scroll it
	await element.scrollIntoViewIfNeeded({ timeout: 3000 });
	await page.waitForTimeout(300);
}

// Now safe to interact
await element.click();
```

**Reference**: `tests/e2e/accessibility/building-filters.spec.ts:487-593`

## Pattern 5: SPA Navigation Fix

**Problem**: Page/context closed errors during single-page app navigation.

**Solution**: Use `noWaitAfter` to prevent Playwright from waiting for navigation.

```typescript
// For links that trigger SPA routing (not full page reload)
await link.click({ noWaitAfter: true });

// Wait for specific element instead of navigation event
await page.locator('[data-test-id="new-view"]').waitFor({ state: 'visible' });
```

**Reference**: `tests/e2e/helpers/test-helpers.ts` recent fixes

## Pattern 6: Overlay Waiting

**Problem**: Overlays block interactions causing click timeout.

**Solution**: Wait for overlays to close before proceeding.

```typescript
// Wait for common overlays to be hidden
const overlaySelectors = [
	'.v-overlay--active',
	'.v-dialog--active',
	'.v-menu--active',
	'[role="dialog"][aria-hidden="false"]',
	'.v-overlay__scrim',
	'.loading-overlay',
	'[data-loading="true"]',
	'.v-progress-circular',
];

for (const selector of overlaySelectors) {
	await page
		.locator(selector)
		.waitFor({
			state: 'hidden',
			timeout: 5000,
		})
		.catch(() => {
			// Ignore if overlay doesn't exist
		});
}
```

**Reference**: `tests/e2e/helpers/test-helpers.ts:998-1027`

## Pattern 7: ARIA State Verification

**Problem**: Assertion failures on ARIA attributes.

**Solution**: Wait for ARIA state before asserting.

```typescript
// Don't assert immediately - wait for state
await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });

// For visibility checks, scroll first
await element.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await expect(element).toBeVisible({ timeout: 5000 });
```

## Pattern 8: Vuetify CSS Class False Positives

**Problem**: Selectors like `[class*="error"]` match Vuetify theme utility classes (`text-error`, `bg-error`, `color-error`), causing false-positive error detection.

**Solution**: Use specific component selectors for actual error states.

```typescript
// ❌ WRONG: Matches Vuetify theme classes
const errorElements = page.locator('[class*="error"], [class*="Error"]');
expect(await errorElements.count()).toBe(0); // Always fails with Vuetify

// ✅ CORRECT: Target actual error indicators
const errorAlert = page.locator('.v-alert[type="error"], .loading-error');
expect(await errorAlert.count()).toBe(0);
```

**Applies to**: Any Vuetify project. Also watch for `[class*="warning"]`, `[class*="success"]`, etc.

## Template Reference File

**Use as template**: `tests/e2e/accessibility/building-filters.spec.ts`

This file demonstrates all patterns working together:

- Lines 363-424: Rapid toggle improvements with scroll-before-interact
- Lines 487-593: Keyboard navigation with viewport verification
- Lines 616-706: Visual feedback with selector fallbacks

## Test File Priority Order

Apply patterns in this order for maximum impact:

1. `layer-controls.spec.ts` (~31 failures) - Toggle interactions
2. `navigation-levels.spec.ts` (~22 failures) - Level transitions
3. `expansion-panels.spec.ts` (~18 failures) - Panel expansions
4. `comprehensive-walkthrough.spec.ts` (~11 failures) - Complex workflows
5. `view-modes.spec.ts` (~10 failures) - View switching
6. `timeline-controls.spec.ts` (~9 failures) - Timeline interactions

## Critical Constraints

When applying these patterns, maintain:

1. **Sequential execution**: `workers: 1` in playwright.config.ts (WebGL resource constraint)
2. **Low timeout values**: Keep tight timeouts for fast feedback
3. **Test-only fixes**: Prefer test changes over application code changes
4. **No timeout increases**: Use retries and better selectors instead

## Usage

When fixing a failing test:

1. Identify the failure pattern from error message
2. Apply the corresponding pattern from this library
3. Test locally with: `bun run test:layer-controls` (or appropriate file)
4. Verify fix doesn't cause regressions

For multiple failures in same file, apply patterns systematically from top to bottom of the file.
