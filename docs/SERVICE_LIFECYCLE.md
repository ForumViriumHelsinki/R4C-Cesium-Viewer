# Service Lifecycle Management

This document explains the lifecycle management of services in the R4C Cesium Viewer application, particularly focusing on services that manage resources like event listeners, timers, and DOM references.

## Overview

Several services in the application implement `destroy()` methods to clean up resources and prevent memory leaks. This document clarifies:

1. When and how these `destroy()` methods should be called
2. Which components are responsible for cleanup
3. Best practices for adding new services

## Services with Resource Cleanup

### geocoding.js

**⚠️ Note:** The Geocoding class in `src/services/geocoding.js` appears to be legacy code. The current UnifiedSearch component (Vue 3 Composition API) implements geocoding functionality inline using the Digitransit API directly, without instantiating the Geocoding class.

**Resources managed by Geocoding class:**
- 3 event listeners (keyup, click, input)
- DOM element references (searchInput, searchButton, addressResult)

**Cleanup method:**
```javascript
destroy() {
  this.removeGeocodingEventListeners();
  this.searchField = null;
  this.searchButton = null;
  this.addressResult = null;
  this.addressData = null;
}
```

**Current UnifiedSearch.vue implementation:**
The component uses Vue's built-in lifecycle and doesn't require explicit destroy():
```vue
<!-- src/components/UnifiedSearch.vue -->
<script setup>
import { ref } from 'vue';
import Camera from '../services/camera';
import FeaturePicker from '../services/featurepicker';

// Uses reactive refs and fetch API directly
const searchQuery = ref('');
const addressResults = ref([]);

// Geocoding via Digitransit API
const fetchAddressResults = async () => {
  const response = await fetch(
    `/digitransit/geocoding/v1/autocomplete?text=${searchQuery.value}`
  );
  const data = await response.json();
  addressResults.value = processAddressData(data.features);
};

// Vue handles cleanup automatically when component unmounts
</script>
```

**No explicit cleanup needed** - UnifiedSearch uses Vue's Composition API with reactive refs that are automatically cleaned up on component unmount.

### backgroundPreloader.js

**Resources managed:**
- 5 document-level event listeners (mousedown, mousemove, keypress, scroll, touchstart)
- Idle timer (setTimeout)
- Preload queue and priority maps

**Lifecycle:**
- **Created:** Singleton instance exported by module
- **Initialized:** When CesiumViewer mounts (via warmCriticalData())
- **Destroyed:** When application unmounts (page navigation, tab close)
- **Note:** Currently, CesiumViewer does NOT call destroy() - this is a known gap

**Cleanup method:**
```javascript
destroy() {
  this.pause();
  this.removeIdleDetection();
  this.preloadQueue.clear();
  this.preloadPriorities.clear();
  console.log('Background preloader destroyed');
}
```

**Current implementation in CesiumViewer.vue:**
```vue
<!-- src/pages/CesiumViewer.vue -->
<script>
import cacheWarmer from '@/services/cacheWarmer.js';

export default {
  setup() {
    onMounted(() => {
      // cacheWarmer is singleton, called during mount
      // Uses requestIdleCallback for non-blocking initialization
      requestIdleCallback(() => {
        cacheWarmer.warmCriticalData();
      }, { timeout: 2000 });
    });

    onBeforeUnmount(() => {
      // ⚠️ MISSING: Should call cacheWarmer.destroy() here
      // Currently only cleans up ESC key handler
      document.removeEventListener('keydown', handleGlobalEscKey);
    });
  }
}
</script>
```

**Recommended fix:**
```vue
onBeforeUnmount(() => {
  // Clean up ESC key handler
  document.removeEventListener('keydown', handleGlobalEscKey);

  // Clean up background preloader
  cacheWarmer.destroy();
});
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
  }
}
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
- Custom chart renderers
- Component-specific animation controllers
- Specialized data processors

**Pattern:**
```javascript
// Service file exports class
export default class ChartRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.animationFrame = null;
  }

  start() {
    this.animationFrame = requestAnimationFrame(this.render.bind(this));
  }

  destroy() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.canvas = null;
  }
}

// In component
import ChartRenderer from '@/services/chartRenderer.js';

let renderer = null;

onMounted(() => {
  const canvas = document.getElementById('chart');
  renderer = new ChartRenderer(canvas);
  renderer.start();
});

onBeforeUnmount(() => {
  renderer?.destroy();
  renderer = null;
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

| Service | Resources | Created By | Destroyed By | Pattern | Status |
|---------|-----------|------------|--------------|---------|--------|
| geocoding.js | 3 event listeners | (Legacy - unused) | N/A | Per-component | ⚠️ Legacy code |
| backgroundPreloader.js | 5 listeners + timer | CesiumViewer | ⚠️ NOT called (should be) | Singleton | ⚠️ Missing cleanup |
| GridView.vue | 6 DOM listeners | GridView (self) | GridView.beforeUnmount() | Component-managed | ✅ Implemented |
| Scatterplot.vue | 2 DOM + 1 eventBus | Scatterplot (self) | Scatterplot.beforeUnmount() | Component-managed | ✅ Implemented |
| UnifiedSearch.vue | None (uses Vue refs) | UnifiedSearch (self) | Auto (Vue lifecycle) | Component-managed | ✅ No cleanup needed |

## Questions?

If you're unsure whether your service needs a `destroy()` method, ask:

1. **Does it attach event listeners?** → Yes, implement destroy()
2. **Does it use timers?** → Yes, implement destroy()
3. **Does it subscribe to external events?** → Yes, implement destroy()
4. **Does it maintain large data structures?** → Yes, implement destroy()
5. **Is it a pure utility (no state, no resources)?** → No, destroy() not needed

## Related Documentation

- [Memory Management Best Practices](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Memory_Management)
- [Vue Lifecycle Hooks](https://vuejs.org/guide/essentials/lifecycle.html)
- [Testing Documentation](core/TESTING.md)
