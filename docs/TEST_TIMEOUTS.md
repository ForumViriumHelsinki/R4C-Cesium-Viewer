# Test Timeout Constants

This document explains the centralized timeout constants used throughout the test suite to replace hard-coded "magic number" timeouts.

## Overview

Previously, the test suite contained **261 hard-coded `waitForTimeout()` calls** and **264 hard-coded timeout options** scattered across test files. These magic numbers made it difficult to:

- Understand why specific timeout values were chosen
- Adjust timeouts globally for different CI/CD environments
- Maintain consistency across tests
- Tune performance for faster or slower test execution

As of **Issue #321**, all hard-coded timeouts have been replaced with named constants from `TEST_TIMEOUTS` in `/tests/e2e/helpers/test-helpers.ts`.

## Benefits

### 1. Semantic Clarity

Named constants explain **why** a timeout value was chosen:

```typescript
// Before (unclear why 500ms)
await page.waitForTimeout(500);

// After (clear purpose)
await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);
```

### 2. Global Tunability

Adjust all timeouts of a specific type in one place:

```typescript
// Change all tooltip waits from 500ms to 400ms
WAIT_TOOLTIP: 400,
```

### 3. Environment-Specific Configuration

Easy to create CI-specific timeout overrides:

```typescript
const TEST_TIMEOUTS = process.env.CI ? CI_TIMEOUTS : LOCAL_TIMEOUTS;
```

### 4. Consistency

Ensures similar operations use the same timeout values across all tests.

## Timeout Categories

### Fixed Wait Delays (`WAIT_*`)

Used with `waitForTimeout()` for element stabilization and animation delays:

| Constant            | Value  | Purpose                    | Example Use Case                         |
| ------------------- | ------ | -------------------------- | ---------------------------------------- |
| `WAIT_BRIEF`        | 100ms  | Very short UI updates      | Focus settling, quick state changes      |
| `WAIT_SHORT`        | 200ms  | Element stabilization      | Scroll retry backoff                     |
| `WAIT_STABILITY`    | 300ms  | Post-interaction stability | After check/uncheck, form input          |
| `WAIT_TOOLTIP`      | 500ms  | Tooltip/overlay animations | CSS transitions, modals, dropdowns       |
| `WAIT_STATE_CHANGE` | 500ms  | State changes to settle    | View mode switches, filter updates       |
| `WAIT_MEDIUM`       | 1000ms | Data processing            | Form submissions, API responses          |
| `WAIT_DATA_LOAD`    | 2000ms | Data loading operations    | Chart rendering, table population        |
| `WAIT_CESIUM_TILES` | 2000ms | Cesium tile loading        | After camera movement                    |
| `WAIT_LONG`         | 3000ms | Complex operations         | Multi-step processes, heavy computations |
| `WAIT_EXTENDED`     | 5000ms | Very heavy operations      | Large data sets, multiple API calls      |

### Element Interaction Timeouts (`ELEMENT_*`)

Used with `waitFor()`, `waitForSelector()`, and `expect()` options:

| Constant                 | Value   | Purpose                   | Example Use Case                   |
| ------------------------ | ------- | ------------------------- | ---------------------------------- |
| `ELEMENT_VISIBLE`        | 500ms   | Quick visibility checks   | Loading cards, toast notifications |
| `ELEMENT_INTERACTION`    | 2000ms  | Element click/interaction | Button clicks, form inputs         |
| `ELEMENT_SCROLL`         | 3000ms  | Scroll into view          | Long lists, nested navigation      |
| `ELEMENT_STANDARD`       | 5000ms  | Standard element waits    | General element visibility         |
| `ELEMENT_COMPLEX`        | 8000ms  | Complex elements          | Timeline, charts, graphs           |
| `ELEMENT_DATA_DEPENDENT` | 10000ms | Data-dependent elements   | API-fetched content                |

### CesiumJS-Specific Timeouts (`CESIUM_*`)

Timeouts for CesiumJS initialization and rendering:

| Constant             | Value   | Purpose                      | Example Use Case                 |
| -------------------- | ------- | ---------------------------- | -------------------------------- |
| `CESIUM_CONTAINER`   | 10000ms | Container initialization     | Wait for `#cesiumContainer`      |
| `CESIUM_READY`       | 15000ms | Viewer ready state           | Local development initialization |
| `CESIUM_READY_CI`    | 30000ms | Viewer ready in CI           | GitHub Actions environment       |
| `CESIUM_POSTAL_CODE` | 8000ms  | Postal code level activation | Drill-down to postal code        |
| `CESIUM_BUILDING`    | 10000ms | Building level activation    | Drill-down to building           |

