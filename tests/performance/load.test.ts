import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { chromium, Browser, Page } from 'playwright';
import { TIMEOUTS, PERFORMANCE_THRESHOLDS, API_ENDPOINTS } from '../config/constants';

// Localhost URL for performance tests
const LOCALHOST_URL = 'http://localhost:5173';

describe('Performance and Load Tests', { tags: ['@performance', '@integration'] }, () => {
	let browser: Browser;

	beforeAll(async () => {
		browser = await chromium.launch();
	});

	afterAll(async () => {
		await browser?.close();
	});

	describe('Page Load Performance', () => {
		it('should load initial page within acceptable time', async () => {
			const page = await browser.newPage();

			const startTime = Date.now();
			await page.goto('/');

			// Wait for main content to load
			await page.waitForSelector('canvas', {
				state: 'visible',
				timeout: TIMEOUTS.ELEMENT_WAIT,
			});

			const loadTime = Date.now() - startTime;

			// Should load within 5 seconds
			expect(loadTime).toBeLessThan(PERFORMANCE_THRESHOLDS.INITIAL_LOAD);

			await page.close();
		});

		it('should have good Core Web Vitals metrics', async () => {
			const page = await browser.newPage();

			// Navigate and wait for load
			await page.goto(LOCALHOST_URL);
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

			// Assert reasonable performance metrics
			expect((metrics as any).domContentLoaded).toBeLessThan(2000); // DOM ready within 2s
			expect((metrics as any).loadComplete).toBeLessThan(5000); // Full load within 5s

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
					return canvas && canvas.offsetWidth > 0 && canvas.offsetHeight > 0;
				},
				{ timeout: 10000 }
			);

			// Start performance monitoring
			await page.evaluate(() => {
				(window as any).performanceMetrics = {
					frameCount: 0,
					startTime: Date.now(),
				};

				function countFrames() {
					(window as any).performanceMetrics.frameCount++;
					requestAnimationFrame(countFrames);
				}
				requestAnimationFrame(countFrames);
			});

			// Perform map interactions
			const canvas = page.locator('canvas');
			await canvas.click({ position: { x: 400, y: 300 } });
			await page.waitForFunction(
				() => {
					const metrics = (window as any).performanceMetrics;
					return metrics && metrics.frameCount > 10;
				},
				{ timeout: 5000 }
			);

			await canvas.click({ position: { x: 500, y: 400 } });
			await page.waitForFunction(
				() => {
					const metrics = (window as any).performanceMetrics;
					return metrics && metrics.frameCount > 20;
				},
				{ timeout: 5000 }
			);

			// Simulate zoom interaction
			await canvas.hover();
			await page.mouse.wheel(0, -300);
			await page.waitForFunction(
				() => {
					const metrics = (window as any).performanceMetrics;
					return metrics && metrics.frameCount > 30;
				},
				{ timeout: 5000 }
			);

			// Measure FPS
			const fps = await page.evaluate(() => {
				const metrics = (window as any).performanceMetrics;
				const duration = (Date.now() - metrics.startTime) / 1000;
				return metrics.frameCount / duration;
			});

			// Should maintain at least 30 FPS during interactions
			expect(fps).toBeGreaterThan(30);

			await page.close();
		});

		it('should handle memory usage efficiently', async () => {
			const page = await browser.newPage();
			await page.goto(LOCALHOST_URL);
			await page.waitForSelector('canvas', { state: 'visible' });

			// Get initial memory usage
			const initialMemory = await page.evaluate(() => {
				if ('memory' in performance) {
					return (performance as any).memory.usedJSHeapSize;
				}
				return 0;
			});

			// Perform memory-intensive operations
			for (let i = 0; i < 10; i++) {
				await page.locator('canvas').click({ position: { x: 300 + i * 10, y: 300 + i * 10 } });
				// Wait for any visual updates or animations to complete
				await page.waitForFunction(
					() => {
						return document.readyState === 'complete';
					},
					{ timeout: 1000 }
				);
			}

			// Check memory after operations
			const finalMemory = await page.evaluate(() => {
				if ('memory' in performance) {
					return (performance as any).memory.usedJSHeapSize;
				}
				return 0;
			});

			// Memory increase should be reasonable (less than 50MB)
			if (initialMemory > 0 && finalMemory > 0) {
				const memoryIncrease = (finalMemory - initialMemory) / (1024 * 1024); // MB
				expect(memoryIncrease).toBeLessThan(50);
			}

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

			// All interactions should complete within reasonable time
			expect(responseTime).toBeLessThan(3000);

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
				timeout: 15000,
			});

			const loadTime = Date.now() - startTime;
			expect(loadTime).toBeLessThan(15000); // 15 seconds max for slow network

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
			await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
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
					{ timeout: 500 }
				);
			}

			const endTime = Date.now();
			const sessionDuration = endTime - startTime;

			// Session should complete within reasonable time
			expect(sessionDuration).toBeLessThan(30000); // 30 seconds

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
						timeout: 10000,
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
							{ timeout: 1000 }
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
			await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

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
				{ timeout: 5000 }
			);

			// Application should still be responsive
			await expect(page.locator('canvas')).toBeVisible();

			// Restore network
			networkDown = false;

			// Should recover and work normally
			await page.locator('canvas').click({ position: { x: 300, y: 400 } });
			await page.waitForLoadState('networkidle', { timeout: 3000 }).catch(() => {});

			await expect(page.locator('canvas')).toBeVisible();

			await page.close();
		});
	});
});
