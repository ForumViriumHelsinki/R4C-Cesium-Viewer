# Code Quality

## CSS Theming (Dark Mode)

**ALWAYS** use Vuetify CSS variables for colors. Never introduce hardcoded color values.

### Transformation Rules

| Hardcoded value                             | Replacement                               |
| ------------------------------------------- | ----------------------------------------- |
| `rgba(0, 0, 0, X)` (text/border/background) | `rgba(var(--v-theme-on-surface), X)`      |
| `rgba(255, 255, 255, X)`                    | `rgba(var(--v-theme-surface), X)`         |
| `#1976d2` / primary blue                    | `rgb(var(--v-theme-primary))`             |
| `background: white` / `#fff`                | `background: rgb(var(--v-theme-surface))` |
| `color: black` / `#000`                     | `color: rgb(var(--v-theme-on-surface))`   |

```css
/* ✅ CORRECT: Theme-aware */
background: rgba(var(--v-theme-surface), 0.95);
color: rgba(var(--v-theme-on-surface), 0.8);
border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
outline: 2px solid rgb(var(--v-theme-primary));
```

```css
/* ❌ WRONG: Hardcoded — breaks in dark mode */
background: rgba(255, 255, 255, 0.95);
color: rgba(0, 0, 0, 0.8);
border: 1px solid rgba(0, 0, 0, 0.12);
outline: 2px solid #1976d2;
```

### Exceptions (Leave Hardcoded)

| Context                            | Reason                                       |
| ---------------------------------- | -------------------------------------------- |
| `box-shadow` values                | Shadows work fine hardcoded in both themes   |
| D3 chart data/scale colors         | Semantic data colors, not UI chrome          |
| Cesium entity colors in `<script>` | Map data visualization, not UI               |
| JS-string inline styles            | CSS variables don't work in JS style objects |

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

## Request Lifecycle Management

### Cancellable Requests

For services that load data which may become stale (e.g., user navigates away before load completes), implement request cancellation:

```javascript
// ✅ CORRECT: Cancellable request pattern
class DataLoader {
	constructor() {
		this._abortController = null;
		this._currentRequestId = null;
	}

	get activeRequestId() {
		return this._currentRequestId;
	}

	cancelCurrentLoad() {
		if (this._abortController) {
			this._abortController.abort();
			this._abortController = null;
		}
		this._currentRequestId = null;
	}

	async load(id) {
		// Cancel previous request before starting new one
		this.cancelCurrentLoad();

		this._abortController = new AbortController();
		this._currentRequestId = id;

		try {
			const response = await fetch(url, {
				signal: this._abortController.signal,
			});
			return await response.json();
		} catch (error) {
			if (error.name === 'AbortError') {
				return null; // Expected cancellation
			}
			throw error;
		}
	}
}
```

```javascript
// ❌ WRONG: No cancellation - stale data may overwrite fresh data
async load(id) {
  const response = await fetch(url)
  this.data = await response.json()  // May overwrite newer data!
}
```

### Latest-Wins Pattern

For user interactions that may fire rapidly (e.g., clicks), queue the latest request:

```javascript
// ✅ CORRECT: Queue pending navigation
if (store.isProcessing) {
	store.setPendingNavigation({ target, name });
	loader.cancelCurrentLoad();
	return; // Don't start new navigation while processing
}

// After processing completes
const pending = store.consumePendingNavigation();
if (pending) {
	navigateTo(pending);
}
```

```javascript
// ❌ WRONG: Drop user input while processing
if (store.isProcessing) {
	return; // User's click is lost!
}
```

### Per-Host Concurrency Coordination

Per-request cancellation handles in-flight cleanup; it does **not** coordinate concurrency across many requests sharing a rate-limited upstream. When multiple independent loaders fan out parallel fetches to the same proxy (`/pygeoapi/*`, `/wms/proxy/*`, etc.), use a host-keyed semaphore so the gateway sees a bounded request rate regardless of how many call sites are active.

```javascript
// ✅ CORRECT: Gate each fetch behind a per-host semaphore
import { acquireHostSlot, setHostLimit } from '@/services/hostConcurrencyLimiter';

// Optional per-host tuning (defaults to DEFAULT_LIMIT)
setHostLimit('pygeoapi', 3);

async function fetchWithLimit(url, options) {
	const release = await acquireHostSlot(url, options.signal);
	try {
		return await fetch(url, options);
	} finally {
		release(); // idempotent; safe in finally + on retry/return paths
	}
}
```

