/**
 * Comprehensive Test Helpers for R4C Cesium Viewer Accessibility Testing
 *
 * These helpers provide utilities for testing all views, options, and features
 * to ensure nothing gets lost during interface overhaul.
 */

import { expect } from '@playwright/test';
import type { PlaywrightPage, CesiumTestState } from '../../types/playwright';
import type { Locator } from '@playwright/test';
import {
	waitForCesiumReady as cesiumWaitForReady,
	initializeCesiumWithRetry,
	waitForAppReady,
} from './cesium-helper';

/**
 * Centralized timeout constants for test suite operations.
 *
 * These values are calibrated based on:
 * - Actual CesiumJS WebGL initialization performance (10-15s typical)
 * - Vuetify animation durations (CSS transitions: 150-300ms)
 * - Network latency for WMS/API calls (1-3s typical)
 * - Browser rendering and layout stabilization timing
 *
 * ## Design Philosophy
 *
 * **Stability over speed**: Timeouts are intentionally conservative to prevent
 * flaky tests. A test that takes 1 second longer but never flakes is preferable
 * to a fast but unreliable test.
 *
 * **Categories by purpose**: Timeouts are organized by what they're waiting for
 * (element rendering, data loading, animations) rather than by numeric value.
 * This makes it easier to tune related operations together.
 *
 * **Environment awareness**: CI environments (GitHub Actions) receive 1.5-2x
 * longer timeouts due to:
 * - Shared compute resources causing variable CPU availability
 * - Software rendering for WebGL (SwiftShader) being 2-3x slower than GPU
 * - Container networking overhead for API/WMS requests
 *
 * ## Performance Considerations
 *
 * These timeouts were chosen to balance:
 * 1. **Test reliability**: Must accommodate 99th percentile performance
 * 2. **Feedback speed**: Shorter timeouts = faster failure detection
 * 3. **Resource efficiency**: Longer waits consume CI minutes
 *
 * Current test suite performance (local development):
 * - Median test: ~15-20 seconds (Cesium init + interactions)
 * - 95th percentile: ~35-40 seconds (complex drill-down scenarios)
 * - CI environments: ~1.5-2x slower
 *
 * @see {@link https://playwright.dev/docs/test-timeouts | Playwright Timeout Guide}
 * @see {@link file://../../../docs/TEST_TIMEOUTS.md | Test Timeouts Documentation}
 */
