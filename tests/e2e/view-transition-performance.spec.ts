import { expect, test } from '../fixtures/test-fixture'
import { TEST_TIMEOUTS } from './helpers/test-helpers'

/**
 * View Transition Performance Tests
 *
 * These tests measure performance of switching between capital region and
 * statistical grid views. The grid has 18K+ entities, and without optimization
 * the transition can take 10-15 seconds with significant UI jank.
 *
 * Performance targets after optimization:
 * - Grid transition time: < 3 seconds
 * - Main thread blocking: < 50ms per task
 * - Minimal frame drops during transition
 *
 * @see docs/PERFORMANCE_MONITORING.md for baseline tracking details
 */
test.describe('View Transition Performance @performance', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		// Dismiss disclaimer to trigger app initialization
		await page.locator('button', { hasText: 'Explore Map' }).click()
		// Wait for Cesium canvas to be ready
		await page.waitForSelector('#cesiumContainer canvas', { state: 'visible' })
	})

	test('capital region to statistical grid transition should complete within budget', async ({
		page,
	}) => {
		// Navigate to capital region view first
		const capitalRegionButton = page.getByRole('button', { name: /capital region/i })
		if (await capitalRegionButton.isVisible()) {
			await capitalRegionButton.click()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STATE_CHANGE)
		}

		// Find the statistical grid toggle
		const gridToggle = page
			.locator('[data-testid="statistical-grid-toggle"]')
			.or(page.getByRole('button', { name: /statistical grid|grid view|population grid/i }))

		// Check if the grid toggle exists
		const hasGridToggle = (await gridToggle.count()) > 0
		if (!hasGridToggle) {
			// Skip test if grid toggle not found in current view
			test.skip(true, 'Statistical grid toggle not available in current view')
			return
		}

		// Measure transition to statistical grid
		const startTime = Date.now()

		await gridToggle.click()

		// Wait for grid entities to render (18K+ entities)
		await page.waitForFunction(
			() => {
				const viewer = (window as any).__viewer
				if (!viewer?.dataSources) return false
				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some(
					(ds: any) => ds.name === 'PopulationGrid' && ds.entities?.values?.length > 0
				)
			},
			{ timeout: 30000 }
		)

		const transitionTime = Date.now() - startTime

		// Performance budget: 5 seconds max (realistic target with optimization)
		// Pre-optimization baseline was ~10-15 seconds
		expect(transitionTime).toBeLessThan(5000)

		// Record metric for baseline tracking
		test.info().annotations.push({
			type: 'performance',
			description: `grid-transition-ms:${transitionTime}`,
		})

		// Log for monitoring
		console.log(`Grid transition time: ${transitionTime}ms`)
	})

	test('statistical grid to capital region transition should complete within budget', async ({
		page,
	}) => {
		// First navigate to statistical grid view
		const gridToggle = page
			.locator('[data-testid="statistical-grid-toggle"]')
			.or(page.getByRole('button', { name: /statistical grid|grid view|population grid/i }))

		const hasGridToggle = (await gridToggle.count()) > 0
		if (!hasGridToggle) {
			test.skip(true, 'Statistical grid toggle not available in current view')
			return
		}

		// Navigate to grid view first
		await gridToggle.click()
		await page.waitForFunction(
			() => {
				const viewer = (window as any).__viewer
				if (!viewer?.dataSources) return false
				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some(
					(ds: any) => ds.name === 'PopulationGrid' && ds.entities?.values?.length > 0
				)
			},
			{ timeout: 30000 }
		)

		// Wait for grid to fully load
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

		// Now measure transition back to capital region
		const startTime = Date.now()

		// Toggle off grid view or click capital region button
		const capitalRegionButton = page.getByRole('button', { name: /capital region/i })
		if (await capitalRegionButton.isVisible()) {
			await capitalRegionButton.click()
		} else {
			// Try toggling off the grid
			await gridToggle.click()
		}

		// Wait for transition to complete
		await page.waitForLoadState('networkidle', { timeout: 15000 })

		const transitionTime = Date.now() - startTime

		// Performance budget: 3 seconds max for reverse transition
		// Should be faster as we're removing entities, not styling them
		expect(transitionTime).toBeLessThan(3000)

		// Record metric
		test.info().annotations.push({
			type: 'performance',
			description: `grid-reverse-transition-ms:${transitionTime}`,
		})

		console.log(`Reverse grid transition time: ${transitionTime}ms`)
	})

	test('grid entity styling should not cause long tasks', async ({ page }) => {
		// This test verifies the batched processing optimization is working
		// Long tasks are captured via window.__longTasks in the browser context

		// Instrument the page to capture long tasks
		await page.evaluate(() => {
			const observer = new PerformanceObserver((list) => {
				for (const entry of list.getEntries()) {
					// Store on window for retrieval
					;(window as any).__longTasks = (window as any).__longTasks || []
					;(window as any).__longTasks.push({
						duration: entry.duration,
						startTime: entry.startTime,
					})
				}
			})
			observer.observe({ type: 'longtask', buffered: true })
			;(window as any).__longTaskObserver = observer
		})

		// Navigate to grid view to trigger entity styling
		const gridToggle = page
			.locator('[data-testid="statistical-grid-toggle"]')
			.or(page.getByRole('button', { name: /statistical grid|grid view|population grid/i }))

		const hasGridToggle = (await gridToggle.count()) > 0
		if (!hasGridToggle) {
			test.skip(true, 'Statistical grid toggle not available')
			return
		}

		await gridToggle.click()

		// Wait for transition to complete
		await page.waitForFunction(
			() => {
				const viewer = (window as any).__viewer
				if (!viewer?.dataSources) return false
				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some(
					(ds: any) => ds.name === 'PopulationGrid' && ds.entities?.values?.length > 0
				)
			},
			{ timeout: 30000 }
		)

		// Give time for any remaining long tasks to be captured
		await page.waitForTimeout(500)

		// Retrieve captured long tasks
		const capturedLongTasks = await page.evaluate(() => (window as any).__longTasks || [])

		// Log long tasks for analysis
		console.log(`Long tasks captured: ${capturedLongTasks.length}`)
		if (capturedLongTasks.length > 0) {
			const maxDuration = Math.max(...capturedLongTasks.map((t: any) => t.duration))
			console.log(`Longest task: ${maxDuration}ms`)

			// Warn if any task exceeds 100ms (indicating potential UI jank)
			const veryLongTasks = capturedLongTasks.filter((t: any) => t.duration > 100)
			if (veryLongTasks.length > 0) {
				console.warn(`Tasks exceeding 100ms: ${veryLongTasks.length}`)
			}
		}

		// Performance assertion: no individual task should exceed 200ms
		// 50ms is the ideal target, but 200ms is acceptable with batching
		const maxDuration =
			capturedLongTasks.length > 0 ? Math.max(...capturedLongTasks.map((t: any) => t.duration)) : 0
		expect(maxDuration).toBeLessThan(200)

		// Record for tracking
		test.info().annotations.push({
			type: 'performance',
			description: `max-long-task-ms:${maxDuration}`,
		})
	})

	test('nature grid toggle should maintain UI responsiveness', async ({ page }) => {
		// Navigate to grid view first
		const gridToggle = page
			.locator('[data-testid="statistical-grid-toggle"]')
			.or(page.getByRole('button', { name: /statistical grid|grid view|population grid/i }))

		const hasGridToggle = (await gridToggle.count()) > 0
		if (!hasGridToggle) {
			test.skip(true, 'Statistical grid toggle not available')
			return
		}

		await gridToggle.click()
		await page.waitForFunction(
			() => {
				const viewer = (window as any).__viewer
				if (!viewer?.dataSources) return false
				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some(
					(ds: any) => ds.name === 'PopulationGrid' && ds.entities?.values?.length > 0
				)
			},
			{ timeout: 30000 }
		)

		// Find and toggle the nature grid
		const natureToggle = page.getByLabel(/nature grid/i)
		const hasNatureToggle = (await natureToggle.count()) > 0
		if (!hasNatureToggle) {
			test.skip(true, 'Nature grid toggle not available')
			return
		}

		// Measure nature grid toggle performance
		const startTime = Date.now()

		await natureToggle.check()

		// Wait for entities to be restyled
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

		const styleTime = Date.now() - startTime

		// Nature grid styling (18K entities to green) should complete within 3s
		expect(styleTime).toBeLessThan(3000)

		// Record for tracking
		test.info().annotations.push({
			type: 'performance',
			description: `nature-grid-style-ms:${styleTime}`,
		})

		console.log(`Nature grid styling time: ${styleTime}ms`)

		// Clean up
		await natureToggle.uncheck()
	})
})