### Retry Backoff Delays (`RETRY_*`)

Delays for retry logic with exponential backoff:

| Constant                    | Value  | Purpose                   | Example Use Case                                               |
| --------------------------- | ------ | ------------------------- | -------------------------------------------------------------- |
| `RETRY_BACKOFF_BASE`        | 200ms  | Base retry backoff        | Scroll retries                                                 |
| `RETRY_BACKOFF_INTERACTION` | 300ms  | Interaction retry backoff | Check/uncheck retries                                          |
| `RETRY_BACKOFF_EXPONENTIAL` | 1000ms | Exponential backoff base  | `backoffMs = RETRY_BACKOFF_EXPONENTIAL * Math.pow(2, attempt)` |

## Usage Examples

### Example 1: Basic Wait

```typescript
import { TEST_TIMEOUTS } from '../helpers/test-helpers';

// Wait for element to stabilize after clicking
await button.click();
await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);
```

### Example 2: Element Visibility with Timeout

```typescript
import { TEST_TIMEOUTS } from '../helpers/test-helpers';

// Wait for loading card to appear
await expect(loadingCard).toBeVisible({
	timeout: TEST_TIMEOUTS.ELEMENT_VISIBLE,
});
```

### Example 3: Cesium-Specific Wait

```typescript
import { TEST_TIMEOUTS } from '../helpers/test-helpers';

// Wait for Cesium container to initialize
await page.waitForSelector('#cesiumContainer', {
	state: 'visible',
	timeout: TEST_TIMEOUTS.CESIUM_CONTAINER,
});
```

### Example 4: Retry Logic with Backoff

```typescript
import { TEST_TIMEOUTS } from '../helpers/test-helpers';

for (let attempt = 1; attempt <= maxRetries; attempt++) {
	try {
		await element.check({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD });
		break;
	} catch (error) {
		if (attempt < maxRetries) {
			// Exponential backoff
			await page.waitForTimeout(TEST_TIMEOUTS.RETRY_BACKOFF_INTERACTION * attempt);
		}
	}
}
```

### Example 5: Environment-Specific Timeout

```typescript
import { TEST_TIMEOUTS } from '../helpers/test-helpers';

// Use longer timeout in CI environment
await page.waitForSelector('#cesiumContainer', {
	timeout: process.env.CI ? TEST_TIMEOUTS.CESIUM_READY_CI : TEST_TIMEOUTS.CESIUM_READY,
});
```

## Migration Summary

### Replacement Statistics

| Category                 | Count   | Description                            |
| ------------------------ | ------- | -------------------------------------- |
| `waitForTimeout()` calls | 261 → 0 | All replaced with named constants      |
| Timeout options          | 264 → 0 | All replaced with named constants      |
| Files modified           | 23      | Test files now importing TEST_TIMEOUTS |

### Most Common Replacements

| Hard-Coded Value       | Replacement                            | Occurrences |
| ---------------------- | -------------------------------------- | ----------- |
| `waitForTimeout(500)`  | `TEST_TIMEOUTS.WAIT_TOOLTIP`           | 53          |
| `waitForTimeout(1000)` | `TEST_TIMEOUTS.WAIT_MEDIUM`            | 51          |
| `waitForTimeout(2000)` | `TEST_TIMEOUTS.WAIT_DATA_LOAD`         | 41          |
| `waitForTimeout(3000)` | `TEST_TIMEOUTS.WAIT_LONG`              | 33          |
| `waitForTimeout(300)`  | `TEST_TIMEOUTS.WAIT_STABILITY`         | 29          |
| `timeout: 500`         | `TEST_TIMEOUTS.ELEMENT_VISIBLE`        | 35          |
| `timeout: 10000`       | `TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT` | 15          |

## Best Practices

### 1. Choose the Right Category

Use the timeout category that matches the **purpose**, not just the numeric value:

```typescript
// ❌ Wrong - using WAIT_TOOLTIP for data loading
await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP); // 500ms - too short!

// ✅ Right - using DATA_LOAD for data operations
await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD); // 2000ms
```

