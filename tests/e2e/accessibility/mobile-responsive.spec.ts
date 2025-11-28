/**
 * Mobile Responsive Layout Tests
 *
 * Tests responsive behavior of the application across different viewport sizes.
 * Ensures proper layout adaptation for mobile, tablet, and desktop screens.
 *
 * Covers:
 * - Control panel responsive drawer behavior
 * - Timeline component width constraints
 * - Camera controls repositioning
 * - Viewport meta tag configuration
 */

import { expect } from '@playwright/test';
import { cesiumTest, cesiumDescribe } from '../../fixtures/cesium-fixture';
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from '../helpers/test-helpers';

cesiumDescribe('Mobile Responsive Layout @accessibility @mobile', () => {
	cesiumTest.use({ tag: ['@accessibility', '@mobile'] });
	let helpers: AccessibilityTestHelpers;

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage);
	});

	cesiumTest.describe('Control Panel Responsive Behavior', () => {
		cesiumTest('should display as temporary overlay on mobile (<768px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 600, height: 800 });

			// Control panel should exist
			const drawer = cesiumPage.locator('.v-navigation-drawer');
			await expect(drawer).toBeAttached();

			// Should have temporary behavior (can be closed by clicking outside)
			// Check if it has the temporary class or scrim overlay
			const hasScrim = (await cesiumPage.locator('.v-overlay__scrim').count()) > 0;
			expect(hasScrim).toBeTruthy();
		});

		cesiumTest('should be full width (100%) on mobile (<600px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 375, height: 667 });

			// Open control panel
			const toggleButton = cesiumPage.getByLabel('Toggle control panel');
			const isVisible = await cesiumPage.locator('.v-navigation-drawer').isVisible();

			if (!isVisible) {
				await toggleButton.click();
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);
			}

			const drawer = cesiumPage.locator('.v-navigation-drawer');
			await expect(drawer).toBeVisible();

			// Check drawer width (should be close to 100% of viewport)
			const box = await drawer.boundingBox();
			expect(box).not.toBeNull();
			// Allow for small margin/padding differences
			expect(box!.width).toBeGreaterThan(350); // Should be nearly full width on 375px screen
		});

		cesiumTest('should be 90% width on small tablets (600-960px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 768, height: 1024 });

			// Open control panel if not visible
			const toggleButton = cesiumPage.getByLabel('Toggle control panel');
			const isVisible = await cesiumPage.locator('.v-navigation-drawer').isVisible();

			if (!isVisible) {
				await toggleButton.click();
				await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP);
			}

			const drawer = cesiumPage.locator('.v-navigation-drawer');
			const box = await drawer.boundingBox();
			expect(box).not.toBeNull();

			// Should be approximately 90% of viewport width
			const expectedWidth = 768 * 0.9;
			expect(box!.width).toBeGreaterThan(expectedWidth - 50);
			expect(box!.width).toBeLessThan(expectedWidth + 50);
		});

		cesiumTest('should have fixed width on desktop (>960px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 1920, height: 1080 });

			const drawer = cesiumPage.locator('.v-navigation-drawer');
			await expect(drawer).toBeVisible();

			const box = await drawer.boundingBox();
			expect(box).not.toBeNull();
			// Should have fixed width around 320-350px on desktop
			expect(box!.width).toBeLessThan(400);
		});
	});

	cesiumTest.describe('Timeline Component', () => {
		cesiumTest('should not cause horizontal scroll on mobile', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 375, height: 667 });

			// Navigate to view that shows timeline
			await helpers.selectPostalCodeByMap({ retries: 3 });
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM);

			// Check if timeline exists and is visible
			const timeline = cesiumPage.locator('.timeline-card');
			const timelineVisible = await timeline.isVisible();

			if (timelineVisible) {
				const box = await timeline.boundingBox();
				expect(box).not.toBeNull();

				// Timeline should not exceed viewport width minus padding (32px)
				expect(box!.width).toBeLessThanOrEqual(375);
			}

			// Check for horizontal scrollbar on body
			const hasHorizontalScroll = await cesiumPage.evaluate(() => {
				return document.documentElement.scrollWidth > document.documentElement.clientWidth;
			});
			expect(hasHorizontalScroll).toBe(false);
		});

		cesiumTest('should respect max-width constraint', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 1920, height: 1080 });

			// Navigate to view that shows timeline
			await helpers.selectPostalCodeByMap({ retries: 3 });
			await cesiumPage.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM);

			const timeline = cesiumPage.locator('.timeline-card');
			const timelineVisible = await timeline.isVisible();

			if (timelineVisible) {
				const box = await timeline.boundingBox();
				expect(box).not.toBeNull();

				// Timeline should not exceed 400px on large screens
				expect(box!.width).toBeLessThanOrEqual(400);
			}
		});
	});

	cesiumTest.describe('Camera Controls Repositioning', () => {
		cesiumTest('should be top-left on desktop', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 1024, height: 768 });

			const cameraControls = cesiumPage.locator('.camera-controls-container');
			await expect(cameraControls).toBeVisible();

			const box = await cameraControls.boundingBox();
			expect(box).not.toBeNull();

			// Should be near top-left corner
			expect(box!.y).toBeLessThan(150); // Near top
			expect(box!.x).toBeLessThan(100); // Near left
		});

		cesiumTest('should be centered bottom on tablets (768px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 768, height: 1024 });

			const cameraControls = cesiumPage.locator('.camera-controls-container');
			await expect(cameraControls).toBeVisible();

			const box = await cameraControls.boundingBox();
			expect(box).not.toBeNull();

			// Should be at bottom
			expect(box!.y).toBeGreaterThan(900);

			// Should be approximately centered horizontally
			const centerX = box!.x + box!.width / 2;
			const viewportCenterX = 768 / 2;
			expect(Math.abs(centerX - viewportCenterX)).toBeLessThan(100);
		});

		cesiumTest('should be left-aligned on small mobile (<480px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 375, height: 667 });

			const cameraControls = cesiumPage.locator('.camera-controls-container');
			await expect(cameraControls).toBeVisible();

			const box = await cameraControls.boundingBox();
			expect(box).not.toBeNull();

			// Should be at bottom-left
			expect(box!.y).toBeGreaterThan(500);
			expect(box!.x).toBeLessThan(100);
		});
	});

	cesiumTest.describe('Viewport Meta Tags', () => {
		cesiumTest('should allow user scaling up to 5x', async ({ cesiumPage }) => {
			const viewportMeta = await cesiumPage.evaluate(() => {
				const meta = document.querySelector('meta[name="viewport"]');
				return meta?.getAttribute('content');
			});

			expect(viewportMeta).toContain('user-scalable=yes');
			expect(viewportMeta).toContain('maximum-scale=5.0');
		});

		cesiumTest('should support viewport-fit for notched displays', async ({ cesiumPage }) => {
			const viewportMeta = await cesiumPage.evaluate(() => {
				const meta = document.querySelector('meta[name="viewport"]');
				return meta?.getAttribute('content');
			});

			expect(viewportMeta).toContain('viewport-fit=cover');
		});

		cesiumTest('should have theme color defined', async ({ cesiumPage }) => {
			const themeColor = await cesiumPage.evaluate(() => {
				const meta = document.querySelector('meta[name="theme-color"]');
				return meta?.getAttribute('content');
			});

			expect(themeColor).toBe('#1976d2');
		});

		cesiumTest('should support light and dark color schemes', async ({ cesiumPage }) => {
			const colorScheme = await cesiumPage.evaluate(() => {
				const meta = document.querySelector('meta[name="color-scheme"]');
				return meta?.getAttribute('content');
			});

			expect(colorScheme).toContain('light');
			expect(colorScheme).toContain('dark');
		});
	});

	cesiumTest.describe('Responsive Text Labels', () => {
		cesiumTest('should show full text on desktop control panel toggle', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 1024, height: 768 });

			const toggleButton = cesiumPage.getByLabel('Toggle control panel');
			const text = await toggleButton.textContent();

			// Should show full "Show/Hide Controls" text
			expect(text).toMatch(/Controls/);
		});

		cesiumTest(
			'should show abbreviated text on mobile control panel toggle',
			async ({ cesiumPage }) => {
				await cesiumPage.setViewportSize({ width: 375, height: 667 });

				const toggleButton = cesiumPage.getByLabel('Toggle control panel');
				const text = await toggleButton.textContent();

				// Should show abbreviated "Show/Hide" only
				expect(text).toBeTruthy();
				expect(text!.length).toBeLessThan(15); // Short text on mobile
			}
		);
	});
});
