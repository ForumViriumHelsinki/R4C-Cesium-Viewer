# PRP-003: Adaptive Batch Processing

## Overview

| Field           | Value                                                                     |
| --------------- | ------------------------------------------------------------------------- |
| **Priority**    | Medium                                                                    |
| **Effort**      | Medium (2-3 days)                                                         |
| **Impact**      | Smoother UI, fewer frame drops                                            |
| **Related ADR** | [ADR-001: Progressive Rendering](../adr/ADR-001-progressive-rendering.md) |
| **Status**      | Ready                                                                     |

## Problem Statement

The current batch processing uses a fixed batch size of 25 entities:

```javascript
// Current implementation in batchProcessor.js
await processBatch(entities, processor, { batchSize: 25 });
```

This causes problems:

1. **Fast Devices**: 25 entities/batch underutilizes available CPU, making loading slower than necessary
2. **Slow Devices**: 25 entities/batch may exceed frame budget, causing jank
3. **Variable Workload**: Some processors are faster than others (height calc vs color calc)

### Observed Behavior

| Device Type    | Fixed 25/batch | Frame Drops |
| -------------- | -------------- | ----------- |
| MacBook Pro M2 | 2ms/batch      | None        |
| MacBook Air M1 | 5ms/batch      | None        |
| Older Intel    | 15ms/batch     | Occasional  |
| Low-end device | 30ms/batch     | Frequent    |

The 16.67ms frame budget (60fps) is exceeded on lower-end devices.

## Objective

Implement adaptive batch sizing that automatically adjusts to maintain smooth 60fps rendering across all devices.

## Success Criteria

| Metric                      | Current  | Target              |
| --------------------------- | -------- | ------------------- |
| Frame drops during loading  | 10-30    | <5                  |
| Batch processing total time | Same     | Same or faster      |
| UI responsiveness           | Variable | Consistently smooth |

## Functional Requirements

### FR-1: Frame Budget Tracking

Monitor actual processing time per batch:

```javascript
const FRAME_BUDGET_MS = 16.67; // 60fps target
const MIN_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 100;
const INITIAL_BATCH_SIZE = 25;
```

### FR-2: Adaptive Sizing Algorithm

Adjust batch size based on measured performance:

```javascript
function calculateNextBatchSize(currentSize, elapsedMs) {
	const targetMs = FRAME_BUDGET_MS * 0.5; // Use 50% of frame budget

	// Calculate efficiency ratio
	const ratio = targetMs / elapsedMs;

	// Adjust batch size
	let nextSize = Math.floor(currentSize * ratio);

	// Apply bounds
	nextSize = Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, nextSize));

	// Smooth changes to avoid oscillation
	return Math.floor((currentSize + nextSize) / 2);
}
```

### FR-3: Per-Processor Calibration

Different processors may have different performance characteristics:

```javascript
const processorCalibration = new Map();

function getInitialBatchSize(processorName) {
	return processorCalibration.get(processorName) || INITIAL_BATCH_SIZE;
}

function updateCalibration(processorName, optimalSize) {
	processorCalibration.set(processorName, optimalSize);
}
```

### FR-4: Yield Strategy

Ensure browser can handle events between batches:

```javascript
async function yieldToMain() {
	return new Promise((resolve) => {
		if ('scheduler' in globalThis && 'yield' in scheduler) {
			// Modern browsers with Scheduler API
			scheduler.yield().then(resolve);
		} else if (typeof requestIdleCallback === 'function') {
			// Fallback to requestIdleCallback
			requestIdleCallback(resolve, { timeout: 50 });
		} else {
			// Final fallback
			setTimeout(resolve, 0);
		}
	});
}
```

## Technical Specification

### Modified `batchProcessor.js`

