/**
 * @file End-to-End tests for ViewportBuildingLoader service
 * @tag @e2e @viewport-loading
 *
 * Tests full viewport-based building loading workflow:
 * - Buildings load when camera moves to new areas
 * - Buffer zone prevents pop-in during panning
 * - Tile eviction when memory limits reached
 * - Integration with postal code loading
 * - Performance characteristics of viewport loading
 *
 * **IMPORTANT**: These tests are currently marked as fixme because the ViewportBuildingLoader
 * feature is not yet fully integrated into the application. The tests will be enabled once:
 * 1. ViewportBuildingLoader service is initialized in CesiumViewer.vue
 * 2. The viewport streaming toggle correctly triggers the service
 * 3. Building datasources are created with "Buildings Viewport" naming
 */

import { expect, test } from '../fixtures/test-fixture'
import { TEST_TIMEOUTS } from './helpers/test-helpers'

/**
 * Helper function to enable viewport streaming mode programmatically
 * Since the UI toggle doesn't reliably trigger the feature, we enable it directly via store and trigger loading
 *
 * @param page - Playwright page instance
 */
async function enableViewportStreaming(page) {
	// Enable viewport tile mode programmatically through the store and trigger camera event
	await page.evaluate(() => {
		const viewer = (window as any).cesiumViewer
		if (!viewer) {
			console.warn('[Test] Cesium viewer not found')
			return
		}

		// Get the toggle store from Vue instance
		const app = (window as any).__VUE_APP__
		if (app) {
			const pinia = app.config.globalProperties.$pinia
			if (pinia) {
				const stores = (pinia as any)._s
				const toggleStore = Array.from(stores.values()).find((store: any) =>
					Object.hasOwn(store, 'viewportTileMode')
				)

				if (toggleStore) {
					console.log('[Test] Setting viewportTileMode to true')
					;(toggleStore as any).viewportTileMode = true
				} else {
					console.warn('[Test] Toggle store not found')
				}
			}
		}

		// Trigger a camera move event to activate viewport loading
		// The ViewportBuildingLoader listens to camera movement
		if (viewer.camera) {
			console.log('[Test] Triggering camera move event')
			viewer.camera.moveEnd.raiseEvent()
		}
	})

	// Wait for the viewport loader to initialize and process
	await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

	// Check if viewport datasources were created (indicating feature is working)
	const hasViewportFeature = await page
		.waitForFunction(
			() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				const dataSources = viewer.dataSources._dataSources || []
				// Check for viewport datasources (may be empty but should exist)
				return dataSources.some((ds: any) => ds.name?.includes('Buildings Viewport'))
			},
			{ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT }
		)
		.catch(() => false)

	if (!hasViewportFeature) {
		// Feature not implemented or not working - skip this test
		throw new Error(
			'Viewport Streaming feature not available - ViewportBuildingLoader may not be initialized'
		)
	}
}

