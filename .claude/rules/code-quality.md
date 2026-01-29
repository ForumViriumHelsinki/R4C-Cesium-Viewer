# Code Quality

## Event Listener Cleanup

**CRITICAL**: All event listeners MUST be removed on component unmount to prevent memory leaks.

### Vue Components

```javascript
// ✅ CORRECT: Capture handler references and clean up
let motionMediaQuery = null;
let handleMotionChange = null;

onMounted(() => {
	motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
	handleMotionChange = (e) => {
		prefersReducedMotion.value = e.matches;
	};
	motionMediaQuery.addEventListener('change', handleMotionChange);
});

onUnmounted(() => {
	if (motionMediaQuery && handleMotionChange) {
		motionMediaQuery.removeEventListener('change', handleMotionChange);
	}
});
```

```javascript
// ✅ CORRECT: Track multiple listeners for cleanup
const eventCleanupFunctions = [];

onMounted(() => {
	const handler = () => {
		/* logic */
	};
	element.addEventListener('click', handler);
	eventCleanupFunctions.push(() => element.removeEventListener('click', handler));
});

onUnmounted(() => {
	eventCleanupFunctions.forEach((cleanup) => cleanup());
	eventCleanupFunctions.length = 0;
});
```

```javascript
// ❌ WRONG: Listener added but never removed
onMounted(() => {
	element.addEventListener('click', () => {
		/* logic */
	});
	// Missing cleanup in onUnmounted!
});
```

### Vue Watchers

```javascript
// ✅ CORRECT: Capture stop handlers
import { watch, onUnmounted } from 'vue';

const stopWatcher1 = watch(
	() => store.value,
	(newValue) => {
		// logic
	}
);

const stopWatcher2 = watch(
	() => toggleStore.setting,
	(newValue) => {
		// logic
	}
);

onUnmounted(() => {
	stopWatcher1();
	stopWatcher2();
});
```

```javascript
// ❌ WRONG: Watchers without cleanup
watch(
	() => store.value,
	(newValue) => {
		// logic - will continue running after component unmount!
	}
);
```

## Async/Promise Error Handling

### Never Use `void` Operator

```javascript
// ❌ WRONG: Errors silently swallowed
void featurePicker.loadPostalCode();
void treeService.loadTrees();
```

```javascript
// ✅ CORRECT: Proper error handling
featurePicker.loadPostalCode().catch((error) => {
	logger.error('Failed to load postal code:', error);
	loadingStore.setError('Failed to load postal code data');
});

// ✅ CORRECT: If truly fire-and-forget, document why
// This is intentionally fire-and-forget because it's a non-critical background preload
treeService.loadTrees().catch(logger.error);
```

### Replace `.catch(console.error)`

```javascript
// ❌ WRONG: Error logged but UI doesn't reflect failure
loadData().catch(console.error);
```

```javascript
// ✅ CORRECT: Update UI state on error
loadData().catch((error) => {
	logger.error('Failed to load data:', error);
	loadingStore.setLoadingError('dataKey', 'Failed to load data');
	// Optionally: notify user, trigger retry, cleanup
});
```

### Avoid Unnecessary Promise Constructors

```javascript
// ❌ WRONG: Unnecessary wrapper around async function
async removeDataSourcesByNamePrefix(namePrefix) {
    return new Promise((resolve, reject) => {
        Promise.all(removalPromises)
            .then(() => resolve())
            .catch((error) => reject(error))
    })
}
```

```javascript
// ✅ CORRECT: Use async/await directly
async removeDataSourcesByNamePrefix(namePrefix) {
    await Promise.all(removalPromises)
}
```

**Exception**: `new Promise()` is valid when wrapping callback-based APIs:

```javascript
// ✅ CORRECT: Wrapping callback API
function waitForIdle() {
	return new Promise((resolve) => {
		requestIdleCallback(resolve);
	});
}
```

### Use `.finally()` for Cleanup

```javascript
// ✅ CORRECT: Cleanup guaranteed to run
this.loadTile(tileKey)
	.then(() => {
		// Success handling
	})
	.catch((error) => {
		logger.error('Failed to load tile:', error);
	})
	.finally(() => {
		this.activeLoads--;
		this.loadingTiles.delete(tileKey);
		this.processLoadingQueue().catch(logger.error);
	});
```

## Logging

### Use Logger Utility, Not Console

**ALWAYS** use the logger utility from `src/utils/logger.js`:

```javascript
// ✅ CORRECT
import { logger } from '@/utils/logger';

logger.debug('[Service] Loading data...'); // Dev only
logger.info('User logged in'); // Production OK
logger.warn('Deprecated API usage'); // Always visible
logger.error('Failed to save:', error); // Always visible
```

```javascript
// ❌ WRONG: Direct console usage
console.log('[Service] Loading data...');
console.warn('Deprecated API usage');
console.error('Failed to save:', error);
```

**Exceptions**: Intentional console output like version banners in `src/version.js`.

### Decision Matrix

| Use Case         | Method           | Visibility |
| ---------------- | ---------------- | ---------- |
| Debug/trace info | `logger.debug()` | Dev only   |
| Operational info | `logger.info()`  | Always     |
| Warnings         | `logger.warn()`  | Always     |
| Errors           | `logger.error()` | Always     |

## Constants vs Magic Values

### Extract Magic Numbers

