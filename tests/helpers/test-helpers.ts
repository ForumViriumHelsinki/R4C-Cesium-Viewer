import type { Page } from '@playwright/test'

// Re-export TEST_TIMEOUTS from the e2e helpers for backward compatibility
export { TEST_TIMEOUTS } from '../e2e/helpers/test-helpers'

import { TEST_TIMEOUTS } from '../e2e/helpers/test-helpers'

/**
 * Shared test helper functions for E2E tests
 * These helpers replace brittle patterns with robust, state-based waits
 */

/**
 * Wait for Cesium to be fully initialized and ready for interaction
 * Checks for canvas visibility, Cesium viewer, and globe tiles loaded
 */
export async function waitForCesiumReady(page: Page): Promise<void> {
	// Wait for canvas to be visible first
	await page.waitForSelector('canvas', { state: 'visible', timeout: TEST_TIMEOUTS.CESIUM_READY })

	// Wait for Cesium viewer to be initialized
	await page.waitForFunction(
		() => {
			const viewer = (window as any).cesiumViewer || (window as any).__viewer
			return viewer?.scene?.globe
		},
		{ timeout: TEST_TIMEOUTS.CESIUM_READY }
	)

	// Wait for initial tile loading to complete by checking the loading indicator
	// The loading indicator appears as "Loading X layers..." at the bottom of the screen
	await page
		.waitForFunction(
			() => {
				const loadingText = document.body.innerText
				return !loadingText.includes('Loading') || !loadingText.includes('layers')
			},
			{ timeout: TEST_TIMEOUTS.CESIUM_READY_CI }
		)
		.catch(() => {
			// If timeout, continue anyway as the viewer might be functional
		})

	// Give a small delay for final render
	await page.waitForTimeout(TEST_TIMEOUTS.WAIT_MEDIUM)
}

/**
 * Wait for postal code selection to complete
 * Checks store state for selectedPostalCode
 */
export async function waitForPostalCodeSelection(page: Page): Promise<void> {
	await page.waitForFunction(
		() => {
			const store = (window as any).useGlobalStore?.()
			return store?.selectedPostalCode !== null
		},
		{ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT }
	)
}

/**
 * Wait for building selection to complete
 * Checks store state for selectedBuilding
 */
export async function waitForBuildingSelection(page: Page): Promise<void> {
	await page.waitForFunction(
		() => {
			const store = (window as any).useGlobalStore?.()
			return store?.selectedBuilding !== null
		},
		{ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT }
	)
}

/**
 * Dismiss modal if present (non-blocking, no race condition)
 * Uses single operation with error handling instead of check-then-click pattern
 * Note: Uses text-based locator to match visible button text regardless of aria-label
 */
export async function dismissModalIfPresent(
	page: Page,
	buttonText: string = 'Close'
): Promise<void> {
	try {
		// Use locator with hasText for visible text matching (ignores aria-label)
		const button = page.locator('button', { hasText: buttonText })
		// Wait for button to be visible first with a longer timeout
		await button.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
		await button.click({ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
		// Wait for the dialog content to fully disappear after clicking
		// The v-overlay-container may still have the dialog during CSS transition
		await page
			.waitForFunction(
				() => {
					const container = document.querySelector('.v-overlay-container')
					if (!container) return true
					// Check if any v-dialog is still active/visible
					const dialogs = container.querySelectorAll('.v-dialog')
					return (
						dialogs.length === 0 ||
						Array.from(dialogs).every((d) => {
							const style = window.getComputedStyle(d)
							return (
								style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0'
							)
						})
					)
				},
				{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
			)
			.catch(() => {})
		// Small additional wait for Vuetify transition cleanup
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF)
	} catch {
		// Modal not present, that's fine
	}
}

/**
 * Dismiss modal with verification (for critical paths)
 * Ensures modal is actually dismissed before proceeding
 */
export async function dismissModal(page: Page, buttonName: string = 'Close'): Promise<void> {
	const closeButton = page.getByRole('button', { name: buttonName })
	await closeButton.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
	await closeButton.click()
	await closeButton.waitFor({ state: 'hidden', timeout: TEST_TIMEOUTS.ELEMENT_SCROLL })
}

/**
 * Click on map canvas at specific position
 * Waits for canvas to be ready before clicking
 */
export async function clickOnMap(page: Page, x: number, y: number): Promise<void> {
	const canvas = page.locator('canvas')
	await canvas.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })
	await canvas.click({ position: { x, y } })
}

/**
 * Wait for layer to finish loading
 * Uses network activity and visual indicators
 */