```javascript
// src/utils/batchProcessor.js

const FRAME_BUDGET_MS = 16.67;
const MIN_BATCH_SIZE = 5;
const MAX_BATCH_SIZE = 100;
const TARGET_UTILIZATION = 0.5; // Use 50% of frame budget

/**
 * Process items in adaptive batches that maintain 60fps
 *
 * @param {Array} items - Items to process
 * @param {Function} processor - Async function to process each item
 * @param {Object} options - Configuration options
 * @returns {Promise<void>}
 */
export async function processBatchAdaptive(items, processor, options = {}) {
	const {
		initialBatchSize = 25,
		yieldToMain: shouldYield = true,
		onProgress = null,
		processorName = 'default',
	} = options;

	if (!items?.length) return;

	let batchSize = getInitialBatchSize(processorName) || initialBatchSize;
	let processed = 0;
	const total = items.length;

	// Performance tracking
	const batchTimes = [];

	while (processed < total) {
		const batchStart = performance.now();

		// Process current batch
		const batch = items.slice(processed, processed + batchSize);
		await Promise.all(batch.map(processor));

		const batchEnd = performance.now();
		const elapsedMs = batchEnd - batchStart;

		// Track for calibration
		batchTimes.push({ size: batchSize, time: elapsedMs });

		// Calculate next batch size
		batchSize = calculateNextBatchSize(batchSize, elapsedMs);

		processed += batch.length;

		// Progress callback
		if (onProgress) {
			onProgress(processed, total);
		}

		// Yield to browser
		if (shouldYield && processed < total) {
			await yieldToMain();
		}
	}

	// Update calibration for future runs
	if (batchTimes.length > 3) {
		const avgOptimalSize = calculateOptimalSize(batchTimes);
		updateCalibration(processorName, avgOptimalSize);
	}
}

function calculateNextBatchSize(currentSize, elapsedMs) {
	const targetMs = FRAME_BUDGET_MS * TARGET_UTILIZATION;

	if (elapsedMs === 0) {
		// Instant processing - double the batch
		return Math.min(currentSize * 2, MAX_BATCH_SIZE);
	}

	const ratio = targetMs / elapsedMs;
	let nextSize = Math.floor(currentSize * ratio);

	// Apply bounds
	nextSize = Math.max(MIN_BATCH_SIZE, Math.min(MAX_BATCH_SIZE, nextSize));

	// Smooth changes (exponential moving average)
	return Math.floor(currentSize * 0.3 + nextSize * 0.7);
}

function calculateOptimalSize(batchTimes) {
	// Find batch sizes that completed within budget
	const withinBudget = batchTimes.filter((b) => b.time < FRAME_BUDGET_MS * TARGET_UTILIZATION);

	if (withinBudget.length === 0) {
		return MIN_BATCH_SIZE;
	}

	// Return the largest batch that stayed within budget
	return Math.max(...withinBudget.map((b) => b.size));
}

// Calibration persistence (session storage)
const processorCalibration = new Map();

function getInitialBatchSize(processorName) {
	// Check memory first
	if (processorCalibration.has(processorName)) {
		return processorCalibration.get(processorName);
	}

	// Check session storage
	try {
		const stored = sessionStorage.getItem(`batchSize_${processorName}`);
		if (stored) {
			const size = parseInt(stored, 10);
			processorCalibration.set(processorName, size);
			return size;
		}
	} catch {
		// Storage not available
	}

	return null;
}

function updateCalibration(processorName, optimalSize) {
	processorCalibration.set(processorName, optimalSize);

	try {
		sessionStorage.setItem(`batchSize_${processorName}`, String(optimalSize));
	} catch {
		// Storage not available
	}
}

async function yieldToMain() {
	return new Promise((resolve) => {
		if ('scheduler' in globalThis && 'yield' in globalThis.scheduler) {
			globalThis.scheduler.yield().then(resolve);
		} else if (typeof requestIdleCallback === 'function') {
			requestIdleCallback(resolve, { timeout: 50 });
		} else {
			setTimeout(resolve, 0);
		}
	});
}

// Export legacy function for backward compatibility
export async function processBatch(items, processor, options = {}) {
	const { batchSize = 25, yieldToMain: shouldYield = true } = options;

	// Use adaptive by default, but respect explicit batchSize
	if (options.adaptive !== false) {
		return processBatchAdaptive(items, processor, {
			initialBatchSize: batchSize,
			yieldToMain: shouldYield,
			...options,
		});
	}

	// Legacy fixed-size implementation
	for (let i = 0; i < items.length; i += batchSize) {
		const batch = items.slice(i, i + batchSize);
		await Promise.all(batch.map(processor));

		if (shouldYield) {
			await yieldToMain();
		}
	}
}
```

### Usage in Building Styler

```javascript
// src/services/building/buildingStyler.js

import { processBatchAdaptive } from '@/utils/batchProcessor'

async setHeatExposureToBuildings(entities, heatData) {
  await processBatchAdaptive(
    entities.values,
    async (entity) => {
      const color = this.calculateHeatColor(entity, heatData)
      entity.polygon.material = color
    },
    {
      processorName: 'heatExposure',
      onProgress: (done, total) => {
        loadingStore.setProgress('buildings', done / total)
      }
    }
  )
}

async setHelsinkiBuildingsHeight(entities) {
  await processBatchAdaptive(
    entities.values,
    async (entity) => {
      const height = calculateBuildingHeight(entity.properties)
      entity.polygon.extrudedHeight = height
    },
    {
      processorName: 'heightExtrusion'
    }
  )
}
```

