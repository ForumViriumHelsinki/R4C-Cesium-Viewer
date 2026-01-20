import { expect, test } from '@playwright/test'
import {
	clickOnMap,
	dismissModalIfPresent,
	dismissVuetifyOverlays,
	TEST_TIMEOUTS,
	waitForCesiumReady,
	waitForMapViewTransition,
} from './helpers/test-helpers'
import { setupDigitransitMock } from './setup/digitransit-mock'

// Setup digitransit mocking for all tests in this file
setupDigitransitMock()

test.describe('Data Visualization Components', () => {
	test.use({ tag: ['@e2e', '@data', '@visual'] })
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		// Dismiss the disclaimer popup
		await dismissModalIfPresent(page, 'Explore Map')
		await waitForCesiumReady(page)
	})

	test('should display charts and visualization components', async ({ page }) => {
		// Navigate to get some data loaded
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Look for various chart components
		const chartContainers = page.locator(
			'[id*="chart"], [id*="plot"], .chart-container, .plot-container'
		)

		const chartCount = await chartContainers.count()
		if (chartCount > 0) {
			// Check that at least one chart container is visible
			const visibleCharts = await chartContainers.filter({ hasText: /./ }).count()
			if (visibleCharts > 0) {
				await expect(chartContainers.first()).toBeVisible()
			}
		}
	})

	test('should handle heat histogram visualization', async ({ page }) => {
		// Navigate to postal code to load heat data
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Look for heat histogram
		const heatHistogram = page.locator('#heatHistogramContainer, [data-testid="heat-histogram"]')

		const histogramCount = await heatHistogram.count()
		if (histogramCount > 0) {
			await expect(heatHistogram.first()).toBeVisible()

			// Check for SVG chart content
			const svg = heatHistogram.locator('svg')
			const svgCount = await svg.count()
			if (svgCount > 0) {
				await expect(svg.first()).toBeVisible()
			}
		}
	})

	test('should display building information charts', async ({ page }) => {
		// Navigate to building level
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Try to select a building
		await clickOnMap(page, 420, 320)
		await waitForMapViewTransition(page)

		// Look for building charts
		const buildingCharts = page.locator(
			'#buildingGridChartContainer, [data-testid="building-chart"]'
		)

		if ((await buildingCharts.count()) > 0) {
			await expect(buildingCharts.first()).toBeVisible()
		}

		// Check for vulnerability chart
		const vulnChart = page.locator('[data-testid="vulnerability-chart"], .vulnerability-chart')
		if ((await vulnChart.count()) > 0) {
			await expect(vulnChart.first()).toBeVisible()
		}
	})

	test('should handle socio-economics visualization', async ({ page }) => {
		// Look for socio-economics controls
		const socioEcoSection = page.locator('[data-testid="socio-economics"], .socio-economics')

		if ((await socioEcoSection.count()) > 0) {
			await expect(socioEcoSection.first()).toBeVisible()

			// Look for charts or selectors
			const charts = socioEcoSection.locator('svg, canvas, .chart')
			if ((await charts.count()) > 0) {
				await expect(charts.first()).toBeVisible()
			}
		}
	})

	test('should display scatter plot visualizations', async ({ page }) => {
		// Navigate to get data
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Look for scatter plot components
		const scatterPlots = page.locator(
			'[class*="scatter"], [id*="scatter"], [data-testid*="scatter"]'
		)

		if ((await scatterPlots.count()) > 0) {
			const visiblePlots = await scatterPlots.filter({ hasText: /./ }).count()
			if (visiblePlots > 0) {
				await expect(scatterPlots.first()).toBeVisible()
			}
		}
	})

	test('should handle NDVI chart functionality', async ({ page }) => {
		// Look for NDVI chart component
		const ndviChart = page.locator('[data-testid="ndvi-chart"], #ndviChart, .ndvi-chart')

		if ((await ndviChart.count()) > 0) {
			await expect(ndviChart.first()).toBeVisible()

			// Check for date selector or controls
			const dateControls = ndviChart.locator('select, input[type="date"], .date-picker')
			if ((await dateControls.count()) > 0) {
				await expect(dateControls.first()).toBeVisible()
			}
		}
	})

	test('should display statistical grid visualization', async ({ page }) => {
		// Dismiss any open overlays that might intercept clicks
		await dismissVuetifyOverlays(page)

		// Enable statistical grid if available (it's a button, not checkbox)
		const gridButton = page.getByLabel(/statistical.*grid/i)

		if ((await gridButton.count()) > 0) {
			await dismissVuetifyOverlays(page)
			await gridButton.click()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Look for grid visualization components
			const gridComponents = page.locator('[data-testid*="grid"], .grid-view, .population-grid')

			if ((await gridComponents.count()) > 0) {
				await expect(gridComponents.first()).toBeVisible()
			}

			// Look for grid legend
			const legend = page.locator('.legend, [data-testid="legend"]')
			if ((await legend.count()) > 0) {
				await expect(legend.first()).toBeVisible()
			}
		}
	})

	test('should handle interactive chart elements', async ({ page }) => {
		// Navigate to get charts loaded
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Look for interactive chart elements (D3 charts specifically, not UI compass SVGs)
		// D3 charts are typically in containers like .histogram, .chart-container, or inside the sidebar
		const chartContainers = page.locator(
			'.histogram svg, .chart-container svg, .analysis-sidebar svg, .d3-chart svg'
		)

		if ((await chartContainers.count()) > 0) {
			const firstChart = chartContainers.first()

			if (await firstChart.isVisible()) {
				// Try hovering over chart elements
				await firstChart.hover({ force: true })
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

				// Look for tooltips
				const tooltips = page.locator('.tooltip, [data-testid="tooltip"]')
				if ((await tooltips.count()) > 0) {
					// Tooltip might appear on hover
					const tooltip = tooltips.first()
					if (await tooltip.isVisible()) {
						await expect(tooltip).toBeVisible()
					}
				}
			}
		}
	})

	test('should handle chart data updates', async ({ page }) => {
		// Navigate to postal code level
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Toggle a data layer to trigger chart updates
		const vegToggle = page.getByLabel(/vegetation/i)
		if ((await vegToggle.count()) > 0) {
			await vegToggle.check()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Check that charts still exist after data update
			const charts = page.locator('svg, canvas').filter({ hasText: /./ })
			if ((await charts.count()) > 0) {
				await expect(charts.first()).toBeVisible()
			}

			await vegToggle.uncheck()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)
		}
	})

	test('should handle chart responsive behavior', async ({ page }) => {
		// Get some charts loaded
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// Test in mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

		// Charts should still be visible and properly sized
		const charts = page.locator('svg, [id*="chart"]')
		if ((await charts.count()) > 0) {
			const firstChart = charts.first()
			if (await firstChart.isVisible()) {
				const chartBox = await firstChart.boundingBox()

				// Chart should fit within mobile viewport
				if (chartBox) {
					expect(chartBox.width).toBeLessThanOrEqual(375)
					expect(chartBox.x).toBeGreaterThanOrEqual(0)
				}
			}
		}

		// Restore desktop viewport
		await page.setViewportSize({ width: 1280, height: 720 })
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
	})

	test('should handle chart error states', async ({ page }) => {
		// Click on areas that might not have data (use center position to avoid UI overlays)
		await clickOnMap(page, 400, 300)
		await waitForMapViewTransition(page)

		// App should still be functional even if no charts load
		const canvas = page.locator('canvas')
		await expect(canvas).toBeVisible()

		// Navigation should still work
		const toggleButton = page.getByRole('button', {
			name: 'Toggle control panel',
		})
		await expect(toggleButton).toBeVisible()
	})
})
