# Performance Monitoring for Tests

This document describes the performance regression monitoring system implemented for Playwright tests in this project.

## Overview

The performance monitoring system tracks test execution times and compares them against baseline metrics to detect performance regressions early in the development cycle. This helps ensure that optimizations (like those introduced in PR #350) remain effective over time.

## Components

### 1. Performance Reporter (`tests/reporters/performance-reporter.ts`)

A custom Playwright reporter that:

- Tracks individual test duration
- Tracks suite duration
- Compares against historical baselines
- Warns if tests take >20% longer than baseline
- Fails if tests take >30% longer than baseline
- Generates JSON reports for CI integration
- Tracks timeout occurrences and retry counts

### 2. Performance Baselines (`tests/performance-baselines.json`)

A JSON file containing baseline performance metrics for each test suite and individual test. Structure:

```json
{
	"suite-name": {
		"total": 45000,
		"cesiumInit": 8000,
		"individualTests": {
			"test name": 3500,
			"another test": 4200
		}
	}
}
```

### 3. Regression Check Script (`scripts/check-performance-regression.js`)

A Node.js script that:

- Analyzes performance reports
- Identifies critical regressions (>30% slower)
- Identifies warnings (20-30% slower)
- Generates GitHub Actions summary
- Exits with appropriate error codes for CI

## Usage

### Running Performance-Monitored Tests

#### Local Development

```bash
# Run tests with performance monitoring
npm run test:performance:monitor

# Check for regressions after running tests
npm run test:performance:check

# Generate new baseline (after optimization work)
npm run test:performance:baseline
```

#### CI Environment

Performance monitoring is automatically enabled in CI environments. The performance reporter runs alongside other reporters and generates reports in `test-results/performance-report.json`.

### Understanding the Output

#### Console Output

The performance reporter prints a summary at the end of test runs:

```
================================================================================
PERFORMANCE REPORT
================================================================================

Total Duration: 156s
Total Tests: 87
Passed: 85
Failed: 2
Timeouts: 0
Average Test Duration: 3245ms
Slowest Test: should complete full user journey (55000ms)

--------------------------------------------------------------------------------
PERFORMANCE REGRESSIONS
--------------------------------------------------------------------------------
🔴 layer-controls > should handle rapid toggle switching without errors
   Baseline: 5000ms | Actual: 6800ms | +36%

🟡 building-filters > should filter buildings by type
   Baseline: 4500ms | Actual: 5600ms | +24%

================================================================================

❌ 1 critical performance regression(s) detected!
Tests are more than 30% slower than baseline. Please investigate.
```

#### Performance Report JSON

Located at `test-results/performance-report.json`, contains:

```json
{
  "timestamp": "2025-11-12T10:00:00.000Z",
  "totalDuration": 156000,
  "suites": [...],
  "regressions": [...],
  "warnings": [...],
  "summary": {
    "totalTests": 87,
    "passedTests": 85,
    "failedTests": 2,
    "avgDuration": 3245,
    "slowestTest": {...},
    "timeouts": 0
  }
}
```

### Thresholds

- **Warning (🟡)**: 20-30% slower than baseline
- **Critical (🔴)**: >30% slower than baseline (blocks CI)

### Updating Baselines

Baselines should be updated when:

1. **After performance optimizations**: New baselines reflect improved performance
2. **After intentional feature additions**: Tests may legitimately take longer
3. **Infrastructure changes**: CI environment changes may affect baseline times

To update baselines:

```bash
# 1. Run tests with performance monitoring
npm run test:performance:monitor

# 2. Review the generated report
cat test-results/performance-report.json

# 3. If times are acceptable, copy to baselines
cp test-results/performance-report.json tests/performance-baselines.json

# Or use the baseline generation command
npm run test:performance:baseline
```

**Important**: Always review baseline changes in PRs to ensure they're intentional and justified.

## CI Integration

### GitHub Actions Workflow

To integrate performance monitoring into your CI workflow, add these steps to `.github/workflows/test.yml`:

```yaml
- name: Run tests with performance monitoring
  run: npm run test:accessibility
  # Performance reporter is automatically enabled in CI

- name: Check for performance regressions
  run: npm run test:performance:check
  # This step will fail if critical regressions are detected

- name: Upload performance report
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: performance-report
    path: test-results/performance-report.json
```

### GitHub Actions Summary

The regression check script automatically generates a markdown summary when run in GitHub Actions, which appears in the workflow run summary:

- Performance metrics table
- Regression warnings and errors
- Suite-by-suite breakdown

## Metrics Tracked

### Test Execution Metrics

- Individual test duration
- Suite total duration
- Test pass/fail rates
- Retry counts
- Timeout occurrences

### Performance Indicators

- Average test duration
- Slowest test identification
- Percentage change from baseline
- Distribution of test durations

### Future Enhancements

The following metrics are planned for future implementation:

- **Cesium-specific metrics**: Initialization time, first frame render
- **Resource usage**: CPU, memory, WebGL context creation
- **CI environment metrics**: Runner type, network latency
- **Trend analysis**: Performance over time visualization
- **Flakiness correlation**: Relationship between slow tests and failures

## Troubleshooting

### Tests Flagged as Slow

1. **Verify the regression is real**: Run tests multiple times locally
2. **Check for infrastructure changes**: CI environment updates may affect timing
3. **Profile the test**: Use Playwright's trace viewer to identify bottlenecks
4. **Review recent changes**: Look for code changes that might affect performance

### Missing Baseline

If no baseline file exists, the reporter will:

1. Run tests normally
2. Generate a baseline file automatically from passing tests
3. Use this baseline for future comparisons

### False Positives

If tests are flagged incorrectly:

- Ensure consistent CI environment (same runner type)
- Check for external factors (network issues, resource contention)
- Consider increasing thresholds if environment is inherently variable
- Update baselines if changes are intentional

## Best Practices

1. **Review performance reports regularly**: Don't ignore warnings
2. **Update baselines intentionally**: Document why baselines changed
3. **Keep tests focused**: Avoid testing multiple concerns in one test
4. **Use fixture optimization**: Leverage the Cesium fixture for faster initialization
5. **Monitor trends**: Track performance over time, not just absolute values

## Related Documentation

- [Testing Documentation](./TESTING.md)
- [Playwright Performance Guide](https://playwright.dev/docs/test-performance)
- PR #350: Test Stability Improvements
- Issue #352: Timeout Optimization
- Issue #353: Performance Regression Monitoring (this feature)

## Configuration

### Environment Variables

- `PERFORMANCE_MONITORING`: Set to `"true"` to enable performance monitoring locally
- `CI`: Automatically enables performance monitoring when set (GitHub Actions sets this)
- `GITHUB_STEP_SUMMARY`: Used to generate GitHub Actions summary (automatically set in GHA)

### Reporter Options

The performance reporter can be configured in `playwright.config.ts`:

```typescript
[
	'./tests/reporters/performance-reporter.ts',
	{
		baselineFile: './tests/performance-baselines.json',
	},
];
```

### Adjusting Thresholds

To adjust warning and critical thresholds, edit `tests/reporters/performance-reporter.ts`:

```typescript
private readonly WARNING_THRESHOLD = 0.2; // 20% slower
private readonly CRITICAL_THRESHOLD = 0.3; // 30% slower
```

## Support

For questions or issues with the performance monitoring system:

1. Check this documentation
2. Review the performance report JSON for detailed metrics
3. Open an issue with the `performance` label
4. Include the performance report in bug reports
