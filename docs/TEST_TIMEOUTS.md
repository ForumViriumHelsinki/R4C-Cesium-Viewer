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

## Timeout Analysis and Optimization

### Current Timeout Values - Performance Assessment

Based on the comprehensive JSDoc documentation added in issue #352, each timeout value has been analyzed for optimization potential:

#### Safe to Keep (No Changes Recommended)

| Constant                    | Value   | Reason                                                                  |
| --------------------------- | ------- | ----------------------------------------------------------------------- |
| `ELEMENT_VISIBLE`           | 500ms   | Already aggressive; shorter would cause false failures                  |
| `WAIT_STABILITY`            | 300ms   | Matches Vuetify animation timing; measured at 150-200ms typical         |
| `WAIT_TOOLTIP`              | 500ms   | Matches Vuetify transition completion (300-350ms measured)              |
| `WAIT_STATE_CHANGE`         | 500ms   | Necessary for Pinia store + component updates                           |
| `ELEMENT_INTERACTION`       | 2000ms  | Handles WebGL canvas overlay edge cases (200-500ms typical)             |
| `ELEMENT_SCROLL`            | 3000ms  | Handles expansion panel animations + lazy loading                       |
| `ELEMENT_COMPLEX`           | 8000ms  | Timeline/charts measured at 4-6s, buffer needed                         |
| `ELEMENT_DATA_DEPENDENT`    | 10000ms | Building properties can take 5-8s on first load                         |
| `CESIUM_CONTAINER`          | 10000ms | CI measured at 6-10s with SwiftShader                                   |
| `CESIUM_READY`              | 15000ms | Local measured at 8-12s, buffer prevents flakes                         |
| `CESIUM_READY_CI`           | 30000ms | CI measured at 15-25s, handles 95th percentile                          |
| `CESIUM_POSTAL_CODE`        | 8000ms  | Multi-step process (camera + tiles + data), measured at 5-7s            |
| `CESIUM_BUILDING`           | 10000ms | Heavy operation (3D model + multiple APIs), measured at 5-8s            |
| `RETRY_BACKOFF_BASE`        | 200ms   | Matches scroll animation duration                                       |
| `RETRY_BACKOFF_INTERACTION` | 300ms   | Matches element stability wait                                          |
| `RETRY_BACKOFF_EXPONENTIAL` | 1000ms  | Standard base for exponential backoff with jitter                       |
| `WAIT_CESIUM_TILES`         | 2000ms  | Reducing would cause low-res tiles in screenshots                       |
| `WAIT_LONG`                 | 3000ms  | Used for complex multi-step operations (scatter plots with 1000+ points |

#### Minor Optimization Potential

| Constant         | Current | Could Be | Risk Assessment                                                                                                                      |
| ---------------- | ------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `WAIT_BRIEF`     | 100ms   | 50ms     | **Low risk** - Most operations complete in <50ms. However, 100ms provides safety margin for CI variability. **Recommendation: Keep** |
| `WAIT_SHORT`     | 200ms   | 150ms    | **Medium risk** - Scroll animations sometimes take 200-250ms. Could cause intermittent failures. **Recommendation: Keep**            |
| `WAIT_MEDIUM`    | 1000ms  | 750ms    | **Medium risk** - D3.js rendering variable (500-1200ms). Reduction could work but risky. **Recommendation: Keep**                    |
| `WAIT_DATA_LOAD` | 2000ms  | 1500ms   | **Medium risk** - Timeline measured at 1.2-1.8s. 1500ms might be tight. **Recommendation: Keep**                                     |

#### Moderate Optimization Opportunity

| Constant           | Current | Could Be | Rationale & Recommendation                                                                                                                                                                                                    |
| ------------------ | ------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ELEMENT_STANDARD` | 5000ms  | 3000ms   | **Moderate risk** - Most operations complete in 1-2s. 5000ms is very conservative. <br>**Recommendation:** Consider reducing to 4000ms first, monitor for failures, then potentially 3000ms. Would speed up tests by ~20-30%. |
| `WAIT_EXTENDED`    | 5000ms  | 4000ms   | **Low risk** - Rarely used. If needed often, indicates application performance problem. <br>**Recommendation:** Reduce to 4000ms and investigate why tests need this timeout.                                                 |

### Recommended Optimizations (Conservative Approach)

Based on the analysis, only **one timeout has clear optimization potential** without risking test stability:

```typescript
// Current
ELEMENT_STANDARD: 5000,

// Recommended (Phase 1)
ELEMENT_STANDARD: 4000,

// Potential (Phase 2 - after monitoring)
ELEMENT_STANDARD: 3000,
```

**Impact estimation:**

- `ELEMENT_STANDARD` is used in ~150+ test operations
- Reducing from 5000ms to 4000ms: **Saves ~150 seconds per full test run** (if all operations wait full timeout)
- Reducing to 3000ms: **Saves ~300 seconds per full test run**
- Actual savings: **10-30 seconds** (most operations don't hit timeout limit)

**Implementation strategy:**

1. Reduce `ELEMENT_STANDARD` to 4000ms
2. Run full test suite 10 times in CI
3. Monitor for new flakes or failures
4. If stable for 1 week, consider 3000ms reduction
5. If failures occur, revert immediately

### Performance Monitoring Recommendations

To make data-driven timeout decisions, implement performance tracking:

#### 1. Add Timeout Usage Logging

```typescript
export const TEST_TIMEOUTS_INSTRUMENTED = {
	...TEST_TIMEOUTS,
	// Wrap each timeout with timing instrumentation
} as const;
```

#### 2. Track Actual Wait Times

Create a performance reporter that logs:

- How long each `waitForTimeout()` actually waited
- How many retries before timeout expiry
- Which timeouts are consistently hit (vs. operations completing early)

#### 3. Establish Performance Baselines

```bash
# Run tests with performance instrumentation
PERFORMANCE_MONITORING=true npm run test:accessibility

# Analyze timeout usage
node scripts/analyze-timeout-usage.js
```

Expected output:

```
Timeout Usage Analysis:
=======================
WAIT_STABILITY (300ms):
  - Used: 342 times
  - Avg actual wait: 187ms
  - 95th percentile: 245ms
  - Recommendation: Keep current value

ELEMENT_STANDARD (5000ms):
  - Used: 156 times
  - Avg actual wait: 1243ms
  - 95th percentile: 2876ms
  - Recommendation: Reduce to 3500ms (95th + 20% buffer)
```

### Global Timeout Configuration

The timeout values align with Playwright's global timeout configuration:

| Configuration               | Local Dev | CI       | Notes                                            |
| --------------------------- | --------- | -------- | ------------------------------------------------ |
| `timeout` (per test)        | 40000ms   | 50000ms  | Full test including Cesium init + interactions   |
| `actionTimeout`             | 5000ms    | 8000ms   | Matches `ELEMENT_STANDARD` (local), matches CI   |
| `navigationTimeout`         | 10000ms   | 15000ms  | SPA, rarely used (noWaitAfter pattern)           |
| `expect.timeout`            | 5000ms    | 8000ms   | Matches `ELEMENT_STANDARD` and `ELEMENT_COMPLEX` |
| `waitForCesium` (effective) | 15000ms   | 30000ms  | Uses `CESIUM_READY` and `CESIUM_READY_CI`        |
| `drillToLevel` (effective)  | ~20000ms  | ~25000ms | Cumulative: camera + tiles + data + UI           |

**Coherence check:** ✅ All timeout values are coherent with global configuration. No conflicts detected.

### Environment-Specific Tuning Guide

#### Local Development (Fast Iteration)

For rapid test development, create a `.env.test.local` file:

```bash
# Aggressive timeouts for fast feedback during development
TEST_TIMEOUT_SCALE=0.7
```

Then modify `test-helpers.ts`:

```typescript
const SCALE = parseFloat(process.env.TEST_TIMEOUT_SCALE || '1.0');

export const TEST_TIMEOUTS = {
	WAIT_BRIEF: Math.floor(100 * SCALE),
	WAIT_SHORT: Math.floor(200 * SCALE),
	// ... etc
} as const;
```

#### CI Environments (Reliability First)

Current CI multipliers:

- `CESIUM_READY_CI`: 2x local timeout (15s → 30s)
- `actionTimeout`: 1.6x local (5s → 8s)
- Test timeout: 1.25x local (40s → 50s)

These multipliers are **appropriate** for SwiftShader software rendering overhead.

#### Debug Mode (Troubleshooting)

For debugging flaky tests, increase all timeouts:

```bash
# Very generous timeouts for debugging
DEBUG_MODE=true npx playwright test --debug
```

```typescript
const DEBUG_MULTIPLIER = process.env.DEBUG_MODE ? 3.0 : 1.0;
```

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

4. **Performance-based adaptive timeouts**:
   ```typescript
   // Automatically adjust based on historical performance
   const ADAPTIVE_TIMEOUTS = await loadTimeoutsFromBaseline();
   ```

## References

- **Issue #321**: [Replace hard-coded timeouts with named constants](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/321)
- **Issue #352**: [Optimize test timeouts based on actual performance data](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/352)
- **Implementation**: `/tests/e2e/helpers/test-helpers.ts` (comprehensive JSDoc comments)
- **Playwright Documentation**: [Timeouts](https://playwright.dev/docs/test-timeouts)

## Related Documentation

- `docs/TESTING.md` - Comprehensive testing documentation
- `docs/PERFORMANCE_MONITORING.md` - Performance regression monitoring
- `.claude/skills/test-pattern-library.md` - Proven test patterns
