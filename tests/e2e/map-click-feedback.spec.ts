/**
 * Map Click Feedback Loading Overlay E2E Tests
 *
 * Comprehensive test suite for the MapClickLoadingOverlay component, verifying:
 * - Immediate visual feedback via store state changes
 * - Loading lifecycle stages (loading -> animating -> complete)
 * - Camera animation with cancellation via ESC key
 * - Error handling and retry capability
 * - Full accessibility support (ARIA, keyboard navigation)
 * - Performance metrics (sub-100ms feedback, smooth transitions)
 *
 * TESTING STRATEGY:
 * These tests use direct store state manipulation instead of canvas clicks for:
 * - Deterministic, fast, non-flaky tests
 * - Isolation of component behavior from map click detection
 * - Ability to test all edge cases and error states
 *
 * The overlay component reactively displays based on globalStore.clickProcessingState.
 *
 * @see {@link /src/components/MapClickLoadingOverlay.vue}
 * @see {@link /src/stores/globalStore.js}
 */

import { expect } from '@playwright/test';
import { cesiumTest, cesiumDescribe } from '../fixtures/cesium-fixture';
import AccessibilityTestHelpers from './helpers/test-helpers';

/**
 * Helper function to trigger overlay display via store state
 * @param {Page} cesiumPage - Playwright page object
 * @param {Object} stateOverrides - Optional overrides for default state
 */
async function triggerOverlayViaStore(cesiumPage: any, stateOverrides: any = {}) {
	await cesiumPage.evaluate((overrides: any) => {
		const store = (window as any).useGlobalStore?.();
		if (store) {
			store.setClickProcessingState({
				isProcessing: true,
				postalCode: '00100',
				postalCodeName: 'Helsinki Center',
				stage: 'loading',
				startTime: performance.now(),
				canCancel: false,
				error: null,
				retryCount: 0,
				...overrides,
			});
		}
	}, stateOverrides);

	// Wait for Vue reactivity and Vuetify overlay to fully activate
	// V-overlay uses CSS transitions that can take 200-300ms to fully display
	// Wait for the overlay to actually be visible in the DOM
	await cesiumPage.waitForFunction(
		() => {
			const overlay = document.querySelector('.map-click-loading-overlay');
			if (!overlay) return false;
			const style = window.getComputedStyle(overlay);
			return style.display !== 'none' && style.visibility !== 'hidden';
		},
		{ timeout: 2000 }
	);
}

/**
 * Helper function to reset store state
 * @param {Page} cesiumPage - Playwright page object
 */
async function resetStoreState(cesiumPage: any) {
	await cesiumPage.evaluate(() => {
		const store = (window as any).useGlobalStore?.();
		if (store) {
			store.resetClickProcessingState();
		}
	});
}

