# Playwright Accessibility Testing

Best practices and patterns for accessibility testing in the R4C Cesium Viewer project using Playwright.

## Test Architecture

### Fixture Setup (cesium-fixture.ts)

**Purpose**: Provides isolated Cesium viewer instance for each test.

**Key Features**:

- Mock Cesium in CI environments (faster, no WebGL)
- Real Cesium in local development (accurate testing)
- Per-test isolation (clean state for each test)
- Performance optimizations applied automatically

**Usage**:

```typescript
import { cesiumTest as test } from "../fixtures/cesium-fixture";

test.describe("Feature tests", () => {
  test("should do something", async ({ cesiumPage }) => {
    // cesiumPage has Cesium viewer ready
  });
});
```

### Helper Class (test-helpers.ts)

**AccessibilityTestHelpers** provides reusable test utilities:

- `navigateToView(viewName)` - Switch between application views
- `drillToLevel(targetLevel, selections)` - Navigate through drill-down hierarchy
- `testToggle(locator, shouldBeChecked)` - Test toggle switch interactions
- `waitForOverlaysToClose()` - Wait for loading/dialog overlays

## Accessibility Testing Checklist

### 1. Keyboard Navigation

```typescript
// Tab through interactive elements
await page.keyboard.press("Tab");
await expect(element).toBeFocused();

// Activate with Enter/Space
await element.press("Enter");
await element.press("Space"); // For buttons/checkboxes

// Arrow keys for menus/lists
await page.keyboard.press("ArrowDown");
await page.keyboard.press("ArrowUp");
```

### 2. ARIA Attributes

```typescript
// Role verification
await expect(toggle).toHaveAttribute("role", "switch");

// State verification
await expect(toggle).toHaveAttribute("aria-checked", "true");

// Label association
await expect(element).toHaveAttribute("aria-labelledby");
const labelId = await element.getAttribute("aria-labelledby");
const label = page.locator(`#${labelId}`);
await expect(label).toBeVisible();

// Expanded/collapsed state
await expect(panel).toHaveAttribute("aria-expanded", "true");
```

### 3. Screen Reader Labels

```typescript
// Accessible name verification
await expect(button).toHaveAccessibleName("Clear selection");

// Description verification
await expect(element).toHaveAccessibleDescription("Select all items");

// Hidden elements should not be in accessibility tree
const hidden = page.locator('[aria-hidden="true"]');
await expect(hidden).not.toBeInViewport();
```

### 4. Focus Management

```typescript
// Focus trap in modals
await page.keyboard.press("Tab");
const focusedElement = page.locator(":focus");
await expect(focusedElement).toBeVisible();

// Focus restoration after modal close
const beforeFocus = await page.locator(":focus");
const beforeId = await beforeFocus.getAttribute("id");

await openModal();
await closeModal();

await expect(page.locator(`#${beforeId}`)).toBeFocused();
```

### 5. Visual Indicators

```typescript
// Focus indicators visible
await element.focus();
const outline = await element.evaluate((el) => {
  const styles = window.getComputedStyle(el);
  return styles.outline !== "none" && styles.outlineWidth !== "0px";
});
expect(outline).toBe(true);