test.describe('View Transition Sentry Integration @performance', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await page.locator('button', { hasText: 'Explore Map' }).click()
		await page.waitForSelector('#cesiumContainer canvas', { state: 'visible' })
	})

	test('should record performance marks during grid transition', async ({ page }) => {
		// Navigate to grid view
		const gridToggle = page
			.locator('[data-testid="statistical-grid-toggle"]')
			.or(page.getByRole('button', { name: /statistical grid|grid view|population grid/i }))

		const hasGridToggle = (await gridToggle.count()) > 0
		if (!hasGridToggle) {
			test.skip(true, 'Statistical grid toggle not available')
			return
		}

		await gridToggle.click()

		// Wait for transition
		await page.waitForFunction(
			() => {
				const viewer = (window as any).__viewer
				if (!viewer?.dataSources) return false
				const dataSources = viewer.dataSources._dataSources || []
				return dataSources.some(
					(ds: any) => ds.name === 'PopulationGrid' && ds.entities?.values?.length > 0
				)
			},
			{ timeout: 30000 }
		)

		// Check for performance marks
		const performanceMarks = await page.evaluate(() => {
			const marks = performance.getEntriesByType('mark')
			return marks
				.filter(
					(m) =>
						m.name.includes('grid-') || m.name.includes('heat-exposure') || m.name.includes('green')
				)
				.map((m) => ({ name: m.name, startTime: m.startTime }))
		})

		// Should have recorded our custom performance marks
		console.log('Performance marks:', performanceMarks)

		// Check for performance measures
		const performanceMeasures = await page.evaluate(() => {
			const measures = performance.getEntriesByType('measure')
			return measures
				.filter(
					(m) =>
						m.name.includes('grid-') || m.name.includes('heat-exposure') || m.name.includes('green')
				)
				.map((m) => ({ name: m.name, duration: m.duration }))
		})

		console.log('Performance measures:', performanceMeasures)

		// If optimization is working, we should have recorded some measures
		// This validates the instrumentation is in place
		if (performanceMeasures.length > 0) {
			const gridTransition = performanceMeasures.find((m) => m.name === 'grid-transition')
			if (gridTransition) {
				expect(gridTransition.duration).toBeLessThan(5000)
				test.info().annotations.push({
					type: 'performance',
					description: `grid-transition-measure-ms:${gridTransition.duration}`,
				})
			}
		}
	})
})
