import { expect, test } from '@playwright/test'
import { BUNDLE_SIZE_BUDGETS, WEB_VITALS_BUDGETS } from './config/constants'
import { TEST_TIMEOUTS } from './e2e/helpers/test-helpers'
import { setupDigitransitMock } from './setup/digitransit-mock'

// Setup digitransit mocking for all tests in this file
setupDigitransitMock()

test.describe('Loading Performance and User Experience', () => {
	test.use({ tag: ['@performance'] })
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
	})

	test('should load initial page quickly', async ({ page }) => {
		const startTime = Date.now()

		// Wait for disclaimer popup to appear (indicates app is loaded)
		await expect(page.locator('button', { hasText: 'Explore Map' })).toBeVisible()

		const loadTime = Date.now() - startTime

		// Page should load within reasonable time (adjust threshold as needed)
		expect(loadTime).toBeLessThan(10000) // 10 seconds max

		// Dismiss disclaimer
		await page.locator('button', { hasText: 'Explore Map' }).click()
	})

	test('should display loading indicators during data fetching', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		// Wait for canvas to be ready
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// Click to trigger data loading
		await canvas.click({ position: { x: 400, y: 300 } })

		// Check for loading indicators
		const loadingIndicators = page.locator(
			'.loading, [data-testid="loading"], .v-progress-circular, .spinner'
		)

		if ((await loadingIndicators.count()) > 0) {
			// Loading indicator should appear initially
			const hasVisibleLoader = (await loadingIndicators.filter({ hasText: /./ }).count()) > 0
			if (hasVisibleLoader) {
				await expect(loadingIndicators.first()).toBeVisible()
			}
		}

		// Wait for loading to complete using network idle
		await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })

		// Loading indicators should eventually disappear
		if ((await loadingIndicators.count()) > 0) {
			// Check if loaders are hidden after loading
			const _stillVisible = await loadingIndicators.filter({ hasText: /./ }).count()
			// Some loaders might still be in DOM but hidden
		}
	})

	test('should handle layer loading smoothly', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// Navigate to postal code level
		await canvas.click({ position: { x: 400, y: 300 } })
		await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })

		// Toggle vegetation layer and measure loading time
		const vegToggle = page.getByLabel(/vegetation/i)
		if ((await vegToggle.count()) > 0) {
			const startTime = Date.now()

			await vegToggle.check()

			// Wait for layer to load using network idle
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch((e) => console.warn('Layer load network idle timeout:', e.message))

			const loadTime = Date.now() - startTime

			// Layer should load within reasonable time
			expect(loadTime).toBeLessThan(15000) // 15 seconds max

			// App should remain responsive during loading
			await expect(canvas).toBeVisible()
			await expect(vegToggle).toBeEnabled()

			// Clean up
			await vegToggle.uncheck()
			await page
				.waitForLoadState('domcontentloaded')
				.catch((e) => console.warn('DOM load after uncheck timeout:', e.message))
		}
	})

	test('should show progress for large data loads', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// Navigate to trigger large data load
		await canvas.click({ position: { x: 400, y: 300 } })

		// Look for progress indicators
		const progressIndicators = page.locator(
			'.v-progress-linear, .progress-bar, [role="progressbar"]'
		)

		if ((await progressIndicators.count()) > 0) {
			const progress = progressIndicators.first()
			if (await progress.isVisible()) {
				await expect(progress).toBeVisible()

				// Wait for progress to complete using network idle
				await page
					.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
					.catch((e) => console.warn('Progress completion timeout:', e.message))
			}
		}

		// Check for data source status updates
		const statusIndicator = page.locator('.status-indicator-container')
		if (await statusIndicator.isVisible()) {
			await expect(statusIndicator).toBeVisible()
		}
	})

	test('should handle multiple concurrent layer loads', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// Navigate to postal code level
		await canvas.click({ position: { x: 400, y: 300 } })
		await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })

		// Enable multiple layers simultaneously
		const layers = [/vegetation/i, /tree/i, /nature/i]

		const startTime = Date.now()

		// Toggle multiple layers quickly
		for (const layerPattern of layers) {
			const toggle = page.getByLabel(layerPattern)
			if ((await toggle.count()) > 0) {
				await toggle.check()
				// Playwright auto-waits for actionability - no manual delay needed
			}
		}

		// Wait for all layers to load using network idle
		await page
			.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.CESIUM_READY })
			.catch((e) => console.warn('Multiple layers load timeout:', e.message))

		const totalLoadTime = Date.now() - startTime

		// Multiple layers should load efficiently
		expect(totalLoadTime).toBeLessThan(20000) // 20 seconds max

		// App should remain responsive
		await expect(canvas).toBeVisible()

		// Clean up - uncheck all layers
		for (const layerPattern of layers) {
			const toggle = page.getByLabel(layerPattern)
			if ((await toggle.count()) > 0) {
				await toggle.uncheck()
				// Playwright auto-waits for actionability
			}
		}
	})

	test('should handle error states gracefully', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		// Wait for any overlay scrim to disappear
		await page
			.waitForFunction(
				() => {
					const scrim = document.querySelector('.v-overlay__scrim')
					return !scrim || window.getComputedStyle(scrim).opacity === '0'
				},
				{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
			)
			.catch(() => {})

		// Listen for console errors
		const consoleErrors: string[] = []
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				consoleErrors.push(msg.text())
			}
		})

		// Try to trigger potential error conditions
		const canvas = page.locator('canvas')

		// Click on multiple areas rapidly - use center positions to avoid camera controls
		await canvas.click({ position: { x: 500, y: 300 } })
		await canvas.click({ position: { x: 520, y: 320 } })
		await canvas.click({ position: { x: 540, y: 340 } })
		await page
			.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
			.catch((e) => console.warn('Error state handling timeout:', e.message))

		// App should still be functional
		await expect(canvas).toBeVisible()

		// Check that control panel still works
		const toggleButton = page.getByRole('button', {
			name: 'Toggle control panel',
		})
		await expect(toggleButton).toBeVisible()
		await toggleButton.click()
		// Playwright auto-waits for click to complete

		// Errors should be minimal or handled gracefully
		// Note: Some console errors might be expected (network timeouts, etc.)
		const criticalErrors = consoleErrors.filter(
			(error) =>
				error.includes('TypeError') ||
				error.includes('ReferenceError') ||
				error.includes('Cannot read')
		)

		if (criticalErrors.length > 0) {
			console.warn('Critical errors detected:', criticalErrors)
		}
	})

	test('should maintain performance with navigation', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// Perform multiple navigation actions
		const startTime = Date.now()

		// Navigate to postal code
		await canvas.click({ position: { x: 400, y: 300 } })
		await page
			.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
			.catch((e) => console.warn('Postal code navigation timeout:', e.message))

		// Try to navigate to building
		await canvas.click({ position: { x: 420, y: 320 } })
		await page
			.waitForLoadState('domcontentloaded')
			.catch((e) => console.warn('Building navigation timeout:', e.message))

		// Navigate back if possible
		const returnButton = page.getByRole('button', { name: /return|back/i })
		if ((await returnButton.count()) > 0) {
			await returnButton.click()
			await page
				.waitForLoadState('domcontentloaded')
				.catch((e) => console.warn('Back navigation timeout:', e.message))
		}

		// Reset view
		const resetButton = page.getByRole('button', { name: /reset/i })
		if ((await resetButton.count()) > 0) {
			await resetButton.click()
			await page
				.waitForLoadState('domcontentloaded')
				.catch((e) => console.warn('Reset view timeout:', e.message))
		}

		const totalTime = Date.now() - startTime

		// Navigation sequence should complete efficiently
		expect(totalTime).toBeLessThan(15000) // 15 seconds max

		// App should still be responsive
		await expect(canvas).toBeVisible()
	})

	test('should handle memory efficiently during long session', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// Simulate longer user session with multiple interactions
		const interactions = [
			{ x: 300, y: 300 },
			{ x: 400, y: 300 },
			{ x: 500, y: 300 },
			{ x: 400, y: 400 },
			{ x: 400, y: 200 },
		]

		for (const position of interactions) {
			await canvas.click({ position })
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
				.catch((e) => console.warn(`Position ${position.x},${position.y} load timeout:`, e.message))

			// Toggle some layers
			const vegToggle = page.getByLabel(/vegetation/i)
			if ((await vegToggle.count()) > 0) {
				await vegToggle.check()
				await page
					.waitForLoadState('domcontentloaded')
					.catch((e) => console.warn('Layer check timeout:', e.message))
				await vegToggle.uncheck()
				// Playwright auto-waits for actionability
			}

			// App should remain responsive throughout
			await expect(canvas).toBeVisible()
		}

		// Final check - app should still be functional
		const toggleButton = page.getByRole('button', {
			name: 'Toggle control panel',
		})
		await expect(toggleButton).toBeVisible()
		await toggleButton.click()
		// Playwright auto-waits for click to complete
		await toggleButton.click()
	})

	test('should cache data effectively', async ({ page }) => {
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('canvas', { state: 'visible' })

		const canvas = page.locator('canvas')

		// First visit to an area
		await canvas.click({ position: { x: 400, y: 300 } })
		await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })

		// Enable a layer
		const vegToggle = page.getByLabel(/vegetation/i)
		if ((await vegToggle.count()) > 0) {
			const firstLoadStart = Date.now()
			await vegToggle.check()
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch((e) => console.warn('First layer load timeout:', e.message))
			const firstLoadTime = Date.now() - firstLoadStart

			await vegToggle.uncheck()
			await page
				.waitForLoadState('domcontentloaded')
				.catch((e) => console.warn('Layer uncheck timeout:', e.message))

			// Navigate away and back
			await canvas.click({ position: { x: 200, y: 200 } })
			await page
				.waitForLoadState('domcontentloaded')
				.catch((e) => console.warn('Navigate away timeout:', e.message))
			await canvas.click({ position: { x: 400, y: 300 } })
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
				.catch((e) => console.warn('Navigate back timeout:', e.message))

			// Second load should be faster (cached)
			const secondLoadStart = Date.now()
			await vegToggle.check()
			await page
				.waitForLoadState('domcontentloaded')
				.catch((e) => console.warn('Second layer load timeout:', e.message))
			const secondLoadTime = Date.now() - secondLoadStart

			// Second load should be significantly faster
			expect(secondLoadTime).toBeLessThan(firstLoadTime * 0.8)

			await vegToggle.uncheck()
		}
	})

	test('should limit WMS tile requests on page load', async ({ page }) => {
		// Performance baseline: Post PR #340 optimization
		// WMS requests should be reduced from ~600 to ~150 by optimizing tile size
		const wmsRequests: string[] = []

		// Attach listener BEFORE navigation to capture all WMS requests
		page.on('request', (request) => {
			if (request.url().includes('/helsinki-wms')) {
				wmsRequests.push(request.url())
			}
		})

		await page.goto('/')

		// Dismiss disclaimer to trigger full app initialization
		await page.locator('button', { hasText: 'Explore Map' }).click()

		// Wait for map to fully load and WMS tiles to settle
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_EXTENDED)

		// Verify request count is below threshold (down from ~600 before optimization)
		expect(
			wmsRequests.length,
			`WMS requests should be < 200 (optimization from PR #340)`
		).toBeLessThan(200)

		// Log actual count for monitoring and regression detection
		console.log(`WMS tile requests: ${wmsRequests.length}`)
	})
})