// Error states have visible indicators
await expect(errorElement).toHaveClass(/error|invalid/);
await expect(errorMessage).toBeVisible();
```

## Common Test Patterns

### Toggle Switch Testing

```typescript
test("should toggle layer visibility", async ({ cesiumPage }) => {
  const helpers = new AccessibilityTestHelpers(cesiumPage.page);
  const toggle = cesiumPage.page.locator('[data-test-id="layer-toggle"]');

  // Scroll into view first
  await toggle.scrollIntoViewIfNeeded({ timeout: 3000 });
  await cesiumPage.page.waitForTimeout(300);

  // Test toggle on
  await helpers.testToggle(toggle, true);

  // Verify ARIA state
  await expect(toggle).toHaveAttribute("aria-checked", "true");

  // Test keyboard interaction
  await toggle.focus();
  await toggle.press("Space");
  await expect(toggle).toHaveAttribute("aria-checked", "false");
});
```

### Navigation Testing

```typescript
test("should navigate between levels", async ({ cesiumPage }) => {
  const helpers = new AccessibilityTestHelpers(cesiumPage.page);

  // Navigate to view
  await helpers.navigateToView("Capital Region");

  // Drill down to postal code
  await helpers.drillToLevel("postal-code", { postalCode: "00100" });

  // Verify URL and panel visibility
  await expect(cesiumPage.page).toHaveURL(/.*postal-code=00100/);
  await expect(
    cesiumPage.page.locator('[data-panel="postal-code"]'),
  ).toBeVisible();
});
```

### Expansion Panel Testing

```typescript
test("should expand/collapse panel", async ({ cesiumPage }) => {
  const panel = cesiumPage.page.locator('[data-test-id="info-panel"]');
  const button = panel.locator("button[aria-expanded]");

  // Initial state
  await expect(button).toHaveAttribute("aria-expanded", "false");

  // Expand
  await button.scrollIntoViewIfNeeded();
  await button.click();
  await expect(button).toHaveAttribute("aria-expanded", "true");

  // Keyboard collapse
  await button.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "false");
});
```

## Viewport Testing

### Desktop Configuration (1920x1080)

```typescript
// In playwright.config.ts
{
  name: 'accessibility-desktop',
  use: {
    ...devices['Desktop Chrome'],
    viewport: { width: 1920, height: 1080 }
  }
}
```

### Responsive Testing Pattern

```typescript
test("should be responsive across viewports", async ({ cesiumPage }) => {
  // Test mobile drawer behavior
  await cesiumPage.page.setViewportSize({ width: 375, height: 667 });
  const drawer = cesiumPage.page.locator('[data-test-id="nav-drawer"]');
  await expect(drawer).toHaveClass(/mobile/);

  // Test desktop sidebar behavior
  await cesiumPage.page.setViewportSize({ width: 1920, height: 1080 });
  await expect(drawer).toHaveClass(/desktop/);
});
```

## Performance Considerations

### CesiumJS-Specific Constraints

**Critical**: Must use `workers: 1` in playwright.config.ts due to WebGL resource constraints.

```typescript
// playwright.config.ts
{
  workers: 1, // NEVER change - WebGL limitation
  fullyParallel: false
}
```

### Timeout Configuration

Keep timeouts tight for fast feedback:

```typescript
{
  actionTimeout: 5000,     // Element actions (click, fill)
  navigationTimeout: 10000, // Page navigation
  timeout: 20000,          // Per-test timeout
  expect: { timeout: 5000 } // Assertion timeout
}
```

### Avoid Long Waits

```typescript
// ❌ BAD: Fixed timeout
await page.waitForTimeout(5000);

// ✅ GOOD: Conditional wait
await page.locator('[data-loaded="true"]').waitFor({
  state: "visible",
  timeout: 5000,
});
```

## Debugging Tips

### UI Mode for Visual Debugging

```bash
npm run test:accessibility:watch
```

### Trace Viewer

Traces are automatically captured on first failure:

```bash
npm run test:accessibility:report
```

### Selector Playground

Use UI mode to generate selectors:

1. Run test in UI mode
2. Click "Pick locator" icon
3. Click element in browser
4. Copy generated selector

### Console Logs

```typescript
// Enable verbose logging
test.beforeEach(async ({ page }) => {
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
});
```

## Common Pitfalls

### 1. Testing Implementation Details

❌ **BAD**: Testing CSS classes

```typescript
await expect(element).toHaveClass("v-btn--active");
```

✅ **GOOD**: Testing accessibility semantics

```typescript
await expect(element).toHaveAttribute("aria-pressed", "true");
```

### 2. Over-Specifying Selectors

❌ **BAD**: Brittle CSS path

```typescript
const button = page.locator(
  ".v-app > .v-main > .container > button:nth-child(3)",
);
```

✅ **GOOD**: Semantic selector

```typescript
const button = page.locator('button[aria-label="Clear selection"]');
```

### 3. Not Waiting for State

❌ **BAD**: Race condition

```typescript
await button.click();
expect(await panel.isVisible()).toBe(true); // Might be false
```

✅ **GOOD**: Wait for state

```typescript
await button.click();
await expect(panel).toBeVisible({ timeout: 5000 });
```

### 4. Ignoring Viewport Position

❌ **BAD**: Click without scroll

```typescript
await element.click(); // Fails if out of viewport
```

✅ **GOOD**: Scroll first

```typescript
await element.scrollIntoViewIfNeeded();
await page.waitForTimeout(300);
await element.click();
```

## Test Organization

### File Structure

```
tests/e2e/accessibility/
├── layer-controls.spec.ts      (20 tests - layer toggles)
├── building-filters.spec.ts    (21 tests - building selection)
├── navigation-levels.spec.ts   (22 tests - drill-down)
├── expansion-panels.spec.ts    (18 tests - panel interactions)
├── timeline-controls.spec.ts   (9 tests - timeline)
├── view-modes.spec.ts          (17 tests - view switching)
└── comprehensive-walkthrough.spec.ts (11 tests - end-to-end)
```

### Test Naming Convention

```typescript
test.describe("Feature Name", () => {
  test("should [expected behavior] when [condition]", async ({
    cesiumPage,
  }) => {
    // Test implementation
  });
});
```

Examples:

- "should toggle layer visibility when clicked"
- "should maintain focus when navigating between levels"
- "should display accessible labels for all controls"

## Resources

- **Pattern Library**: `.claude/skills/test-pattern-library.md`
- **Performance Optimization**: `.claude/skills/cesium-performance-testing.md`
- **Playwright Docs**: https://playwright.dev/docs/accessibility-testing
- **WCAG Guidelines**: https://www.w3.org/WAI/WCAG21/quickref/
