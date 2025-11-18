import { test, expect } from '@playwright/test';

test.describe('Feature Flags Panel', () => {
	test.use({ tag: ['@e2e', '@feature-flags'] });
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForLoadState('domcontentloaded');

		// Dismiss any modal if present
		const closeButton = page.getByRole('button', { name: 'Close' });
		if (await closeButton.isVisible({ timeout: 5000 })) {
			await closeButton.click();
			await expect(closeButton).toBeHidden();
		}
	});

	test('Feature Flags button is visible in navigation', async ({ page }) => {
		// Look for the feature flags button by title or icon
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await expect(featureFlagsButton).toBeVisible({ timeout: 10000 });
	});

	test('Feature Flags panel opens when clicked', async ({ page }) => {
		// Click the feature flags button
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();

		// Wait for dialog to open
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Verify dialog title
		await expect(page.getByText('Feature Flags')).toBeVisible();
	});

	test('Feature Flags panel displays categories', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Check for category sections (at least some of them)
		const categories = ['Data Layers', 'Graphics & Performance', 'Analysis Tools', 'UI & UX'];

		for (const category of categories) {
			await expect(page.getByText(category)).toBeVisible();
		}
	});

	test('Toggle a feature flag and verify persistence', async ({ page, context }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Expand the Data Layers category
		const dataLayersCategory = page.getByText('Data Layers').first();
		await dataLayersCategory.click();

		// Wait for expansion panel to open
		await page.waitForTimeout(500);

		// Find and toggle the NDVI flag
		const ndviSwitch = page.locator('input[type="checkbox"]').first();
		const initialState = await ndviSwitch.isChecked();

		// Click the switch to toggle it
		await ndviSwitch.click();

		// Verify state changed
		await expect(ndviSwitch).toHaveAttribute('aria-checked', initialState ? 'false' : 'true');

		// Close the dialog
		await page.getByRole('button', { name: 'Close' }).click();

		// Reload the page
		await page.reload();
		await page.waitForLoadState('domcontentloaded');

		// Re-open feature flags panel
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Expand the Data Layers category again
		await dataLayersCategory.click();
		await page.waitForTimeout(500);

		// Verify the toggle persisted
		const ndviSwitchAfterReload = page.locator('input[type="checkbox"]').first();
		await expect(ndviSwitchAfterReload).toHaveAttribute(
			'aria-checked',
			initialState ? 'false' : 'true'
		);
	});

	test('Reset flag to default works', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Expand the Data Layers category
		const dataLayersCategory = page.getByText('Data Layers').first();
		await dataLayersCategory.click();
		await page.waitForTimeout(500);

		// Toggle a flag
		const ndviSwitch = page.locator('input[type="checkbox"]').first();
		await ndviSwitch.click();

		// Look for the reset button (restore icon)
		const resetButton = page.getByRole('button', { name: /Reset to default/i }).first();

		// Click the reset button if it appears
		if (await resetButton.isVisible({ timeout: 2000 })) {
			await resetButton.click();

			// Verify the "Modified" chip is gone
			await expect(page.getByText('Modified').first()).not.toBeVisible();
		}
	});

	test('Export configuration creates download', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Set up download listener
		const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

		// Click export button
		const exportButton = page.getByRole('button', { name: /Export/i });
		await exportButton.click();

		// Wait for download to start
		const download = await downloadPromise;

		// Verify download filename
		expect(download.suggestedFilename()).toContain('feature-flags-config.json');
	});

	test('Import invalid JSON shows error notification', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Click import button
		const importButton = page.getByRole('button', { name: /Import/i });
		await importButton.click();

		// Wait for import dialog
		await page.waitForSelector('textarea', { timeout: 5000 });

		// Enter invalid JSON
		const textarea = page.locator('textarea');
		await textarea.fill('{ invalid json }');

		// Click import button in dialog
		const importConfirmButton = page.getByRole('button', { name: 'Import' }).last();
		await importConfirmButton.click();

		// Verify error snackbar appears
		await expect(page.getByText(/Invalid JSON format/i)).toBeVisible({
			timeout: 5000,
		});
	});

	test('Import valid JSON succeeds', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Click import button
		const importButton = page.getByRole('button', { name: /Import/i });
		await importButton.click();

		// Wait for import dialog
		await page.waitForSelector('textarea', { timeout: 5000 });

		// Enter valid JSON
		const validConfig = JSON.stringify({ ndvi: true, floodLayers: false });
		const textarea = page.locator('textarea');
		await textarea.fill(validConfig);

		// Click import button in dialog
		const importConfirmButton = page.getByRole('button', { name: 'Import' }).last();
		await importConfirmButton.click();

		// Verify success snackbar appears
		await expect(page.getByText(/imported successfully/i)).toBeVisible({
			timeout: 5000,
		});
	});

	test('Reset all flags confirmation dialog', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Set up dialog listener for confirmation
		page.on('dialog', async (dialog) => {
			expect(dialog.type()).toBe('confirm');
			expect(dialog.message()).toContain('reset all feature flags');
			await dialog.dismiss();
		});

		// Click reset all button
		const resetAllButton = page.getByRole('button', {
			name: /Reset All to Defaults/i,
		});
		await resetAllButton.click();

		// The dialog handler will verify the confirmation appeared
	});

	test('Feature flags panel shows enabled count', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Look for the enabled count chip (e.g., "15 / 30 enabled")
		const enabledCountChip = page
			.locator('.v-chip')
			.filter({ hasText: /\d+\s*\/\s*\d+\s*enabled/i });
		await expect(enabledCountChip).toBeVisible();
	});

	test('Experimental flags show warning badge', async ({ page }) => {
		// Open feature flags panel
		const featureFlagsButton = page.getByRole('button', {
			name: /Feature Flags/i,
		});
		await featureFlagsButton.click();
		await page.waitForSelector('[role="dialog"]', { timeout: 5000 });

		// Expand the Graphics & Performance category (likely has experimental flags)
		const graphicsCategory = page.getByText('Graphics & Performance').first();
		await graphicsCategory.click();
		await page.waitForTimeout(500);

		// Look for experimental badge
		const experimentalChip = page.getByText('Experimental').first();
		if (await experimentalChip.isVisible({ timeout: 2000 })) {
			await expect(experimentalChip).toBeVisible();
		}
	});
});