The limiter keys absolute URLs by `URL.hostname` and relative URLs by their first path segment (matching Vite's proxy buckets). Two callers requesting `/pygeoapi/x` and `/pygeoapi/y` share one budget; a caller to `/wms/proxy/z` has its own. See `src/services/hostConcurrencyLimiter.js`.

**When to reach for it:**

- Multiple loaders fire parallel requests to the same proxy and you're seeing HTTP 429s
- An upstream's rate limit is enforced at a gateway/WAF, not at the application — concurrency caps in the loader itself can't prevent overload because they're scoped to one loader
- You want per-host tunability for benchmarking (different upstreams have different real-world limits)

**Edge cases:**

- The releaser must be called in `finally` — a thrown fetch (network error, timeout) leaks a slot otherwise
- On retry paths, release before sleeping so other waiters can use the slot during backoff
- Pass the request's `AbortSignal` into `acquireHostSlot` so a queued waiter unblocks promptly when its caller cancels

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

### Guard `response.json()` Against SPA Catch-All

`response.ok` only tells you the HTTP status is 2xx. It does **not** tell you the body is JSON. FVH apps deployed behind nginx (`try_files ... /index.html`) or Envoy Gateway (no `/oauth2/*` upstream rule) silently fall through to the SPA's `index.html` and return `200 OK` with `text/html` for any unmatched path. A naive `await response.json()` then throws `SyntaxError` on the HTML body — and if it lives inside a bare `catch {}`, the misconfiguration becomes invisible.

Always check `content-type` before parsing, and log loudly on the mismatch so the gateway/proxy issue is visible in production logs.

```ts
// ✅ CORRECT: defensive parse with single warn-once on misconfiguration
const response = await fetch('/oauth2/userinfo');
if (!response.ok) {
	logger.debug('userinfo not available (status %d)', response.status);
	return;
}

const contentType = response.headers.get('content-type') ?? '';
if (!contentType.toLowerCase().includes('application/json')) {
	if (!this.warnedOnce) {
		this.warnedOnce = true; // Pinia state — see "Once-per-app warn flags" below
		logger.warn(
			'/oauth2/userinfo returned non-JSON (content-type: %s); ' +
				'the OIDC proxy is likely not in front of the app.',
			contentType || '(missing)'
		);
	}
	return;
}

const data = await response.json();
```

```ts
// ❌ WRONG: SyntaxError on text/html body is swallowed by bare catch
try {
	const response = await fetch('/oauth2/userinfo');
	if (!response.ok) return;
	const data = await response.json(); // throws on HTML body
	// ...
} catch {
	// Silent — the misconfiguration is now invisible
}
```

**Once-per-app warn flags.** When the misconfiguration would otherwise log on every call (route change, periodic refresh), gate the `logger.warn` on a "warned once" flag stored on **Pinia state**, not a module-scoped `let`. Production: the singleton's lifetime gives the right "once per page load" semantics. Tests: `setActivePinia(createPinia())` in `beforeEach` resets it cleanly per test — a module-scoped flag would leak across cases.

Apply the same pattern to any fetch against a same-origin endpoint that might be served by the SPA's catch-all (feature-flag bootstraps, version endpoints, etc.).

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

### Gate UI on `initialized` for Async-Fetched State

When a store hydrates from an async source in `onMounted` (auth via `/oauth2/userinfo`, feature flags via OpenFeature, user profile, etc.), the initial reactive value is whatever the store defaults to — almost always the unauthenticated / disabled / empty case. Rendering UI on that default state during the in-flight round-trip produces a flash of the wrong affordance: a "Sign in" button briefly shown to an already-authenticated user, a feature toggle showing off before the override loads, a name field blank before the profile lands.

Stores that fetch asynchronously should track an `initialized: boolean` and components should gate visibility on **both** the value AND `initialized`.

```vue
<!-- ✅ CORRECT: menu stays empty until fetchUserInfo resolves -->
<v-list-item
	v-if="userStore.initialized && userStore.isAuthenticated"
	title="Sign out"
	@click="signOut"
/>
<v-list-item v-else-if="userStore.initialized" title="Sign in" @click="signIn" />
```

```vue
<!-- ❌ WRONG: "Sign in" flashes for authenticated users during fetch -->
<v-list-item v-if="userStore.isAuthenticated" title="Sign out" @click="signOut" />
<v-list-item v-else title="Sign in" @click="signIn" />
```

The store side:

```ts
state: () => ({
	isAuthenticated: false,
	initialized: false,  // flipped in finally{} after fetch resolves/rejects
}),
actions: {
	async fetchUserInfo() {
		try {
			/* ... */
		} finally {
			this.initialized = true
		}
	},
}
```

Apply the same gate to feature-flag-driven UI when the flag value comes from a remote evaluation: render nothing (or a skeleton) until `featureFlagStore.initialized`, then render the resolved variant.

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