## Test Plan

### Unit Tests

```javascript
describe('processBatchAdaptive', () => {
	it('should process all items', async () => {
		const items = Array.from({ length: 100 }, (_, i) => i);
		const processed = [];

		await processBatchAdaptive(items, async (item) => {
			processed.push(item);
		});

		expect(processed).toEqual(items);
	});

	it('should increase batch size for fast processors', async () => {
		const items = Array.from({ length: 200 }, (_, i) => i);
		const batchSizes = [];

		await processBatchAdaptive(
			items,
			async () => {
				// Instant processing
			},
			{
				initialBatchSize: 10,
				onProgress: (done, total) => {
					// Track batch sizes via progress jumps
				},
			}
		);

		// Final batch size should be larger than initial
		const finalSize = getInitialBatchSize('default');
		expect(finalSize).toBeGreaterThan(10);
	});

	it('should decrease batch size for slow processors', async () => {
		const items = Array.from({ length: 50 }, (_, i) => i);

		await processBatchAdaptive(
			items,
			async () => {
				// Simulate slow processing
				await new Promise((r) => setTimeout(r, 20));
			},
			{
				initialBatchSize: 50,
				processorName: 'slowTest',
			}
		);

		const finalSize = getInitialBatchSize('slowTest');
		expect(finalSize).toBeLessThan(50);
	});

	it('should respect MIN and MAX bounds', async () => {
		const items = Array.from({ length: 1000 }, (_, i) => i);

		await processBatchAdaptive(
			items,
			async () => {
				// Instant
			},
			{
				initialBatchSize: 5,
				processorName: 'boundsTest',
			}
		);

		const finalSize = getInitialBatchSize('boundsTest');
		expect(finalSize).toBeLessThanOrEqual(100); // MAX_BATCH_SIZE
		expect(finalSize).toBeGreaterThanOrEqual(5); // MIN_BATCH_SIZE
	});
});

describe('calculateNextBatchSize', () => {
	it('should increase size when under budget', () => {
		const next = calculateNextBatchSize(25, 5); // 5ms is fast
		expect(next).toBeGreaterThan(25);
	});

	it('should decrease size when over budget', () => {
		const next = calculateNextBatchSize(25, 20); // 20ms exceeds budget
		expect(next).toBeLessThan(25);
	});

	it('should maintain size when at target', () => {
		const next = calculateNextBatchSize(25, 8.3); // ~50% of 16.67ms
		expect(next).toBeCloseTo(25, 0);
	});
});
```

### Performance Tests

```javascript
describe('Adaptive Batch Performance', () => {
	it('should complete within frame budget', async () => {
		const items = Array.from({ length: 500 }, (_, i) => i);
		const frameTimes = [];

		let lastFrameTime = performance.now();

		await processBatchAdaptive(
			items,
			async () => {
				await new Promise((r) => setTimeout(r, 1));
			},
			{
				onProgress: () => {
					const now = performance.now();
					frameTimes.push(now - lastFrameTime);
					lastFrameTime = now;
				},
			}
		);

		// Most frames should be under budget
		const overBudget = frameTimes.filter((t) => t > 20).length;
		const percentOverBudget = overBudget / frameTimes.length;

		expect(percentOverBudget).toBeLessThan(0.1); // <10% over budget
	});
});
```

### Visual Testing

Manual test on various devices:

1. Open DevTools Performance panel
2. Load buildings for dense postal code
3. Check for long tasks (>50ms)
4. Verify smooth scrolling during load

## Rollout Plan

### Phase 1: Implement with Feature Flag

1. Add `processBatchAdaptive` function
2. Feature flag to switch between fixed/adaptive
3. Deploy to staging

### Phase 2: A/B Test

1. Enable adaptive for 50% of users
2. Compare frame drop metrics
3. Compare total processing time

### Phase 3: Full Rollout

1. Make adaptive the default
2. Remove legacy fixed-size code path
3. Monitor for regressions

## Acceptance Checklist

- [ ] Adaptive algorithm adjusts batch size correctly
- [ ] MIN/MAX bounds respected
- [ ] Calibration persists in session storage
- [ ] Progress callback works
- [ ] Yields to main thread between batches
- [ ] Frame drops reduced on low-end devices
- [ ] No regression on high-end devices
- [ ] Unit tests pass
- [ ] Performance tests pass
- [ ] Manual testing on various devices