export async function waitForLayerLoad(page: Page): Promise<void> {
	// Wait for any loading indicators to disappear
	const loadingIndicators = page.locator('.v-progress-circular, .loading, .spinner')
	const count = await loadingIndicators.count()

	if (count > 0) {
		// Wait for all loading indicators to be hidden
		for (let i = 0; i < count; i++) {
			await loadingIndicators
				.nth(i)
				.waitFor({ state: 'hidden', timeout: TEST_TIMEOUTS.CESIUM_READY })
				.catch(() => {}) // May already be hidden
		}
	}

	// Small delay to ensure visual updates complete
	await page.waitForTimeout(TEST_TIMEOUTS.WAIT_TOOLTIP)
}

/**
 * Wait for map view transition to complete
 * Checks for camera movement to stop and tiles to load
 */
export async function waitForMapViewTransition(page: Page): Promise<void> {
	await page
		.waitForFunction(
			() => {
				const viewer = (window as any).cesiumViewer || (window as any).__viewer
				if (!viewer) return false

				// Check if camera is not moving and tiles are loaded
				const cameraMoving = viewer.camera?.isMoving || false
				const tilesLoaded = viewer.scene?.globe?.tilesLoaded || false

				return !cameraMoving && tilesLoaded
			},
			{ timeout: TEST_TIMEOUTS.ELEMENT_DATA_DEPENDENT }
		)
		.catch(() => {
			// Timeout is acceptable, continue anyway
		})
}

/**
 * Reset store state for test isolation
 * Call in afterEach to ensure clean state between tests
 */
export async function resetStoreState(page: Page): Promise<void> {
	await page.evaluate(() => {
		const globalStore = (window as any).useGlobalStore?.()
		const buildingStore = (window as any).useBuildingStore?.()
		const toggleStore = (window as any).useToggleStore?.()

		globalStore?.$reset?.()
		buildingStore?.$reset?.()
		toggleStore?.$reset?.()
	})
}

/**
 * Check if element exists in DOM (without throwing)
 * Returns true if element exists, false otherwise
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
	const count = await page.locator(selector).count()
	return count > 0
}

/**
 * Wait for Vue reactivity to settle
 * Useful after store mutations or computed property updates
 */
export async function waitForVueReactivity(page: Page, delayMs: number = 100): Promise<void> {
	await page.waitForTimeout(delayMs)
	await page.evaluate(() => {
		return new Promise<void>((resolve) => {
			// Wait for Vue's next tick
			if ((window as any).Vue) {
				;(window as any).Vue.nextTick(() => resolve())
			} else {
				resolve()
			}
		})
	})
}

/**
 * Toggle layer with wait for completion
 * Handles checkbox toggle and waits for layer to load
 */
export async function toggleLayer(
	page: Page,
	labelPattern: string | RegExp,
	checked: boolean
): Promise<void> {
	const toggle = page.getByLabel(labelPattern)
	await toggle.waitFor({ state: 'visible', timeout: TEST_TIMEOUTS.ELEMENT_STANDARD })

	const currentState = await toggle.isChecked()
	if (currentState !== checked) {
		await toggle.click()
		await waitForLayerLoad(page)
	}
}

/**
 * Dismiss any open Vuetify overlays (menus, dialogs, etc.)
 * Presses Escape key to close overlays and waits for them to be removed
 */
export async function dismissVuetifyOverlays(page: Page): Promise<void> {
	// Check if any overlay scrim is visible
	const hasOverlay = await page.evaluate(() => {
		const scrim = document.querySelector('.v-overlay__scrim')
		if (!scrim) return false
		const style = window.getComputedStyle(scrim)
		return style.display !== 'none' && style.visibility !== 'hidden'
	})

	if (hasOverlay) {
		// Press Escape to close any open overlays
		await page.keyboard.press('Escape')
		// Wait for overlay to be removed
		await page
			.waitForFunction(
				() => {
					const scrims = document.querySelectorAll('.v-overlay__scrim')
					return Array.from(scrims).every((scrim) => {
						const style = window.getComputedStyle(scrim)
						return (
							style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0'
						)
					})
				},
				{ timeout: TEST_TIMEOUTS.ELEMENT_STANDARD }
			)
			.catch(() => {})
		await page.waitForTimeout(TEST_TIMEOUTS.WAIT_BRIEF)
	}
}

/**
 * Verify no console errors of specific types
 * Useful for error-free test assertions
 */
export async function getConsoleErrors(
	page: Page,
	errorTypes: string[] = ['TypeError', 'ReferenceError']
): Promise<string[]> {
	const errors: string[] = []

	page.on('console', (msg) => {
		if (msg.type() === 'error') {
			const text = msg.text()
			if (errorTypes.some((type) => text.includes(type))) {
				errors.push(text)
			}
		}
	})

	return errors
}
