# Service Lifecycle Management

This document explains the lifecycle management of services in the R4C Cesium Viewer application, particularly focusing on services that manage resources like event listeners, timers, and DOM references.

## Overview

Several services in the application implement `destroy()` methods to clean up resources and prevent memory leaks. This document clarifies:

1. When and how these `destroy()` methods should be called
2. Which components are responsible for cleanup
3. Best practices for adding new services

## Services with Resource Cleanup

### geocoding.js

**Resources managed:**

- 3 event listeners (keyup, click, input)
- DOM element references (searchInput, searchButton, searchResults)

**Lifecycle:**

- **Created:** When UnifiedSearch component mounts
- **Destroyed:** When UnifiedSearch component unmounts

**Cleanup method:**

```javascript
destroy() {
  if (this.searchInput) {
    this.searchInput.removeEventListener('keyup', this.boundHandleSearch);
  }
  if (this.searchButton) {
    this.searchButton.removeEventListener('click', this.boundHandleSearch);
  }
  if (this.searchResults) {
    this.searchResults.removeEventListener('input', this.boundHandleSelection);
  }

  // Nullify references
  this.searchInput = null;
  this.searchButton = null;
  this.searchResults = null;
}
```

**Implementation in component:**

```vue
<!-- src/components/UnifiedSearch.vue -->
<script>
import Geocoding from '@/services/geocoding.js';

export default {
	setup() {
		let geocodingService = null;

		onMounted(() => {
			geocodingService = new Geocoding();
			// Use the service...
		});

		onBeforeUnmount(() => {
			if (geocodingService) {
				geocodingService.destroy();
				geocodingService = null;
			}
		});
	},
};
</script>
```

### backgroundPreloader.js

**Resources managed:**

- 5 document-level event listeners
- Idle timer (setTimeout)
- Map collections (landcoverLayersMap, floodLayersMap)

**Lifecycle:**

- **Created:** During application initialization in CesiumViewer
- **Destroyed:** When application unmounts (page navigation, tab close)

**Cleanup method:**

```javascript
destroy() {
  this.stopBackgroundLoading();

  if (this.idleTimer) {
    clearTimeout(this.idleTimer);
    this.idleTimer = null;
  }

  // Remove all event listeners
  document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  document.removeEventListener('focus', this.resetIdleTimer);
  document.removeEventListener('blur', this.pauseLoading);
  // ... (additional listeners)

  // Clear map collections
  this.landcoverLayersMap.clear();
  this.floodLayersMap.clear();
}
```

**Implementation in component:**

```vue
<!-- src/pages/CesiumViewer.vue -->
<script>
import cacheWarmer from '@/services/cacheWarmer.js';

export default {
	setup() {
		onMounted(async () => {
			// cacheWarmer is singleton, initialized during mount
			await cacheWarmer.start();
		});

		onBeforeUnmount(() => {
			// Clean up when page/app unmounts
			cacheWarmer.destroy();
		});
	},
};
</script>
```

## Vue Component Lifecycle Integration

### GridView.vue and Scatterplot.vue

These components manage their own DOM event listeners directly in the component lifecycle:

**Pattern used:**

```vue
<script>
export default {
	data() {
		return {
			// Store bound function references for cleanup
			boundHandleNumericalChange: null,
			boundHandleSelectChange: null,
			// ... more bound functions
		};
	},

	mounted() {
		// Create bound function references
		this.boundHandleNumericalChange = this.handleNumericalChange.bind(this);

		// Add event listeners
		const element = document.getElementById('someElement');
		if (element) {
			element.addEventListener('change', this.boundHandleNumericalChange);
		}
	},

	beforeUnmount() {
		// Remove event listeners using the same bound references
		const element = document.getElementById('someElement');
		if (element) {
			element.removeEventListener('change', this.boundHandleNumericalChange);
		}

		// Nullify references
		this.boundHandleNumericalChange = null;
	},
};
</script>
```

**Why this pattern?**

- Event listeners require the **exact same function reference** for removal
- Binding creates a new function, so we store it for later cleanup
- Checking element existence prevents errors if DOM changed

## Service Instance Patterns

### Singleton Services

**When to use:** Services that should exist once for the entire application lifetime.

**Examples:**

- `cacheWarmer` (backgroundPreloader.js)

**Pattern:**

```javascript
// Service file exports singleton instance
export default new BackgroundPreloader();

// In component
import cacheWarmer from '@/services/cacheWarmer.js';

onMounted(() => cacheWarmer.start());
onBeforeUnmount(() => cacheWarmer.destroy());
```

### Per-Component Services