export const TEST_TIMEOUTS = {
	// ============================================================================
	// FIXED WAIT DELAYS (WAIT_*)
	// Used with page.waitForTimeout() for explicit pauses
	// ============================================================================

	/**
	 * Very brief wait for immediate UI state changes (100ms).
	 *
	 * **When to use:**
	 * - Focus state settling after programmatic focus()
	 * - Synchronous Vue reactivity updates
	 * - Quick DOM mutations that happen within one frame
	 *
	 * **Rationale:** 100ms = ~6 frames at 60fps, sufficient for:
	 * - Browser to commit pending style changes
	 * - Vue's nextTick() to process reactive updates
	 * - Accessibility tree updates to propagate
	 *
	 * **Optimization potential:** Could be reduced to 50ms for most cases,
	 * but 100ms provides safety margin for slower CI environments.
	 */
	WAIT_BRIEF: 100,

	/**
	 * Short wait for element stabilization after layout changes (200ms).
	 *
	 * **When to use:**
	 * - Retry backoff in scroll operations
	 * - After dynamic content insertion causing reflow
	 * - Between rapid successive interactions
	 *
	 * **Rationale:** 200ms matches typical scroll animation duration.
	 * Vuetify's default scroll-behavior uses CSS scroll-behavior: smooth,
	 * which takes ~200-250ms to complete.
	 *
	 * **Used in:** scrollIntoViewportWithRetry retry delays
	 */
	WAIT_SHORT: 200,

	/**
	 * Wait for element stability after user interactions (300ms).
	 *
	 * **When to use:**
	 * - After checkbox check/uncheck operations
	 * - After form input value changes
	 * - After programmatic state updates
	 * - Before verifying element state changed
	 *
	 * **Rationale:** 300ms accommodates:
	 * - Vuetify transition durations (150-250ms)
	 * - Vue reactivity batching and DOM patch cycle
	 * - Browser reflow/repaint after DOM changes
	 *
	 * **Measured performance:** Most interactions settle within 150-200ms,
	 * 300ms provides 50% safety margin for variable CI performance.
	 */
	WAIT_STABILITY: 300,

	/**
	 * Wait for tooltip, overlay, and modal animations (500ms).
	 *
	 * **When to use:**
	 * - After closing dialogs/overlays
	 * - After tooltip display/hide
	 * - After dropdown menu open/close
	 * - After view mode switches (state changes)
	 *
	 * **Rationale:** 500ms covers:
	 * - Vuetify overlay fade transitions (300ms)
	 * - CSS transform/opacity animations
	 * - Z-index stacking context updates
	 * - Overlay backdrop removal from DOM
	 *
	 * **Measured performance:** Vuetify transitions complete in 300-350ms,
	 * 500ms ensures animation fully completes and cleanup runs.
	 */
	WAIT_TOOLTIP: 500,

	/**
	 * Wait for application state changes to propagate (500ms).
	 *
	 * **When to use:**
	 * - After view mode selection (Capital Region ↔ Statistical Grid)
	 * - After filter toggle changes
	 * - After layer visibility changes
	 * - Before verifying derived state updates
	 *
	 * **Rationale:** Same as WAIT_TOOLTIP (both are 500ms), but semantically
	 * different. State changes may trigger multiple UI updates:
	 * - Pinia store updates
	 * - Component re-renders
	 * - Computed property recalculations
	 * - Watchers and side effects
	 */
	WAIT_STATE_CHANGE: 500,

	/**
	 * Medium wait for data processing and light computations (1000ms).
	 *
	 * **When to use:**
	 * - After form submissions
	 * - After API responses return but UI updating
	 * - After timeline slider changes (data recalculation)
	 * - Between drill-down levels
	 *
	 * **Rationale:** 1 second accommodates:
	 * - D3.js chart re-rendering
	 * - GeoJSON data parsing and processing
	 * - CesiumJS entity updates
	 * - Multiple cascading Vue component updates
	 *
	 * **Optimization potential:** Could potentially be reduced to 750ms,
	 * but 1000ms is a safe default for variable data set sizes.
	 */
	WAIT_MEDIUM: 1000,

	/**
	 * Wait for data loading and rendering operations (2000ms).
	 *
	 * **When to use:**
	 * - After data-dependent component mounting
	 * - After chart/graph rendering with D3.js
	 * - After table population with large datasets
	 * - After timeline component initialization
	 *
	 * **Rationale:** 2 seconds covers:
	 * - API fetch completion (local: 100-500ms, WMS: 500-1500ms)
	 * - Data transformation and processing
	 * - D3.js enter/update/exit cycles
	 * - Vuetify data table rendering
	 *
	 * **Measured performance:** Timeline initialization takes 1.2-1.8s,
	 * 2000ms provides buffer for slower network or CPU contention.
	 */
	WAIT_DATA_LOAD: 2000,

	/**
	 * Wait for CesiumJS tile loading after camera movement (2000ms).
	 *
	 * **When to use:**
	 * - After camera fly-to operations
	 * - After zoom level changes
	 * - After view mode switches affecting camera
	 * - Before capturing screenshots of map
	 *
	 * **Rationale:** CesiumJS tile loading is progressive:
	 * - Low-res tiles: 200-500ms
	 * - High-res tiles: 1000-2000ms
	 * - 3D terrain tiles: 1500-3000ms
	 *
	 * **Note:** CesiumJS continuously loads tiles in background, so this
	 * timeout is a "good enough" heuristic, not a guarantee all tiles loaded.
	 *
	 * **Optimization potential:** Reducing below 2000ms would cause visible
	 * low-resolution tiles in screenshots/assertions.
	 */
	WAIT_CESIUM_TILES: 2000,

	/**
	 * Long wait for complex multi-step operations (3000ms).
	 *
	 * **When to use:**
	 * - After postal code drill-down (multi-step process)
	 * - After multiple cascading state updates
	 * - After heavy computation or rendering
	 * - In scenarios with multiple asynchronous dependencies
	 *
	 * **Rationale:** 3 seconds allows for:
	 * - Multiple sequential API calls
	 * - Heavy D3.js visualizations (scatter plots with 1000+ points)
	 * - CesiumJS camera animations + data loading
	 * - Complex Vue component lifecycle (mount + data fetch + render)
	 */
	WAIT_LONG: 3000,

	/**
	 * Extended wait for very heavy operations (5000ms).
	 *
	 * **When to use:**
	 * - After building level drill-down (loads multiple data sources)
	 * - After large dataset operations
	 * - When multiple WMS/API calls run in parallel
	 * - For operations with unpredictable performance characteristics
	 *
	 * **Rationale:** 5 seconds is conservative timeout for:
	 * - Parallel data fetching (WMS layers + API data + GeoJSON)
	 * - Large GeoJSON parsing (10,000+ features)
	 * - Complex Cesium entity collections
	 *
	 * **Usage note:** Should be used sparingly - if you need this often,
	 * consider optimizing the application rather than increasing timeout.
	 */
	WAIT_EXTENDED: 5000,

	// ============================================================================
	// ELEMENT INTERACTION TIMEOUTS (ELEMENT_*)
	// Used with waitFor(), waitForSelector(), expect() timeout options
	// These use Playwright's auto-retry mechanism
	// ============================================================================

	/**
	 * Quick element visibility check timeout (500ms).
	 *
	 * **When to use:**
	 * - Loading spinners that should appear immediately
	 * - Toast notifications
	 * - Error messages
	 * - Elements that should already be in DOM
	 *
	 * **Rationale:** Short timeout for fail-fast on elements that should
	 * appear instantly. If element not visible in 500ms, likely an error.
	 *
	 * **Playwright retry behavior:** Retries every 50ms, so 500ms = ~10 attempts.
	 *
	 * **Optimization:** Already quite aggressive - don't reduce further.
	 */
	ELEMENT_VISIBLE: 500,

	/**
	 * Element click/interaction operation timeout (2000ms).
	 *
	 * **When to use:**
	 * - button.click() with timeout option
	 * - checkbox.check()/uncheck() operations
	 * - input.fill() operations
	 * - Any interactive element manipulation
	 *
	 * **Rationale:** 2 seconds allows for:
	 * - Playwright actionability checks (visible, stable, enabled, not obscured)
	 * - Scroll into view if needed
	 * - Wait for element to become actionable
	 * - Handle Vuetify overlay timing issues
	 *
	 * **Measured performance:** Most interactions complete in 200-500ms,
	 * 2000ms handles edge cases like WebGL canvas overlays settling.
	 */
	ELEMENT_INTERACTION: 2000,

	/**
	 * Scroll into view operation timeout (3000ms).
	 *
	 * **When to use:**
	 * - scrollIntoViewIfNeeded() operations
	 * - Long lists or nested scrollable containers
	 * - Elements in expansion panels that need to expand first
	 *
	 * **Rationale:** 3 seconds accommodates:
	 * - Scroll animation duration (200-300ms)
	 * - Expansion panel open animation (250ms)
	 * - Lazy-loaded content rendering
	 * - Multiple nested scroll containers
	 *
	 * **Used in:** scrollIntoViewportWithRetry, testToggle, drillToLevel
	 */
	ELEMENT_SCROLL: 3000,

	/**
	 * Standard element wait timeout (5000ms).
	 *
	 * **When to use:**
	 * - Generic expect(element).toBeVisible() assertions
	 * - waitForSelector() for regular UI elements
	 * - Elements that depend on state changes
	 * - Default timeout when specific timeout unclear
	 *
	 * **Rationale:** 5 seconds is conservative default that handles:
	 * - View mode switches (500ms) + element render (500ms) + buffer (4s)
	 * - Network-dependent elements that aren't specifically data-heavy
	 * - Elements that require multiple preconditions
	 *
	 * **Matches:** Playwright config expect.timeout in local dev (5000ms)
	 *
	 * **Optimization potential:** Could be reduced to 3000ms for many cases,
	 * but 5000ms prevents false failures on slower machines.
	 */
	ELEMENT_STANDARD: 5000,

	/**
	 * Complex element wait timeout (8000ms).
	 *
	 * **When to use:**
	 * - Timeline component visibility and initialization
	 * - D3.js charts and graphs
	 * - Interactive visualizations
	 * - Elements with complex initialization logic
	 *
	 * **Rationale:** 8 seconds allows for:
	 * - Timeline: data fetch (1s) + D3 render (1s) + slider init (0.5s) + buffer
	 * - Scatter plots: data load (1s) + D3 layout (2s) + render (1s) + buffer
	 * - Heat histogram: data processing (1.5s) + chart render (1s) + buffer
	 *
	 * **Matches:** Playwright config expect.timeout in CI (8000ms)
	 */
	ELEMENT_COMPLEX: 8000,

	/**
	 * Data-dependent element timeout (10000ms).
	 *
	 * **When to use:**
	 * - Elements populated from API calls
	 * - WMS layer-dependent UI elements
	 * - GeoJSON-loaded content
	 * - Elements requiring multiple data sources
	 *
	 * **Rationale:** 10 seconds covers:
	 * - WMS GetFeatureInfo request (1-3s)
	 * - PyGeoAPI data fetch (500ms-2s)
	 * - Data transformation (500ms-1s)
	 * - UI rendering (500ms-1s)
	 * - Retry attempts (2-3s)
	 *
	 * **Measured performance:** Building properties panel can take 5-8s
	 * on first load (WMS + PyGeoAPI + GeoJSON parsing), 10s provides buffer.
	 */
	ELEMENT_DATA_DEPENDENT: 10000,

	// ============================================================================
	// CESIUM-SPECIFIC TIMEOUTS (CESIUM_*)
	// Calibrated for WebGL initialization and 3D rendering operations
	// ============================================================================

	/**
	 * Cesium container initialization timeout (10000ms).
	 *
	 * **When to use:**
	 * - waitForSelector('#cesiumContainer')
	 * - Before any Cesium interactions
	 * - Ensuring canvas element exists and has dimensions
	 *
	 * **Rationale:** 10 seconds for:
	 * - Vue component mount and Cesium instantiation (2-4s)
	 * - WebGL context creation (1-2s, slower in CI with SwiftShader)
	 * - Initial camera setup (1s)
	 * - Default imagery provider loading (2-3s)
	 *
	 * **Measured performance:** Local: 3-5s, CI: 6-10s
	 */
	CESIUM_CONTAINER: 10000,

	/**
	 * Cesium viewer ready state timeout - local development (15000ms).
	 *
	 * **When to use:**
	 * - waitForCesiumReady() in local environment
	 * - Ensuring Cesium viewer fully initialized
	 * - Before performing any map interactions
	 *
	 * **Rationale:** 15 seconds for complete initialization:
	 * - Container ready (3-5s)
	 * - Imagery tiles loaded (3-5s)
	 * - Terrain provider ready (2-4s)
	 * - Initial data layers (2-3s)
	 *
	 * **Local performance:** Typically 8-12 seconds, 15s provides buffer.
	 */
	CESIUM_READY: 15000,

	/**
	 * Cesium viewer ready state timeout - CI environment (30000ms).
	 *
	 * **When to use:**
	 * - waitForCesiumReady() when process.env.CI is true
	 * - GitHub Actions or other CI environments
	 * - Headless browser with software rendering
	 *
	 * **Rationale:** 30 seconds accounts for:
	 * - SwiftShader software rendering (2-3x slower than GPU)
	 * - Shared CI compute resources causing CPU throttling
	 * - Container networking latency for tile requests
	 * - Cold start penalties (no HTTP cache)
	 *
	 * **CI performance:** Typically 15-25 seconds, 30s handles 95th percentile.
	 *
	 * **Optimization:** Could potentially reduce to 25s, but 30s prevents
	 * flakes during periods of high CI load.
	 */
	CESIUM_READY_CI: 30000,

	/**
	 * Postal code level activation timeout (8000ms).
	 *
	 * **When to use:**
	 * - After clicking map to drill down to postal code
	 * - Waiting for postal code UI panels to appear
	 * - Before interacting with postal code-level features
	 *
	 * **Rationale:** 8 seconds for postal code activation:
	 * - Click handling and hit testing (100ms)
	 * - Camera fly-to animation (1-2s)
	 * - Tile loading for new zoom level (2-3s)
	 * - Building data fetch and render (2-3s)
	 * - Timeline initialization (1-2s)
	 *
	 * **Used in:** drillToLevel('postalCode')
	 */
	CESIUM_POSTAL_CODE: 8000,

	/**
	 * Building level activation timeout (10000ms).
	 *
	 * **When to use:**
	 * - After clicking building to drill down to building level
	 * - Waiting for building-specific panels
	 * - Before interacting with building detail features
	 *
	 * **Rationale:** 10 seconds for building activation:
	 * - Building selection and highlight (200ms)
	 * - Camera fly-to building (1-2s)
	 * - 3D model loading if applicable (2-3s)
	 * - Building properties API fetch (1-2s)
	 * - Heat data fetch (1-2s)
	 * - UI panel rendering (1-2s)
	 *
	 * **Used in:** drillToLevel('building')
	 *
	 * **Measured performance:** Typically 5-8s, 10s handles slow API responses.
	 */
	CESIUM_BUILDING: 10000,

	// ============================================================================
	// RETRY BACKOFF DELAYS (RETRY_*)
	// Used in retry logic for transient failures
	// ============================================================================

	/**
	 * Base backoff delay for scroll retry operations (200ms).
	 *
	 * **When to use:**
	 * - In scrollIntoViewportWithRetry retry loops
	 * - Between scroll attempts when first attempt fails
	 * - As multiplier: 200ms * attempt (200, 400, 600...)
	 *
	 * **Rationale:** 200ms = typical scroll animation duration.
	 * Waiting one animation cycle before retry ensures scroll completed.
	 *
	 * **Pattern:** `await page.waitForTimeout(200 * scrollAttempt)`
	 */
	RETRY_BACKOFF_BASE: 200,

	/**
	 * Backoff delay for interaction retry operations (300ms).
	 *
	 * **When to use:**
	 * - In checkWithRetry/uncheckWithRetry retry loops
	 * - Between click attempts when actionability checks fail
	 * - As multiplier: 300ms * attempt (300, 600, 900...)
	 *
	 * **Rationale:** 300ms = element stability wait + small buffer.
	 * Allows Vuetify overlays and WebGL canvas to settle between attempts.
	 *
	 * **Pattern:** `await page.waitForTimeout(RETRY_BACKOFF_INTERACTION * attempt)`
	 */
	RETRY_BACKOFF_INTERACTION: 300,

	/**
	 * Base for exponential backoff calculations (1000ms).
	 *
	 * **When to use:**
	 * - In retry logic with exponential backoff
	 * - For operations with transient failures (network, rate limits)
	 * - As base: 1000ms * Math.pow(multiplier, attempt)
	 *
	 * **Rationale:** 1 second base provides reasonable spacing:
	 * - Attempt 1: 1s * 1.5^1 = 1.5s
	 * - Attempt 2: 1s * 1.5^2 = 2.25s
	 * - Attempt 3: 1s * 1.5^3 = 3.375s
	 *
	 * **Pattern:** `backoffMs = 1000 * Math.pow(1.5, attempt) + Math.random() * 500`
	 *
	 * **Note:** Usually combined with jitter to prevent thundering herd.
	 */
	RETRY_BACKOFF_EXPONENTIAL: 1000,

	// ============================================================================
	// LEGACY ALIASES
	// Deprecated - kept for backward compatibility during migration
	// ============================================================================

	/**
	 * @deprecated Use ELEMENT_SCROLL instead. Will be removed in next major version.
	 */
	SCROLL_INTO_VIEW: 3000,

	/**
	 * @deprecated Use ELEMENT_STANDARD instead. Will be removed in next major version.
	 */
	INTERACTION: 5000,
} as const;

