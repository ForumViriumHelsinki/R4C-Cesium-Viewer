---
description: Run single test file with fail-fast mode for faster iteration
---

# Test Focused Mode

Run a specific accessibility test file and stop on first failure for rapid development iteration.

## Usage

`/test-focused [filename]`

## Examples

```bash
# Run layer controls tests
/test-focused layer-controls.spec.ts

# Run building filters tests
/test-focused building-filters.spec.ts

# Run with full path
/test-focused tests/e2e/accessibility/navigation-levels.spec.ts
```

## What It Does

1. Runs the specified test file in isolation
2. Stops immediately on first failure (`--max-failures=1`)
3. Uses sequential execution (`--workers=1`) for WebGL compatibility
4. Provides fast feedback (~2-5 minutes vs 17.5 minutes for full suite)

## Implementation

Execute the corresponding bun script based on filename:

- `layer-controls.spec.ts` → `bun run test:layer-controls`
- `building-filters.spec.ts` → `bun run test:building-filters`
- `navigation-levels.spec.ts` → `bun run test:navigation-levels`
- `expansion-panels.spec.ts` → `bun run test:expansion-panels`
- `timeline-controls.spec.ts` → `bun run test:timeline-controls`
- `view-modes.spec.ts` → `bun run test:view-modes`
- `comprehensive-walkthrough.spec.ts` → `bun run test:comprehensive-walkthrough`

Or use generic command:

```bash
bun run test:accessibility:file tests/e2e/accessibility/[filename]
```

## Expected Output

```
Running 20 tests using 1 worker

✓ test 1 passed
✓ test 2 passed
❌ test 3 failed

Error: locator.click: Timeout 2000ms exceeded
  at tests/e2e/accessibility/layer-controls.spec.ts:150

1 test failed, stopping execution
```

## Workflow

1. **Identify file** with failures (from previous full run or HANDOFF_PRIMER.md)
2. **Run focused** test to see first failure quickly
3. **Fix issue** based on error and patterns from `.claude/skills/test-pattern-library.md`
4. **Re-run immediately** to verify fix
5. **Iterate** until file passes
6. **Move to next file**

## Time Savings

**Traditional workflow** (3 fixes):

- 3 full suite runs × 17.5 min = 52.5 minutes

**Focused workflow** (3 fixes):

- 3 focused runs × 3 min = 9 minutes (5.8x faster)

## Priority Order

Run tests in this order for maximum impact:

1. `layer-controls.spec.ts` (~31 failures) - Highest priority
2. `navigation-levels.spec.ts` (~22 failures)
3. `expansion-panels.spec.ts` (~18 failures)
4. `comprehensive-walkthrough.spec.ts` (~11 failures)
5. `view-modes.spec.ts` (~10 failures)
6. `timeline-controls.spec.ts` (~9 failures)

## Tips

- Use with `/test-debug` if you need visual step-through
- Check `.claude/skills/test-pattern-library.md` for common fix patterns
- Reference `building-filters.spec.ts` as template (already fixed)
- View results with `bun run test:accessibility:report`

## Resources

- **Pattern Library**: `.claude/skills/test-pattern-library.md`
- **Accessibility Testing**: `.claude/skills/playwright-accessibility-testing.md`
- **Performance**: `.claude/skills/cesium-performance-testing.md`
- **Full Documentation**: `docs/TESTING.md`