**When to use:** Services that are scoped to a single component's lifecycle.

**Examples:**

- Geocoding service in UnifiedSearch

**Pattern:**

```javascript
// Service file exports class
export default class Geocoding { ... }

// In component
import Geocoding from '@/services/geocoding.js';

let geocodingService = null;

onMounted(() => {
  geocodingService = new Geocoding();
});

onBeforeUnmount(() => {
  geocodingService?.destroy();
  geocodingService = null;
});
```

## Best Practices for New Services

### 1. Always Implement destroy() for Resource Management

If your service manages any of the following, implement a `destroy()` method:

- Event listeners (DOM, window, document)
- Timers (setTimeout, setInterval)
- External subscriptions (eventBus, observables)
- Large data structures (Maps, Sets, arrays)
- WebSocket connections
- Animation frames (requestAnimationFrame)

### 2. Document Resource Ownership

Add JSDoc comments explaining:

```javascript
/**
 * My Service
 *
 * **Lifecycle:**
 * - Created: When SomeComponent mounts
 * - Destroyed: When SomeComponent unmounts
 *
 * **Cleanup responsibility:** Parent component must call destroy() in beforeUnmount
 *
 * **Resources managed:**
 * - 2 event listeners on window object
 * - 1 interval timer for periodic updates
 * - Large cache Map with 1000+ entries
 */
export default class MyService {
  constructor() { ... }

  /**
   * Cleanup all resources and prevent memory leaks
   * MUST be called before service is discarded
   */
  destroy() { ... }
}
```

### 3. Defensive Cleanup

Always check for existence before cleanup:

```javascript
destroy() {
  // Check before removing listeners
  if (this.element) {
    this.element.removeEventListener('click', this.boundHandler);
  }

  // Clear timers safely
  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }

  // Clear collections
  this.cache?.clear();

  // Nullify references
  this.element = null;
  this.boundHandler = null;
}
```

### 4. Test Cleanup

Add unit tests verifying cleanup:

```javascript
it('should cleanup all resources on destroy', () => {
	const service = new MyService();
	const removeListenerSpy = vi.spyOn(element, 'removeEventListener');

	service.destroy();

	expect(removeListenerSpy).toHaveBeenCalledWith('click', expect.any(Function));
	expect(service.timer).toBeNull();
});
```

## Common Memory Leak Scenarios

### ❌ Missing Cleanup

```javascript
// BAD: Event listener never removed
mounted() {
  window.addEventListener('resize', this.handleResize);
}
// Component unmounts → listener still active → memory leak
```

### ✅ Proper Cleanup

```javascript
// GOOD: Event listener properly removed
mounted() {
  this.boundHandleResize = this.handleResize.bind(this);
  window.addEventListener('resize', this.boundHandleResize);
}

beforeUnmount() {
  window.removeEventListener('resize', this.boundHandleResize);
  this.boundHandleResize = null;
}
```

### ❌ Timer Not Cleared

```javascript
// BAD: setInterval keeps running
mounted() {
  this.timer = setInterval(() => {
    this.updateData();
  }, 5000);
}
// Component unmounts → timer still running → memory leak
```

### ✅ Timer Cleanup

```javascript
// GOOD: Timer cleared on unmount
mounted() {
  this.timer = setInterval(() => this.updateData(), 5000);
}

beforeUnmount() {
  if (this.timer) {
    clearInterval(this.timer);
    this.timer = null;
  }
}
```

## Verification Checklist

Use Chrome DevTools to verify cleanup:

1. **Memory Profiler:**
   - Take heap snapshot before navigation
   - Navigate to/from views multiple times
   - Take another heap snapshot
   - Compare: should not see growing detached DOM nodes or event listeners

2. **Performance Tab:**
   - Record during navigation
   - Check for lingering timers after unmount
   - Verify no unexpected function calls post-unmount

3. **Console Logs:**
   - Add `console.log('[Service] Destroyed')` in destroy methods
   - Verify logs appear during navigation

## Service Cleanup Summary Table

| Service                | Resources               | Created By         | Destroyed By                  | Pattern           |
| ---------------------- | ----------------------- | ------------------ | ----------------------------- | ----------------- |
| geocoding.js           | 3 event listeners       | UnifiedSearch      | UnifiedSearch.beforeUnmount() | Per-component     |
| backgroundPreloader.js | 5 listeners + timer     | CesiumViewer       | CesiumViewer.beforeUnmount()  | Singleton         |
| GridView.vue           | 6 DOM listeners         | GridView (self)    | GridView.beforeUnmount()      | Component-managed |
| Scatterplot.vue        | 2 DOM + 1 eventBus      | Scatterplot (self) | Scatterplot.beforeUnmount()   | Component-managed |
| buildingLoader.js      | AbortController + state | Building service   | cancelCurrentLoad()           | Request lifecycle |
| toggleStore.js         | Grid visibility state   | Store (self)       | onExitPostalCode()            | Navigation hooks  |
| globalStore.js         | Pending navigation      | Store (self)       | consumePendingNavigation()    | Latest-wins queue |

