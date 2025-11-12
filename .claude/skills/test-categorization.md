# Test Categorization and Tag-Based Organization

Best practices for organizing and categorizing tests in the R4C Cesium Viewer project using tags and constants.

## Overview

This project uses a comprehensive test organization system with:
- **Test tags** for selective test execution
- **Centralized constants** for maintainability
- **Clear categorization** for better CI/CD pipeline configuration

## Test Tags

### Available Tags

Tests are categorized using the following tags:

#### Test Type Tags
- `@e2e` - End-to-end tests (Playwright)
- `@unit` - Unit tests (Vitest)
- `@integration` - Integration tests (Vitest)
- `@smoke` - Quick smoke tests for basic functionality

#### Feature/Domain Tags
- `@accessibility` - Accessibility testing (ARIA, keyboard navigation, screen readers)
- `@performance` - Performance and load time testing
- `@wms` - WMS (Web Map Service) integration tests
- `@cesium` - CesiumJS-specific functionality tests
- `@ui` - User interface interaction tests

### Tag Syntax

The syntax differs between Playwright and Vitest:

**Playwright tests** (use `tag` - singular):
```typescript
test("Page load", { tag: ["@e2e", "@smoke"] }, async ({ page }) => {
  // Test implementation
});
```

**Vitest tests** (use `tags` - plural):
```typescript
describe("WMS Service", { tags: ["@unit", "@wms"] }, () => {
  it("should handle requests", () => {
    // Test implementation
  });
});
```

### Nested Tag Usage (Advanced Pattern)

For complex test suites, you can apply tags at different nesting levels to add domain-specific categorization:

```typescript
test.describe("R4C Climate Visualization Comprehensive Tests", () => {
  test.use({ tag: ["@e2e", "@comprehensive"] });

  test.describe("HSY Background Maps Integration", () => {
    test.use({ tag: ["@wms"] }); // Adds @wms to all tests in this block

    test("should load WMS layers", async ({ page }) => {
      // This test has tags: @e2e, @comprehensive, @wms
    });
  });
});
```

**Benefits of nested tags:**
- Apply base tags to entire test suite
- Add domain-specific tags to test subsets
- Avoid repetition in individual test declarations
- Makes it easy to run all WMS tests: `npx playwright test --grep @wms`

**Note:** Nested `test.use({ tag: [...] })` calls are additive in Playwright, merging tags from parent and child scopes.

### Selective Test Execution

Run specific test categories using the `--grep` flag:

```bash
# Run all accessibility tests
npx playwright test --grep @accessibility

# Run all performance tests
npx playwright test --grep @performance

# Run smoke tests only
npx playwright test --grep @smoke

# Run WMS integration tests
npx playwright test --grep @wms

# Combine tags (AND logic)
npx playwright test --grep "@accessibility.*@smoke"

# Exclude tags (NOT logic)
npx playwright test --grep-invert @performance
```

### Tag Naming Conventions

1. **Always use @ prefix**: Tags start with `@` for consistency
2. **Use lowercase**: All tags are lowercase (`@accessibility`, not `@Accessibility`)
3. **Use hyphens for multi-word tags**: e.g., `@smoke-test` (though current tags are single words)
4. **Be specific**: Choose descriptive tags that clearly indicate test purpose
5. **Limit to 2-3 tags per test**: Avoid over-tagging

## Test Constants

### Constants File Location

All test constants are centralized in: `tests/config/constants.ts`

### Available Constant Groups

#### 1. API Endpoints
```typescript
import { API_ENDPOINTS } from '../config/constants';

// Usage in tests
await page.waitForRequest(API_ENDPOINTS.WMS_PROXY);
await page.waitForRequest(API_ENDPOINTS.DIGITRANSIT);
```

Available endpoints:
- `WMS_PROXY` - Helsinki WMS proxy
- `DIGITRANSIT` - Public transport API
- `PAAVO` - Statistics Finland postal code data
- `PYGEOAPI` - Finland's geo data portal
- `TERRAIN_PROXY` - Helsinki 3D terrain data