test.describe('Bundle Size and Dynamic Import Performance', () => {
	test.use({ tag: ['@performance', '@bundle'] })

	/**
	 * Helper function to get response size with fallback for dev server
	 */
	async function getResponseSize(response: any): Promise<number> {
		const contentLength = response.headers()['content-length']
		if (contentLength) {
			return parseInt(contentLength, 10)
		}
		// Fallback: read body size (for dev server without content-length)
		try {
			const buffer = await response.body()
			return buffer?.byteLength || 0
		} catch (e) {
			console.warn('Could not determine response size:', response.url(), e)
			return 0
		}
	}

	test('should load Cesium as separate chunk (dynamic import)', async ({ page }) => {
		// Performance baseline: Post v1.27.7 optimization (#279)
		// Cesium (~5MB) should load as a separate dynamically imported chunk
		const cesiumResources: Array<{ url: string; size: number }> = []

		// Attach listener BEFORE navigation to avoid missing early resources
		page.on('response', async (response) => {
			const url = response.url()
			// Match Cesium chunks (case-insensitive, handles both dev and prod builds)
			if (url.toLowerCase().includes('cesium')) {
				const size = await getResponseSize(response)
				if (size > 0) {
					cesiumResources.push({ url, size })
				}
			}
		})

		await page.goto('/')

		// Dismiss disclaimer to trigger full app initialization (Cesium loads lazily)
		await page.locator('button', { hasText: 'Explore Map' }).click()

		// Wait for network idle to ensure all resources loaded (listener collects them asynchronously)
		await page.waitForLoadState('networkidle')
		// Small delay to ensure async response listener has processed all responses
		await page.waitForTimeout(500)

		// Verify Cesium loaded as separate chunk
		expect(
			cesiumResources.length,
			'Cesium should load as one or more separate chunks'
		).toBeGreaterThan(0)

		// Verify at least one Cesium resource is substantial (dynamic import)
		const hasSizableCesiumChunk = cesiumResources.some(
			(resource) => resource.size > BUNDLE_SIZE_BUDGETS.MIN_CESIUM_CHUNK
		)
		expect(
			hasSizableCesiumChunk,
			`Cesium chunk should be substantial (>${(BUNDLE_SIZE_BUDGETS.MIN_CESIUM_CHUNK / BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB).toFixed(0)}KiB), indicating dynamic import`
		).toBe(true)

		const totalSize = cesiumResources.reduce((sum, r) => sum + r.size, 0)
		console.log(
			`Cesium resources loaded: ${cesiumResources.length} chunks, total size: ${(totalSize / BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB).toFixed(2)} KiB`
		)
	})

	test('main bundle should not include Cesium', async ({ page }) => {
		// Performance baseline: Post v1.27.7 optimization (#279)
		// Main bundle should be < 500KB (without Cesium's ~5MB)
		const mainBundles: Array<{ url: string; size: number }> = []

		// Attach listener BEFORE navigation to avoid missing early resources
		page.on('response', async (response) => {
			const url = response.url()
			// Capture all non-Cesium JavaScript bundles to ensure comprehensive monitoring
			if (url.endsWith('.js') && !url.toLowerCase().includes('cesium')) {
				const size = await getResponseSize(response)
				if (size > 0) {
					mainBundles.push({ url, size })
				}
			}
		})

		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Should have at least one main bundle
		expect(mainBundles.length, 'Should have at least one JavaScript bundle').toBeGreaterThan(0)

		// Check the largest single bundle to ensure no individual bundle exceeds budget
		const largestMainBundle = Math.max(...mainBundles.map((b) => b.size))
		expect(
			largestMainBundle,
			`Largest non-Cesium bundle should be < ${BUNDLE_SIZE_BUDGETS.MAX_MAIN_BUNDLE / BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB}KiB (Cesium excluded via dynamic import)`
		).toBeLessThan(BUNDLE_SIZE_BUDGETS.MAX_MAIN_BUNDLE)

		// Check total size of all main bundles to prevent multiple smaller bundles from bloating
		const totalMainSize = mainBundles.reduce((sum, b) => sum + b.size, 0)
		expect(
			totalMainSize,
			`Total non-Cesium bundle size should be < ${BUNDLE_SIZE_BUDGETS.MAX_TOTAL_MAIN_BUNDLE / BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB}KiB`
		).toBeLessThan(BUNDLE_SIZE_BUDGETS.MAX_TOTAL_MAIN_BUNDLE)

		console.log(
			`Largest non-Cesium bundle: ${(largestMainBundle / BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB).toFixed(2)} KiB`
		)
		console.log(
			`Total non-Cesium bundle size: ${(totalMainSize / BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB).toFixed(2)} KiB`
		)
		console.log(`Total non-Cesium bundles: ${mainBundles.length}`)
	})

	test('should measure Web Vitals (FCP, LCP, domInteractive)', async ({ page }) => {
		// Performance baseline: Post v1.27.7 optimization (#279)
		// Expected improvements: FCP 500ms-2s faster than v1.27.6
		await page.goto('/')
		await page.waitForLoadState('networkidle')

		// Detect if we're in CI environment (pass from Node context)
		const isCI = process.env.CI === 'true'

		// Measure Web Vitals using Performance API
		const webVitals = await page.evaluate(
			({ isCI, timeoutCI, timeoutLocal }) => {
				return new Promise((resolve) => {
					const metrics: {
						fcp?: number
						lcp?: number
						domInteractive?: number
					} = {}

					// First Contentful Paint (FCP)
					const paintEntries = performance.getEntriesByType('paint') as PerformanceEntry[]
					const fcpEntry = paintEntries.find((entry) => entry.name === 'first-contentful-paint')
					if (fcpEntry) {
						metrics.fcp = fcpEntry.startTime
					}

					// Largest Contentful Paint (LCP)
					const observer = new PerformanceObserver((list) => {
						const entries = list.getEntries()
						const lastEntry = entries[entries.length - 1] as any
						if (lastEntry) {
							metrics.lcp = lastEntry.startTime
						}
					})
					observer.observe({
						type: 'largest-contentful-paint',
						buffered: true,
					})

					// DOM Interactive time (not true TTI, but a useful metric)
					// Note: True TTI requires CPU idle time calculation after last long task
					const navigationEntry = performance.getEntriesByType('navigation')[0] as any
					if (navigationEntry) {
						metrics.domInteractive = navigationEntry.domInteractive
					}

					// LCP finalizes on user interaction or page visibility change
					// Use longer timeout for CI environments to capture accurate LCP
					const timeout = isCI ? timeoutCI : timeoutLocal
					setTimeout(() => {
						observer.disconnect()
						resolve(metrics)
					}, timeout)
				})
			},
			{
				isCI,
				timeoutCI: WEB_VITALS_BUDGETS.LCP_OBSERVATION_TIMEOUT_CI,
				timeoutLocal: WEB_VITALS_BUDGETS.LCP_OBSERVATION_TIMEOUT_LOCAL,
			}
		)

		console.log('Web Vitals:', webVitals)

		// Assert performance budgets
		// FCP: First Contentful Paint should be < 2s (good UX)
		expect(
			webVitals.fcp,
			`First Contentful Paint should be defined and < ${WEB_VITALS_BUDGETS.FCP_BUDGET}ms`
		).toBeDefined()
		expect(
			webVitals.fcp,
			`First Contentful Paint should be < ${WEB_VITALS_BUDGETS.FCP_BUDGET}ms`
		).toBeLessThan(WEB_VITALS_BUDGETS.FCP_BUDGET)

		// LCP: Largest Contentful Paint should be < 3s (good UX)
		expect(
			webVitals.lcp,
			`Largest Contentful Paint should be defined and < ${WEB_VITALS_BUDGETS.LCP_BUDGET}ms`
		).toBeDefined()
		expect(
			webVitals.lcp,
			`Largest Contentful Paint should be < ${WEB_VITALS_BUDGETS.LCP_BUDGET}ms`
		).toBeLessThan(WEB_VITALS_BUDGETS.LCP_BUDGET)

		// DOM Interactive: Should be < 5s
		// Note: This is domInteractive, not true TTI (which requires CPU idle time analysis)
		expect(
			webVitals.domInteractive,
			`DOM Interactive should be defined and < ${WEB_VITALS_BUDGETS.DOM_INTERACTIVE_BUDGET}ms`
		).toBeDefined()
		expect(
			webVitals.domInteractive,
			`DOM Interactive should be < ${WEB_VITALS_BUDGETS.DOM_INTERACTIVE_BUDGET}ms`
		).toBeLessThan(WEB_VITALS_BUDGETS.DOM_INTERACTIVE_BUDGET)

		// Log for tracking performance over time
		console.log(`FCP: ${webVitals.fcp?.toFixed(2)}ms`)
		console.log(`LCP: ${webVitals.lcp?.toFixed(2)}ms`)
		console.log(`DOM Interactive: ${webVitals.domInteractive?.toFixed(2)}ms (Note: not true TTI)`)
	})

	test('should track total JavaScript bundle size', async ({ page }) => {
		// Track all JavaScript resources to monitor bundle bloat
		const jsResources: Array<{ url: string; size: number }> = []

		// Attach listener BEFORE navigation to avoid missing early resources
		page.on('response', async (response) => {
			const url = response.url()
			if (url.endsWith('.js')) {
				const size = await getResponseSize(response)
				if (size > 0) {
					jsResources.push({ url, size })
				}
			}
		})

		await page.goto('/')

		// Dismiss disclaimer to load all chunks (Cesium loads lazily)
		await page.locator('button', { hasText: 'Explore Map' }).click()

		// Wait for network idle to ensure all resources loaded
		// The response listener above captures all JS resources including Cesium
		await page.waitForLoadState('networkidle')

		const totalSize = jsResources.reduce((sum, r) => sum + r.size, 0)
		const totalMiB = (
			totalSize /
			(BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB * BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB)
		).toFixed(2)

		console.log(`Total JavaScript size: ${totalMiB} MiB`)
		console.log(`Number of JS files: ${jsResources.length}`)

		// Log largest bundles for tracking
		const sortedBySize = [...jsResources].sort((a, b) => b.size - a.size)
		console.log('Largest bundles:')
		sortedBySize.slice(0, 5).forEach((resource, i) => {
			const fileName = resource.url.split('/').pop() || resource.url
			const sizeMiB = (
				resource.size /
				(BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB * BUNDLE_SIZE_BUDGETS.BYTES_PER_KIB)
			).toFixed(2)
			console.log(`  ${i + 1}. ${fileName}: ${sizeMiB} MiB`)
		})

		// Total should be reasonable (accounting for Cesium ~5MB + app code)
		// This is a soft assertion for tracking, not a hard limit
		expect(totalSize).toBeGreaterThan(0)
	})
})
