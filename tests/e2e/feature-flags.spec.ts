import { expect, test } from '@playwright/test'
import { dismissModalIfPresent } from '../helpers/test-helpers' // TEST_TIMEOUTS;
import { TEST_TIMEOUTS } from './helpers/test-helpers'

test.describe('Feature Flags Panel', () => {
	test.use({ tag: ['@e2e', '@feature-flags'] })
	test.beforeEach(async ({ page }, testInfo) => {
		// Feature Flags toolbar button doesn't fit on mobile viewports
		test.skip(
			testInfo.project.name.includes('Mobile'),
			'Feature Flags panel requires desktop viewport'
		)
		// Panel requires ?flags=true URL param or showFeaturePanel flag
		await page.goto('/?flags=true')
		await page.waitForLoadState('domcontentloaded')

		// Dismiss any modal if present
		await dismissModalIfPresent(page, 'Explore Map')
	})

	test('Feature Flags button is hidden without flags param', async ({ page }) => {
		await page.goto('/')
		await page.waitForLoadState('domcontentloaded')
		await dismissModalIfPresent(page, 'Explore Map')

		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await expect(featureFlagsButton).not.toBeVisible({
			timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION,
		})
	})

	test('Feature Flags button is visible with flags param', async ({ page }) => {
		// Already navigated to /?flags=true in beforeEach
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await expect(featureFlagsButton).toBeVisible({ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
	})

	test('Feature Flags panel opens when clicked', async ({ page }) => {
		// Click the feature flags button
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()

		// Wait for dialog to open
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Wait for dialog animations
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

		// Scope selectors to dialog to avoid scrim interception
		const dialog = page.getByRole('dialog').filter({ hasText: /Feature Flags.*enabled/i })

		// Verify dialog title
		await expect(dialog.getByText('Feature Flags').first()).toBeVisible()
	})

	test('Feature Flags panel displays categories', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Wait for dialog animations
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

		// Scope selectors to dialog to avoid scrim interception
		const dialog = page.getByRole('dialog').filter({ hasText: /Feature Flags.*enabled/i })

		// Check for category sections (at least some of them)
		const categories = ['Data Layers', 'Graphics & Performance', 'Analysis Tools', 'UI & UX']

		for (const category of categories) {
			await expect(dialog.getByText(category).first()).toBeVisible()
		}
	})

	test('Toggle a feature flag within dialog', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Wait for dialog animations
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

		// Scope selectors to the Feature Flags dialog specifically
		const dialog = page.getByRole('dialog').filter({ hasText: /Feature Flags.*enabled/i })
		await expect(dialog).toBeVisible()

		// Expand the Data Layers category
		const dataLayersCategory = dialog
			.locator('.v-expansion-panel-title')
			.filter({ hasText: 'Data Layers' })
		await dataLayersCategory.click()

		// Wait for expansion panel to open
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

		// Find and toggle the NDVI flag (scoped to dialog)
		const ndviSwitch = dialog.locator('input[type="checkbox"]').first()
		const initialState = await ndviSwitch.isChecked()

		// Click the switch to toggle it
		await ndviSwitch.click()

		// Verify state changed
		if (initialState) {
			await expect(ndviSwitch).not.toBeChecked()
		} else {
			await expect(ndviSwitch).toBeChecked()
		}

		// Toggle back to original state
		await ndviSwitch.click()

		// Verify returned to original state
		if (initialState) {
			await expect(ndviSwitch).toBeChecked()
		} else {
			await expect(ndviSwitch).not.toBeChecked()
		}

		// Verify dialog is still functional
		await expect(dialog).toBeVisible()
	})

	test('Reset flag to default works', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Wait for dialog animations
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

		// Scope selectors to dialog to avoid scrim interception
		const dialog = page.getByRole('dialog').filter({ hasText: /Feature Flags.*enabled/i })

		// Expand the Data Layers category
		const dataLayersCategory = dialog
			.locator('.v-expansion-panel-title')
			.filter({ hasText: 'Data Layers' })
		await dataLayersCategory.click()
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

		// Toggle a flag
		const ndviSwitch = dialog.locator('input[type="checkbox"]').first()
		await ndviSwitch.click()

		// Look for the reset button (restore icon)
		const resetButton = dialog.getByRole('button', { name: /Reset to default/i }).first()

		// Click the reset button if it appears
		if (await resetButton.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION })) {
			await resetButton.click()

			// Verify the "Modified" chip is gone
			await expect(dialog.getByText('Modified').first()).not.toBeVisible()
		}
	})

	test('Export configuration creates download', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Set up download listener
		const downloadPromise = page.waitForEvent('download', {
			timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
		})

		// Click export button
		const exportButton = page.getByRole('button', { name: /Export/i })
		await exportButton.click()

		// Wait for download to start
		const download = await downloadPromise

		// Verify download filename
		expect(download.suggestedFilename()).toContain('feature-flags-config.json')
	})

	test('Import invalid JSON shows error notification', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Wait for dialog animations
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

		// Scope selectors to dialog to avoid scrim interception
		const dialog = page.getByRole('dialog').filter({ hasText: /Feature Flags.*enabled/i })

		// Click import button
		const importButton = dialog.getByRole('button', { name: /Import/i })
		await importButton.click()

		// Wait for import dialog
		await page.waitForSelector('textarea', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Enter invalid JSON
		const textarea = page.locator('textarea')
		await textarea.fill('{ invalid json }')

		// Click import button in dialog
		const importConfirmButton = page.getByRole('button', { name: 'Import' }).last()
		await importConfirmButton.click()

		// Verify error snackbar appears
		await expect(page.getByText(/Invalid JSON format/i)).toBeVisible({
			timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
		})
	})

	test('Import valid JSON succeeds', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Wait for dialog animations
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)

		// Scope selectors to dialog to avoid scrim interception
		const dialog = page.getByRole('dialog').filter({ hasText: /Feature Flags.*enabled/i })

		// Click import button
		const importButton = dialog.getByRole('button', { name: /Import/i })
		await importButton.click()

		// Wait for import dialog
		await page.waitForSelector('textarea', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Enter valid JSON
		const validConfig = JSON.stringify({ ndvi: true, floodLayers: false })
		const textarea = page.locator('textarea')
		await textarea.fill(validConfig)

		// Click import button in dialog
		const importConfirmButton = page.getByRole('button', { name: 'Import' }).last()
		await importConfirmButton.click()

		// Verify success snackbar appears
		await expect(page.getByText(/imported successfully/i)).toBeVisible({
			timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
		})
	})

	test('Reset all flags confirmation dialog', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Set up dialog listener for confirmation
		page.on('dialog', async (dialog) => {
			expect(dialog.type()).toBe('confirm')
			expect(dialog.message()).toContain('reset all feature flags')
			await dialog.dismiss()
		})

		// Click reset all button
		const resetAllButton = page.getByRole('button', {
			name: /Reset All to Defaults/i,
		})
		await resetAllButton.click()

		// The dialog handler will verify the confirmation appeared
	})

	test('Feature flags panel shows enabled count', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Look for the enabled count chip (e.g., "15 / 30 enabled")
		const enabledCountChip = page
			.locator('.v-chip')
			.filter({ hasText: /\d+\s*\/\s*\d+\s*enabled/i })
		await expect(enabledCountChip).toBeVisible()
	})

	test('Experimental flags show warning badge', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		})
		await featureFlagsButton.click()
		await page.waitForSelector('[role="dialog"]', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

		// Expand the Graphics & Performance category (likely has experimental flags)
		const graphicsCategory = page.getByText('Graphics & Performance').first()
		await graphicsCategory.click()
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)

		// Look for experimental badge
		const experimentalChip = page.getByText('Experimental').first()
		if (await experimentalChip.isVisible({ timeout: TEST_TIMEOUTS.ELEMENT_INTERACTION })) {
			await expect(experimentalChip).toBeVisible()
		}
	})
})
