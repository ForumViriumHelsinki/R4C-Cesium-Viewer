/**
 * Comprehensive Walkthrough Accessibility Tests
 *
 * End-to-end user journey validation covering complete workflows:
 * - New user journey (start → capital region → postal code → building)
 * - Grid analysis workflow (start → statistical grid → cooling centers)
 * - Multi-view exploration (switching between all views and levels)
 * - Feature combination testing (layers + filters + navigation)
 * - Complete accessibility audit
 */

import { expect } from '@playwright/test';
import { cesiumTest, cesiumDescribe } from '../../fixtures/cesium-fixture';
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from '../helpers/test-helpers';

cesiumDescribe('Comprehensive Walkthrough Accessibility', () => {
	cesiumTest.use({ tag: ['@accessibility', '@e2e', '@comprehensive'] });
	let helpers: AccessibilityTestHelpers;

	cesiumTest.beforeEach(async ({ cesiumPage }) => {
		helpers = new AccessibilityTestHelpers(cesiumPage);
		// Cesium is already initialized by the fixture
	});

	cesiumTest.describe('Complete User Journeys', () => {
		cesiumTest(
			'should support new user journey: start → postal code → building',
			async ({ cesiumPage }) => {
				// 1. Start Level - verify initial state
				await helpers.verifyPanelVisibility({
					currentView: 'capitalRegion',
					currentLevel: 'start',
				});

				// 2. Navigate to postal code level
				await helpers.drillToLevel('postalCode');
				// Wait for postal code UI elements
				await cesiumPage
					.waitForSelector('text="Building Scatter Plot"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {});

				// Verify postal code features
				await helpers.verifyPanelVisibility({
					currentView: 'capitalRegion',
					currentLevel: 'postalCode',
					hasData: true,
				});

				// Verify timeline appears
				await helpers.verifyTimelineVisibility('postalCode');

				// 3. Navigate to building level
				await helpers.drillToLevel('building');
				// Wait for building level elements
				await cesiumPage
					.waitForSelector('.mdi-arrow-left', { timeout: TEST_TIMEOUTS.CESIUM_READY })
					.catch(() => {});

				// Verify building features
				await helpers.verifyPanelVisibility({
					currentView: 'capitalRegion',
					currentLevel: 'building',
				});

				// Verify back navigation works
				const backButton = cesiumPage
					.getByRole('button')
					.filter({ has: cesiumPage.locator('.mdi-arrow-left') });
				await expect(backButton).toBeVisible();

				// Test back navigation
				await backButton.click();
				// Wait for navigation back to postal code level
				await expect(backButton).toBeHidden();

				// Should be back at postal code level
				await helpers.verifyTimelineVisibility('postalCode');
				await expect(backButton).not.toBeVisible();
			}
		);

		cesiumTest('should support grid analysis workflow', async ({ cesiumPage }) => {
			// 1. Switch to Statistical Grid view
			await helpers.navigateToView('gridView');

			// Verify grid-specific features
			await helpers.verifyPanelVisibility({
				currentView: 'grid',
				currentLevel: 'start',
			});

			await expect(cesiumPage.getByText('Statistical grid options')).toBeVisible();

			// 2. Navigate through levels in grid view
			await helpers.drillToLevel('postalCode');
			// Wait for postal code level in grid view
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {});

			// Timeline should work in grid view
			await helpers.verifyTimelineVisibility('postalCode');

			// 3. Test grid-specific features
			const coolingCenters = cesiumPage.getByText('Manage Cooling Centers');
			if (await coolingCenters.isVisible()) {
				await expect(coolingCenters).toBeVisible();
			}

			// 4. Navigate to building level in grid view
			await helpers.drillToLevel('building');
			// Wait for building level in grid view
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {});

			// Should show grid-specific building data
			await expect(cesiumPage.getByText('Building heat data')).toBeVisible();
		});

		cesiumTest('should support multi-view exploration workflow', async ({ cesiumPage }) => {
			const views = ['capitalRegionView', 'gridView'] as const;

			for (const view of views) {
				// Switch to view
				await helpers.navigateToView(view);
				// Wait for view switch to complete
				await expect(cesiumPage.locator(`input[value="${view}"]`)).toBeChecked();

				// Test navigation through all levels
				for (const level of ['postalCode', 'building'] as const) {
					await helpers.drillToLevel(level);
					// Wait for level-specific UI
					if (level === 'postalCode') {
						await cesiumPage
							.waitForSelector('text="Building Scatter Plot"', {
								timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
							})
							.catch(() => {});
					} else {
						await cesiumPage
							.waitForSelector('text="Building heat data"', {
								timeout: TEST_TIMEOUTS.CESIUM_READY,
							})
							.catch(() => {});
					}

					// Verify appropriate features for view+level combination
					await helpers.verifyPanelVisibility({
						currentView: view === 'capitalRegionView' ? 'capitalRegion' : 'grid',
						currentLevel: level,
						hasData: true,
					});

					if (level === 'postalCode' || level === 'building') {
						await helpers.verifyTimelineVisibility(level);
					}
				}

				// Reset for next view
				const resetButton = cesiumPage
					.getByRole('button')
					.filter({ has: cesiumPage.locator('.mdi-refresh') });
				await resetButton.click();
				// Wait for reset to complete
				await cesiumPage
					.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
					.catch(() => {});
			}
		});
	});

	cesiumTest.describe('Feature Combination Testing', () => {
		cesiumTest(
			'should handle layers + filters + navigation simultaneously',
			async ({ cesiumPage }) => {
				// 1. Navigate to postal code level
				await helpers.drillToLevel('postalCode');
				// Wait for postal code UI
				await cesiumPage
					.waitForSelector('text="Building Scatter Plot"', {
						timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
					})
					.catch(() => {});

				// 2. Enable multiple layers
				const ndviToggle = cesiumPage
					.getByText('NDVI')
					.locator('..')
					.locator('input[type="checkbox"]');
				const landCoverToggle = cesiumPage
					.getByText('Land Cover')
					.locator('..')
					.locator('input[type="checkbox"]');
				const treesToggle = cesiumPage
					.getByText('Trees')
					.locator('..')
					.locator('input[type="checkbox"]');

				await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' });
				await helpers.checkWithRetry(landCoverToggle, {
					elementName: 'Land Cover',
				});
				if (await treesToggle.isVisible()) {
					await helpers.checkWithRetry(treesToggle, { elementName: 'Trees' });
				}

				// 3. Enable multiple filters
				const publicBuildingsToggle = cesiumPage
					.getByText('Public Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]');
				const tallBuildingsToggle = cesiumPage
					.getByText('Tall Buildings', { exact: true })
					.locator('..')
					.locator('input[type="checkbox"]');

				await helpers.checkWithRetry(publicBuildingsToggle, {
					elementName: 'Public Buildings',
				});
				await helpers.checkWithRetry(tallBuildingsToggle, {
					elementName: 'Tall Buildings',
				});

				// 4. Use timeline
				const slider = cesiumPage.locator('.timeline-slider input');
				await slider.fill('2');

				// 5. Navigate to building level with all features enabled
				await helpers.drillToLevel('building');
				// Wait for building level
				await cesiumPage
					.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
					.catch(() => {});

				// 6. Verify all features are maintained
				await expect(ndviToggle).toBeChecked();
				await expect(landCoverToggle).toBeChecked();
				await expect(publicBuildingsToggle).toBeChecked();
				await expect(tallBuildingsToggle).toBeChecked();

				const currentSliderValue = await slider.inputValue();
				expect(currentSliderValue).toBe('2');
			}
		);

		cesiumTest('should handle view switching with complex state', async ({ cesiumPage }) => {
			// 1. Set up complex state in Capital Region view
			await helpers.drillToLevel('postalCode');
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {});

			const ndviToggle = cesiumPage
				.getByText('NDVI')
				.locator('..')
				.locator('input[type="checkbox"]');
			const tallBuildingsToggle = cesiumPage
				.getByText('Tall Buildings', { exact: true })
				.locator('..')
				.locator('input[type="checkbox"]');

			await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' });
			await helpers.checkWithRetry(tallBuildingsToggle, {
				elementName: 'Tall Buildings',
			});

			// 2. Switch to Grid view
			await helpers.navigateToView('gridView');
			// Wait for view switch
			await expect(cesiumPage.locator('input[value="gridView"]')).toBeChecked();

			// 3. Verify state transition
			await expect(ndviToggle).toBeChecked();
			await expect(tallBuildingsToggle).toBeChecked();

			// 4. Switch back to Capital Region
			await helpers.navigateToView('capitalRegionView');
			// Wait for view switch back
			await expect(cesiumPage.locator('input[value="capitalRegionView"]')).toBeChecked();

			// 5. Verify state is maintained
			await expect(ndviToggle).toBeChecked();
			await expect(tallBuildingsToggle).toBeChecked();
		});
	});

	cesiumTest.describe('Accessibility Audit', () => {
		cesiumTest(
			'should pass comprehensive accessibility checks across all states',
			async ({ cesiumPage }) => {
				const states = [
					{ view: 'capitalRegionView', level: 'start' },
					{ view: 'capitalRegionView', level: 'postalCode' },
					{ view: 'capitalRegionView', level: 'building' },
					{ view: 'gridView', level: 'start' },
					{ view: 'gridView', level: 'postalCode' },
					{ view: 'gridView', level: 'building' },
				];

				for (const state of states) {
					// Reset to clean state
					const resetButton = cesiumPage
						.getByRole('button')
						.filter({ has: cesiumPage.locator('.mdi-refresh') });
					await resetButton.click();
					// Wait for reset
					await cesiumPage
						.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
						.catch(() => {});

					// Navigate to target state
					await helpers.navigateToView(state.view as 'capitalRegionView' | 'gridView');

					if (state.level !== 'start') {
						await helpers.drillToLevel(state.level as 'postalCode' | 'building');
						// Wait for level-specific UI
						if (state.level === 'postalCode') {
							await cesiumPage
								.waitForSelector('text="Building Scatter Plot"', {
									timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
								})
								.catch(() => {});
						} else {
							await cesiumPage
								.waitForSelector('text="Building heat data"', {
									timeout: TEST_TIMEOUTS.CESIUM_READY,
								})
								.catch(() => {});
						}
					}

					// Capture accessibility state
					const accessibilityTree = await helpers.captureAccessibilityTree();

					// Verify essential elements are accessible
					expect(accessibilityTree.visibleElements.length).toBeGreaterThan(10);
					expect(
						accessibilityTree.interactiveElements.some((e) => e.includes('buttons'))
					).toBeTruthy();

					// Verify no error states
					const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]');
					const errorCount = await errorElements.count();
					expect(errorCount).toBe(0);
				}
			}
		);

		cesiumTest(
			'should maintain keyboard navigation throughout complete workflows',
			async ({ cesiumPage }) => {
				// Test keyboard navigation in different contexts
				const contexts = [
					{ description: 'start level', action: () => Promise.resolve() },
					{
						description: 'postal code level',
						action: () => helpers.drillToLevel('postalCode'),
					},
					{
						description: 'building level',
						action: () => helpers.drillToLevel('building'),
					},
				];

				for (const context of contexts) {
					// Reset and navigate to context
					const resetButton = cesiumPage
						.getByRole('button')
						.filter({ has: cesiumPage.locator('.mdi-refresh') });
					await resetButton.click();
					// Wait for reset
					await cesiumPage
						.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
						.catch(() => {});

					await context.action();
					// Wait for context action to complete
					await cesiumPage.waitForFunction(() => document.readyState === 'complete', {
						timeout: TEST_TIMEOUTS.ELEMENT_STANDARD,
					});

					// Test keyboard navigation
					let focusableElements = 0;

					for (let i = 0; i < 20; i++) {
						await cesiumPage.keyboard.press('Tab');
						// Brief wait for focus to move
						await cesiumPage
							.waitForFunction(() => document.readyState === 'complete', {
								timeout: TEST_TIMEOUTS.ELEMENT_VISIBLE,
							})
							.catch(() => {});

						const focused = cesiumPage.locator(':focus');
						if (await focused.isVisible()) {
							focusableElements++;
						}
					}

					// Should have found focusable elements
					expect(focusableElements).toBeGreaterThan(3);
				}
			}
		);

		cesiumTest('should be responsive across all viewport sizes', async ({ cesiumPage }) => {
			const viewports = [
				{ width: 1920, height: 1080, name: 'desktop' },
				{ width: 1024, height: 768, name: 'tablet-landscape' },
				{ width: 768, height: 1024, name: 'tablet-portrait' },
				{ width: 375, height: 667, name: 'mobile' },
				{ width: 320, height: 568, name: 'small-mobile' },
			];

			for (const viewport of viewports) {
				await cesiumPage.setViewportSize(viewport);
				// Wait for viewport change to take effect
				await cesiumPage.waitForFunction(
					(expectedWidth) => {
						return window.innerWidth === expectedWidth;
					},
					viewport.width,
					{ timeout: TEST_TIMEOUTS.ELEMENT_SCROLL }
				);

				// Test essential elements are accessible
				await expect(cesiumPage.locator('#cesiumContainer')).toBeVisible();
				await expect(cesiumPage.locator('#viewModeContainer')).toBeVisible();
				await expect(cesiumPage.getByText('Layers')).toBeVisible();
				await expect(cesiumPage.getByText('Filters')).toBeVisible();

				// Test navigation works
				await helpers.navigateToView('gridView');
				await expect(cesiumPage.locator('input[value="gridView"]')).toBeChecked();

				await helpers.navigateToView('capitalRegionView');
				await expect(cesiumPage.locator('input[value="capitalRegionView"]')).toBeChecked();
			}
		});
	});

	cesiumTest.describe('Performance and Reliability', () => {
		cesiumTest('should handle complete workflows under load', async ({ cesiumPage }) => {
			// Simulate slower network
			cesiumPage.route('**/*', (route) => {
				setTimeout(() => route.continue(), 200);
			});

			// Complete workflow with delays
			await helpers.navigateToView('gridView');
			// Wait for grid view
			await expect(cesiumPage.locator('input[value="gridView"]')).toBeChecked();

			await helpers.drillToLevel('postalCode');
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {});

			// Enable features during slow loading
			const ndviToggle = cesiumPage
				.getByText('NDVI')
				.locator('..')
				.locator('input[type="checkbox"]');
			await helpers.checkWithRetry(ndviToggle, { elementName: 'NDVI' });

			await helpers.drillToLevel('building');
			// Wait for building level under load
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY_CI })
				.catch(() => {});

			// Should reach stable state
			await expect(ndviToggle).toBeChecked();
			await expect(cesiumPage.getByText('Building heat data')).toBeVisible();
		});

		cesiumTest('should recover gracefully from errors', async ({ cesiumPage }) => {
			// Simulate some network failures
			let failCount = 0;
			cesiumPage.route('**/*.json', (route) => {
				if (failCount < 2) {
					failCount++;
					route.abort('failed');
				} else {
					route.continue();
				}
			});

			// Attempt navigation despite failures
			await helpers.drillToLevel('postalCode');
			// Wait longer for recovery
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT })
				.catch(() => {});

			// Should not show error states
			const errorElements = cesiumPage.locator('[class*="error"], [class*="Error"]');
			const errorCount = await errorElements.count();
			expect(errorCount).toBe(0);

			// Basic functionality should remain
			const resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') });
			await expect(resetButton).toBeVisible();

			await resetButton.click();
			// Wait for reset to complete
			await cesiumPage
				.waitForLoadState('networkidle', { timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
				.catch(() => {});

			// Should return to stable state
			await helpers.testNavigationControls('start');
		});
	});

	cesiumTest.describe('Feature Coverage Validation', () => {
		cesiumTest('should verify all identified features are accessible', async ({ cesiumPage }) => {
			const _featureCheckList = [
				// View modes
				'Capital Region Heat',
				'Statistical Grid',

				// Navigation controls
				'.mdi-refresh',
				'.mdi-compass',

				// Layer controls
				'NDVI',
				'Land Cover',

				// Filter controls
				'Public Buildings',
				'Tall Buildings',

				// Expansion panels
				'HSY Background maps',
				'Syke Flood Background Maps',
				'Geocoding',

				// Level-specific features (test at appropriate levels)
				'Building Scatter Plot', // postal code level
				'Building heat data', // building level
			];

			// Test features at start level
			await expect(cesiumPage.getByText('Capital Region Heat')).toBeVisible();
			await expect(cesiumPage.getByText('Statistical Grid')).toBeVisible();
			await expect(cesiumPage.getByText('NDVI')).toBeVisible();
			await expect(cesiumPage.getByText('Land Cover')).toBeVisible();
			await expect(cesiumPage.getByText('Public Buildings', { exact: true })).toBeVisible();
			await expect(cesiumPage.getByText('Tall Buildings', { exact: true })).toBeVisible();
			await expect(cesiumPage.getByText('HSY Background maps')).toBeVisible();
			await expect(cesiumPage.getByText('Syke Flood Background Maps')).toBeVisible();
			await expect(cesiumPage.getByText('Geocoding')).toBeVisible();

			// Test features at postal code level
			await helpers.drillToLevel('postalCode');
			// Wait for postal code level
			await cesiumPage
				.waitForSelector('text="Building Scatter Plot"', {
					timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT,
				})
				.catch(() => {});
			await expect(cesiumPage.getByText('Building Scatter Plot')).toBeVisible();

			// Test features at building level
			await helpers.drillToLevel('building');
			// Wait for building level
			await cesiumPage
				.waitForSelector('text="Building heat data"', { timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {});
			await expect(cesiumPage.getByText('Building heat data')).toBeVisible();

			// All essential controls should remain functional
			const resetButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-refresh') });
			const backButton = cesiumPage
				.getByRole('button')
				.filter({ has: cesiumPage.locator('.mdi-arrow-left') });

			await expect(resetButton).toBeVisible();
			await expect(backButton).toBeVisible();
		});
	});
});