```javascript
// ❌ WRONG: Magic numbers
if (height > 50000) {
	// ...
}
setTimeout(() => {}, 1500);
```

```javascript
// ✅ CORRECT: Named constants
import { VIEWPORT, TIMING } from '@/constants';

if (height > VIEWPORT.MAX_CAMERA_HEIGHT_FOR_BUILDINGS) {
	// ...
}
setTimeout(() => {}, TIMING.CAMERA_DEBOUNCE_MS);
```

### Extract Magic Strings

```javascript
// ❌ WRONG: Magic codes repeated throughout
const codes = ['221', '222', '223', '224'];
if ([511, 131].includes(kayttotark) || (kayttotark > 210 && kayttotark < 240)) {
	// ...
}
```

```javascript
// ✅ CORRECT: Named constants with documentation
import { TREE_HEIGHT_CODES, SOTE_BUILDING_CODES } from '@/constants';

const codes = TREE_HEIGHT_CODES.ALL;
if (SOTE_BUILDING_CODES.isSoteBuilding(kayttotark)) {
	// ...
}
```

### Organize Constants

```
src/constants/
├── index.js           # Re-exports all
├── treeCodes.js       # Tree height categories
├── buildingCodes.js   # Building use codes
├── timing.js          # Timeouts, delays, debounce
├── viewport.js        # Camera heights, thresholds
├── dates.js           # Reference dates
└── performance.js     # Batch sizes, limits
```

## Component Size Limits

### Maximum Lines

| Type          | Recommended Max | Action if Exceeded                           |
| ------------- | --------------- | -------------------------------------------- |
| Vue Component | 400 lines       | Extract composables or child components      |
| Service File  | 300 lines       | Split into focused modules                   |
| Function      | 80 lines        | Extract helper functions                     |
| Nesting Depth | 3 levels        | Refactor with early returns or extract logic |

### Component Refactoring Patterns

**Extract Composables** (for large Vue components):

```javascript
// src/composables/useViewportLoading.js
export function useViewportLoading(viewer, store) {
	const handleCameraSettled = async () => {
		/* ... */
	};
	const updateViewportBuildings = async () => {
		/* ... */
	};
	return { handleCameraSettled, updateViewportBuildings };
}

// In component
import { useViewportLoading } from '@/composables/useViewportLoading';
const { handleCameraSettled, updateViewportBuildings } = useViewportLoading(viewer, store);
```

**Split Services** (for large service files):

```
src/services/building/
├── index.js              # Re-exports (backward compatibility)
├── buildingLoader.js     # Data fetching
├── buildingFilter.js     # Filtering logic
├── buildingStyler.js     # Visual styling
└── buildingHighlighter.js # Selection
```

**Extract Child Components** (for complex UI):

```
src/components/MapControls/
├── MapControls.vue         # Parent container
├── DataLayerControls.vue   # Trees, vegetation
└── VisualizationControls.vue # Heat, statistics
```

## Batch Processing

**Always use** the batch processor utility for large datasets:

```javascript
// ✅ CORRECT
import { processBatch } from '@/utils/batchProcessor';

await processBatch(
	items,
	async (item) => {
		await processItem(item);
	},
	{ batchSize: 25, yieldToMain: true }
);
```

```javascript
// ❌ WRONG: Manual batch processing duplicated
for (let i = 0; i < items.length; i += 25) {
	const batch = items.slice(i, i + 25);
	await Promise.all(batch.map(processItem));
	await new Promise((resolve) => requestIdleCallback(resolve));
}
```

## Vue 3 Composition API

### Prefer Composition API Over Options API

```javascript
// ✅ CORRECT: Full Composition API
import { onMounted } from 'vue';

const treeService = new Tree();
const buildingService = new Building();

onMounted(() => {
	// Initialization logic
});
```

```javascript
// ❌ WRONG: Mixing Options and Composition APIs
mounted() {
    this.treeService = new Tree()
    this.buildingService = new Building()
}
// Plus Composition API code elsewhere
```

## Complexity Reduction

### Use Early Returns

```javascript
// ✅ CORRECT: Early returns reduce nesting
function filterBuildings(entities, filterParams) {
	if (!filterParams.hideNewBuildings && !filterParams.hideNonSote) {
		return entities;
	}

	return entities.filter((entity) => {
		if (filterParams.hideNewBuildings && isNew(entity)) return false;
		if (filterParams.hideNonSote && !isSote(entity)) return false;
		return true;
	});
}
```

```javascript
// ❌ WRONG: Deep nesting
function filterBuildings(entities, filterParams) {
	if (filterParams.hideNewBuildings || filterParams.hideNonSote) {
		return entities.filter((entity) => {
			if (filterParams.hideNewBuildings) {
				if (isNew(entity)) {
					return false;
				} else {
					if (filterParams.hideNonSote) {
						// ... more nesting
					}
				}
			}
		});
	}
}
```

### Extract Predicates

```javascript
// ✅ CORRECT: Extracted predicates
const createFilterPredicates = (params) => ({
	shouldHideAsNew: (entity) => params.hideNewBuildings && isNew(entity),
	shouldHideAsNonSote: (entity) => params.hideNonSote && !isSote(entity),
});

function filterBuildings(entities, filterParams) {
	const predicates = createFilterPredicates(filterParams);
	return entities.filter(
		(entity) => !predicates.shouldHideAsNew(entity) && !predicates.shouldHideAsNonSote(entity)
	);
}
```