#### 2. Bundle Size Budgets
```typescript
import { BUNDLE_SIZE_BUDGETS } from '../config/constants';

// Usage in performance tests
expect(bundleSize).toBeLessThan(BUNDLE_SIZE_BUDGETS.MAX_MAIN_BUNDLE);
expect(cesiumChunk).toBeGreaterThan(BUNDLE_SIZE_BUDGETS.MIN_CESIUM_CHUNK);
```

Available budgets:
- `MIN_CESIUM_CHUNK` - 100KB minimum for Cesium library
- `MAX_MAIN_BUNDLE` - 500KB budget for largest bundle
- `BYTES_PER_KIB` - 1024 conversion factor

#### 3. Web Vitals Budgets
```typescript
import { WEB_VITALS_BUDGETS } from '../config/constants';

// Usage in performance tests
expect(fcpTime).toBeLessThan(WEB_VITALS_BUDGETS.FCP_MAX);
expect(lcpTime).toBeLessThan(WEB_VITALS_BUDGETS.LCP_MAX);
```

Available budgets:
- `FCP_MAX` - First Contentful Paint (2000ms)
- `LCP_MAX` - Largest Contentful Paint (3000ms)
- `DOM_INTERACTIVE_MAX` - DOM Interactive (5000ms)

#### 4. Viewports
```typescript
import { VIEWPORTS } from '../config/constants';

// Usage in responsive tests
await page.setViewportSize(VIEWPORTS.MOBILE);
await page.setViewportSize(VIEWPORTS.TABLET);
await page.setViewportSize(VIEWPORTS.DESKTOP_HD);
```

Available viewports:
- `MOBILE` - { width: 375, height: 667 } (iPhone SE)
- `TABLET` - { width: 768, height: 1024 } (iPad)
- `DESKTOP_HD` - { width: 1920, height: 1080 }

## Best Practices

### When Adding New Tests

1. **Always add appropriate tags** to new tests
2. **Use constants instead of magic numbers/URLs**
3. **Choose tags that reflect test purpose**, not just test type
4. **Add multiple tags** when tests span categories

Example:
```typescript
test("Layer controls are keyboard accessible",
  { tag: ["@e2e", "@accessibility", "@smoke"] },
  async ({ page }) => {
    await page.goto(API_ENDPOINTS.BASE_URL);
    // Test implementation
  }
);
```

### When Creating New Constants

1. **Add constants to `tests/config/constants.ts`**
2. **Group related constants** together
3. **Use `as const`** for type safety
4. **Add explanatory comments** for business logic

Example:
```typescript
export const NEW_BUDGETS = {
  MAX_RESPONSE_TIME: 1000, // 1s maximum API response time
  MIN_FPS: 30, // Minimum acceptable frame rate for animations
} as const;
```

### CI/CD Pipeline Configuration

Tags enable selective test execution in CI/CD:

```yaml
# Example GitHub Actions workflow
- name: Run smoke tests
  run: npx playwright test --grep @smoke

- name: Run accessibility tests
  run: npx playwright test --grep @accessibility

- name: Run performance tests
  run: npx playwright test --grep @performance
```

## Tag Coverage Guidelines

### Minimum Tags Required
- **Every test** should have at least one test type tag (`@e2e`, `@unit`, or `@integration`)
- **Critical path tests** should also have `@smoke` tag
- **Specialized tests** should have domain tags (`@accessibility`, `@performance`, etc.)

### Tag Matrix

| Test Type | Required Tags | Optional Tags |
|-----------|---------------|---------------|
| Basic E2E | `@e2e` | `@smoke`, `@ui` |
| Accessibility | `@e2e`, `@accessibility` | `@smoke` |
| Performance | `@e2e`, `@performance` | - |
| Unit test | `@unit` | Domain-specific |
| Integration | `@integration` | Domain-specific |