### 2. Import Only Once Per File

```typescript
// At the top of your test file
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from '../helpers/test-helpers';
```

### 3. Use Comments for Complex Logic

```typescript
// Wait for CesiumJS tiles to load after camera movement
await page.waitForTimeout(TEST_TIMEOUTS.WAIT_CESIUM_TILES);
```

### 4. Prefer Playwright's Built-in Waits

Only use `waitForTimeout()` when necessary. Prefer:

```typescript
// ❌ Avoid - polling with arbitrary timeout
await page.waitForTimeout(1000);
await expect(element).toBeVisible();

// ✅ Better - let Playwright poll automatically
await expect(element).toBeVisible({
	timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
});
```

### 5. Use Appropriate Timeouts for CI

CI environments may be slower, so use longer timeouts:

```typescript
const timeout = process.env.CI ? TEST_TIMEOUTS.CESIUM_READY_CI : TEST_TIMEOUTS.CESIUM_READY;
```

## Intentional Non-Replacement

Some timeout patterns were intentionally left as calculated values:

### Exponential Backoff with Multiplier

```typescript
// Intentional - dynamically calculated based on attempt number
await page.waitForTimeout(200 * scrollAttempt);
await page.waitForTimeout(300 * attempt);
await page.waitForTimeout(500 * attempt);
```

### Exponential Backoff with Power

```typescript
// Intentional - exponential backoff formula
const backoffMs = 1000 * Math.pow(1.5, attempt) + Math.random() * 500;
await page.waitForTimeout(backoffMs);
```

### Special Fallback Timeouts

```typescript
// Intentional - conditional timeout based on environment
timeout: process.env.CI ? 30000 : 15000;
```

These patterns are acceptable because they:

1. Are calculated dynamically based on context
2. Have clear semantic meaning from the calculation
3. Are used in retry logic where the multiplier is the key factor

## Troubleshooting

### Tests Failing After Migration

If tests fail after this change:

1. **Check import path**: Ensure TEST_TIMEOUTS is imported correctly

   ```typescript
   import { TEST_TIMEOUTS } from '../helpers/test-helpers';
   ```

2. **Verify timeout is appropriate**: The new timeout might be shorter/longer
   - If too short: Switch to a longer timeout category
   - If too long: Tests may be unnecessarily slow but should still pass

3. **Check for typos**: Ensure constant names are correct

   ```typescript
   // ❌ Wrong
   TEST_TIMEOUTS.WAIT_TOOLIP; // typo

   // ✅ Right
   TEST_TIMEOUTS.WAIT_TOOLTIP;
   ```

### Adjusting Timeout Values

To adjust timeout values globally:

1. Edit `/tests/e2e/helpers/test-helpers.ts`
2. Modify the `TEST_TIMEOUTS` constant
3. Run tests to verify: `npm run test:accessibility`

### Adding New Timeout Constants

If you need a new timeout constant:

1. Add it to the appropriate category in `TEST_TIMEOUTS`
2. Document its purpose with an inline comment
3. Update this documentation file

## Future Enhancements

Potential improvements for the timeout system:

1. **Environment-based timeout profiles**:

   ```typescript
   const TIMEOUT_PROFILES = {
   	local: {
   		/* fast timeouts */
   	},
   	ci: {
   		/* slower timeouts */
   	},
   	debug: {
   		/* very slow timeouts */
   	},
   };
   ```

2. **Automatic timeout scaling**:

   ```typescript
   const TIMEOUT_SCALE = process.env.CI ? 2.0 : 1.0;
   const TEST_TIMEOUTS = scaleTimeouts(BASE_TIMEOUTS, TIMEOUT_SCALE);
   ```

3. **Per-test timeout overrides**:
   ```typescript
   test.use({ timeoutProfile: 'slow' });
   ```

## References

- **Issue**: [#321 Replace hard-coded timeouts with named constants](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/321)
- **Implementation**: `/tests/e2e/helpers/test-helpers.ts` (lines 17-67)
- **Playwright Documentation**: [Timeouts](https://playwright.dev/docs/test-timeouts)

## Related Documentation

- `docs/TESTING.md` - Comprehensive testing documentation
- `docs/PERFORMANCE_MONITORING.md` - Performance regression monitoring
- `.claude/skills/test-pattern-library.md` - Proven test patterns