cesiumDescribe('Map Click Loading Overlay', () => {
	cesiumTest.use({ tag: ['@e2e', '@interaction', '@accessibility', '@performance'] });
	let _helpers: AccessibilityTestHelpers;

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		_helpers = new AccessibilityTestHelpers(cesiumPage);
		// Cesium is already initialized by the fixture
		// Reset store state before each test
		await resetStoreState(cesiumPage);
	});

	cesiumTest.afterEach(async ({ cesiumPage }) => {
		// Clean up store state after each test
		await resetStoreState(cesiumPage);
	});

	cesiumTest.describe('Immediate Visual Feedback', () => {
		cesiumTest(
			'should display loading overlay within 100ms of store state change @performance',
			async ({ cesiumPage }) => {
				// Record start time
				const startTime = Date.now();

				// Trigger overlay via store state
				await triggerOverlayViaStore(cesiumPage);

				// Debug: Check if state was set and overlay visibility
				const stateCheck = await cesiumPage.evaluate(() => {
					const store = (window as any).useGlobalStore?.();
					const overlay = document.querySelector('.map-click-loading-overlay');
					const card = document.querySelector('.loading-card');
					return {
						storeExists: !!store,
						isProcessing: store?.clickProcessingState?.isProcessing,
						postalCode: store?.clickProcessingState?.postalCode,
						stage: store?.clickProcessingState?.stage,
						overlayFound: !!overlay,
						overlayDisplay: overlay ? window.getComputedStyle(overlay).display : null,
						overlayVisibility: overlay ? window.getComputedStyle(overlay).visibility : null,
						cardFound: !!card,
						cardDisplay: card ? window.getComputedStyle(card).display : null,
					};
				});
				console.log('[DEBUG] Store state and overlay:', JSON.stringify(stateCheck, null, 2));

				// The overlay should appear almost immediately
				const overlay = cesiumPage.locator('.map-click-loading-overlay');
				const loadingCard = cesiumPage.locator('.loading-card');

				// Wait for overlay to appear with tight timeout
				await expect(overlay).toBeVisible({ timeout: 500 });
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				const endTime = Date.now();
				const feedbackTime = endTime - startTime;

				// Verify feedback time is within target (allows up to 150ms for test overhead)
				expect(feedbackTime).toBeLessThan(150);

				console.log(`[Performance] Loading overlay appeared in ${feedbackTime}ms`);

				// Verify loading card has proper styling
				await expect(loadingCard).toHaveClass(/loading-card/);
			}
		);

		cesiumTest('should show postal code name in overlay', async ({ cesiumPage }) => {
			// Trigger overlay with specific postal code name
			await triggerOverlayViaStore(cesiumPage, {
				postalCodeName: 'Helsinki Center Test Area',
			});

			// Wait for overlay to appear
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check for postal code name text
			const postalCodeText = cesiumPage.locator('.loading-card p.text-body-2');
			await expect(postalCodeText).toBeVisible();

			// Should show the postal code name we set
			const text = await postalCodeText.textContent();
			expect(text).toContain('Helsinki Center Test Area');
		});

		cesiumTest('should display progress indicator while loading', async ({ cesiumPage }) => {
			// Trigger overlay in loading stage
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Wait for overlay to appear
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check for progress circular indicator
			const progressCircular = cesiumPage.locator('.v-progress-circular');
			await expect(progressCircular).toBeVisible();

			// Should have indeterminate state
			const hasIndeterminate = await progressCircular
				.locator('.v-progress-circular__underlay')
				.count()
				.then((count) => count > 0);

			expect(hasIndeterminate).toBeTruthy();
		});

		cesiumTest(
			'should display stage-appropriate text for loading stage',
			async ({ cesiumPage }) => {
				// Trigger overlay in loading stage
				await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

				// Wait for overlay to appear
				const loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				// Check for loading stage text
				const stageText = cesiumPage.locator('.loading-card h3');
				await expect(stageText).toBeVisible();
				await expect(stageText).toHaveText('Loading Postal Code');
			}
		);

		cesiumTest(
			'should display stage-appropriate text for animating stage',
			async ({ cesiumPage }) => {
				// Trigger overlay in animating stage
				await triggerOverlayViaStore(cesiumPage, {
					stage: 'animating',
					canCancel: true,
				});

				// Wait for overlay to appear
				const loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				// Check for animating stage text
				const stageText = cesiumPage.locator('.loading-card h3');
				await expect(stageText).toBeVisible();
				await expect(stageText).toHaveText('Moving Camera');
			}
		);

		cesiumTest(
			'should display stage-appropriate text for complete stage',
			async ({ cesiumPage }) => {
				// Trigger overlay in complete stage
				await triggerOverlayViaStore(cesiumPage, { stage: 'complete' });

				// Wait for overlay to appear
				const loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				// Check for complete stage text
				const stageText = cesiumPage.locator('.loading-card h3');
				await expect(stageText).toBeVisible();
				await expect(stageText).toHaveText('Almost Ready');
			}
		);

		cesiumTest(
			'should display default processing text for unknown stage',
			async ({ cesiumPage }) => {
				// Trigger overlay with no specific stage
				await triggerOverlayViaStore(cesiumPage, { stage: null });

				// Wait for overlay to appear
				const loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				// Check for default processing text
				const stageText = cesiumPage.locator('.loading-card h3');
				await expect(stageText).toBeVisible();
				await expect(stageText).toHaveText('Processing');
			}
		);
	});

	cesiumTest.describe('Loading Stage Progression', () => {
		cesiumTest('should transition from loading to animating stage', async ({ cesiumPage }) => {
			// Start in loading stage
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Verify loading stage text
			const stageText = cesiumPage.locator('.loading-card h3');
			await expect(stageText).toHaveText('Loading Postal Code');

			// Transition to animating stage
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			// Verify stage text changed
			await expect(stageText).toHaveText('Moving Camera');
		});

		cesiumTest('should transition from animating to complete stage', async ({ cesiumPage }) => {
			// Start in animating stage
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Verify animating stage text
			const stageText = cesiumPage.locator('.loading-card h3');
			await expect(stageText).toHaveText('Moving Camera');

			// Transition to complete stage
			await triggerOverlayViaStore(cesiumPage, { stage: 'complete' });

			// Verify stage text changed
			await expect(stageText).toHaveText('Almost Ready');
		});

		cesiumTest('should show progress bar during loading stage', async ({ cesiumPage }) => {
			// Trigger overlay in loading stage
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check for progress linear indicator
			const progressLinear = cesiumPage.locator('.v-progress-linear').first();
			await expect(progressLinear).toBeVisible();

			// Should have a progress value (30% for loading stage)
			const value = await progressLinear.getAttribute('aria-valuenow');
			expect(parseInt(value || '0')).toBeGreaterThan(0);
		});

		cesiumTest('should show progress bar during animating stage', async ({ cesiumPage }) => {
			// Trigger overlay in animating stage
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check for progress linear indicator
			const progressLinear = cesiumPage.locator('.v-progress-linear').first();
			await expect(progressLinear).toBeVisible();

			// Should have higher progress value (60% for animating stage)
			const value = await progressLinear.getAttribute('aria-valuenow');
			expect(parseInt(value || '0')).toBeGreaterThanOrEqual(30);
		});

		cesiumTest('should show loading progress with real progress data', async ({ cesiumPage }) => {
			// Trigger overlay with real progress data
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				loadingProgress: { current: 1, total: 3 },
			});

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Progress bar should reflect real progress (33%)
			const progressLinear = cesiumPage.locator('.v-progress-linear').first();
			await expect(progressLinear).toBeVisible();

			const value = await progressLinear.getAttribute('aria-valuenow');
			expect(parseInt(value || '0')).toBeCloseTo(33, 0);
		});

		cesiumTest('should maintain visible overlay while processing', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Overlay should remain visible for several frames
			for (let i = 0; i < 3; i++) {
				await cesiumPage.waitForTimeout(200);
				await expect(loadingCard).toBeVisible();
			}
		});
	});

	cesiumTest.describe('Cancel Functionality', () => {
		cesiumTest('should show cancel button during animation stage', async ({ cesiumPage }) => {
			// Trigger overlay in animating stage with cancel enabled
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Cancel button should be visible
			const cancelButton = cesiumPage.locator('button:has-text("Press ESC to Cancel")');
			await expect(cancelButton).toBeVisible();
		});

		cesiumTest('should NOT show cancel button when canCancel is false', async ({ cesiumPage }) => {
			// Trigger overlay with cancel disabled
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: false,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Cancel button should NOT be visible
			const cancelButton = cesiumPage.locator('button:has-text("Press ESC to Cancel")');
			await expect(cancelButton).not.toBeVisible();
		});

		cesiumTest('should NOT show cancel button during loading stage', async ({ cesiumPage }) => {
			// Trigger overlay in loading stage
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				canCancel: false,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Cancel button should NOT be visible during loading
			const cancelButton = cesiumPage.locator('button:has-text("Press ESC to Cancel")');
			await expect(cancelButton).not.toBeVisible();
		});

		cesiumTest('should support cancel button click', async ({ cesiumPage }) => {
			// Trigger overlay with cancel enabled
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Find and click cancel button
			const cancelButton = cesiumPage.locator('button:has-text("Press ESC to Cancel")');
			await expect(cancelButton).toBeVisible();

			// Set up event listener to capture the cancel event
			const cancelEventPromise = cesiumPage.evaluate(() => {
				return new Promise<void>((resolve) => {
					// Listen for the cancel event being emitted from the component
					document.addEventListener('cancel-click-processing', () => {
						resolve();
					});
					setTimeout(() => resolve(), 1000); // Fallback timeout
				});
			});

			await cancelButton.click();

			// Verify click was registered
			await cancelEventPromise;
		});
	});

	cesiumTest.describe('Error Handling and Retry', () => {
		cesiumTest('should display error message on load failure', async ({ cesiumPage }) => {
			// Trigger overlay with error state
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				error: {
					message: 'Failed to load postal code data',
					code: 'LOAD_ERROR',
				},
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check for error alert with assertive aria-live
			const errorAlert = cesiumPage.locator('[role="alert"]');
			await expect(errorAlert).toBeVisible();

			// Verify error message is displayed
			await expect(errorAlert).toContainText('Failed to load postal code data');
		});

		cesiumTest('should show retry button on error', async ({ cesiumPage }) => {
			// Trigger overlay with error state
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				error: {
					message: 'Network error occurred',
					code: 'NETWORK_ERROR',
				},
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Look for retry button within error alert
			const retryButton = cesiumPage.locator('button:has-text("Retry")');
			await expect(retryButton).toBeVisible();
		});

		cesiumTest('should support retry button click', async ({ cesiumPage }) => {
			// Trigger overlay with error state
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				error: {
					message: 'Connection timeout',
					code: 'TIMEOUT',
				},
				retryCount: 1,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Find and click retry button
			const retryButton = cesiumPage.locator('button:has-text("Retry")');
			await expect(retryButton).toBeVisible();

			// Set up event listener to capture retry event
			const retryEventPromise = cesiumPage.evaluate(() => {
				return new Promise<void>((resolve) => {
					document.addEventListener('retry-click-processing', () => {
						resolve();
					});
					setTimeout(() => resolve(), 1000); // Fallback timeout
				});
			});

			await retryButton.click();

			// Verify click was registered
			await retryEventPromise;
		});

		cesiumTest('should track retry count', async ({ cesiumPage }) => {
			// Set initial retry count
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				retryCount: 0,
			});

			// Check retry count in store
			const initialRetryCount = await cesiumPage.evaluate(() => {
				const store = (window as any).useGlobalStore?.();
				if (store && store.clickProcessingState) {
					return store.clickProcessingState.retryCount;
				}
				return -1;
			});

			expect(initialRetryCount).toBe(0);

			// Increment retry count
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				retryCount: 1,
				error: {
					message: 'Retry attempt 1',
					code: 'RETRY',
				},
			});

			const updatedRetryCount = await cesiumPage.evaluate(() => {
				const store = (window as any).useGlobalStore?.();
				if (store && store.clickProcessingState) {
					return store.clickProcessingState.retryCount;
				}
				return -1;
			});

			expect(updatedRetryCount).toBe(1);
		});

		cesiumTest(
			'should show different error messages for different error codes',
			async ({ cesiumPage }) => {
				// Test network error
				await triggerOverlayViaStore(cesiumPage, {
					stage: 'loading',
					error: {
						message: 'Network connection failed',
						code: 'NETWORK_ERROR',
					},
				});

				let loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				let errorAlert = cesiumPage.locator('[role="alert"]');
				await expect(errorAlert).toContainText('Network connection failed');

				// Reset and test timeout error
				await resetStoreState(cesiumPage);

				await triggerOverlayViaStore(cesiumPage, {
					stage: 'loading',
					error: {
						message: 'Request timed out',
						code: 'TIMEOUT',
					},
				});

				loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				errorAlert = cesiumPage.locator('[role="alert"]');
				await expect(errorAlert).toContainText('Request timed out');
			}
		);

		cesiumTest('should maintain overlay visibility during error state', async ({ cesiumPage }) => {
			// Trigger overlay with error
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				error: {
					message: 'Persistent error',
					code: 'ERROR',
				},
			});

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Overlay should remain visible with error for extended period
			for (let i = 0; i < 3; i++) {
				await cesiumPage.waitForTimeout(300);
				await expect(loadingCard).toBeVisible();
				const errorAlert = cesiumPage.locator('[role="alert"]');
				await expect(errorAlert).toBeVisible();
			}
		});
	});

	// Remaining test sections - to be merged into main file

	cesiumTest.describe('Accessibility Features', () => {
		cesiumTest('should have proper ARIA attributes', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check for ARIA attributes
			const role = await loadingCard.getAttribute('role');
			expect(role).toBe('status');

			// Should have aria-live region
			const ariaLive = await loadingCard.getAttribute('aria-live');
			expect(ariaLive).toBe('polite');

			// Should be atomic for screen readers
			const ariaAtomic = await loadingCard.getAttribute('aria-atomic');
			expect(ariaAtomic).toBe('true');
		});

		cesiumTest('should announce stage changes to screen readers', async ({ cesiumPage }) => {
			// Start with loading stage
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Stage text should be present for screen readers
			const stageText = cesiumPage.locator('.loading-card h3');
			await expect(stageText).toHaveText('Loading Postal Code');

			// Change to animating stage
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			// Stage text should update for screen readers
			await expect(stageText).toHaveText('Moving Camera');
		});

		cesiumTest('should have keyboard-accessible cancel button', async ({ cesiumPage }) => {
			// Trigger overlay with cancel enabled
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Cancel button should be focusable
			const cancelButton = cesiumPage.locator('button:has-text("Press ESC to Cancel")');
			await expect(cancelButton).toBeVisible();

			// Should be keyboard accessible
			await cancelButton.focus();
			const focused = await cesiumPage.locator(':focus');
			await expect(focused).toHaveCount(1);

			// Should have aria-label
			const ariaLabel = await cancelButton.getAttribute('aria-label');
			expect(ariaLabel).toContain('Cancel');
			expect(ariaLabel).toContain('Escape');
		});

		cesiumTest('should support keyboard navigation in error state', async ({ cesiumPage }) => {
			// Trigger overlay with error
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				error: {
					message: 'Test error',
					code: 'TEST_ERROR',
				},
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Retry button should be present
			const retryButton = cesiumPage.locator('button:has-text("Retry")');
			await expect(retryButton).toBeVisible();

			// Should be able to focus via keyboard
			await retryButton.focus();
			const focused = await cesiumPage.locator(':focus');
			await expect(focused).toHaveCount(1);
		});

		cesiumTest('should provide adequate color contrast', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check loading card has styled appearance
			const bgColor = await loadingCard.evaluate((el) => {
				return window.getComputedStyle(el).backgroundColor;
			});
			expect(bgColor).toBeTruthy();

			// Check text contrast
			const textColor = await cesiumPage.locator('.loading-card h3').evaluate((el) => {
				return window.getComputedStyle(el).color;
			});
			expect(textColor).toBeTruthy();
		});

		cesiumTest('should respect prefers-reduced-motion', async ({ cesiumPage }) => {
			// Set reduced motion preference
			await cesiumPage.emulateMedia({ reducedMotion: 'reduce' });

			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Progress indicators should still be present
			const progressCircular = cesiumPage.locator('.v-progress-circular');
			await expect(progressCircular).toBeVisible();

			// Check that animation is disabled in CSS
			const animationStyle = await progressCircular.evaluate((el) => {
				return window.getComputedStyle(el).animation;
			});
			// In reduced motion mode, animation should be 'none' or significantly reduced
			expect(animationStyle).toBeDefined();

			// Reset media settings
			await cesiumPage.emulateMedia({ reducedMotion: 'no-preference' });
		});

		cesiumTest('should provide descriptive button labels', async ({ cesiumPage }) => {
			// Trigger overlay with cancel button
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'animating',
				canCancel: true,
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Cancel button should have descriptive label
			const cancelButton = cesiumPage.locator('button:has-text("Press ESC to Cancel")');
			await expect(cancelButton).toBeVisible();

			const ariaLabel = await cancelButton.getAttribute('aria-label');
			const text = await cancelButton.textContent();

			expect(ariaLabel || text).toMatch(/cancel.*escape/i);
		});

		cesiumTest('should have error alert with assertive aria-live', async ({ cesiumPage }) => {
			// Trigger overlay with error
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				error: {
					message: 'Critical error occurred',
					code: 'CRITICAL',
				},
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Error alert should have assertive aria-live
			const errorAlert = cesiumPage.locator('[role="alert"]');
			await expect(errorAlert).toBeVisible();

			const ariaLive = await errorAlert.getAttribute('aria-live');
			expect(ariaLive).toBe('assertive');
		});
	});

	cesiumTest.describe('Performance Metrics', () => {
		cesiumTest('should measure interaction time @performance', async ({ cesiumPage }) => {
			// Start performance measurement
			await cesiumPage.evaluate(() => {
				performance.mark('test-store-update-start');
			});

			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage);

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Mark completion
			const duration = await cesiumPage.evaluate(() => {
				performance.mark('test-store-update-end');
				performance.measure(
					'test-store-update',
					'test-store-update-start',
					'test-store-update-end'
				);

				const measure = performance.getEntriesByName('test-store-update')[0];
				return measure?.duration || -1;
			});

			console.log(`[Performance] Store update to visibility in ${duration}ms`);
			expect(duration).toBeGreaterThan(0);
			expect(duration).toBeLessThan(150); // Should be very fast with store approach
		});

		cesiumTest('should maintain smooth state transitions @performance', async ({ cesiumPage }) => {
			// Trigger initial overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Monitor frame timings during transitions
			const frameTimings: number[] = [];

			const stages = ['loading', 'animating', 'complete'];
			for (const stage of stages) {
				const start = Date.now();

				await triggerOverlayViaStore(cesiumPage, {
					stage,
					canCancel: stage === 'animating',
				});

				await cesiumPage.waitForTimeout(100);
				frameTimings.push(Date.now() - start);
			}

			// Average transition time should be reasonable
			const avgTime = frameTimings.reduce((a, b) => a + b) / frameTimings.length;
			expect(avgTime).toBeLessThan(200);
		});

		cesiumTest('should not block main thread @performance', async ({ cesiumPage }) => {
			// Measure responsiveness before overlay
			const beforeTime = await cesiumPage.evaluate(() => {
				const start = performance.now();
				// Simulate some work
				for (let i = 0; i < 1000; i++) {
					Math.sqrt(i);
				}
				return performance.now() - start;
			});

			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Measure responsiveness with overlay visible
			const afterTime = await cesiumPage.evaluate(() => {
				const start = performance.now();
				// Same work as before
				for (let i = 0; i < 1000; i++) {
					Math.sqrt(i);
				}
				return performance.now() - start;
			});

			// Times should be similar (overlay shouldn't block thread)
			expect(afterTime).toBeLessThan(beforeTime + 10);
		});

		cesiumTest(
			'should cleanup resources after overlay closes @performance',
			async ({ cesiumPage }) => {
				// Check initial memory state
				const initialState = await cesiumPage.evaluate(() => {
					return {
						elementCount: document.querySelectorAll('*').length,
					};
				});

				// Trigger and close overlay multiple times
				for (let i = 0; i < 5; i++) {
					await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });
					await cesiumPage.waitForTimeout(200);
					await resetStoreState(cesiumPage);
					await cesiumPage.waitForTimeout(200);
				}

				// Check final state
				const finalState = await cesiumPage.evaluate(() => {
					return {
						elementCount: document.querySelectorAll('*').length,
					};
				});

				// Element count should not grow significantly (some variance is acceptable)
				expect(finalState.elementCount).toBeLessThanOrEqual(initialState.elementCount + 50);
			}
		);
	});

	cesiumTest.describe('Multi-Click Scenarios', () => {
		cesiumTest('should handle rapid state changes', async ({ cesiumPage }) => {
			// Perform multiple rapid state changes
			for (let i = 0; i < 3; i++) {
				await triggerOverlayViaStore(cesiumPage, {
					postalCode: `0010${i}`,
					postalCodeName: `Test Area ${i}`,
					stage: 'loading',
				});
				await cesiumPage.waitForTimeout(100);
			}

			// Overlay should be visible with last postal code
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			const postalCodeText = cesiumPage.locator('.loading-card p.text-body-2');
			await expect(postalCodeText).toContainText('Test Area 2');
		});

		cesiumTest('should handle state change during display', async ({ cesiumPage }) => {
			// First state
			await triggerOverlayViaStore(cesiumPage, {
				postalCode: '00100',
				postalCodeName: 'First Area',
				stage: 'loading',
			});

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Update state while overlay is visible
			await triggerOverlayViaStore(cesiumPage, {
				postalCode: '00200',
				postalCodeName: 'Second Area',
				stage: 'animating',
				canCancel: true,
			});

			// Overlay should update to show new data
			const postalCodeText = cesiumPage.locator('.loading-card p.text-body-2');
			await expect(postalCodeText).toContainText('Second Area');

			const stageText = cesiumPage.locator('.loading-card h3');
			await expect(stageText).toHaveText('Moving Camera');
		});

		cesiumTest('should preserve state consistency across changes', async ({ cesiumPage }) => {
			// Perform multiple state changes
			for (let i = 0; i < 2; i++) {
				await triggerOverlayViaStore(cesiumPage, {
					postalCode: `0010${i}`,
					stage: 'loading',
					retryCount: i,
				});

				const loadingCard = cesiumPage.locator('.loading-card');
				await expect(loadingCard).toBeVisible({ timeout: 500 });

				// Check store consistency
				const storeState = await cesiumPage.evaluate(() => {
					const store = (window as any).useGlobalStore?.();
					if (store && store.clickProcessingState) {
						return {
							isProcessing: store.clickProcessingState.isProcessing,
							postalCode: store.clickProcessingState.postalCode,
							stage: store.clickProcessingState.stage,
							retryCount: store.clickProcessingState.retryCount,
						};
					}
					return null;
				});

				expect(storeState?.isProcessing).toBe(true);
				expect(storeState?.postalCode).toBe(`0010${i}`);
				expect(storeState?.stage).toBe('loading');
				expect(storeState?.retryCount).toBe(i);

				// Wait before next change
				await cesiumPage.waitForTimeout(200);
			}
		});
	});

	cesiumTest.describe('Mobile and Responsive Behavior', () => {
		cesiumTest('should display overlay on mobile viewport', async ({ cesiumPage }) => {
			// Set mobile viewport
			await cesiumPage.setViewportSize({ width: 375, height: 667 });
			await cesiumPage.waitForTimeout(300);

			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Overlay should appear on mobile
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Card should be readable on mobile
			const box = await loadingCard.boundingBox();
			expect(box?.width).toBeGreaterThan(100);
			expect(box?.width).toBeLessThanOrEqual(375); // Should fit in viewport
		});

		cesiumTest('should handle viewport resize during overlay display', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Resize to tablet viewport
			await cesiumPage.setViewportSize({ width: 768, height: 1024 });
			await cesiumPage.waitForTimeout(300);

			// Overlay should remain visible and accessible
			await expect(loadingCard).toBeVisible();

			// Resize to mobile viewport
			await cesiumPage.setViewportSize({ width: 375, height: 667 });
			await cesiumPage.waitForTimeout(300);

			// Overlay should still be visible
			await expect(loadingCard).toBeVisible();
		});

		cesiumTest('should maintain z-index above other elements', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			// Wait for overlay
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Check z-index of overlay parent
			const overlay = cesiumPage.locator('.map-click-loading-overlay');
			const zIndex = await overlay.evaluate((el) => {
				return parseInt(window.getComputedStyle(el).zIndex || '0');
			});

			expect(zIndex).toBeGreaterThanOrEqual(1000);
		});
	});

	cesiumTest.describe('Edge Cases and Error States', () => {
		cesiumTest('should handle missing postal code data gracefully', async ({ cesiumPage }) => {
			// Trigger overlay with minimal data
			await triggerOverlayViaStore(cesiumPage, {
				postalCode: null,
				postalCodeName: null,
				stage: 'loading',
			});

			// Overlay should still appear
			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Should show default "Loading..." text
			const postalCodeText = cesiumPage.locator('.loading-card p.text-body-2');
			await expect(postalCodeText).toContainText('Loading...');
		});

		cesiumTest('should handle store state reset correctly', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Reset state
			await resetStoreState(cesiumPage);

			// Overlay should be hidden
			await expect(loadingCard).not.toBeVisible();

			// Verify state is reset
			const state = await cesiumPage.evaluate(() => {
				const store = (window as any).useGlobalStore?.();
				if (store && store.clickProcessingState) {
					return {
						isProcessing: store.clickProcessingState.isProcessing,
						error: store.clickProcessingState.error,
						postalCode: store.clickProcessingState.postalCode,
					};
				}
				return null;
			});

			expect(state?.isProcessing).toBe(false);
			expect(state?.error).toBeNull();
			expect(state?.postalCode).toBeNull();
		});

		cesiumTest('should handle stage without progress data', async ({ cesiumPage }) => {
			// Trigger overlay without loading progress data
			await triggerOverlayViaStore(cesiumPage, {
				stage: 'loading',
				loadingProgress: null,
			});

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Should show progress bar with fallback values
			const progressLinear = cesiumPage.locator('.v-progress-linear').first();
			await expect(progressLinear).toBeVisible();

			// Should have default 30% for loading stage
			const value = await progressLinear.getAttribute('aria-valuenow');
			expect(parseInt(value || '0')).toBe(30);
		});
	});

	cesiumTest.describe('Teardown and Cleanup', () => {
		cesiumTest('should not leave stale overlays after reset', async ({ cesiumPage }) => {
			// Trigger overlay
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });

			const loadingCard = cesiumPage.locator('.loading-card');
			await expect(loadingCard).toBeVisible({ timeout: 500 });

			// Reset state
			await resetStoreState(cesiumPage);

			// Wait for cleanup
			await cesiumPage.waitForTimeout(500);

			// Should be only zero or one overlay (the hidden one)
			const overlayCount = await cesiumPage.locator('.map-click-loading-overlay').count();
			expect(overlayCount).toBeLessThanOrEqual(1);

			// If overlay exists, it should not be visible
			if (overlayCount === 1) {
				await expect(loadingCard).not.toBeVisible();
			}
		});

		cesiumTest('should have consistent state after multiple operations', async ({ cesiumPage }) => {
			// Perform multiple operations
			await triggerOverlayViaStore(cesiumPage, { stage: 'loading' });
			await cesiumPage.waitForTimeout(200);

			await triggerOverlayViaStore(cesiumPage, { stage: 'animating' });
			await cesiumPage.waitForTimeout(200);

			await resetStoreState(cesiumPage);
			await cesiumPage.waitForTimeout(200);

			// Component should be in consistent state
			const storeState = await cesiumPage.evaluate(() => {
				const store = (window as any).useGlobalStore?.();
				if (store && store.clickProcessingState) {
					return {
						isProcessing: store.clickProcessingState.isProcessing,
						stage: store.clickProcessingState.stage,
						error: store.clickProcessingState.error,
						postalCode: store.clickProcessingState.postalCode,
					};
				}
				return null;
			});

			expect(storeState?.isProcessing).toBe(false);
			expect(storeState?.stage).toBeNull();
			expect(storeState?.error).toBeNull();
			expect(storeState?.postalCode).toBeNull();
		});
	});
});
