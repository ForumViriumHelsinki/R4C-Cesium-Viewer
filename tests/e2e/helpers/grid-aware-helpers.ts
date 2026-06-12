/**
 * Quiescence-aware accessibility test helpers (#897).
 *
 * Entering grid view mounts SosEco250mGrid, which loads an 8.9 MB GeoJSON
 * file and creates ~6,700 Cesium entities. On CI runners (2 vCPU, software
 * WebGL) that load saturates the browser main thread for tens of seconds,
 * starving every subsequent Playwright page operation (locator resolution,
 * actionability checks, boundingBox) and pushing the next navigateToView
 * call through its whole retry ladder into failure. That is the root cause
 * of the chronic "locator.click: Timeout 2000ms exceeded" failures on
 * `.view-toggle-group button[value=...]` in the CI a11y jobs.
 *
 * GridAwareTestHelpers.navigateToView waits for the destination view to
 * finish its data load before returning, so the caller's next interaction
 * runs against a responsive page.
 *
 * Kept as a subclass (instead of editing AccessibilityTestHelpers) so specs
 * can opt in individually; folding this into the base helper for all specs
 * is tracked as a follow-up of #897.
 */
import type { PlaywrightPage } from '../../types/playwright'
import AccessibilityTestHelpers, { TEST_TIMEOUTS } from './test-helpers'

export { TEST_TIMEOUTS } from './test-helpers'

type ViewModeId = 'capitalRegionView' | 'gridView'

/**
 * Wait for the app to settle after a view-mode switch.
 *
 * Strategy:
 *   1. Grid view only: wait until the 250m_grid datasource exists and has
 *      entities (observable via the VITE_E2E_TEST window.__viewer hook).
 *   2. Wait for one trivially-true page evaluation, which can only resolve
 *      once the main thread is free again.
 *
 * Both waits are non-fatal on timeout so they can never fail an otherwise
 * passing interaction - the next interaction provides the real signal.
 */
export async function waitForViewSwitchQuiescence(
	page: PlaywrightPage,
	viewMode: ViewModeId
): Promise<void> {
	const timeout = process.env.CI ? 45000 : 10000

	if (viewMode === 'gridView') {
		try {
			await page.waitForFunction(
				() => {
					// biome-ignore lint/suspicious/noExplicitAny: E2E-only window hook
					const viewer = (window as any).__viewer
					// Without the E2E viewer hook the load is not observable;
					// fall through to the responsiveness probe below.
					if (!viewer?.dataSources?._dataSources) return true
					const sources = viewer.dataSources._dataSources as Array<{
						name?: string
						entities?: { values?: unknown[] }
					}>
					const grid = sources.find((ds) => ds.name?.startsWith('250m_grid'))
					return !!grid && (grid.entities?.values?.length ?? 0) > 0
				},
				undefined,
				{ timeout }
			)
		} catch {
			console.warn(
				'[waitForViewSwitchQuiescence] grid datasource did not finish loading in time; continuing'
			)
		}
	}

	try {
		// Resolves on the first evaluation tick once the main thread is free.
		await page.waitForFunction(() => true, undefined, { timeout })
	} catch {
		console.warn('[waitForViewSwitchQuiescence] main thread still busy; continuing')
	}

	await page.waitForTimeout(TEST_TIMEOUTS.WAIT_STABILITY)
}

/**
 * Drop-in replacement for AccessibilityTestHelpers that waits for
 * view-switch quiescence after every navigateToView call.
 */
export class GridAwareTestHelpers extends AccessibilityTestHelpers {
	private readonly quiescencePage: PlaywrightPage

	constructor(page: PlaywrightPage) {
		super(page)
		this.quiescencePage = page
	}

	override async navigateToView(viewMode: ViewModeId): Promise<void> {
		await super.navigateToView(viewMode)
		await waitForViewSwitchQuiescence(this.quiescencePage, viewMode)
	}
}

export default GridAwareTestHelpers
