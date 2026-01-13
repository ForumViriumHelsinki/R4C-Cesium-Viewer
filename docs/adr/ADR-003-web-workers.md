# ADR-003: Web Workers for CPU-Intensive Operations

## Status

Proposed

## Date

2026-01-13

## Context

The building styling pipeline involves CPU-intensive calculations that currently execute on the main thread:

1. **Height Calculation**: For each building, determine height from `measured_height`, `i_kerrlkm` (floors), or default
2. **Heat Color Calculation**: Map heat exposure values to color gradients
3. **Property Extraction**: Parse and transform GeoJSON properties

With 1,000-10,000 buildings per postal code, this causes:

- **UI Blocking**: 200-800ms of main thread occupation
- **Frame Drops**: 10-30 dropped frames during loading
- **Poor Responsiveness**: User interactions delayed during processing

### Current Architecture

```
Main Thread:
┌─────────────────────────────────────────────────────┐
│ Fetch → Parse → [Calculate Heights] → [Apply Colors]│
│                 └── 200-800ms blocking ──┘          │
│ → User Input Blocked                                │
└─────────────────────────────────────────────────────┘
```

### Profiling Data

| Operation              | Time (1000 buildings) | Main Thread Impact |
| ---------------------- | --------------------- | ------------------ |
| Height calculation     | 50-100ms              | Blocking           |
| Color calculation      | 100-200ms             | Blocking           |
| Entity property access | 50-150ms              | Blocking           |
| **Total**              | **200-450ms**         | **Full block**     |

## Decision

Offload CPU-intensive calculations to a **dedicated Web Worker** while keeping Cesium entity manipulation on the main thread:

### Architecture

```
Main Thread:                    Web Worker:
┌──────────────────┐           ┌──────────────────┐
│ Fetch GeoJSON    │           │                  │
│       ↓          │           │                  │
│ Parse features   │──────────→│ Calculate heights│
│       ↓          │           │ Calculate colors │
│ Create entities  │           │       ↓          │
│       ↓          │←──────────│ Return style map │
│ Apply styles     │           │                  │
│ (from style map) │           │                  │
└──────────────────┘           └──────────────────┘
```

### Worker Implementation

```javascript
// src/workers/buildingStylingWorker.js
self.onmessage = ({ data: { features, heatData, config } }) => {
	const styles = features.map((feature) => {
		const props = feature.properties;

		// Height calculation (moved from entityStyling.js)
		let height = 2.7; // default
		if (props.measured_height) {
			height = props.measured_height;
		} else if (props.i_kerrlkm) {
			height = props.i_kerrlkm * 3.2;
		}

		// Heat color calculation (moved from buildingStyler.js)
		let color = [255, 255, 255, 178]; // default white
		if (heatData && props.vtj_prt) {
			const heat = heatData.find((h) => h.vtj_prt === props.vtj_prt);
			if (heat) {
				color = calculateHeatColor(heat.exposure, config.colorScale);
			}
		}

		return {
			id: feature.id || props.vtj_prt,
			height,
			color,
		};
	});

	self.postMessage({ styles });
};

function calculateHeatColor(exposure, colorScale) {
	// Color interpolation logic
	const normalized = Math.min(1, Math.max(0, exposure / 100));
	// Return RGBA array
	return interpolateColor(colorScale.low, colorScale.high, normalized);
}
```

### Main Thread Integration

```javascript
// src/services/building/buildingStyler.js
import BuildingStylingWorker from '@/workers/buildingStylingWorker?worker';

class BuildingStylerService {
	constructor() {
		this.worker = new BuildingStylingWorker();
	}

	async styleBuildings(entities, features, heatData) {
		// Send to worker
		const styles = await this.calculateStylesInWorker(features, heatData);

		// Apply styles on main thread (required for Cesium)
		await processBatch(entities.values, (entity) => {
			const style = styles.get(entity.id);
			if (style) {
				entity.polygon.extrudedHeight = style.height;
				entity.polygon.material = Cesium.Color.fromBytes(...style.color);
			}
		});
	}

	calculateStylesInWorker(features, heatData) {
		return new Promise((resolve) => {
			this.worker.onmessage = ({ data: { styles } }) => {
				resolve(new Map(styles.map((s) => [s.id, s])));
			};
			this.worker.postMessage({ features, heatData, config: this.config });
		});
	}
}
```

## Consequences

### Positive

- **Non-Blocking Calculations**: 50-70% reduction in main thread blocking
- **Responsive UI**: User can interact while calculations run
- **Parallel Processing**: Worker runs on separate CPU core
- **Scalable**: Can add more workers for larger datasets

### Negative

- **Serialization Overhead**: ~10-20ms to transfer data to/from worker
- **Code Complexity**: Logic split between worker and main thread
- **Debugging Complexity**: Worker errors harder to trace
- **Browser Support**: Workers require modern browser (all supported browsers have it)

### Neutral

- **Memory**: Worker has separate memory space (slight increase)
- **Cesium Dependency**: Cannot use Cesium types in worker (must use plain objects)

## Alternatives Considered

### Alternative 1: WebAssembly (WASM)

Compile calculation logic to WASM for faster execution.

**Not chosen because:**

- Higher implementation complexity
- Requires toolchain setup (Rust/C++)
- Marginal improvement for this workload
- Web Workers sufficient for our use case

### Alternative 2: GPU Compute (WebGPU)

Use GPU for parallel calculations.

**Not chosen because:**

- WebGPU not yet widely supported
- Overkill for this workload
- Would require significant architecture changes

### Alternative 3: Incremental Styling

Style entities one at a time in requestAnimationFrame.

**Not chosen because:**

- Still blocks between frames
- Takes longer total time
- More complex state management
- Web Workers provide better UX

### Alternative 4: OffscreenCanvas Worker

Move entire Cesium rendering to worker.

**Not chosen because:**

- Cesium doesn't fully support OffscreenCanvas
- Would require major architecture rewrite
- Risk of breaking existing functionality

## Implementation Notes

### Worker Module Setup (Vite)

```javascript
// vite.config.js - already supports ?worker imports
// No configuration needed
```

### Files to Create

1. **`src/workers/buildingStylingWorker.js`**
   - Height calculation logic
   - Color calculation logic
   - Message handling

2. **`src/workers/buildingStylingWorker.types.ts`** (optional)
   - TypeScript interfaces for worker messages

### Files to Modify

1. **`src/services/building/buildingStyler.js`**
   - Initialize worker
   - Send features to worker
   - Apply returned styles

2. **`src/utils/entityStyling.js`**
   - Extract calculation logic to shared module
   - Can be imported by both main thread and worker

### Error Handling

```javascript
this.worker.onerror = (error) => {
  logger.error('Building styling worker error:', error)
  // Fallback to main thread processing
  await this.fallbackMainThreadStyling(entities, features, heatData)
}
```

### Performance Monitoring

Add timing metrics:

```javascript
const workerStart = performance.now();
const styles = await this.calculateStylesInWorker(features, heatData);
const workerTime = performance.now() - workerStart;

logger.debug(`Worker calculation: ${workerTime}ms for ${features.length} buildings`);
```

### Testing

- Unit test worker logic in isolation
- Integration test worker communication
- Performance benchmark vs main thread
- Test fallback behavior on worker error

## References

- [Building Pipeline Analysis](../building-pipeline.md)
- [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)
- [Vite Worker Import](https://vitejs.dev/guide/features.html#web-workers)
- [Transferable Objects](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Transferable_objects)