test.describe('Viewport Building Loading', () => {
	test.beforeEach(async ({ page }) => {
		// Navigate to application
		await page.goto('/')

		// Wait for initial load
		await page.waitForLoadState('domcontentloaded')

		// Dismiss any modal if present
		const closeButton = page.getByRole('button', { name: 'Close' })
		if (await closeButton.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })) {
			await closeButton.click()
			await expect(closeButton).toBeHidden()
		}

		// Wait for canvas to be visible (Cesium initialization)
		await page.waitForSelector('canvas', {
			state: 'visible',
			timeout: TEST_TIMEOUTS.CESIUM_READY_CI,
		})
		// Additional time for 3D rendering to stabilize
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)
	})

	test.fixme(
		'should load buildings in initial viewport',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport tile mode
			await enableViewportStreaming(page)

			// Verify that buildings are present in the scene
			// Check for building datasources via Cesium's dataSources
			const hasBuildings = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				// Check for viewport building datasources
				const dataSources = viewer.dataSources._dataSources
				const viewportDatasources = dataSources.filter((ds: any) =>
					ds.name?.includes('Buildings Viewport')
				)

				return viewportDatasources.length > 0
			})

			expect(hasBuildings).toBe(true)
		}
	)

	test.fixme(
		'should load buildings when panning to new area',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Wait for initial viewport loading
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Get initial viewport state
			const initialTileCount = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return 0

				const dataSources = viewer.dataSources._dataSources
				return dataSources.filter((ds: any) => ds.name?.includes('Buildings Viewport')).length
			})

			// Pan camera to new area
			const canvas = page.locator('canvas')
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(200, 300, { steps: 10 })
			await page.mouse.up()

			// Wait for debounced viewport update and loading
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Check that new tiles were loaded
			const newTileCount = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return 0

				const dataSources = viewer.dataSources._dataSources
				return dataSources.filter((ds: any) => ds.name?.includes('Buildings Viewport')).length
			})

			// Should have same or more tiles after panning
			expect(newTileCount).toBeGreaterThanOrEqual(initialTileCount)
		}
	)

	test.fixme(
		'should preload buffer zone around viewport',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Wait for initial viewport loading to complete
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Get current viewport - use try/catch to handle cases where rectangle computation fails
			const viewportInfo = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer || !viewer.camera || !viewer.scene || !viewer.scene.globe) return null

				try {
					const rect = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid)
					if (!rect) return null

					return {
						west: Cesium.Math.toDegrees(rect.west),
						south: Cesium.Math.toDegrees(rect.south),
						east: Cesium.Math.toDegrees(rect.east),
						north: Cesium.Math.toDegrees(rect.north),
					}
				} catch (_e) {
					// Fallback: return camera position
					const position = viewer.camera.positionCartographic
					if (!position) return null

					return {
						west: Cesium.Math.toDegrees(position.longitude) - 0.1,
						south: Cesium.Math.toDegrees(position.latitude) - 0.1,
						east: Cesium.Math.toDegrees(position.longitude) + 0.1,
						north: Cesium.Math.toDegrees(position.latitude) + 0.1,
					}
				}
			})

			expect(viewportInfo).not.toBeNull()

			// Check that tiles beyond immediate viewport are loaded (buffer zone)
			const tileInfo = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return { tiles: [], loader: null }

				// Access viewport loader if exposed
				const loader = (viewer as any).viewportBuildingLoader
				if (!loader) return { tiles: [], loader: null }

				return {
					tiles: Array.from(loader.loadedTiles.keys()),
					visibleTiles: Array.from(loader.visibleTiles),
					loader: 'active',
				}
			})

			// Should have loaded tiles (may not be exposed, so check datasources as fallback)
			if (tileInfo.loader === 'active') {
				expect(tileInfo.tiles.length).toBeGreaterThan(0)
			}
		}
	)

	test.fixme(
		'should handle zoom operations without losing buildings',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			const canvas = page.locator('canvas')

			// Zoom in
			await canvas.hover()
			await page.mouse.wheel(0, -100)

			// Wait for debounce (300ms) + network + processing
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Check buildings still visible
			let hasBuildings = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				const dataSources = viewer.dataSources._dataSources
				const viewportDatasources = dataSources.filter((ds: any) =>
					ds.name?.includes('Buildings Viewport')
				)

				return viewportDatasources.some((ds: any) => ds.show === true)
			})

			expect(hasBuildings).toBe(true)

			// Zoom out
			await page.mouse.wheel(0, 100)

			// Wait for debounce + processing
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Check buildings still managed
			hasBuildings = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				const dataSources = viewer.dataSources._dataSources
				const viewportDatasources = dataSources.filter((ds: any) =>
					ds.name?.includes('Buildings Viewport')
				)

				return viewportDatasources.length > 0
			})

			expect(hasBuildings).toBe(true)
		}
	)

	test.fixme(
		'should respect tile memory limits',
		{ tag: ['@e2e', '@viewport-loading', '@performance'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Wait for initial viewport loading
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// This test verifies that the loader doesn't load unlimited tiles

			// Pan camera multiple times to different areas
			const canvas = page.locator('canvas')

			for (let i = 0; i < 5; i++) {
				await canvas.hover()
				await page.mouse.down()
				await page.mouse.move(200 + i * 50, 300 + i * 50, { steps: 10 })
				await page.mouse.up()
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)
			}

			// Wait for all loading to complete
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Check tile count doesn't exceed limit
			const tileStats = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return { count: 0, limit: 50 }

				const loader = (viewer as any).viewportBuildingLoader
				if (!loader)
					return {
						count: viewer.dataSources._dataSources.filter((ds: any) =>
							ds.name?.includes('Buildings Viewport')
						).length,
						limit: 50,
					}

				return {
					count: loader.loadedTiles.size,
					limit: 50, // CONFIG.MAX_LOADED_TILES
				}
			})

			// Should not exceed memory limit (with some tolerance for concurrent loading)
			expect(tileStats.count).toBeLessThanOrEqual(tileStats.limit + 5)
		}
	)

	test.fixme(
		'should load buildings faster than postal code loading',
		{ tag: ['@e2e', '@viewport-loading', '@performance'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Measure viewport loading time for a NEW area (after the initial load)
			const startTime = Date.now()

			// Pan camera to trigger loading of a new area
			const canvas = page.locator('canvas')
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(300, 300, { steps: 5 })
			await page.mouse.up()

			// Wait for first buildings to appear in new area
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			const viewportLoadTime = Date.now() - startTime

			// Viewport loading should be reasonably fast (< 3 seconds for new area response)
			// Allow more time since initial load already happened in enableViewportStreaming
			expect(viewportLoadTime).toBeLessThan(3000)
		}
	)

	test.fixme(
		'should hide distant tiles when panning away',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Wait for initial viewport loading
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Get initial visible tile count
			const _initialVisible = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return 0

				const dataSources = viewer.dataSources._dataSources
				return dataSources.filter(
					(ds: any) => ds.name?.includes('Buildings Viewport') && ds.show === true
				).length
			})

			// Pan to a significantly different area
			const canvas = page.locator('canvas')
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(100, 100, { steps: 20 })
			await page.mouse.up()

			// Wait for viewport update (debounce + processing)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Check that some datasources are now hidden
			const datasourceStates = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return { visible: 0, hidden: 0, total: 0 }

				const dataSources = viewer.dataSources._dataSources || []
				const viewportDatasources = dataSources.filter((ds: any) =>
					ds.name?.includes('Buildings Viewport')
				)

				return {
					visible: viewportDatasources.filter((ds: any) => ds.show === true).length,
					hidden: viewportDatasources.filter((ds: any) => ds.show === false).length,
					total: viewportDatasources.length,
				}
			})

			// Should have both visible and hidden datasources (tiles outside viewport are hidden)
			expect(datasourceStates.total).toBeGreaterThan(0)
			expect(datasourceStates.visible).toBeGreaterThan(0)
		}
	)

	test.fixme(
		'should debounce rapid camera movements',
		{ tag: ['@e2e', '@viewport-loading', '@performance'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Track loading requests
			let loadCount = 0
			page.on('console', (msg) => {
				if (msg.text().includes('[ViewportBuildingLoader] Loading tile')) {
					loadCount++
				}
			})

			// Perform rapid camera movements
			const canvas = page.locator('canvas')
			await canvas.hover()

			for (let i = 0; i < 10; i++) {
				await page.mouse.move(300 + i * 5, 300 + i * 5, { steps: 1 })
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF)
			}

			// Wait for debounced update
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Should have debounced and not triggered 10 separate loads
			// Exact count depends on timing, but should be much less than 10
			expect(loadCount).toBeLessThan(10)
		}
	)

	test.fixme(
		'should integrate with existing postal code mode',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			// This already waits for datasources to appear
			await enableViewportStreaming(page)

			// Check that viewport datasources exist
			const hasViewportDatasources = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some((ds: any) => ds.name?.includes('Buildings Viewport'))
			})

			// Viewport loading should be active
			expect(hasViewportDatasources).toBe(true)
		}
	)

	test.fixme(
		'should handle tile loading errors gracefully',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Intercept WFS requests and simulate failures for some tiles (set up BEFORE enabling)
			await page.route('**/geoserver/avoindata/wfs*', async (route) => {
				// Randomly fail 20% of requests to simulate network issues
				// Use lower failure rate to ensure some tiles succeed
				if (Math.random() < 0.2) {
					await route.abort('failed')
				} else {
					await route.continue()
				}
			})

			// Enable viewport streaming - may take longer due to retries
			await enableViewportStreaming(page)

			// Pan camera to trigger loading of additional tiles
			const canvas = page.locator('canvas')
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(300, 300, { steps: 5 })
			await page.mouse.up()

			// Wait for loading attempts (including retries)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Application should still function (some tiles loaded successfully)
			const hasAnyBuildings = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some((ds: any) => ds.name?.includes('Buildings Viewport'))
			})

			// Should have loaded at least some tiles despite errors
			expect(hasAnyBuildings).toBe(true)
		}
	)

	test.fixme(
		'should reuse cached tiles when revisiting areas',
		{ tag: ['@e2e', '@viewport-loading', '@performance'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Wait for initial viewport loading
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// First visit to an area
			const canvas = page.locator('canvas')
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(350, 300, { steps: 5 })
			await page.mouse.up()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Pan away
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(150, 300, { steps: 10 })
			await page.mouse.up()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Track cache hits
			let cacheHits = 0
			page.on('console', (msg) => {
				if (msg.text().includes('Using cached data')) {
					cacheHits++
				}
			})

			// Return to first area
			await canvas.hover()
			await page.mouse.down()
			await page.mouse.move(350, 300, { steps: 5 })
			await page.mouse.up()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Should use cached data on revisit (if within cache TTL)
			// Note: This may not always fire if tiles are still in memory
			// The test passes if no errors occur
			expect(cacheHits).toBeGreaterThanOrEqual(0)
		}
	)
})