## Request Lifecycle Management

Some services manage in-flight HTTP requests that may need cancellation during navigation transitions.

### Request Cancellation Pattern

**BuildingLoader** (`src/services/building/buildingLoader.js`)

The building loader implements request cancellation to prevent stale data from overwriting fresher navigation targets:

```javascript
class BuildingLoader {
	constructor() {
		this._abortController = null;
		this._currentLayerId = null;
	}

	// Track currently active request
	get activeLayerId() {
		return this._currentLayerId;
	}

	// Cancel any in-flight request
	cancelCurrentLoad() {
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
		this._currentLayerId = null;
	}

	async loadBuildings(postalCode) {
		// Cancel previous request
		this.cancelCurrentLoad();

		// Create new abort controller
		this._abortController = new AbortController();
		this._currentLayerId = postalCode;

		try {
			const response = await fetch(url, {
				signal: this._abortController.signal,
			});
			// ... process response
		} catch (error) {
			if (error.name === 'AbortError') {
				// Request was cancelled - this is expected
				return null;
			}
			throw error;
		}
	}
}
```

**When to cancel:**

- User clicks new postal code while current one is loading
- User navigates back to start level
- User switches view modes (GridView, PostalCodeView)

**Integration in FeaturePicker:**

```javascript
// Before starting new navigation
this.buildingService.cancelCurrentLoad()

// In reset functions
reset() {
  this.buildingService.cancelCurrentLoad()
  // ... other cleanup
}
```

### Latest-Wins Navigation Pattern

**GlobalStore** (`src/stores/globalStore.js`)

Queues the most recent user click to prevent dropped inputs during rapid navigation:

```javascript
// State
clickProcessingState: {
  isProcessing: false,
  pendingNavigation: null  // { postalCode: string, postalCodeName: string }
}

// Actions
setPendingNavigation(navigation) {
  this.clickProcessingState.pendingNavigation = navigation
}

clearPendingNavigation() {
  this.clickProcessingState.pendingNavigation = null
}

consumePendingNavigation() {
  const pending = this.clickProcessingState.pendingNavigation
  this.clickProcessingState.pendingNavigation = null
  return pending
}
```

**Usage in postalCodeLoader.js:**

```javascript
// After parallel loading completes, check for pending navigation
const pendingNavigation = processParallelLoadingResults(
	results,
	// ... other params
	() => store.clickProcessingState.pendingNavigation
);

if (pendingNavigation && onNavigationRequest) {
	// Navigate to the pending target instead of staying on current
	onNavigationRequest(pendingNavigation);
}
```

### Visibility Coordination Pattern

**ToggleStore** (`src/stores/toggleStore.js`)

Manages layer visibility during navigation level transitions:

```javascript
// State
_previousGrid250m: false  // Tracks grid state before entering postal code

// Lifecycle hooks
onEnterPostalCode() {
  // Save and hide grid when entering postal code level
  if (this.grid250m) {
    this._previousGrid250m = true
    this.grid250m = false
  }
}

onExitPostalCode() {
  // Restore grid when leaving postal code level
  if (this._previousGrid250m) {
    this.grid250m = true
    this._previousGrid250m = false
  }
}
```

**Integration points:**

- `featurepicker/index.js` - calls `onEnterPostalCode()` when navigating to postal code
- `App.vue`, `PostalCodeView.vue`, `GridView.vue` - call `onExitPostalCode()` when leaving

## Questions?

If you're unsure whether your service needs a `destroy()` method, ask:

1. **Does it attach event listeners?** → Yes, implement destroy()
2. **Does it use timers?** → Yes, implement destroy()
3. **Does it subscribe to external events?** → Yes, implement destroy()
4. **Does it maintain large data structures?** → Yes, implement destroy()
5. **Is it a pure utility (no state, no resources)?** → No, destroy() not needed
6. **Does it make HTTP requests that could become stale?** → Yes, implement cancelCurrentLoad()

## Related Documentation

- [Memory Management Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [Vue Lifecycle Hooks](https://vuejs.org/guide/essentials/lifecycle.html)
- [Testing Memory Leaks](../TESTING.md#memory-leak-testing)
