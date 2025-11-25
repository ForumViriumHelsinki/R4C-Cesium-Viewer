# Core Development Documentation

This directory contains essential development documentation for the R4C Cesium Viewer project.

## Contents

- [TESTING.md](./TESTING.md) - Testing strategies, test categories, and how to run tests
- [PERFORMANCE_MONITORING.md](./PERFORMANCE_MONITORING.md) - Performance regression monitoring and optimization
- [FEATURE_FLAGS.md](./FEATURE_FLAGS.md) - Feature flag system and available flags
- [TEST_INFRASTRUCTURE_LEARNINGS.md](./TEST_INFRASTRUCTURE_LEARNINGS.md) - Lessons learned from test infrastructure development

## Quick Start

For testing:

```bash
npm run test:accessibility        # Run all accessibility tests
npm run test:layer-controls       # Run single test file (fast iteration)
npx playwright test --ui          # Interactive UI mode
```

For performance monitoring:

```bash
npm run test:performance:monitor  # Run tests with performance tracking
npm run test:performance:check    # Check for regressions
```

## Related Documentation

- [../GETTING_STARTED.md](../GETTING_STARTED.md) - Local development setup
- [../database/](../database/) - Database documentation
