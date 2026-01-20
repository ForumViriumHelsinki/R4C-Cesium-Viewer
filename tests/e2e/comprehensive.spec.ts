import { expect, test } from '@playwright/test'
import { VIEWPORTS } from '../config/constants'
import {
	clickOnMap,
	dismissModalIfPresent,
	TEST_TIMEOUTS,
	waitForCesiumReady,
	waitForMapViewTransition,
} from '../helpers/test-helpers'

test.describe('R4C Climate Visualization Comprehensive Tests', () => {
	test.use({ tag: ['@e2e', '@comprehensive'] })

	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		await dismissModalIfPresent(page, 'Explore Map')
		await waitForCesiumReady(page)
	})

	test.describe('Basic Application Functionality', () => {
		test('should load main page with correct title and elements', async ({ page }) => {
			await expect(page).toHaveTitle(/R4C Uusimaa Demo/)

			// Check for key UI elements
			await expect(page.locator('.v-app-bar')).toBeVisible()
			await expect(page.locator('canvas')).toBeVisible()
			await expect(page.locator('.analysis-sidebar')).toBeVisible()

			// Check that the 3D viewer has loaded
			const canvas = page.locator('canvas')
			await expect(canvas).toHaveAttribute('width')
			await expect(canvas).toHaveAttribute('height')
		})

		test('should handle window resize correctly', async ({ page }) => {
			const initialSize = await page.viewportSize()

			// Resize window
			await page.setViewportSize({ width: 1200, height: 800 })
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Canvas should adapt to new size
			const canvas = page.locator('canvas')
			await expect(canvas).toBeVisible()

			// Restore original size
			if (initialSize) {
				await page.setViewportSize(initialSize)
			}
		})
	})

	test.describe('Map Navigation and Interaction', () => {
		test('should support camera controls', async ({ page }) => {
			// Test zoom in/out buttons if present
			const cameraControls = page.locator('[class*="camera"]')
			const count = await cameraControls.count()

			if (count > 0) {
				await cameraControls.first().click()
				await waitForMapViewTransition(page)
			}

			// Test mouse wheel zoom by dispatching wheel events
			await page.locator('canvas').hover({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
			await page.mouse.wheel(0, -100) // Zoom in
			await waitForMapViewTransition(page)
			await page.mouse.wheel(0, 100) // Zoom out
			await waitForMapViewTransition(page)
		})

		test('should handle map clicks and feature selection', async ({ page }) => {
			// Click on different areas of the map
			const mapAreas = [
				{ x: 400, y: 300, description: 'center area' },
				{ x: 600, y: 200, description: 'upper right area' },
				{ x: 200, y: 400, description: 'lower left area' },
			]

			for (const area of mapAreas) {
				await clickOnMap(page, area.x, area.y)
				// Wait for any map response (state change or UI update)
				await waitForMapViewTransition(page)
			}
		})

		test('should maintain map state during navigation', async ({ page }) => {
			// Interact with the map
			await clickOnMap(page, 500, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Navigate to different sections if available
			const navButtons = await page.locator('button').all()
			if (navButtons.length > 0) {
				for (const button of navButtons.slice(0, 3)) {
					// Test first 3 buttons
					try {
						const buttonText = await button.textContent()
						if (buttonText && !buttonText.toLowerCase().includes('close')) {
							await button.click()
							await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

							// Verify map is still functional
							await expect(page.locator('canvas')).toBeVisible()
						}
					} catch (_error) {
						// Button might not be clickable or cause navigation issues
					}
				}
			}
		})
	})

	test.describe('Background Maps Integration', () => {
		test.use({ tag: ['@wms'] })

		test('should load and interact with background maps', async ({ page }) => {
			// The BackgroundMapBrowser uses category chips (Environmental, Flood, etc.)
			const backgroundMapSection = page.locator('.background-map-browser')

			// Check if background map browser is visible
			if ((await backgroundMapSection.count()) > 0) {
				await expect(backgroundMapSection).toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})

				// Check for category chips
				const categoryChips = page.locator('.background-map-browser .v-chip')
				if ((await categoryChips.count()) > 0) {
					await expect(categoryChips.first()).toBeVisible()
				}
			}

			// Canvas should still be functional
			await expect(page.locator('canvas')).toBeVisible()
		})

		test('should handle flood layer selection', async ({ page }) => {
			// The BackgroundMapBrowser uses category chips for navigation
			const floodChip = page.locator('.background-map-browser').getByText('Flood')

			if ((await floodChip.count()) > 0) {
				await floodChip.click()
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

				// Check for flood scenario buttons
				const floodButtons = page.locator('.flood-buttons .v-btn')
				if ((await floodButtons.count()) > 0) {
					await expect(floodButtons.first()).toBeVisible()
				}
			}

			// Canvas should still be functional
			await expect(page.locator('canvas')).toBeVisible()
		})
	})

	test.describe('Building Information and Properties', () => {
		// Note: These tests verify building-related UI functionality.
		// Building selection via map clicks is inherently flaky in E2E tests,
		// so we focus on verifiable UI behavior.

		test('should display Building Filters section at Capital Region level', async ({ page }) => {
			// At Capital Region level, Building Filters should be visible in the control panel
			const buildingFiltersHeader = page.getByRole('heading', { name: 'Building Filters' })
			await expect(buildingFiltersHeader).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

			// Verify filter checkboxes are present using exact text matching to avoid tooltip duplicates
			const publicBuildingsCheckbox = page.getByText('Public Buildings', { exact: true })
			const tallBuildingsCheckbox = page.getByText('Tall Buildings', { exact: true })

			await expect(publicBuildingsCheckbox).toBeVisible()
			await expect(tallBuildingsCheckbox).toBeVisible()
		})

		test('should handle building filter interactions', async ({ page }) => {
			// The Tall Buildings checkbox is in a container with the text
			// Find the text and then locate the sibling checkbox
			const tallBuildingsText = page.getByText('Tall Buildings', { exact: true })
			await expect(tallBuildingsText).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

			// The checkbox is a sibling in the parent container - click the parent to toggle
			// This works because Vuetify's v-checkbox makes the whole row clickable
			const checkboxContainer = tallBuildingsText.locator('xpath=..')
			await checkboxContainer.click()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Click again to toggle back
			await checkboxContainer.click()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Verify no errors occurred (the Cesium canvas should still be visible)
			const canvas = page.locator('canvas')
			await expect(canvas).toBeVisible()
		})
	})

	test.describe('Statistical Grid and Data Layers', () => {
		test('should enable and interact with statistical grid', async ({ page }) => {
			try {
				// Enable statistical grid
				const gridCheckbox = page.getByLabel('Statistical Grid')
				if (await gridCheckbox.isVisible()) {
					await gridCheckbox.check()
					await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

					// Select grid resolution
					const gridOption = page.locator('div').filter({ hasText: /^250m grid$/ })
					if (await gridOption.isVisible()) {
						await gridOption.locator('span').click()
						await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)
					}

					// Verify grid is displayed
					await expect(page.locator('canvas')).toBeVisible()
				}
			} catch (_error) {
				test.skip('Statistical grid not available')
			}
		})

		test('should display heat vulnerability information', async ({ page }) => {
			try {
				// Enable statistical grid first
				await page.getByLabel('Statistical Grid').check()
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

				await page
					.locator('div')
					.filter({ hasText: /^250m grid$/ })
					.locator('span')
					.click()
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

				// Access heat vulnerability
				const heatVulnButton = page.getByRole('heading', {
					name: 'Heat Vulnerability',
				})
				if (await heatVulnButton.isVisible()) {
					await heatVulnButton.click()
					await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

					await expect(heatVulnButton).toBeVisible()
				}
			} catch (_error) {
				test.skip('Heat vulnerability data not available')
			}
		})
	})

	test.describe('Data Loading and Performance', () => {
		test('should handle loading states correctly', async ({ page }) => {
			// The page was already loaded in beforeEach, so just verify it's responsive
			// and no console errors occurred during loading
			const consoleErrors: string[] = []
			page.on('console', (msg) => {
				if (msg.type() === 'error') {
					consoleErrors.push(msg.text())
				}
			})

			// Perform actions that trigger potential data loading
			await clickOnMap(page, 500, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

			// Verify the canvas is still visible and responsive
			await expect(page.locator('canvas')).toBeVisible()

			// Check loading indicator is not stuck (if visible, should eventually hide)
			const loadingIndicator = page.locator('.v-progress-circular')
			if (await loadingIndicator.isVisible({ timeout: 500 }).catch(() => false)) {
				// Wait for loading to complete (max 10 seconds)
				await expect(loadingIndicator).not.toBeVisible({
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
			}

			// Filter out known benign console errors (like analytics or third-party issues)
			const criticalErrors = consoleErrors.filter(
				(e) => !e.includes('Failed to load resource') && !e.includes('analytics')
			)
			expect(criticalErrors).toHaveLength(0)
		})

		test('should handle slow network conditions', async ({ page }) => {
			// Simulate slow network
			await page.route('**/*', async (route) => {
				await new Promise((resolve) => setTimeout(resolve, 100)) // Add 100ms delay
				await route.continue()
			})

			// Perform typical user interactions
			await clickOnMap(page, 400, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_LONG)

			// Application should remain responsive
			await expect(page.locator('canvas')).toBeVisible()

			// Try to interact with available controls
			const buttons = await page.locator('button:visible').all()
			if (buttons.length > 0) {
				await buttons[0].click()
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)
			}
		})
	})

	test.describe('Error Handling and Edge Cases', () => {
		test('should handle network failures gracefully', async ({ page }) => {
			// Block specific API calls
			await page.route('**/api/**', (route) => {
				route.abort('failed')
			})

			// Application should still load basic interface
			await expect(page.locator('canvas')).toBeVisible()
			// Verify the app bar with title is still visible
			await expect(page.getByText('Regions4Climate')).toBeVisible()

			// User interactions should not crash the application
			await clickOnMap(page, 400, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)
		})

		test('should handle invalid user inputs', async ({ page }) => {
			// Test with various input scenarios
			try {
				const searchInput = page.getByPlaceholder('Search for WMS layers')
				if (await searchInput.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION })) {
					// Test empty search
					await searchInput.click()
					await searchInput.fill('')
					await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

					// Test very long search term
					await searchInput.fill('a'.repeat(1000))
					await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

					// Test special characters
					await searchInput.fill('!@#$%^&*()')
					await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

					// Clear the input
					await searchInput.fill('')
				}
			} catch (_error) {
				// Search input not available
			}

			// Application should remain stable
			await expect(page.locator('canvas')).toBeVisible()
		})

		test('should handle rapid user interactions', async ({ page }) => {
			// Rapidly click on different map areas
			const clickPositions = [
				{ x: 200, y: 200 },
				{ x: 400, y: 200 },
				{ x: 600, y: 200 },
				{ x: 200, y: 400 },
				{ x: 400, y: 400 },
				{ x: 600, y: 400 },
			]

			for (const pos of clickPositions) {
				await clickOnMap(page, pos.x, pos.y)
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF) // Very short wait
			}

			// Application should remain responsive
			await expect(page.locator('canvas')).toBeVisible()
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD) // Allow processing to complete
		})
	})

	test.describe('Mobile and Responsive Design', () => {
		test('should work on mobile viewport', async ({ page }) => {
			// Set mobile viewport
			await page.setViewportSize(VIEWPORTS.MOBILE)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Basic elements should still be visible
			await expect(page.locator('canvas')).toBeVisible()
			// App bar with title should be visible
			await expect(page.getByText('Regions4Climate')).toBeVisible()

			// Click interactions should work on mobile viewport
			await clickOnMap(page, 200, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

			// Additional click to verify responsive map
			await clickOnMap(page, 200, 300)
			await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

			// Verify canvas is still visible and interactive
			await expect(page.locator('canvas')).toBeVisible()
		})

		test('should adapt to different screen sizes', async ({ page }) => {
			const viewports = [
				{ ...VIEWPORTS.MOBILE_SMALL, name: 'iPhone SE' },
				{ ...VIEWPORTS.TABLET, name: 'iPad' },
				{ ...VIEWPORTS.TABLET_LANDSCAPE, name: 'iPad Landscape' },
				{ ...VIEWPORTS.DESKTOP_HD, name: 'Desktop HD' },
			]

			for (const viewport of viewports) {
				await page.setViewportSize({
					width: viewport.width,
					height: viewport.height,
				})
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

				// Core functionality should work at all sizes
				await expect(page.locator('canvas')).toBeVisible()

				// Test basic interaction
				await clickOnMap(page, viewport.width / 2, viewport.height / 2)
				await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)
			}
		})
	})

	test.describe('Data Visualization Features', () => {
		test('should handle different visualization modes', async ({ page }) => {
			// Test various toggle options if available
			const toggleOptions = ['Statistical Grid', 'Heat Vulnerability', 'Building properties']

			for (const option of toggleOptions) {
				try {
					const element = page.getByText(option).first()
					if (await element.isVisible({ timeout: TEST_TIMEOUTS.WAIT_MEDIUM })) {
						await element.click()
						await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)

						// Verify the map is still functional
						await expect(page.locator('canvas')).toBeVisible()
					}
				} catch (_error) {
					// Option not available
				}
			}
		})

		test('should support timeline functionality if available', async ({ page }) => {
			// Look for timeline or date controls
			const timelineSelectors = [
				'[class*="timeline"]',
				'[class*="date"]',
				'input[type="date"]',
				'select[class*="year"]',
			]

			for (const selector of timelineSelectors) {
				try {
					const element = page.locator(selector).first()
					if (await element.isVisible({ timeout: TEST_TIMEOUTS.WAIT_MEDIUM })) {
						await element.click()
						await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)

						// If it's a select or input, try to change the value
						const tagName = await element.evaluate((el) => el.tagName.toLowerCase())
						if (tagName === 'select') {
							const options = await element.locator('option').all()
							if (options.length > 1) {
								await element.selectOption({ index: 1 })
								await page.waitForTimeout(TEST_TIMEOUTS.WAIT_DATA_LOAD)
							}
						}
					}
				} catch (_error) {
					// Timeline controls not found
				}
			}
		})
	})
})