## Common Patterns

### Pattern 1: Smoke Test Suite
Quick validation of critical functionality:
```typescript
test("App loads successfully",
  { tag: ["@e2e", "@smoke"] },
  async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#cesium-container')).toBeVisible();
  }
);
```

### Pattern 2: Accessibility Tests
ARIA and keyboard navigation validation:
```typescript
test("Layer controls keyboard navigation",
  { tag: ["@e2e", "@accessibility"] },
  async ({ page }) => {
    const toggle = page.getByRole('switch', { name: 'Buildings' });
    await toggle.focus();
    await page.keyboard.press('Space');
    await expect(toggle).toHaveAttribute('aria-checked', 'true');
  }
);
```

### Pattern 3: Performance Tests
Using constants for performance budgets:
```typescript
test("Bundle size within budget",
  { tag: ["@performance", "@e2e"] },
  async () => {
    const stats = await getBuildStats();
    expect(stats.mainBundle).toBeLessThan(BUNDLE_SIZE_BUDGETS.MAX_MAIN_BUNDLE);
  }
);
```

### Pattern 4: WMS Integration Tests
API endpoint testing with constants:
```typescript
describe("WMS Service", { tags: ["@unit", "@wms"] }, () => {
  it("should construct correct URL", () => {
    const url = buildWmsUrl(params);
    expect(url).toContain(API_ENDPOINTS.WMS_PROXY);
  });
});
```

## Migration Guide

### Converting Existing Tests

When updating old tests to use tags and constants:

1. **Identify test type** and add primary tag
2. **Identify test domain** and add domain tag(s)
3. **Replace magic numbers** with constants
4. **Replace hard-coded URLs** with API endpoint constants

**Before:**
```typescript
test("Page loads", async ({ page }) => {
  await page.goto('/');
  await page.setViewportSize({ width: 1920, height: 1080 });
  const response = await page.waitForRequest('/helsinki-wms');
  expect(response.timing().responseEnd).toBeLessThan(3000);
});
```

**After:**
```typescript
test("Page loads",
  { tag: ["@e2e", "@performance", "@smoke"] },
  async ({ page }) => {
    await page.goto('/');
    await page.setViewportSize(VIEWPORTS.DESKTOP_HD);
    const response = await page.waitForRequest(API_ENDPOINTS.WMS_PROXY);
    expect(response.timing().responseEnd).toBeLessThan(WEB_VITALS_BUDGETS.LCP_MAX);
  }
);
```

## Benefits

### 1. Selective Execution
Run only relevant tests during development:
```bash
# Working on accessibility features?
npx playwright test --grep @accessibility

# Need quick feedback?
npx playwright test --grep @smoke
```

### 2. Better CI/CD
Configure different test suites for different stages:
- **Pre-commit**: `@smoke` tests only
- **PR validation**: `@e2e` and `@unit` tests
- **Nightly**: Full suite including `@performance`

### 3. Improved Maintainability
- **Single source of truth**: Change a constant once, update everywhere
- **Clear categorization**: Easy to find related tests
- **Better documentation**: Tags self-document test purpose

### 4. Faster Iteration
- **Targeted testing**: Run only what you need
- **Reduced feedback loop**: Smoke tests complete in seconds
- **Clear organization**: Know which tests cover which features

## References

- **Constants file**: `tests/config/constants.ts`
- **Example Playwright tests**: `tests/e2e/accessibility/layer-controls.spec.ts`
- **Example Vitest tests**: `tests/unit/services/wms.test.js`
- **Performance tests**: `tests/performance/load.test.ts`
- **CLAUDE.md testing section**: Main project documentation

## Related Skills

- `test-pattern-library.md` - Patterns for fixing test failures
- `playwright-accessibility-testing.md` - Accessibility testing best practices
- `cesium-performance-testing.md` - Performance optimization patterns
