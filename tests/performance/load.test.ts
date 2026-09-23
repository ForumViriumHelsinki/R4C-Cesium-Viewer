import { type Browser, chromium, type Page } from 'playwright'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { TEST_TIMEOUTS } from '../e2e/helpers/test-helpers'
import {
	clickMap,
	closeTrackedPages,
	gotoReady,
	MAP_CANVAS,
	openPage,
	probeResponsiveness,
	recordMetric,
} from './harness'

// Localhost URL for performance tests.
// CI serves the production bundle via `bun run preview` on :4173 (see the
// performance-tests job in .github/workflows/test.yml); local dev uses :5173.
// Mirrors playwright.config.ts baseURL handling. PERF_BASE_URL overrides both,
// for a preview on another port.
const LOCALHOST_URL =
	process.env.PERF_BASE_URL ?? (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173')

// Budget for gotoReady(): navigation until the viewer exists, the map canvas has
// a size and the global loading overlay is not active. The per-test timeouts of
// the tests that call it are this CI budget (45s) plus the test's own work
// budget, written as literals so the formatter keeps each test body flat.
const READY_TIMEOUT_MS = process.env.CI ? 45000 : 20000

/**
 * CI-aware performance configuration
 * CI environments often have:
 * - Software rendering (no GPU acceleration)
 * - Lower CPU resources
 * - Higher baseline latency
 */
const PERF_CONFIG = {
	// Load time thresholds (ms)
	INITIAL_LOAD: process.env.CI ? 10000 : 5000,
	DOM_READY: process.env.CI ? 4000 : 2000,
	FULL_LOAD: process.env.CI ? 10000 : 5000,

	// Runtime performance thresholds
	MIN_FPS: process.env.CI ? 15 : 30, // CI often has software rendering
	MAX_MEMORY_INCREASE_MB: process.env.CI ? 100 : 50,
	RAPID_INTERACTIONS_TIME: process.env.CI ? 5000 : 3000,

	// Network and stress test thresholds
	SLOW_NETWORK_TIMEOUT: process.env.CI ? 25000 : 15000,
	// 50 map clicks with a responsiveness probe after each. The first two CI runs
	// with the harness took about 42s (run 35857022407) and 43.4s (run
	// 35858081838), probe p50 568ms and 505ms: under SwiftShader the page's main
	// thread was in long tasks for about 95% of the session (40.8s, 43.1s). On a
	// real GPU the same session takes about 1.2s. 60s is the CI value plus about
	// 40% headroom (#961).
	SESSION_DURATION: process.env.CI ? 60000 : 30000,

	// Warmup configuration
	WARMUP_RUNS: 1, // Number of warmup runs before measurement
	FPS_MEASUREMENT_DURATION: 2000, // Duration to measure FPS (ms)
} as const

/**
 * Logs an asserted measurement next to its threshold (to the CI log and
 * metrics.jsonl), so thresholds are recalibrated from recorded CI values.
 */
function recordThreshold(metric: string, value: number, threshold: number): void {
	const test = expect.getState().currentTestName?.split(' > ').pop() ?? 'unknown'
	recordMetric(test, { metric, value: Math.round(value * 10) / 10, threshold })
}

/**
 * Helper function to measure performance with warmup runs
 * Warmup runs eliminate cold start effects and JIT compilation noise
 */
async function _measureWithStats(
	fn: () => Promise<void>,
	options = { iterations: 5, warmup: 2 }
): Promise<{ mean: number; p95: number; stddev: number }> {
	const measurements: number[] = []

	// Warmup runs (not measured)
	for (let i = 0; i < options.warmup; i++) {
		await fn()
	}

	// Measurement runs
	for (let i = 0; i < options.iterations; i++) {
		const start = Date.now()
		await fn()
		measurements.push(Date.now() - start)
	}

	measurements.sort((a, b) => a - b)
	const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length
	const p95 = measurements[Math.floor(measurements.length * 0.95)]
	const variance =
		measurements.reduce((sum, val) => sum + (val - mean) ** 2, 0) / measurements.length

	return { mean, p95, stddev: Math.sqrt(variance) }
}

describe('Performance and Load Tests', { tags: ['@performance', '@integration'] }, () => {
	let browser: Browser
	let baselineContexts = 0

	beforeAll(async () => {
		// PERF_TEST_CHROMIUM_ARGS sets the renderer. The CI job passes the software
		// (SwiftShader) flags playwright.config.ts uses; `just test-performance 1`
		// passes the same flags locally. Unset → the local GPU.
		browser = await chromium.launch({
			args: process.env.PERF_TEST_CHROMIUM_ARGS
				? process.env.PERF_TEST_CHROMIUM_ARGS.split(/\s+/).filter(Boolean)
				: [],
		})

		// Verify server is responding before running tests
		const page = await openPage(browser)
		try {
			await page.goto(LOCALHOST_URL, { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
			await page.waitForSelector(MAP_CANVAS, {
				state: 'visible',
				timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
			})
		} catch (error: any) {
			throw new Error(
				`Server at ${LOCALHOST_URL} not responding. In CI, ensure \`bun run preview\` ` +
					'serves the production build on :4173 (see the performance-tests job in ' +
					'.github/workflows/test.yml); locally, run `bun run dev` (:5173).\n' +
					`Original error: ${error.message}`
			)
		} finally {
			await closeTrackedPages('server check', false)
		}
		baselineContexts = browser.contexts().length
	}, 60000)

	// Close every page the test opened, including when it timed out: a leaked page
	// keeps rendering and fetching tiles through the tests after it (#961).
	afterEach(async (ctx) => {
		await closeTrackedPages(ctx.task.name, ctx.task.result?.state === 'fail')
		expect(browser.contexts(), 'a test left a browser context open').toHaveLength(baselineContexts)
	}, 60000)

	afterAll(async () => {
		await browser?.close()
	})

	describe('Page Load Performance', () => {
		it('should load initial page within acceptable time', async () => {
			const page = await openPage(browser)

			// Warmup run (not measured) - eliminates cold start effects
			await page.goto(LOCALHOST_URL)
			await page.waitForSelector(MAP_CANVAS, { state: 'visible' })
			await page.reload()

			// Measured run
			const startTime = Date.now()
			await page.waitForSelector(MAP_CANVAS, {
				state: 'visible',
				timeout: PERF_CONFIG.INITIAL_LOAD + 5000,
			})
			const loadTime = Date.now() - startTime

			// Use CI-aware threshold
			recordThreshold('loadTimeMs', loadTime, PERF_CONFIG.INITIAL_LOAD)
			expect(loadTime).toBeLessThan(PERF_CONFIG.INITIAL_LOAD)
		})

		it('should have good Core Web Vitals metrics', async () => {
			const page = await openPage(browser)

			// Warmup run. Use 'load' rather than 'networkidle': this is a Cesium map
			// that streams tiles continuously, so the network never goes idle and
			// 'networkidle' would hang past the 10s test timeout.
			await page.goto(LOCALHOST_URL)
			await page.waitForLoadState('load')
			await page.reload()

			// Measured run
			await page.waitForLoadState('load')

			// Measure performance metrics
			const metrics = await page.evaluate(() => {
				return new Promise((resolve) => {
					// Wait for performance observer to capture metrics
					const observer = new PerformanceObserver((list) => {
						const entries = list.getEntries()
						const metrics: any = {}

						entries.forEach((entry) => {
							if (entry.entryType === 'navigation') {
								const navEntry = entry as PerformanceNavigationTiming
								metrics.domContentLoaded =
									navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart
								metrics.loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart
								metrics.firstContentfulPaint = navEntry.responseEnd - navEntry.fetchStart
							}
						})

						resolve(metrics)
					})

					observer.observe({ entryTypes: ['navigation'] })

					// Fallback in case observer doesn't fire
					setTimeout(() => {
						const navigation = performance.getEntriesByType(
							'navigation'
						)[0] as PerformanceNavigationTiming
						resolve({
							domContentLoaded:
								navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
							loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
							firstContentfulPaint: navigation.responseEnd - navigation.fetchStart,
						})
					}, 1000)
				})
			})

			// Assert CI-aware performance metrics
			recordThreshold(
				'domContentLoadedMs',
				(metrics as any).domContentLoaded,
				PERF_CONFIG.DOM_READY
			)
			recordThreshold('loadCompleteMs', (metrics as any).loadComplete, PERF_CONFIG.FULL_LOAD)
			expect((metrics as any).domContentLoaded).toBeLessThan(PERF_CONFIG.DOM_READY)
			expect((metrics as any).loadComplete).toBeLessThan(PERF_CONFIG.FULL_LOAD)
		})

		it('should handle resource loading efficiently', async () => {
			const page = await openPage(browser)
			const resources: any[] = []

			// Monitor network requests
			page.on('response', async (response) => {
				resources.push({
					url: response.url(),
					status: response.status(),
					size: parseInt(response.headers()['content-length'] || '0', 10),
				})
			})

			await page.goto(LOCALHOST_URL)
			// 'load' (not 'networkidle'): the Cesium map streams tiles forever, so the
			// network never idles. JS/CSS/image resources are all requested by load.
			await page.waitForLoadState('load')

			// Analyze resource loading
			const jsResources = resources.filter((r) => r.url.includes('.js'))
			const cssResources = resources.filter((r) => r.url.includes('.css'))
			const imageResources = resources.filter(
				(r) => r.url.includes('.png') || r.url.includes('.jpg') || r.url.includes('.svg')
			)

			// Check that critical resources loaded successfully
			expect(jsResources.length).toBeGreaterThan(0)
			expect(jsResources.every((r) => r.status === 200)).toBe(true)

			// Check CSS resources
			if (cssResources.length > 0) {
				expect(cssResources.every((r) => r.status === 200)).toBe(true)
			}

			// Check image resources
			if (imageResources.length > 0) {
				expect(imageResources.every((r) => r.status === 200)).toBe(true)
			}
		})
	})

	describe('Runtime Performance', () => {
		it('should maintain good FPS during map interactions', async (ctx) => {
			const page = await openPage(browser)
			await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)

			// FPS on a software rasterizer (SwiftShader / llvmpipe) is not representative,
			// so MIN_FPS is asserted only on a real GPU, which means local runs: the CI
			// runner has none. CI still measures and logs the value as a trend datapoint
			// before skipping (#843).
			const renderer = await page.evaluate(() => {
				const gl = document.createElement('canvas').getContext('webgl')
				const ext = gl?.getExtension('WEBGL_debug_renderer_info')
				return ext ? (gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) as string) : ''
			})
			const softwareRendering = /swiftshader|llvmpipe|software/i.test(renderer)

			// Warmup interactions (not measured)
			await clickMap(page, 400, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

			// Measure FPS using Cesium's Scene.postRender event
			const fps = await page.evaluate((measureDuration: number) => {
				return new Promise<number>((resolve) => {
					const viewer = (window as any).__viewer
					if (!viewer) {
						resolve(0)
						return
					}

					const scene = viewer.scene
					const startTime = Date.now()
					let frameCount = 0

					// Force continuous rendering for accurate measurement
					const wasRequestRenderMode = scene.requestRenderMode
					scene.requestRenderMode = false

					const listener = () => {
						frameCount++
						if (Date.now() - startTime >= measureDuration) {
							scene.postRender.removeEventListener(listener)
							scene.requestRenderMode = wasRequestRenderMode
							resolve(frameCount / (measureDuration / 1000))
						}
					}

					scene.postRender.addEventListener(listener)
				})
			}, PERF_CONFIG.FPS_MEASUREMENT_DURATION)

			recordMetric(ctx.task.name, {
				renderer,
				fps: Math.round(fps * 10) / 10,
				asserted: !softwareRendering,
			})
			if (softwareRendering) {
				ctx.skip()
				return
			}

			// Use CI-aware threshold
			expect(fps).toBeGreaterThan(PERF_CONFIG.MIN_FPS)
		}, 65000)

		it('should handle memory usage efficiently', async () => {
			const page = await openPage(browser)
			await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)

			// Read JS heap via Chromium's performance.memory (Playwright has no
			// Puppeteer-style page.metrics()). performance.memory is Chromium-only and
			// works under SwiftShader; returns 0 if unavailable so the test stays robust.
			const readHeapBytes = () =>
				page.evaluate(() => (performance as any).memory?.usedJSHeapSize ?? 0)

			const initialHeapBytes = await readHeapBytes()

			// Perform memory-intensive operations
			for (let i = 0; i < 10; i++) {
				await clickMap(page, 300 + i * 10, 300 + i * 10)
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF)
			}

			// Check memory after operations
			const finalHeapBytes = await readHeapBytes()

			// Calculate memory growth in MB
			const memoryGrowthMB = (finalHeapBytes - initialHeapBytes) / (1024 * 1024)

			// Use CI-aware threshold
			recordThreshold('memoryGrowthMB', memoryGrowthMB, PERF_CONFIG.MAX_MEMORY_INCREASE_MB)
			expect(memoryGrowthMB).toBeLessThan(PERF_CONFIG.MAX_MEMORY_INCREASE_MB)
			// Per-test timeout: page readiness plus 10 clicks under software rendering.
		}, 75000)

		it('should handle rapid user interactions without blocking', async () => {
			const page = await openPage(browser)
			await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)

			const startTime = Date.now()

			// Perform rapid interactions: 20 clicks back to back, each sent as soon as
			// the browser acknowledged the previous one.
			for (let i = 0; i < 20; i++) {
				await clickMap(page, 300 + (i % 5) * 50, 300 + Math.floor(i / 5) * 50)
			}

			const responseTime = Date.now() - startTime

			// Use CI-aware threshold
			recordThreshold('responseTimeMs', responseTime, PERF_CONFIG.RAPID_INTERACTIONS_TIME)
			expect(responseTime).toBeLessThan(PERF_CONFIG.RAPID_INTERACTIONS_TIME)

			// Page should remain responsive
			await probeResponsiveness(page)
			// Vitest's expect has no Playwright toBeVisible matcher; use isVisible()
			expect(await page.locator(MAP_CANVAS).isVisible()).toBe(true)
			// Per-test timeout: page readiness plus the interaction budget; the 10s
			// global testTimeout covered neither.
		}, 65000)
	})

	describe('Network Performance', () => {
		it('should handle slow network conditions', async () => {
			const page = await openPage(browser)

			// Simulate slow network (3G)
			await page.route('**/*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 100)) // 100ms delay
				await route.continue()
			})

			const startTime = Date.now()
			await page.goto(LOCALHOST_URL)

			// Should still load within reasonable time even with slow network
			await page.waitForSelector(MAP_CANVAS, {
				state: 'visible',
				timeout: PERF_CONFIG.SLOW_NETWORK_TIMEOUT,
			})

			const loadTime = Date.now() - startTime
			recordThreshold('loadTimeMs', loadTime, PERF_CONFIG.SLOW_NETWORK_TIMEOUT)
			expect(loadTime).toBeLessThan(PERF_CONFIG.SLOW_NETWORK_TIMEOUT)
		})

		it('should cache bundle assets across reloads', async () => {
			// The previous assertion ("the second load requests fewer resources") was
			// wrong for this app: Cesium streams a different set of dynamic map tiles on
			// every load, so the total request count is not monotonic across a reload.
			// This version looks only at the hashed same-origin bundle assets (which are
			// requested identically on both loads) and measures reuse via `transferSize`
			// rather than response status — Playwright reports 200 for a revalidated
			// (304) resource, so no status-based assertion can work here.
			const page = await openPage(browser)

			// The resource-timing buffer defaults to 250 entries and this page records
			// well over 500; bundle assets happen to load first today, but a bundle
			// reorder would silently truncate the measurement.
			await page.addInitScript(() => performance.setResourceTimingBufferSize(5000))

			// `vite preview` sends `Cache-Control: no-cache` with an ETag, so the browser
			// revalidates and Chrome reports its fixed header-overhead estimate (300
			// bytes) with no body bytes. The predicate also holds for a pure memory-cache
			// hit (`transferSize === 0`), so it stays correct against production nginx,
			// which serves the same hashed assets with a long max-age.
			const HEADER_ONLY_TRANSFER_BYTES = 300

			// `App.vue` resolves several `defineAsyncComponent(() => import(...))` chunks
			// and `await import(...)` services after mount, so the bundle-asset set is
			// still growing when the canvas becomes visible — and it grows faster on the
			// cached reload than on the cold load. Sampling at `waitForSelector('canvas')`
			// would therefore compare two truncated, differently-truncated sets. Poll
			// until the count is unchanged across two consecutive checks so both samples
			// are complete and the cold-vs-reload comparison is over the same set.
			const SETTLE_INTERVAL_MS = 500
			const SETTLE_ATTEMPTS = 20

			const sampleBundleAssets = (target: Page) =>
				target.evaluate((origin) => {
					const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
					return entries
						.filter(
							(entry) =>
								entry.name.startsWith(`${origin}/assets/`) &&
								(entry.name.endsWith('.js') || entry.name.endsWith('.css'))
						)
						.map((entry) => ({ name: entry.name, transferSize: entry.transferSize }))
				}, LOCALHOST_URL)

			const sampleSettledBundleAssets = async (target: Page) => {
				let previous = await sampleBundleAssets(target)
				for (let attempt = 0; attempt < SETTLE_ATTEMPTS; attempt++) {
					await target.waitForTimeout(SETTLE_INTERVAL_MS)
					const current = await sampleBundleAssets(target)
					if (current.length === previous.length && current.length > 0) return current
					previous = current
				}
				return previous
			}

			await page.goto(LOCALHOST_URL)
			await page.waitForSelector(MAP_CANVAS, { state: 'visible' })
			const coldEntries = await sampleSettledBundleAssets(page)

			expect(
				coldEntries.length,
				'no hashed /assets/*.js|css entries — the performance suite must run against `bun run preview` (just test-performance), not the dev server'
			).toBeGreaterThan(0)

			// Control: on a cold load every bundle asset must transfer a real body. If the
			// measurement mechanism ever starts returning zeros, this fails rather than
			// letting the reload assertion pass vacuously.
			expect(coldEntries.every((entry) => entry.transferSize > HEADER_ONLY_TRANSFER_BYTES)).toBe(
				true
			)

			await page.reload()
			await page.waitForSelector(MAP_CANVAS, { state: 'visible' })
			const reloadEntries = await sampleSettledBundleAssets(page)

			// The same hashed URLs are requested on both loads. Compare the name sets
			// rather than only the counts, so a chunk swapped for another of equal count
			// is not read as a match.
			expect([...reloadEntries.map((entry) => entry.name)].sort()).toEqual(
				[...coldEntries.map((entry) => entry.name)].sort()
			)
			expect(
				reloadEntries.filter((entry) => entry.transferSize <= HEADER_ONLY_TRANSFER_BYTES).length
			).toBe(reloadEntries.length)
			// Per-test timeout: this performs two full Cesium loads plus two settle
			// polls, and the global testTimeout is 10s.
		}, 60000)

		it('should handle concurrent API requests efficiently', async () => {
			const page = await openPage(browser)
			await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)

			const apiResponses: any[] = []
			page.on('response', (response) => {
				if (response.url().includes('/api/') || response.url().includes('geoserver')) {
					apiResponses.push({
						url: response.url(),
						status: response.status(),
						timing: Date.now(),
					})
				}
			})

			// Trigger multiple API requests by interacting with the map
			const positions = [
				{ x: 300, y: 300 },
				{ x: 400, y: 400 },
				{ x: 500, y: 300 },
				{ x: 600, y: 400 },
			]

			const startTime = Date.now()

			// Trigger concurrent requests: the clicks go out back to back, each awaited
			// only until the browser acknowledges it, so the requests they start overlap.
			// (These clicks used to be fired without await, so the test asserted nothing
			// about them and their rejections surfaced in later tests, #961.)
			for (const pos of positions) {
				await clickMap(page, pos.x, pos.y)
			}

			// Wait for API responses or network activity to settle. Use a 3s cap (below
			// the 10s test timeout) so the .catch() actually fires — the Cesium map
			// streams tiles continuously and never reaches true 'networkidle'.
			await page.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.WAIT_LONG }).catch(() => {
				// Continue if network doesn't become idle (expected for ongoing operations)
			})

			const endTime = Date.now()
			const totalTime = endTime - startTime

			// Should handle concurrent requests within reasonable time
			recordThreshold('totalTimeMs', totalTime, 10000)
			expect(totalTime).toBeLessThan(10000)

			// Check that API responses were received
			if (apiResponses.length > 0) {
				// Most API responses should be successful
				const successfulResponses = apiResponses.filter((r) => r.status < 400)
				expect(successfulResponses.length / apiResponses.length).toBeGreaterThan(0.8)
			}
			// Per-test timeout: page readiness plus the 10s interaction budget asserted above.
		}, 60000)
	})

	describe('Stress Testing', () => {
		it('should handle extended usage without degradation', async () => {
			const page = await openPage(browser)
			await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)

			// Extended interaction session
			const startTime = Date.now()

			for (let i = 0; i < 50; i++) {
				// Random map interactions
				const x = 200 + Math.random() * 400
				const y = 200 + Math.random() * 300

				await clickMap(page, x, y)

				// Occasionally perform other interactions
				if (i % 10 === 0) {
					await page.mouse.wheel(0, Math.random() > 0.5 ? -100 : 100)
				}

				// Wait for the page to take a new task before the next interaction
				await probeResponsiveness(page)
			}

			const endTime = Date.now()
			const sessionDuration = endTime - startTime

			// Use CI-aware threshold
			recordThreshold('sessionDurationMs', sessionDuration, PERF_CONFIG.SESSION_DURATION)
			expect(sessionDuration).toBeLessThan(PERF_CONFIG.SESSION_DURATION)

			// Application should still be responsive
			// Vitest's expect has no Playwright toBeVisible matcher; use isVisible()
			expect(await page.locator(MAP_CANVAS).isVisible()).toBe(true)

			// Final interaction test
			await clickMap(page, 400, 300)
			// Per-test timeout: page readiness plus SESSION_DURATION and a margin, so the
			// session's own threshold is what fails, not the test timeout.
		}, 120000)

		it('should handle multiple browser tabs efficiently', async () => {
			const tabs: Page[] = []

			// Open multiple tabs
			for (let i = 0; i < 3; i++) {
				const page = await openPage(browser)
				await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)
				tabs.push(page)
			}

			// Interact with all tabs concurrently
			const interactions = tabs.map(async (page, index) => {
				for (let i = 0; i < 5; i++) {
					await clickMap(page, 300 + index * 50, 300 + i * 30)
					// Wait for the tab to take a new task before its next click
					await probeResponsiveness(page)
				}
			})

			await Promise.all(interactions)

			// All tabs should remain functional
			for (const page of tabs) {
				// Vitest's expect has no Playwright toBeVisible matcher; use isVisible()
				expect(await page.locator(MAP_CANVAS).isVisible()).toBe(true)
			}
			// Per-test timeout: three sequential page loads plus the interactions.
		}, 165000)

		it('should recover from temporary network failures', async () => {
			const page = await openPage(browser)
			await gotoReady(page, LOCALHOST_URL, READY_TIMEOUT_MS)

			// Simulate network failure for external requests
			let networkDown = false

			await page.route('**/api/**', (route) => {
				if (networkDown) {
					route.abort('failed')
				} else {
					route.continue()
				}
			})

			// Normal interaction first
			await clickMap(page, 400, 300)
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.WAIT_LONG })
				.catch(() => {})

			// Enable network failure
			networkDown = true

			// Try interaction during network failure
			await clickMap(page, 500, 300)
			// Wait for the application to handle the network error and take a new task
			await probeResponsiveness(page)

			// Application should still be responsive
			// Vitest's expect has no Playwright toBeVisible matcher; use isVisible()
			expect(await page.locator(MAP_CANVAS).isVisible()).toBe(true)

			// Restore network
			networkDown = false

			// Should recover and work normally
			await clickMap(page, 300, 400)
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.WAIT_LONG })
				.catch(() => {})

			// Vitest's expect has no Playwright toBeVisible matcher; use isVisible()
			expect(await page.locator(MAP_CANVAS).isVisible()).toBe(true)
			// Per-test timeout: page readiness plus two 3s networkidle waits and the clicks.
		}, 75000)
	})
})