export interface ViewMode {
	id: 'capitalRegionView' | 'gridView' | 'helsinkiHeat';
	label: string;
	selector: string;
}

export interface NavigationLevel {
	level: 'start' | 'postalCode' | 'building';
	expectedElements: string[];
}

export class AccessibilityTestHelpers {
	private page: PlaywrightPage;

	constructor(page: PlaywrightPage) {
		this.page = page;
	}

	/**
	 * Scroll element into viewport with retry logic
	 *
	 * Ensures element is visible in viewport before interaction by:
	 * 1. Scrolling element into view
	 * 2. Verifying bounding box is within viewport (y >= 0, x >= 0)
	 * 3. Retrying with exponential backoff on failure
	 *
	 * @param locator - The Playwright locator for the element
	 * @param options - Configuration options
	 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
	 * @param options.elementName - Element name for logging (default: 'element')
	 */
	async scrollIntoViewportWithRetry(
		locator: Locator,
		options: { maxRetries?: number; elementName?: string } = {}
	): Promise<void> {
		const { maxRetries = 3, elementName = 'element' } = options;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await locator.scrollIntoViewIfNeeded({
					timeout: TEST_TIMEOUTS.SCROLL_INTO_VIEW,
				});
				const box = await locator.boundingBox();
				if (box && box.y >= 0 && box.x >= 0) {
					return; // Successfully in viewport
				}
			} catch {
				if (attempt === maxRetries) {
					console.warn(`Scroll failed for ${elementName}, continuing anyway`);
				}
				// Wait for element to stabilize
				await this.page
					.waitForLoadState('domcontentloaded', {
						timeout: TEST_TIMEOUTS.RETRY_BACKOFF_BASE * attempt,
					})
					.catch((e) => console.warn('Element stabilization timeout:', e.message));
			}
		}
	}

	/**
	 * Check a checkbox/toggle with scroll-before-interact pattern
	 *
	 * Implements the complete scroll-before-interact pattern:
	 * 1. Scrolls element into viewport with retry
	 * 2. Waits for element stability
	 * 3. Checks the element with retry and exponential backoff
	 * 4. Uses force click on retry attempts to handle WebGL/Vuetify overlay timing issues
	 *
	 * Force clicking on retries is necessary because:
	 * - Playwright's actionability checks don't work reliably with WebGL canvases
	 * - Vuetify overlay animations can cause timing issues
	 * - The initial attempt without force ensures the element is truly interactive
	 *
	 * @param locator - The Playwright locator for the checkbox
	 * @param options - Configuration options
	 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
	 * @param options.elementName - Element name for logging (default: 'element')
	 */
	async checkWithRetry(
		locator: Locator,
		options: { maxRetries?: number; elementName?: string } = {}
	): Promise<void> {
		await this.scrollIntoViewportWithRetry(locator, options);

		const { maxRetries = 3, elementName = 'element' } = options;
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await locator.check({
					timeout: TEST_TIMEOUTS.INTERACTION,
					// Force click on retry to handle WebGL canvas and Vuetify overlay timing issues
					// First attempt uses normal checks to ensure element is truly interactive
					force: attempt > 1,
				});
				return;
			} catch {
				if (attempt === maxRetries) {
					throw new Error(`Failed to check ${elementName} toggle after ${maxRetries} attempts`);
				}
				// Wait with exponential backoff before retry
				await this.page.waitForTimeout(TEST_TIMEOUTS.RETRY_BACKOFF_INTERACTION * attempt);
			}
		}
	}

	/**
	 * Uncheck a checkbox/toggle with scroll-before-interact pattern
	 *
	 * Implements the complete scroll-before-interact pattern for unchecking:
	 * 1. Scrolls element into viewport with retry
	 * 2. Waits for element stability
	 * 3. Unchecks the element with retry and exponential backoff
	 * 4. Uses force click on retry attempts to handle WebGL/Vuetify overlay timing issues
	 *
	 * Force clicking on retries is necessary because:
	 * - Playwright's actionability checks don't work reliably with WebGL canvases
	 * - Vuetify overlay animations can cause timing issues
	 * - The initial attempt without force ensures the element is truly interactive
	 *
	 * @param locator - The Playwright locator for the checkbox
	 * @param options - Configuration options
	 * @param options.maxRetries - Maximum number of retry attempts (default: 3)
	 * @param options.elementName - Element name for logging (default: 'element')
	 */
	async uncheckWithRetry(
		locator: Locator,
		options: { maxRetries?: number; elementName?: string } = {}
	): Promise<void> {
		await this.scrollIntoViewportWithRetry(locator, options);

		const { maxRetries = 3, elementName = 'element' } = options;
		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				await locator.uncheck({
					timeout: TEST_TIMEOUTS.INTERACTION,
					// Force click on retry to handle WebGL canvas and Vuetify overlay timing issues
					// First attempt uses normal checks to ensure element is truly interactive
					force: attempt > 1,
				});
				return;
			} catch {
				if (attempt === maxRetries) {
					throw new Error(`Failed to uncheck ${elementName} toggle after ${maxRetries} attempts`);
				}
				// Wait with exponential backoff before retry
				await this.page.waitForTimeout(TEST_TIMEOUTS.RETRY_BACKOFF_INTERACTION * attempt);
			}
		}
	}

	/**
	 * Navigate to specific view mode and verify selection with retry logic
	 */
	async navigateToView(viewMode: 'capitalRegionView' | 'gridView'): Promise<void> {
		const viewModes: Record<string, ViewMode> = {
			capitalRegionView: {
				id: 'capitalRegionView',
				label: 'Capital Region',
				selector: '[data-testid="view-mode-capital-region"]',
			},
			gridView: {
				id: 'gridView',
				label: 'Statistical Grid',
				selector: '[data-testid="view-mode-statistical-grid"]',
			},
		};

		const targetView = viewModes[viewMode];
		if (!targetView) {
			throw new Error(`Unknown view mode: ${viewMode}`);
		}

		// Wait for any overlays to close before attempting navigation
		await this.waitForOverlaysToClose();

		// Dynamic view detection with retry logic (reduced from 5 to 2 with requestRenderMode)
		const maxRetries = 2;
		let lastError: Error | null = null;

		for (let attempt = 1; attempt <= maxRetries; attempt++) {
			try {
				// Wait for page to be stable first
				await this.page
					.waitForLoadState('domcontentloaded', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
					.catch((e) => console.warn('DOM content load wait failed:', e.message));

				// Multi-strategy selector detection with fallbacks
				let viewCardFound = false;
				let viewCard = this.page.locator(targetView.selector);

				// Strategy 1: Try direct view-mode-card selector
				viewCardFound = await viewCard.count().then((c) => c > 0);

				// Strategy 2: If not found, try via input radio button
				if (!viewCardFound) {
					const radioInput = this.page.locator(`input[value="${viewMode}"]`);
					const radioExists = await radioInput.count().then((c) => c > 0);
					if (radioExists) {
						viewCard = radioInput.locator('..').locator('..');
						viewCardFound = await viewCard.count().then((c) => c > 0);
					}
				}

				// Strategy 3: Try finding any view-mode-card and filter by text
				if (!viewCardFound) {
					const allCards = this.page.locator('.view-mode-card');
					const cardCount = await allCards.count();
					for (let i = 0; i < cardCount; i++) {
						const card = allCards.nth(i);
						const text = await card.textContent().catch(() => '');
						if (text.includes(targetView.label)) {
							viewCard = card;
							viewCardFound = true;
							break;
						}
					}
				}

				// Strategy 4: Try finding button elements directly by text
				if (!viewCardFound) {
					const buttonSelector = `button:has-text("${targetView.label}")`;
					const button = this.page.locator(buttonSelector);
					const buttonExists = await button.count().then((c) => c > 0);
					if (buttonExists) {
						viewCard = button;
						viewCardFound = true;
					}
				}

				if (!viewCardFound) {
					throw new Error(
						`View mode card for ${viewMode} not found (attempt ${attempt}/${maxRetries}). Available selectors checked: ${targetView.selector}, input[value="${viewMode}"], .view-mode-card`
					);
				}

				// Wait for element to be visible and stable
				await viewCard.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD });

				// Scroll into viewport with retry
				for (let scrollAttempt = 1; scrollAttempt <= 3; scrollAttempt++) {
					try {
						await viewCard.scrollIntoViewIfNeeded({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL });
						break;
					} catch {
						if (scrollAttempt === 3) {
							console.warn('Scroll failed, continuing anyway');
						}
						await this.page.waitForTimeout(200 * scrollAttempt);
					}
				}

				// Wait for element stability with exponential backoff
				await this.page.waitForTimeout(300 * attempt);

				// Verify element is in viewport before clicking
				const box = await viewCard.boundingBox();
				if (!box || box.y < 0 || box.x < 0) {
					throw new Error(`View card not properly in viewport: ${JSON.stringify(box)}`);
				}

				// Click with force by default - requestRenderMode makes this safe
				// Use noWaitAfter since this is a SPA - click triggers state change, not navigation
				try {
					await viewCard.click({
						timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION,
						noWaitAfter: true,
						force: true, // Force click bypasses stability checks that don't work with WebGL
					});
				} catch (clickError) {
					console.warn('Click failed, retrying with mouse.click:', clickError);
					// Fallback: use mouse.click directly
					const box = await viewCard.boundingBox();
					if (box) {
						await this.page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
					} else {
						throw new Error('Click failed and element has no bounding box');
					}
				}

				// Wait for UI to update after view switch
				// Note: View switching is synchronous state changes in requestRenderMode,
				// so we just need a brief wait for the UI to reflect the new state
				// We don't wait for network idle because CesiumJS continuously loads tiles
				await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);

				// Verify the selection with multiple strategies
				const verificationResults = await Promise.all([
					// Check 1: Radio button state
					this.page
						.locator(`input[value="${viewMode}"]`)
						.isChecked()
						.catch(() => false),
					// Check 2: Active class on card
					viewCard
						.getAttribute('class')
						.then((c) => c?.includes('active') || false)
						.catch(() => false),
					// Check 3: Aria-checked state
					this.page
						.locator(`input[value="${viewMode}"]`)
						.getAttribute('aria-checked')
						.then((v) => v === 'true')
						.catch(() => false),
				]);

				const isSelected = verificationResults.some((result) => result === true);

				if (!isSelected) {
					throw new Error(
						`View mode ${viewMode} not properly selected on attempt ${attempt}. Verification results: ${JSON.stringify(verificationResults)}`
					);
				}

				// Success - additional wait for full stabilization
				await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);
				return;
			} catch (error) {
				lastError = error as Error;
				console.warn(`navigateToView attempt ${attempt}/${maxRetries} failed:`, lastError.message);

				if (attempt < maxRetries) {
					// Exponential backoff with jitter
					const backoffMs = 1000 * Math.pow(1.5, attempt) + Math.random() * 500;
					await this.page.waitForTimeout(backoffMs);

					// Try to recover by closing overlays
					await this.waitForOverlaysToClose();

					// Try to reset page state
					await this.page
						.waitForLoadState('domcontentloaded', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
						.catch((e) => console.warn('Page state reset failed:', e.message));
				}
			}
		}

		// All retries failed
		throw new Error(
			`CRITICAL: Failed to navigate to view ${viewMode} after ${maxRetries} attempts. Last error: ${lastError?.message}. This indicates a fundamental issue with view mode detection or page state.`
		);
	}

	/**
	 * Navigate through levels: start → postal code → building with retry and viewport handling
	 */
	async drillToLevel(targetLevel: 'postalCode' | 'building', identifier?: string): Promise<void> {
		// Wait for any overlays to close before attempting drill-down
		await this.waitForOverlaysToClose();

		const maxRetries = 2; // Reduced from 5 - requestRenderMode makes retries unnecessary

		switch (targetLevel) {
			case 'postalCode': {
				// Click on a postal code area - using Helsinki center as default
				const _postalCodeId = identifier || '00100';

				// Wait for Cesium viewer to be ready with enhanced verification
				await this.page.waitForSelector('#cesiumContainer', {
					state: 'visible',
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				});

				// Wait for Cesium to properly initialize with multiple checks
				await this.page.waitForFunction(
					() => {
						const container = document.querySelector('#cesiumContainer');
						const canvas = container ? container.querySelector('canvas') : null;
						if (!canvas) return false;

						// Check canvas dimensions
						if (canvas.offsetWidth === 0 || canvas.offsetHeight === 0) return false;

						// Check if Cesium viewer is initialized (check both possible names)
						const cesiumWidget = (window as any).cesiumWidget;
						const viewer = (window as any).viewer;
						if (!cesiumWidget && !viewer) return false;

						return true;
					},
					{ timeout: process.env.CI ? 20000 : 15000 }
				);

				// Retry logic for clicking on map to select postal code
				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					try {
						// Scroll Cesium container into view with retries
						const cesiumContainer = this.page.locator('#cesiumContainer');

						for (let scrollAttempt = 1; scrollAttempt <= 3; scrollAttempt++) {
							try {
								await cesiumContainer.scrollIntoViewIfNeeded({
									timeout: TEST_TIMEOUTS.ELEMENT_SCROLL,
								});
								break;
							} catch {
								if (scrollAttempt === 3) {
									console.warn('Cesium container scroll failed, continuing anyway');
								}
								await this.page.waitForTimeout(200 * scrollAttempt);
							}
						}

						// Verify container is in viewport
						const box = await cesiumContainer.boundingBox();
						if (!box || box.y < 0 || box.x < 0) {
							console.warn(
								`Cesium container not in viewport: ${JSON.stringify(box)}, attempt ${attempt}`
							);
							if (attempt < maxRetries) {
								await this.page.waitForTimeout(500 * attempt);
								continue;
							}
						}

						// Wait for stability with exponential backoff
						await this.page.waitForTimeout(500 * attempt);

						// Wait for map to finish loading
						// Note: CesiumJS continuously loads tiles, so we use a simple timeout
						await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);

						// Simulate clicking on the center of the map where postal codes are
						// Use multiple click positions to increase success rate
						const clickPositions = [
							{ x: 400, y: 300 },
							{ x: 450, y: 320 },
							{ x: 350, y: 280 },
						];

						const clickPos = clickPositions[attempt % clickPositions.length];

						await cesiumContainer.click({
							position: clickPos,
							timeout: TEST_TIMEOUTS.ELEMENT_SCROLL,
							force: true, // Always force click on Cesium canvas - stability checks don't work with WebGL
						});

						// Wait for postal code level to activate by checking for specific UI elements
						// Also check for timeline as it's a reliable indicator of postal code level
						const activationChecks = await Promise.all([
							this.page
								.waitForSelector('text="Building Scatter Plot"', {
									state: 'visible',
									timeout: TEST_TIMEOUTS.ELEMENT_COMPLEX,
								})
								.then(() => true)
								.catch(() => false),
							this.page
								.waitForSelector('text="Area properties"', {
									state: 'visible',
									timeout: TEST_TIMEOUTS.ELEMENT_COMPLEX,
								})
								.then(() => true)
								.catch(() => false),
							// Timeline visibility is a reliable indicator of postal code level activation
							this.page
								.waitForSelector('#heatTimeseriesContainer', {
									state: 'visible',
									timeout: TEST_TIMEOUTS.ELEMENT_COMPLEX,
								})
								.then(() => true)
								.catch(() => false),
						]);

						const activated = activationChecks.some((check) => check === true);

						if (activated) {
							// Additional wait for data to load
							// Note: CesiumJS continuously loads tiles, so we use a simple timeout
							await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM);

							// Wait for timeline component to fully initialize (critical for timeline tests)
							// At postal code level, the timeline should become visible with interactive elements
							await this.page
								.waitForFunction(
									() => {
										const timeline = document.querySelector('#heatTimeseriesContainer');
										if (!timeline) return false;
										const rect = timeline.getBoundingClientRect();
										if (rect.width === 0 || rect.height === 0) return false;

										// Verify Vuetify slider is rendered and visible (check thumb, not hidden input)
										const sliderThumb = document.querySelector('.timeline-slider .v-slider-thumb');
										if (!sliderThumb) return false;
										const thumbVisible =
											sliderThumb instanceof HTMLElement &&
											sliderThumb.offsetParent !== null &&
											window.getComputedStyle(sliderThumb).visibility !== 'hidden' &&
											window.getComputedStyle(sliderThumb).display !== 'none';
										return thumbVisible;
									},
									{ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT }
								)
								.catch(() => {
									// Timeline might not always be fully interactive immediately
									console.warn('[drillToLevel] Timeline slider did not become interactive in time');
								});

							// Extra stability wait for Vue/Vuetify to finish rendering slider animations
							await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD);
							return; // Success
						}

						if (attempt < maxRetries) {
							console.warn(
								`Postal code selection attempt ${attempt}/${maxRetries} did not activate level, retrying...`
							);
							// Exponential backoff
							await this.page.waitForTimeout(1000 * Math.pow(1.3, attempt));
						}
					} catch (error) {
						console.warn(
							`drillToLevel(postalCode) attempt ${attempt}/${maxRetries} failed:`,
							error
						);
						if (attempt === maxRetries) {
							throw new Error(
								`Failed to drill to postal code level after ${maxRetries} attempts: ${error}`
							);
						}
						// Backoff before retry
						await this.page.waitForTimeout(1000 * attempt);
					}
				}
				throw new Error(`Failed to activate postal code level after ${maxRetries} attempts`);
			}

			case 'building':
				// Ensure we're at postal code level first
				if (identifier) {
					await this.drillToLevel('postalCode', identifier);
				}

				// Retry logic for clicking on building
				for (let attempt = 1; attempt <= maxRetries; attempt++) {
					try {
						// Scroll container into view with retries
						const container = this.page.locator('#cesiumContainer');

						for (let scrollAttempt = 1; scrollAttempt <= 3; scrollAttempt++) {
							try {
								await container.scrollIntoViewIfNeeded({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL });
								break;
							} catch {
								if (scrollAttempt === 3) {
									console.warn('Container scroll failed, continuing anyway');
								}
								await this.page.waitForTimeout(200 * scrollAttempt);
							}
						}

						// Verify container is in viewport
						const box = await container.boundingBox();
						if (!box || box.y < 0 || box.x < 0) {
							console.warn(`Container not in viewport: ${JSON.stringify(box)}, attempt ${attempt}`);
							if (attempt < maxRetries) {
								await this.page.waitForTimeout(500 * attempt);
								continue;
							}
						}

						// Wait for stability with exponential backoff
						await this.page.waitForTimeout(500 * attempt);

						// Wait for map to finish loading
						// Note: CesiumJS continuously loads tiles, so we use a simple timeout
						await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);

						// Click on a building (use multiple positions to increase success rate)
						const buildingPositions = [
							{ x: 500, y: 350 },
							{ x: 480, y: 370 },
							{ x: 520, y: 330 },
						];

						const clickPos = buildingPositions[attempt % buildingPositions.length];

						await container.click({
							position: clickPos,
							timeout: TEST_TIMEOUTS.ELEMENT_SCROLL,
							force: true, // Always force click on Cesium canvas - stability checks don't work with WebGL
						});

						// Wait for building level to activate by checking for specific UI elements
						const activationChecks = await Promise.all([
							this.page
								.waitForSelector('text="Building heat data"', {
									state: 'visible',
									timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
								})
								.then(() => true)
								.catch(() => false),
							this.page
								.waitForSelector('text="Building properties"', {
									state: 'visible',
									timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
								})
								.then(() => true)
								.catch(() => false),
						]);

						const activated = activationChecks.some((check) => check === true);

						if (activated) {
							// Additional wait for data to load
							// Note: CesiumJS continuously loads tiles, so we use a simple timeout
							await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM);

							// Wait for timeline component to remain fully interactive (critical for timeline tests)
							// At building level, the timeline should still be visible and functional
							await this.page
								.waitForFunction(
									() => {
										const timeline = document.querySelector('#heatTimeseriesContainer');
										if (!timeline) return false;
										const rect = timeline.getBoundingClientRect();
										if (rect.width === 0 || rect.height === 0) return false;

										// Also verify the slider input is visible (not just in DOM)
										const slider = document.querySelector('.timeline-slider input');
										if (!slider) return false;
										const sliderVisible =
											slider instanceof HTMLElement &&
											slider.offsetParent !== null &&
											window.getComputedStyle(slider).visibility !== 'hidden';
										return sliderVisible;
									},
									{ timeout: TEST_TIMEOUTS.ELEMENT_COMPLEX }
								)
								.catch(() => {
									// Timeline might not always be fully interactive immediately
									console.warn('[drillToLevel] Timeline slider did not remain interactive');
								});

							// Final stability wait
							await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);
							return; // Success
						}

						if (attempt < maxRetries) {
							console.warn(
								`Building selection attempt ${attempt}/${maxRetries} did not activate level, retrying...`
							);
							// Exponential backoff
							await this.page.waitForTimeout(1000 * Math.pow(1.3, attempt));
						}
					} catch (error) {
						console.warn(`drillToLevel(building) attempt ${attempt}/${maxRetries} failed:`, error);
						if (attempt === maxRetries) {
							throw new Error(
								`Failed to drill to building level after ${maxRetries} attempts: ${error}`
							);
						}
						// Backoff before retry
						await this.page.waitForTimeout(1000 * attempt);
					}
				}
				throw new Error(`Failed to activate building level after ${maxRetries} attempts`);
		}
	}

	/**
	 * Verify conditional panel visibility based on current state
	 */
	async verifyPanelVisibility(conditions: {
		currentView?: string;
		currentLevel?: string;
		statsIndex?: string;
		hasData?: boolean;
	}): Promise<void> {
		const {
			currentView = 'capitalRegion',
			currentLevel = 'start',
			statsIndex,
			hasData = true,
		} = conditions;

		// Test Cooling Centers panel (grid view + heat_index)
		if (currentView === 'grid' && statsIndex === 'heat_index') {
			await expect(this.page.getByText('Manage Cooling Centers')).toBeVisible();
		} else {
			await expect(this.page.getByText('Manage Cooling Centers')).not.toBeVisible();
		}

		// Test Statistical grid options (grid view only)
		if (currentView === 'grid') {
			await expect(this.page.getByText('Statistical grid options')).toBeVisible();
		} else {
			await expect(this.page.getByText('Statistical grid options')).not.toBeVisible();
		}

		// Test NDVI panel (not grid view)
		if (currentView !== 'grid') {
			await expect(this.page.getByText('NDVI', { exact: true })).toBeVisible();
		}

		// Test postal code level panels
		if (currentLevel === 'postalCode') {
			await expect(this.page.getByText('Building Scatter Plot')).toBeVisible();
			await expect(this.page.getByText('Area properties')).toBeVisible();

			if (hasData) {
				await expect(this.page.getByText('Heat Histogram')).toBeVisible();
			}

			if (currentView !== 'helsinki') {
				await expect(this.page.getByText('Land Cover')).toBeVisible();
			}
		}

		// Test building level panels
		if (currentLevel === 'building') {
			await expect(this.page.getByText('Building heat data')).toBeVisible();
			await expect(this.page.getByText('Building properties')).toBeVisible();
		}

		// Universal panels should always be visible
		await expect(this.page.getByText('HSY Background maps')).toBeVisible();
		await expect(this.page.getByText('Syke Flood Background Maps')).toBeVisible();
		await expect(this.page.getByText('Geocoding')).toBeVisible();
	}

	/**
	 * Test all layer toggles systematically
	 */
	async testAllToggles(context: {
		currentView: string;
		currentLevel: string;
		hasPostalCode: boolean;
	}): Promise<void> {
		const { currentView, currentLevel: _currentLevel, hasPostalCode } = context;

		// Test layer toggles based on context
		if (currentView === 'helsinki') {
			await this.testToggle('Vegetation', true);
			await this.testToggle('Other Nature', true);
		} else {
			await this.testToggle('Vegetation', false);
			await this.testToggle('Other Nature', false);
		}

		// Trees toggle (not grid view + has postal code)
		if (currentView !== 'grid' && hasPostalCode) {
			await this.testToggle('Trees', true);
		} else {
			await this.testToggle('Trees', false);
		}

		// Land Cover (not Helsinki view)
		if (currentView !== 'helsinki') {
			await this.testToggle('Land Cover', true);
		} else {
			await this.testToggle('Land Cover', false);
		}

		// NDVI is universal
		await this.testToggle('NDVI', true);

		// Test filter toggles
		await this.testToggle('Public Buildings', true);
		await this.testToggle('Tall Buildings', true);

		if (currentView === 'helsinki') {
			await this.testToggle('Pre-2018', true);
		} else {
			await this.testToggle('Pre-2018', false);
		}
	}

	/**
	 * Test individual toggle functionality with viewport scrolling
	 */
	private async testToggle(toggleName: string, shouldBeVisible: boolean): Promise<void> {
		const toggle = this.page.getByText(toggleName).locator('..').locator('input[type="checkbox"]');

		if (shouldBeVisible) {
			await expect(this.page.getByText(toggleName)).toBeVisible();

			// Scroll toggle into viewport with retry logic
			for (let scrollAttempt = 1; scrollAttempt <= 3; scrollAttempt++) {
				try {
					await toggle.scrollIntoViewIfNeeded({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL });

					// Verify element is actually in viewport
					const box = await toggle.boundingBox();
					if (box && box.y >= 0 && box.x >= 0) {
						break; // Successfully in viewport
					}

					if (scrollAttempt === 3) {
						console.warn(`Toggle ${toggleName} not properly in viewport after 3 scroll attempts`);
					}
				} catch {
					if (scrollAttempt === 3) {
						console.warn(`Scroll failed for toggle ${toggleName}, continuing anyway`);
					}
					await this.page.waitForTimeout(200 * scrollAttempt);
				}
			}

			// Wait for element stability
			await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);

			// Verify element is clickable before interaction
			const isClickable = await toggle.isEnabled().catch(() => false);
			if (!isClickable) {
				console.warn(`Toggle ${toggleName} is not clickable, skipping interaction`);
				return;
			}

			// Test toggling on with retry
			let checkSuccess = false;
			for (let attempt = 1; attempt <= 3; attempt++) {
				try {
					await toggle.check({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD, force: attempt > 1 });
					checkSuccess = true;
					break;
				} catch (error) {
					console.warn(`Toggle ${toggleName} check attempt ${attempt}/3 failed:`, error);
					if (attempt < 3) {
						await this.page.waitForTimeout(300 * attempt);
					}
				}
			}

			if (!checkSuccess) {
				throw new Error(`Failed to check toggle ${toggleName} after 3 attempts`);
			}

			await expect(toggle).toBeChecked();

			// Wait for any state changes to settle
			await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);

			// Scroll again before unchecking (element might have moved)
			for (let scrollAttempt = 1; scrollAttempt <= 3; scrollAttempt++) {
				try {
					await toggle.scrollIntoViewIfNeeded({ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL });

					// Verify element is still in viewport
					const box = await toggle.boundingBox();
					if (box && box.y >= 0 && box.x >= 0) {
						break;
					}
				} catch {
					if (scrollAttempt === 3) {
						console.warn(`Re-scroll failed for toggle ${toggleName}`);
					}
					await this.page.waitForTimeout(200 * scrollAttempt);
				}
			}

			// Wait for stability
			await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);

			// Test toggling off with retry
			let uncheckSuccess = false;
			for (let attempt = 1; attempt <= 3; attempt++) {
				try {
					await toggle.uncheck({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD, force: attempt > 1 });
					uncheckSuccess = true;
					break;
				} catch (error) {
					console.warn(`Toggle ${toggleName} uncheck attempt ${attempt}/3 failed:`, error);
					if (attempt < 3) {
						await this.page.waitForTimeout(300 * attempt);
					}
				}
			}

			if (!uncheckSuccess) {
				throw new Error(`Failed to uncheck toggle ${toggleName} after 3 attempts`);
			}

			await expect(toggle).not.toBeChecked();
		} else {
			await expect(this.page.getByText(toggleName)).not.toBeVisible();
		}
	}

	/**
	 * Verify timeline component for postal code and building levels
	 */
	async verifyTimelineVisibility(currentLevel: string): Promise<void> {
		if (currentLevel === 'postalCode' || currentLevel === 'building') {
			await expect(this.page.locator('#heatTimeseriesContainer')).toBeVisible();

			// Test timeline slider interaction - verify Vuetify slider thumb is visible
			const sliderThumb = this.page.locator('.timeline-slider .v-slider-thumb');
			await expect(sliderThumb).toBeVisible();

			// Test moving the slider using the native input (works even though input is hidden)
			const slider = this.page.locator('.timeline-slider input');
			await slider.fill('3'); // Move to position 3
			// Wait for slider value change to be processed
			await this.page.waitForFunction(
				() => {
					const sliderElement = document.querySelector(
						'.timeline-slider input'
					) as HTMLInputElement;
					return sliderElement && sliderElement.value === '3';
				},
				{ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL }
			);
		} else {
			await expect(this.page.locator('#heatTimeseriesContainer')).not.toBeVisible();
		}
	}

	/**
	 * Test navigation controls (back, reset, camera rotation)
	 */
	async testNavigationControls(currentLevel: string): Promise<void> {
		// Reset button should always be visible
		const resetButton = this.page
			.getByRole('button')
			.filter({ has: this.page.locator('.mdi-refresh') });
		await expect(resetButton).toBeVisible();

		// Back button only visible at building level
		const backButton = this.page
			.getByRole('button')
			.filter({ has: this.page.locator('.mdi-arrow-left') });
		if (currentLevel === 'building') {
			await expect(backButton).toBeVisible();
		} else {
			await expect(backButton).not.toBeVisible();
		}

		// Camera rotation button visible when not at start level
		const cameraButton = this.page
			.getByRole('button')
			.filter({ has: this.page.locator('.mdi-compass') });
		if (currentLevel !== 'start') {
			await expect(cameraButton).toBeVisible();
		} else {
			await expect(cameraButton).not.toBeVisible();
		}
	}

	/**
	 * Verify loading states and overlays
	 */
	async verifyLoadingStates(): Promise<void> {
		// Check if loading component exists when needed
		const loadingOverlay = this.page.locator('.loading-overlay');

		// The loading overlay may or may not be present depending on data loading state
		// So we just verify it can be found if it exists
		if (await loadingOverlay.isVisible()) {
			await expect(this.page.getByText('Loading data, please wait')).toBeVisible();
		}
	}

	/**
	 * Test expansion panel interactions
	 */
	async testExpansionPanels(): Promise<void> {
		// Get all expansion panels
		const expansionPanels = this.page.locator('.v-expansion-panel');
		const count = await expansionPanels.count();

		// Test opening and closing each panel
		for (let i = 0; i < count; i++) {
			const panel = expansionPanels.nth(i);
			const header = panel.locator('.v-expansion-panel-title');

			if (await header.isVisible()) {
				// Click to open
				await header.click();
				// Wait for panel to expand by checking for visible content
				const content = panel.locator('.v-expansion-panel-text');
				await expect(content).toBeVisible();

				// Click to close (if not using multiple prop)
				await header.click();
				// Wait for panel to collapse
				await expect(content).toBeHidden();
			}
		}
	}

	/**
	 * Capture full accessibility state for documentation
	 */
	async captureAccessibilityTree(): Promise<{
		visibleElements: string[];
		interactiveElements: string[];
		currentState: CesiumTestState;
	}> {
		// Get all visible text elements
		const visibleElements = await this.page.locator('*:visible').allTextContents();

		// Get all interactive elements
		const buttons = await this.page.locator('button:visible').count();
		const inputs = await this.page.locator('input:visible').count();
		const selects = await this.page.locator('select:visible').count();

		return {
			visibleElements: visibleElements.filter((text) => text.trim().length > 0),
			interactiveElements: [`${buttons} buttons`, `${inputs} inputs`, `${selects} selects`],
			currentState: {
				timestamp: new Date().toISOString(),
				url: this.page.url(),
			},
		};
	}

	/**
	 * Wait for Cesium viewer to be fully loaded with improved robustness
	 */
	async waitForCesiumReady(): Promise<void> {
		// Use the enhanced Cesium helper for better CI compatibility
		if (process.env.CI) {
			// In CI, use the full initialization with retry logic
			const initialized = await initializeCesiumWithRetry(this.page, 3);
			if (!initialized) {
				console.warn(
					'Cesium initialization incomplete in CI, proceeding with limited functionality'
				);
			}
		} else {
			// In local development, use simpler initialization
			await waitForAppReady(this.page);
			await cesiumWaitForReady(this.page, 30000);
		}

		// Ensure the Cesium container is present
		await this.page.waitForSelector('#cesiumContainer', {
			timeout: process.env.CI ? 30000 : 15000,
		});

		// Wait for any final initialization processes
		// Note: CesiumJS continuously loads tiles, so we use a simple timeout
		await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);
	}

	/**
	 * Test viewport responsiveness
	 */
	async testResponsiveness(): Promise<void> {
		const viewports = [
			{ width: 1920, height: 1080, name: 'desktop' },
			{ width: 768, height: 1024, name: 'tablet' },
			{ width: 375, height: 667, name: 'mobile' },
		];

		for (const viewport of viewports) {
			await this.page.setViewportSize({
				width: viewport.width,
				height: viewport.height,
			});
			// Wait for viewport change to take effect by checking container dimensions
			await this.page.waitForFunction(
				(expectedWidth) => {
					return window.innerWidth === expectedWidth;
				},
				viewport.width,
				{ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL }
			);

			// Verify navigation drawer is accessible
			const navigationDrawer = this.page.locator('.v-navigation-drawer');
			await expect(navigationDrawer).toBeVisible();

			// Verify Cesium container adapts
			const cesiumContainer = this.page.locator('#cesiumContainer');
			await expect(cesiumContainer).toBeVisible();
		}
	}

	/**
	 * Wait for Vuetify overlays to close before interactions with comprehensive detection
	 */
	async waitForOverlaysToClose(): Promise<void> {
		const maxAttempts = 5;

		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			// Check multiple overlay types with comprehensive selectors
			const overlaySelectors = [
				'.v-overlay__scrim',
				'.v-overlay--active',
				'.v-dialog--active',
				'.v-menu__content',
				"[role='dialog']",
				'.v-snackbar--active',
				'.v-tooltip--active',
				'[data-overlay]',
			];

			let overlayFound = false;
			const visibleOverlays: string[] = [];

			for (const selector of overlaySelectors) {
				// Filter for visible elements only - this prevents counting DOM elements
				// that are hidden via CSS injection (e.g., .v-overlay__scrim { display: none !important; })
				const visibleLocator = this.page.locator(selector).locator('visible=true');
				const count = await visibleLocator.count();

				if (count > 0) {
					overlayFound = true;
					visibleOverlays.push(selector);
				}
			}

			if (!overlayFound) {
				// No overlays detected, we're good
				return;
			}

			console.log(
				`Attempt ${attempt}/${maxAttempts}: Found visible overlays: ${visibleOverlays.join(', ')}`
			);

			// Strategy 1: Press Escape to close any dialogs/overlays
			try {
				await this.page.keyboard.press('Escape');
				await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP); // Allow time for CSS transitions
			} catch {
				console.warn('Escape key press failed, trying alternative methods');
			}

			// Strategy 2: Click on overlay scrim if present
			const scrim = this.page.locator('.v-overlay__scrim').first();
			const scrimExists = await scrim.count().then((c) => c > 0);
			if (scrimExists) {
				try {
					await scrim.click({ timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION, force: true });
					await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);
				} catch {
					// Scrim click failed, continue
				}
			}

			// Strategy 3: Look for close buttons in dialogs
			const closeButtons = this.page.locator(
				'.v-dialog .v-btn[aria-label*="close"], .v-dialog .mdi-close'
			);
			const closeButtonCount = await closeButtons.count();
			if (closeButtonCount > 0) {
				try {
					await closeButtons.first().click({ timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION });
					await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY);
				} catch {
					// Close button click failed, continue
				}
			}

			// Wait for animations to complete
			await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);

			// Verify overlays are gone by checking for visible elements only
			const stillVisible = await Promise.all(
				overlaySelectors.map((selector) =>
					this.page
						.locator(selector)
						.locator('visible=true')
						.count()
						.then((count) => count > 0)
						.catch(() => false)
				)
			);

			if (!stillVisible.some((v) => v === true)) {
				// All overlays are gone
				console.log('All overlays successfully closed');
				return;
			}

			// Fallback: Try clicking outside any remaining overlays
			if (attempt < maxAttempts) {
				try {
					// Try multiple click positions
					const clickPositions = [
						{ x: 10, y: 10 }, // Top-left corner
						{ x: 50, y: 50 }, // Slightly in from corner
					];

					for (const pos of clickPositions) {
						await this.page.mouse.click(pos.x, pos.y);
						await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_SHORT);
					}
				} catch {
					// Continue anyway
				}

				// Exponential backoff before next attempt
				await this.page.waitForTimeout(300 * attempt);
			}
		}

		// Final check - if overlays still present after all attempts, log warning but continue
		const remainingOverlays = await Promise.all(
			['.v-overlay__scrim', '.v-overlay--active', '.v-dialog--active', "[role='dialog']"].map(
				async (selector) => {
					// Only check for visible elements, not just DOM presence
					const count = await this.page
						.locator(selector)
						.locator('visible=true')
						.count()
						.catch(() => 0);
					return count > 0 ? selector : null;
				}
			)
		);

		const stillPresent = remainingOverlays.filter((s) => s !== null);

		if (stillPresent.length > 0) {
			console.warn(
				`WARNING: Overlays still present after ${maxAttempts} attempts: ${stillPresent.join(', ')}. Continuing anyway, but this may cause test failures.`
			);

			// Final desperate measure: wait for any animations to settle
			await this.page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM);
		}
	}
}

export default AccessibilityTestHelpers;
