---
description: Run tests in UI mode for visual debugging with step-by-step execution
---

# Test Debug Mode

Launch Playwright UI mode for interactive visual debugging of accessibility tests.

## Usage

`/test-debug [optional: filename or pattern]`

## Examples

```bash
# Debug all accessibility tests
/test-debug

# Debug specific file
/test-debug layer-controls.spec.ts

# Debug tests matching pattern
/test-debug "toggle layer visibility"
```

## What It Does

Opens Playwright's UI mode which provides:

1. **Visual test execution** - See browser interactions in real-time
2. **Step-by-step debugging** - Pause and step through each action
3. **Selector playground** - Generate and test selectors interactively
4. **Time travel debugging** - Replay test execution
5. **Console output** - View logs and errors as they happen

## Implementation

Execute Playwright UI mode command:

```bash
# All tests
bunx playwright test tests/e2e/accessibility --ui

# Specific file
bunx playwright test tests/e2e/accessibility/[filename] --ui

# Pattern match
bunx playwright test tests/e2e/accessibility --ui --grep "[pattern]"
```

## UI Mode Features

### 1. Watch Mode

- Tests rerun automatically when files change
- Fast feedback during development
- No need to manually restart

### 2. Selector Picker

1. Click "Pick locator" button
2. Click element in browser
3. Get recommended selector
4. Test selector in real-time

### 3. Timeline Scrubbing

- Drag timeline slider to any point in test
- See exact page state at that moment
- Identify where things go wrong

### 4. Action Inspection

- Click any action in test
- See before/after screenshots
- View logs and console output
- Understand failure context

### 5. Browser DevTools

- Full Chrome/Firefox DevTools access
- Inspect elements during test pause
- Debug JavaScript issues
- Profile performance

## When to Use Debug Mode

### Use Debug Mode For:

- Understanding complex test failures
- Figuring out why selectors don't work
- Exploring application state during tests
- Developing new test patterns
- Investigating timing issues

### Use Focused Mode Instead:

- Quick iteration on known failures
- Running tests in CI/CD
- Verifying fixes work
- Batch testing multiple files

## Workflow

1. **Run focused test first** to identify failure
2. **Switch to debug mode** to investigate
3. **Use selector picker** to find reliable selectors
4. **Step through** to understand timing
5. **Fix in code** based on findings
6. **Re-run focused** to verify fix

## Example Session

```bash
# 1. Find failure quickly
bun run test:layer-controls
# ❌ Fails at line 150: click timeout

# 2. Debug to understand why
/test-debug layer-controls.spec.ts
# - Step through to line 150
# - Use selector picker to test selector
# - Notice element is out of viewport

# 3. Apply fix from pattern library
# Add scroll-before-interact from .claude/skills/test-pattern-library.md

# 4. Verify fix
bun run test:layer-controls
# ✓ Passes
```

## Tips

### Pause Test Execution

```typescript
// Add to test to pause at specific point
await page.pause();
```

### Slow Motion

```typescript
// In playwright.config.ts for debugging
use: {
	launchOptions: {
		slowMo: 1000; // 1 second delay between actions
	}
}
```

### Screenshot on Failure

Already configured in playwright.config.ts:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure'
}
```

### Console Logging

```typescript
// Log page console to terminal
test.beforeEach(async ({ page }) => {
	page.on('console', (msg) => console.log('PAGE:', msg.text()));
});
```

## Troubleshooting

### UI Mode Won't Open

```bash
# Install UI dependencies
bunx playwright install --with-deps
```

### Tests Run Too Fast

Add slowMo or use pause() breakpoints

### Can't See Errors

Check browser console tab in UI mode

### Selector Picker Not Working

Ensure browser has focus when clicking "Pick locator"

## Resources

- **Playwright UI Mode Docs**: https://playwright.dev/docs/test-ui-mode
- **Debugging Guide**: https://playwright.dev/docs/debug
- **Selector Best Practices**: `.claude/skills/playwright-accessibility-testing.md`
- **Common Patterns**: `.claude/skills/test-pattern-library.md`

## Alternative: Headed Mode

For simpler debugging without full UI:

```bash
# Run with visible browser
bunx playwright test tests/e2e/accessibility/layer-controls.spec.ts --headed

# With additional debugging
bunx playwright test --headed --debug
```

## Keyboard Shortcuts in UI Mode

- `Space` - Pause/Resume test
- `F10` - Step over action
- `F11` - Step into action
- `Shift+F11` - Step out
- `Ctrl/Cmd+R` - Rerun test
- `Ctrl/Cmd+P` - Pick locator
