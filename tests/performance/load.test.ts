import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { TEST_TIMEOUTS } from '../e2e/helpers/test-helpers';

// Localhost URL for performance tests
const LOCALHOST_URL = 'http://localhost:5173';

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
	SESSION_DURATION: process.env.CI ? 45000 : 30000,

	// Warmup configuration
	WARMUP_RUNS: 1, // Number of warmup runs before measurement
	FPS_MEASUREMENT_DURATION: 2000, // Duration to measure FPS (ms)
} as const;

/**
 * Helper function to measure performance with warmup runs
 * Warmup runs eliminate cold start effects and JIT compilation noise
 */
async function _measureWithStats(
	fn: () => Promise<void>,
	options = { iterations: 5, warmup: 2 }
): Promise<{ mean: number; p95: number; stddev: number }> {
	const measurements: number[] = [];

	// Warmup runs (not measured)
	for (let i = 0; i < options.warmup; i++) {
		await fn();
	}

	// Measurement runs
	for (let i = 0; i < options.iterations; i++) {
		const start = Date.now();
		await fn();
		measurements.push(Date.now() - start);
	}

	measurements.sort((a, b) => a - b);
	const mean = measurements.reduce((a, b) => a + b, 0) / measurements.length;
	const p95 = measurements[Math.floor(measurements.length * 0.95)];
	const variance =
		measurements.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / measurements.length;

	return { mean, p95, stddev: Math.sqrt(variance) };
}

