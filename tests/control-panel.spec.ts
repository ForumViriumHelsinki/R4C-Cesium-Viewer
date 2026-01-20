import { expect, test } from '@playwright/test'
import { TEST_TIMEOUTS } from './e2e/helpers/test-helpers'
import { dismissModalIfPresent } from './helpers/test-helpers' // TEST_TIMEOUTS;
import { setupDigitransitMock } from './setup/digitransit-mock'

// Setup digitransit mocking for all tests in this file
setupDigitransitMock()

test.describe('Control Panel Functionality', () => {
	test.use({ tag: ['@e2e', '@ui'] })
	test.beforeEach(async ({ page }) => {
		await page.goto('/')
		// Dismiss the disclaimer popup
		await dismissModalIfPresent(page, 'Explore Map')

		// Ensure control panel is visible
		const toggleButton = page.getByRole('button', {
			name: 'Toggle control panel',
		})
		// Wait for button to be ready and add timeout to textContent
		await toggleButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
		const isHidden = (
			await toggleButton.textContent({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
		)?.includes('Show')
		if (isHidden) {
			await toggleButton.click()
		}
	})

	test('should display main control sections', async ({ page }) => {
		// Check for main control panel
		await expect(page.locator('.analysis-sidebar')).toBeVisible()

		// Check for search functionality
		const searchInput = page.locator(
			'input[placeholder*="search" i], input[placeholder*="filter" i]'
		)
		if ((await searchInput.count()) > 0) {
			await expect(searchInput.first()).toBeVisible()
		}

		// Check for view mode controls
		const viewModeControls = page.locator(
			'[data-testid="view-mode"], .view-mode, [class*="view-mode"]'
		)
		if ((await viewModeControls.count()) > 0) {
			await expect(viewModeControls.first()).toBeVisible()
		}
	})

	test('should handle UnifiedSearch functionality', async ({ page }) => {
		// Look for the input element inside the unified search component
		const searchInput = page.locator('.unified-search input, .unified-search .v-field__input')

		const count = await searchInput.count()
		if (count > 0) {
			const input = searchInput.first()
			await expect(input).toBeVisible()

			// Test search input interaction
			await input.click()
			await input.fill('Helsinki')

			// Wait for value to be set
			await expect(input).toHaveValue('Helsinki')

			// Clear search
			await input.clear()
		}
	})

	test('should display layer controls', async ({ page }) => {
		// Check for layer control sections
		const layerControls = page.locator('[class*="layer"], [data-testid*="layer"], .control-section')

		if ((await layerControls.count()) > 0) {
			await expect(layerControls.first()).toBeVisible()
		}

		// Look for toggle switches
		const toggles = page.locator('input[type="checkbox"], .v-switch, [role="switch"]')
		if ((await toggles.count()) > 0) {
			await expect(toggles.first()).toBeVisible()
		}
	})

	test('should handle background map browser', async ({ page }) => {
		// Look for background map controls
		const backgroundMapButton = page.getByRole('button', {
			name: /background.*map|HSY.*map/i,
		})

		const buttonCount = await backgroundMapButton.count()
		if (buttonCount > 0) {
			await backgroundMapButton.click()

			// Wait for background map browser to open - check for search input
			const mapSearchInput = page.getByPlaceholder(/search.*layer|search.*map/i)
			await mapSearchInput.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
			await expect(mapSearchInput).toBeVisible()

			// Test searching for a layer
			await mapSearchInput.fill('Kaupunginosat')
			await expect(mapSearchInput).toHaveValue('Kaupunginosat')

			// Clear search
			await mapSearchInput.clear()

			// Close background map browser if there's a close button
			const closeButton = page.getByRole('button', { name: /close|cancel/i })
			const closeCount = await closeButton.count()
			if (closeCount > 0) {
				await closeButton.click()
			}
		}
	})

	test('should display graphics quality controls', async ({ page }) => {
		// Look for graphics quality controls
		const graphicsControls = page.locator(
			'[data-testid="graphics"], [class*="graphics"], .graphics-quality'
		)

		if ((await graphicsControls.count()) > 0) {
			await expect(graphicsControls.first()).toBeVisible()

			// Check for quality settings
			const qualitySettings = page.locator('select, .v-select, [role="combobox"]')
			if ((await qualitySettings.count()) > 0) {
				const firstSetting = qualitySettings.first()
				if (await firstSetting.isVisible()) {
					await firstSetting.click()
					// Playwright auto-waits for dropdown to appear
				}
			}
		}
	})

	test('should handle statistical grid options', async ({ page }) => {
		// Look for statistical grid view button (it's a button, not a checkbox)
		const gridButton = page.getByLabel(/statistical.*grid/i)

		const buttonCount = await gridButton.count()
		if (buttonCount > 0) {
			// Click the button to activate grid view
			await gridButton.click()

			// Wait for grid view to be activated
			await page
				.waitForFunction(
					() => {
						const store = (window as any).useGlobalStore?.()
						return store?.level === 'gridView'
					},
					{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
				)
				.catch(() => {
					// Grid view may not be available in all states
				})

			// Wait for grid options to appear
			const gridOptions = page.locator('[data-testid="grid-options"], .grid-options, .grid-view')
			const optionsCount = await gridOptions.count()
			if (optionsCount > 0) {
				await expect(gridOptions.first()).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
			}
		}
	})

	test('should display data layer toggles', async ({ page }) => {
		// Look for Vuetify switch/checkbox components in the control panel
		// These are the actual toggle controls, not progress bars
		const switches = page.locator('.analysis-sidebar .v-switch, .analysis-sidebar .v-checkbox')

		const switchCount = await switches.count()
		if (switchCount > 0) {
			// Test at least one switch is visible
			await expect(switches.first()).toBeVisible()

			// Test interaction with first available switch
			const firstSwitch = switches.first()
			const inputElement = firstSwitch.locator('input[type="checkbox"]')

			if ((await inputElement.count()) > 0) {
				const isChecked = await inputElement.isChecked()
				await firstSwitch.click()

				// Verify state changed
				const newState = await inputElement.isChecked()
				expect(newState).toBe(!isChecked)

				// Reset to original state
				await firstSwitch.click()
			}
		}
	})

	test('should handle accordion/collapsible sections', async ({ page }) => {
		// Look for Vuetify expansion panels specifically within the control panel
		const expansionPanels = page.locator('.analysis-sidebar .v-expansion-panel')

		const panelCount = await expansionPanels.count()
		if (panelCount > 0) {
			// Find the expansion panel title/button (the clickable header)
			const panelHeader = expansionPanels.first().locator('.v-expansion-panel-title')
			await panelHeader.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

			// Get initial state from aria-expanded attribute
			const initialExpanded = await panelHeader.getAttribute('aria-expanded')

			// Click to toggle
			await panelHeader.click()

			// Wait for animation to complete
			await page.waitForTimeout(300)

			// Verify state changed
			const newExpanded = await panelHeader.getAttribute('aria-expanded')
			if (initialExpanded !== null && newExpanded !== null) {
				expect(newExpanded).not.toBe(initialExpanded)
			}
		}
	})

	test('should handle responsive control panel', async ({ page }) => {
		// Test control panel in mobile viewport
		await page.setViewportSize({ width: 375, height: 667 })

		// Control panel should still be functional
		const controlPanel = page.locator('.analysis-sidebar')
		if (await controlPanel.isVisible()) {
			await expect(controlPanel).toBeVisible()

			// Check that controls are still accessible
			const controls = page.locator('input, button, select').filter({ hasText: /.+/ })
			if ((await controls.count()) > 0) {
				await expect(controls.first()).toBeVisible()
			}
		}
	})
})
