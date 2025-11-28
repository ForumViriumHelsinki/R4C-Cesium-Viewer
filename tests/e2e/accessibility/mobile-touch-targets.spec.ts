/**
 * Mobile Touch Target Accessibility Tests
 *
 * Tests WCAG 2.5.5 Level AAA compliance for touch target sizing.
 * Ensures all interactive elements meet minimum 44x44px touch target size
 * on mobile devices to improve usability for users with motor impairments.
 *
 * Covers:
 * - Navigation buttons (return, sign out, rotate camera)
 * - Control panel toggle button
 * - Camera control buttons (compass directions, zoom)
 */

import { expect } from '@playwright/test';
import { cesiumTest, cesiumDescribe } from '../../fixtures/cesium-fixture';
import AccessibilityTestHelpers from '../helpers/test-helpers';

cesiumDescribe('Mobile Touch Targets @accessibility @mobile', () => {
	cesiumTest.use({ tag: ['@accessibility', '@mobile'] });
	let helpers: AccessibilityTestHelpers;

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage);
	});

	cesiumTest.describe('Navigation Buttons - Mobile', () => {
		cesiumTest(
			'should meet 44px minimum touch target on mobile (375px)',
			async ({ cesiumPage }) => {
				// iPhone SE viewport
				await cesiumPage.setViewportSize({ width: 375, height: 667 });

				// Navigate to postal code level to reveal return button
				await helpers.selectPostalCodeByMap({ retries: 3 });
				await cesiumPage.waitForTimeout(1000);

				// Test return button
				const returnButton = cesiumPage.getByLabel('Return to postal code level');
				if (await returnButton.isVisible()) {
					const box = await returnButton.boundingBox();
					expect(box).not.toBeNull();
					expect(box!.width).toBeGreaterThanOrEqual(44);
					expect(box!.height).toBeGreaterThanOrEqual(44);
				}

				// Test sign out button
				const signOutButton = cesiumPage.getByLabel('Sign out');
				const signOutBox = await signOutButton.boundingBox();
				expect(signOutBox).not.toBeNull();
				expect(signOutBox!.width).toBeGreaterThanOrEqual(44);
				expect(signOutBox!.height).toBeGreaterThanOrEqual(44);

				// Test rotate camera button
				const rotateButton = cesiumPage.getByLabel('Rotate camera view 180 degrees');
				const rotateBox = await rotateButton.boundingBox();
				expect(rotateBox).not.toBeNull();
				expect(rotateBox!.width).toBeGreaterThanOrEqual(44);
				expect(rotateBox!.height).toBeGreaterThanOrEqual(44);
			}
		);

		cesiumTest(
			'should maintain 44px minimum on very small mobile (320px)',
			async ({ cesiumPage }) => {
				// Smallest common mobile viewport (iPhone 5/SE in portrait)
				await cesiumPage.setViewportSize({ width: 320, height: 568 });

				// Test sign out button on smallest viewport
				const signOutButton = cesiumPage.getByLabel('Sign out');
				const box = await signOutButton.boundingBox();
				expect(box).not.toBeNull();
				expect(box!.width).toBeGreaterThanOrEqual(44);
				expect(box!.height).toBeGreaterThanOrEqual(44);
			}
		);
	});

	cesiumTest.describe('Control Panel Toggle', () => {
		cesiumTest('should have adequate touch target size', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 375, height: 667 });

			const toggleButton = cesiumPage.getByLabel('Toggle control panel');
			const box = await toggleButton.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.height).toBeGreaterThanOrEqual(44);
		});
	});

	cesiumTest.describe('Camera Controls - Mobile', () => {
		cesiumTest('should have minimum 32px touch targets on desktop', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 1024, height: 768 });

			// Wait for camera controls to be visible
			await cesiumPage.waitForSelector('.camera-controls-container', { timeout: 5000 });

			// Test zoom buttons
			const zoomInButton = cesiumPage.locator('.zoom-controls .v-btn').first();
			await expect(zoomInButton).toBeVisible();
			const zoomBox = await zoomInButton.boundingBox();
			expect(zoomBox).not.toBeNull();
			expect(zoomBox!.width).toBeGreaterThanOrEqual(32);
			expect(zoomBox!.height).toBeGreaterThanOrEqual(32);
		});

		cesiumTest('should increase to 36px on mobile for compass buttons', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 600, height: 800 });

			// Wait for camera controls
			await cesiumPage.waitForSelector('.compass-assembly', { timeout: 5000 });

			// Test compass direction buttons
			const northButton = cesiumPage.locator('.dir-btn.north');
			await expect(northButton).toBeVisible();
			const box = await northButton.boundingBox();
			expect(box).not.toBeNull();
			expect(box!.width).toBeGreaterThanOrEqual(36);
			expect(box!.height).toBeGreaterThanOrEqual(36);
		});

		cesiumTest('should hide compass on very small screens (<480px)', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 375, height: 667 });

			// Compass should be hidden on screens < 480px
			const compass = cesiumPage.locator('.compass-assembly');
			await expect(compass).not.toBeVisible();

			// Zoom controls should still be visible
			const zoomControls = cesiumPage.locator('.zoom-controls');
			await expect(zoomControls).toBeVisible();
		});
	});

	cesiumTest.describe('Touch Action Optimization', () => {
		cesiumTest(
			'should have touch-action: manipulation on interactive elements',
			async ({ cesiumPage }) => {
				await cesiumPage.setViewportSize({ width: 375, height: 667 });

				// Check navigation buttons have touch-action set
				const signOutButton = cesiumPage.getByLabel('Sign out');
				const touchAction = await signOutButton.evaluate(
					(el) => window.getComputedStyle(el).touchAction
				);
				expect(touchAction).toBe('manipulation');
			}
		);
	});

	cesiumTest.describe('Focus Visible Styles', () => {
		cesiumTest('should show focus indicators for keyboard navigation', async ({ cesiumPage }) => {
			await cesiumPage.setViewportSize({ width: 1024, height: 768 });

			const signOutButton = cesiumPage.getByLabel('Sign out');

			// Focus the button using keyboard
			await signOutButton.focus();

			// Check for focus-visible outline
			const outline = await signOutButton.evaluate((el) => {
				const styles = window.getComputedStyle(el);
				return {
					outlineWidth: styles.outlineWidth,
					outlineStyle: styles.outlineStyle,
				};
			});

			// Should have visible outline when focused
			expect(outline.outlineStyle).not.toBe('none');
		});
	});
});