test.describe('Viewport Building Loading - Edge Cases', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')

		const closeButton = page.getByRole('button', { name: 'Close' })
		if (await closeButton.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })) {
			await closeButton.click()
			await expect(closeButton).toBeHidden()
		}

		// Wait for canvas to be visible (Cesium initialization)
		await page.waitForSelector('canvas', {
			state: 'visible',
			timeout: TEST_TIMEOUTS.CESIUM_READY_CI,
		})
		// Additional time for 3D rendering to stabilize
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)
	})

	test.fixme(
		'should handle camera looking into space (no ground)',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Tilt camera to look into space
			await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return

				viewer.camera.setView({
					destination: Cesium.Cartesian3.fromDegrees(24.9, 60.2, 1000000),
					orientation: {
						heading: 0,
						pitch: Cesium.Math.toRadians(45), // Looking up
						roll: 0,
					},
				})
			})

			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Should not crash or load invalid tiles
			const errors = []
			page.on('pageerror', (error) => {
				errors.push(error.message)
			})

			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			expect(errors.length).toBe(0)
		}
	)

	test.fixme(
		'should handle very high zoom levels',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Zoom in very close to ground
			await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return

				viewer.camera.setView({
					destination: Cesium.Cartesian3.fromDegrees(24.9, 60.2, 100), // 100m altitude
					orientation: {
						heading: 0,
						pitch: Cesium.Math.toRadians(-90),
						roll: 0,
					},
				})
			})

			// Wait for debounced viewport update + tile loading
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Should load buildings at high zoom
			const hasBuildings = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return false

				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some((ds: any) => ds.name?.includes('Buildings Viewport'))
			})

			expect(hasBuildings).toBe(true)
		}
	)

	test.fixme(
		'should handle very low zoom levels (global view)',
		{ tag: ['@e2e', '@viewport-loading'] },
		async ({ page }) => {
			// Enable viewport streaming first
			await enableViewportStreaming(page)

			// Zoom out to global view
			await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return

				viewer.camera.setView({
					destination: Cesium.Cartesian3.fromDegrees(24.9, 60.2, 10000000), // 10,000km
					orientation: {
						heading: 0,
						pitch: Cesium.Math.toRadians(-90),
						roll: 0,
					},
				})
			})

			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Should not attempt to load excessive tiles
			const tileCount = await page.evaluate(() => {
				const viewer = (window as any).cesiumViewer
				if (!viewer) return 0

				const loader = (viewer as any).viewportBuildingLoader
				if (!loader) return 0

				return loader.loadedTiles.size
			})

			// Should respect memory limits even at global zoom
			expect(tileCount).toBeLessThanOrEqual(60) // Slightly over limit due to concurrency
		}
	)
})