describe('Performance and Load Tests', { tags: ['@performance', '@integration'] }, () => {
	let browser: Browser;

	beforeAll(async () => {
		browser = await chromium.launch();

		// Verify server is responding before running tests
		const context = await browser.newContext();
		const page = await context.newPage();
		try {
			await page.goto(LOCALHOST_URL, { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT });
			await page.waitForSelector('canvas', {
				state: 'visible',
				timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
			});
		} catch (error: any) {
			throw new Error(
				'Dev server not responding. Ensure `npm run dev` is running or check playwright.config.ts webServer config.\n' +
					`Original error: ${error.message}`
			);
		} finally {
			await context.close();
		}
	});

	afterAll(async () => {
		await browser?.close();
	});

	describe('Page Load Performance', () => {
		it('should load initial page within acceptable time', async () => {
			const page = await browser.newPage();

			// Warmup run (not measured) - eliminates cold start effects
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });
			await page.reload();

			// Measured run
			const startTime = Date.now();
			await page.waitForSelector('canvas', {
				state: 'visible',
				timeout: PERF_CONFIG.INITIAL_LOAD + 5000,
			});
			const loadTime = Date.now() - startTime;

			// Use CI-aware threshold
			expect(loadTime).toBeLessThan(PERF_CONFIG.INITIAL_LOAD);

			await page.close();
		});

		it('should have good Core Web Vitals metrics', async () => {
			const page = await browser.newPage();

			// Warmup run
			await page.goto(LOCALHOST_URL);
			await page.waitForLoadState('networkidle');
			await page.reload();

			// Measured run
			await page.waitForLoadState('networkidle');

			// Measure performance metrics
			const metrics = await page.evaluate(() => {
				return new Promise((resolve) => {
					// Wait for performance observer to capture metrics
					const observer = new PerformanceObserver((list) => {
						const entries = list.getEntries();
						const metrics: any = {};

						entries.forEach((entry) => {
							if (entry.entryType === 'navigation') {
								const navEntry = entry as PerformanceNavigationTiming;
								metrics.domContentLoaded =
									navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart;
								metrics.loadComplete = navEntry.loadEventEnd - navEntry.loadEventStart;
								metrics.firstContentfulPaint = navEntry.responseEnd - navEntry.fetchStart;
							}
						});

						resolve(metrics);
					});

					observer.observe({ entryTypes: ['navigation'] });

					// Fallback in case observer doesn't fire
					setTimeout(() => {
						const navigation = performance.getEntriesByType(
							'navigation'
						)[0] as PerformanceNavigationTiming;
						resolve({
							domContentLoaded:
								navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
							loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
							firstContentfulPaint: navigation.responseEnd - navigation.fetchStart,
						});
					}, 1000);
				});
			});

			// Assert CI-aware performance metrics
			expect((metrics as any).domContentLoaded).toBeLessThan(PERF_CONFIG.DOM_READY);
			expect((metrics as any).loadComplete).toBeLessThan(PERF_CONFIG.FULL_LOAD);

			await page.close();
		});

		it('should handle resource loading efficiently', async () => {
			const page = await browser.newPage();
			const resources: any[] = [];

			// Monitor network requests
			page.on('response', async (response) => {
				resources.push({
					url: response.url(),
					status: response.status(),
					timing: response.timing(),
					size: parseInt(response.headers()['content-length'] || '0'),
				});
			});

			await page.goto(LOCALHOST_URL);
			await page.waitForLoadState('networkidle');

			// Analyze resource loading
			const jsResources = resources.filter((r) => r.url.includes('.js'));
			const cssResources = resources.filter((r) => r.url.includes('.css'));
			const imageResources = resources.filter(
				(r) => r.url.includes('.png') || r.url.includes('.jpg') || r.url.includes('.svg')
			);

			// Check that critical resources loaded successfully
			expect(jsResources.length).toBeGreaterThan(0);
			expect(jsResources.every((r) => r.status === 200)).toBe(true);

			// Check CSS resources
			if (cssResources.length > 0) {
				expect(cssResources.every((r) => r.status === 200)).toBe(true);
			}

			// Check image resources
			if (imageResources.length > 0) {
				expect(imageResources.every((r) => r.status === 200)).toBe(true);
			}

			await page.close();
		});
	});

	describe('Runtime Performance', () => {
		it('should maintain good FPS during map interactions', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);

			// Wait for initial load and Cesium to be ready
			await page.waitForSelector('canvas', { state: 'visible' });
			await page.waitForFunction(
				() => {
					const canvas = document.querySelector('canvas');
					return (
						canvas &&
						canvas.offsetWidth > 0 &&
						canvas.offsetHeight > 0 &&
						(window as any).cesiumViewer
					);
				},
				{ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT }
			);

			// Warmup interactions (not measured)
			const canvas = page.locator('canvas');
			await canvas.click({ position: { x: 400, y: 300 } });
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);

			// Measure FPS using Cesium's Scene.postRender event
			const fps = await page.evaluate((measureDuration: number) => {
				return new Promise<number>((resolve) => {
					const viewer = (window as any).cesiumViewer;
					if (!viewer) {
						resolve(0);
						return;
					}

					const scene = viewer.scene;
					const startTime = Date.now();
					let frameCount = 0;

					// Force continuous rendering for accurate measurement
					const wasRequestRenderMode = scene.requestRenderMode;
					scene.requestRenderMode = false;

					const listener = () => {
						frameCount++;
						if (Date.now() - startTime >= measureDuration) {
							scene.postRender.removeEventListener(listener);
							scene.requestRenderMode = wasRequestRenderMode;
							resolve(frameCount / (measureDuration / 1000));
						}
					};

					scene.postRender.addEventListener(listener);
				});
			}, PERF_CONFIG.FPS_MEASUREMENT_DURATION);

			// Use CI-aware threshold
			expect(fps).toBeGreaterThan(PERF_CONFIG.MIN_FPS);

			await page.close();
		});

		it('should handle memory usage efficiently', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			// Get initial memory usage using Playwright's cross-browser metrics API
			const initialMetrics = await page.metrics();

			// Perform memory-intensive operations
			for (let i = 0; i < 10; i++) {
				await page.locator('canvas').click({ position: { x: 300 + i * 10, y: 300 + i * 10 } });
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF);
			}

			// Check memory after operations
			const finalMetrics = await page.metrics();

			// Calculate memory growth in MB
			const memoryGrowthMB =
				(finalMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize) / (1024 * 1024);

			// Use CI-aware threshold
			expect(memoryGrowthMB).toBeLessThan(PERF_CONFIG.MAX_MEMORY_INCREASE_MB);

			await page.close();
		});

		it('should handle rapid user interactions without blocking', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			const startTime = Date.now();

			// Perform rapid interactions
			const interactions = [];
			for (let i = 0; i < 20; i++) {
				interactions.push(
					page.locator('canvas').click({
						position: {
							x: 300 + (i % 5) * 50,
							y: 300 + Math.floor(i / 5) * 50,
						},
					})
				);
			}

			await Promise.all(interactions);

			const responseTime = Date.now() - startTime;

			// Use CI-aware threshold
			expect(responseTime).toBeLessThan(PERF_CONFIG.RAPID_INTERACTIONS_TIME);

			// Page should remain responsive
			await expect(page.locator('canvas')).toBeVisible();

			await page.close();
		});
	});

	describe('Network Performance', () => {
		it('should handle slow network conditions', async () => {
			const page = await browser.newPage();

			// Simulate slow network (3G)
			await page.route('**/*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 100)); // 100ms delay
				await route.continue();
			});

			const startTime = Date.now();
			await page.goto(LOCALHOST_URL);

			// Should still load within reasonable time even with slow network
			await page.waitForSelector('canvas', {
				state: 'visible',
				timeout: PERF_CONFIG.SLOW_NETWORK_TIMEOUT,
			});

			const loadTime = Date.now() - startTime;
			expect(loadTime).toBeLessThan(PERF_CONFIG.SLOW_NETWORK_TIMEOUT);

			await page.close();
		});

		it('should cache resources effectively', async () => {
			const page = await browser.newPage();
			const firstLoadResources: string[] = [];
			const secondLoadResources: string[] = [];

			// First load
			page.on('response', (response) => {
				if (response.url().includes('localhost')) {
					firstLoadResources.push(response.url());
				}
			});

			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			// Clear listeners and reload
			page.removeAllListeners('response');
			page.on('response', (response) => {
				if (response.url().includes('localhost')) {
					secondLoadResources.push(response.url());
				}
			});

			await page.reload();
			await page.waitForSelector('canvas', { state: 'visible' });

			// Second load should request fewer resources due to caching
			expect(secondLoadResources.length).toBeLessThanOrEqual(firstLoadResources.length);

			await page.close();
		});

		it('should handle concurrent API requests efficiently', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			const apiResponses: any[] = [];
			page.on('response', (response) => {
				if (response.url().includes('/api/') || response.url().includes('geoserver')) {
					apiResponses.push({
						url: response.url(),
						status: response.status(),
						timing: Date.now(),
					});
				}
			});

			// Trigger multiple API requests by interacting with the map
			const positions = [
				{ x: 300, y: 300 },
				{ x: 400, y: 400 },
				{ x: 500, y: 300 },
				{ x: 600, y: 400 },
			];

			const startTime = Date.now();

			// Trigger concurrent interactions
			for (const pos of positions) {
				page.locator('canvas').click({ position: pos });
			}

			// Wait for API responses or network activity to settle
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch(() => {
					// Continue if network doesn't become idle (expected for ongoing operations)
				});

			const endTime = Date.now();
			const totalTime = endTime - startTime;

			// Should handle concurrent requests within reasonable time
			expect(totalTime).toBeLessThan(10000);

			// Check that API responses were received
			if (apiResponses.length > 0) {
				// Most API responses should be successful
				const successfulResponses = apiResponses.filter((r) => r.status < 400);
				expect(successfulResponses.length / apiResponses.length).toBeGreaterThan(0.8);
			}

			await page.close();
		});
	});

	describe('Stress Testing', () => {
		it('should handle extended usage without degradation', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			// Extended interaction session
			const startTime = Date.now();

			for (let i = 0; i < 50; i++) {
				// Random map interactions
				const x = 200 + Math.random() * 400;
				const y = 200 + Math.random() * 300;

				await page.locator('canvas').click({ position: { x, y } });

				// Occasionally perform other interactions
				if (i % 10 === 0) {
					await page.mouse.wheel(0, Math.random() > 0.5 ? -100 : 100);
				}

				// Wait for interaction to complete before next one
				await page.waitForFunction(
					() => {
						return document.readyState === 'complete';
					},
					{ timeout: TEST_TIMEOUTS.ELEMENT_VISIBLE }
				);
			}

			const endTime = Date.now();
			const sessionDuration = endTime - startTime;

			// Use CI-aware threshold
			expect(sessionDuration).toBeLessThan(PERF_CONFIG.SESSION_DURATION);

			// Application should still be responsive
			await expect(page.locator('canvas')).toBeVisible();

			// Final interaction test
			await page.locator('canvas').click({ position: { x: 400, y: 300 } });

			await page.close();
		});

		it('should handle multiple browser tabs efficiently', async () => {
			const tabs: Page[] = [];

			try {
				// Open multiple tabs
				for (let i = 0; i < 3; i++) {
					const page = await browser.newPage();
					await page.goto(LOCALHOST_URL);
					await page.waitForSelector('canvas', {
						state: 'visible',
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					});
					tabs.push(page);
				}

				// Interact with all tabs concurrently
				const interactions = tabs.map(async (page, index) => {
					for (let i = 0; i < 5; i++) {
						await page.locator('canvas').click({
							position: { x: 300 + index * 50, y: 300 + i * 30 },
						});
						// Wait for canvas interaction to complete
						await page.waitForFunction(
							() => {
								const canvas = document.querySelector('canvas');
								return canvas && canvas.offsetWidth > 0;
							},
							{ timeout: TEST_TIMEOUTS.WAIT_MEDIUM }
						);
					}
				});

				await Promise.all(interactions);

				// All tabs should remain functional
				for (const page of tabs) {
					await expect(page.locator('canvas')).toBeVisible();
				}
			} finally {
				// Clean up tabs
				for (const page of tabs) {
					await page.close();
				}
			}
		});

		it('should recover from temporary network failures', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			// Simulate network failure for external requests
			let networkDown = false;

			await page.route('**/api/**', (route) => {
				if (networkDown) {
					route.abort('failed');
				} else {
					route.continue();
				}
			});

			// Normal interaction first
			await page.locator('canvas').click({ position: { x: 400, y: 300 } });
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_SCROLL })
				.catch(() => {});

			// Enable network failure
			networkDown = true;

			// Try interaction during network failure
			await page.locator('canvas').click({ position: { x: 500, y: 300 } });
			// Wait for the application to handle the network error gracefully
			await page.waitForFunction(
				() => {
					const canvas = document.querySelector('canvas');
					return canvas && canvas.offsetWidth > 0;
				},
				{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
			);

			// Application should still be responsive
			await expect(page.locator('canvas')).toBeVisible();

			// Restore network
			networkDown = false;

			// Should recover and work normally
			await page.locator('canvas').click({ position: { x: 300, y: 400 } });
			await page
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_SCROLL })
				.catch(() => {});

			await expect(page.locator('canvas')).toBeVisible();

			await page.close();
		});
	});
});
