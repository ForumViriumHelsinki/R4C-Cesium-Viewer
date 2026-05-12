/**
 * Regression contract for the 6 user journeys derived from AUDIT-2026-W19.
 *
 * Each journey block mirrors one file under `docs/blueprint/user-journeys/`.
 * The flowcharts in those markdowns are the source of truth for the
 * `expect(...)` calls below — every diamond in a journey flowchart should be
 * one assertion here.
 *
 * Soft vs. hard assertions:
 *   - `expect.soft(...)` is used for contracts tied to an open issue
 *     (#679, #681, #711, #712, #713, #714, #715). The soft form surfaces
 *     every broken contract in a single run instead of bailing on the first.
 *     When an issue closes, the matching soft assertion graduates to a hard
 *     `expect` so the next regression is loud.
 *   - Plain `expect(...)` is used for structural pre/postconditions that
 *     must hold for the journey to make sense (e.g. Cesium ready, store
 *     state transitioned to the expected level).
 *
 * See `tests/e2e/audit-2026-W19/postal-code-breadcrumb.spec.ts` for the
 * already-merged journey-2 breadcrumb assertions — those are not duplicated
 * here.
 */

import type { ConsoleMessage, Response } from '@playwright/test'
import { expect } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import AccessibilityTestHelpers from '../helpers/test-helpers'

interface StoreSnapshot {
	level: string | null
	postalcode: string | null
	view: string | null
	pendingNavigation: unknown
	isProcessing: boolean
}

async function readStoreState(page: import('@playwright/test').Page): Promise<StoreSnapshot> {
	return page.evaluate(() => {
		const store = (window as any).globalStore
		if (!store) {
			return {
				level: null,
				postalcode: null,
				view: null,
				pendingNavigation: null,
				isProcessing: false,
			}
		}
		return {
			level: store.level ?? null,
			postalcode: store.postalcode ?? null,
			view: store.view ?? null,
			pendingNavigation: store.clickProcessingState?.pendingNavigation ?? null,
			isProcessing: Boolean(store.clickProcessingState?.isProcessing),
		}
	})
}

cesiumDescribe('Audit 2026-W19: user journeys', () => {
	// ------------------------------------------------------------------
	// Journey 1 — Onboarding & first load
	// Stories: US-01, US-02, US-09, US-17
	// ------------------------------------------------------------------
	cesiumTest(
		'journey-1: onboarding & first load (both personas)',
		{ tag: ['@e2e', '@audit-2026-w19', '@journey-1'] },
		async ({ cesiumPage }) => {
			const consoleWarnings: string[] = []
			const flagHealthResponses: Response[] = []
			const sentryEnvelopeResponses: Response[] = []

			cesiumPage.on('console', (msg: ConsoleMessage) => {
				if (msg.type() === 'warning' || msg.type() === 'error') {
					consoleWarnings.push(msg.text())
				}
			})
			cesiumPage.on('response', (res: Response) => {
				const url = res.url()
				if (/\/feature-flags\/health/i.test(url)) flagHealthResponses.push(res)
				if (/ingest\.(us\.)?sentry\.io\/.+\/envelope/i.test(url)) sentryEnvelopeResponses.push(res)
			})

			// Structural: the fixture has navigated to / and asserted Cesium readiness.
			// Re-assert here so a future fixture regression is loud.
			const viewerReady = await cesiumPage.evaluate(() => Boolean((window as any).viewer))
			expect(viewerReady, 'Cesium viewer must be initialised').toBe(true)

			// US-01: the disclaimer modal should not remain in the DOM after onboarding.
			// (The cesium-fixture removes it; this guards against fixture regression.)
			const disclaimerCount = await cesiumPage
				.locator('[role="dialog"]')
				.filter({ hasText: /Demo only|disclaimer|R4C Climate Demo/i })
				.count()
			expect(disclaimerCount, 'US-01 — disclaimer must be dismissed before analysis').toBe(0)

			// Let the network settle so any "stuck loading" warnings can fire.
			// networkidle is more semantic than a fixed sleep and tolerates
			// slow CI runners without inflating the happy-path duration.
			await cesiumPage.waitForLoadState('networkidle')

			// US-09 #680 — no recurring stale-loading warnings. Soft because the
			// audit listed this as a known-noisy signal.
			const staleLoadingWarnings = consoleWarnings.filter((m) => /stale loading state/i.test(m))
			expect
				.soft(
					staleLoadingWarnings.length,
					'US-09 #680 — no stale-loading warnings should accumulate during onboarding'
				)
				.toBeLessThanOrEqual(5)

			// US-02 #715 — GOFF /feature-flags/health should be reachable. If no
			// request was observed, mark as unverified (skip the assertion) rather
			// than asserting false negatives. Soft when a request IS observed and
			// is 5xx.
			const flagHealthFailures = flagHealthResponses.filter((r) => r.status() >= 500)
			if (flagHealthResponses.length > 0) {
				expect
					.soft(flagHealthFailures.length, 'US-02 #715 — GOFF /feature-flags/health must not 5xx')
					.toBe(0)
			}

			// US-17 — Sentry envelope POSTs should succeed when present. The beta
			// environment posts envelopes; CI / local without DSN does not. Skip
			// when no envelope traffic was observed.
			const sentryFailures = sentryEnvelopeResponses.filter((r) => r.status() >= 400)
			if (sentryEnvelopeResponses.length > 0) {
				expect.soft(sentryFailures.length, 'US-17 — Sentry envelope POSTs must not 4xx/5xx').toBe(0)
			}
		}
	)

	// ------------------------------------------------------------------
	// Journey 2 — Region → postal code drill-down with analysis
	// Stories: US-03 (existing spec), US-04, US-05, US-06, US-07, US-09, US-19
	// ------------------------------------------------------------------
	cesiumTest(
		'journey-2: Emma drills to postal code 00100 and opens analysis tools',
		{ tag: ['@e2e', '@audit-2026-w19', '@journey-2'] },
		async ({ cesiumPage }) => {
			const helpers = new AccessibilityTestHelpers(cesiumPage)

			const submittedAt = Date.now()
			await helpers.drillToLevel('postalCode', '00100')
			const settledAt = Date.now()

			// Structural — we must be at postal-code level for the rest of the
			// assertions to make sense.
			const state = await readStoreState(cesiumPage)
			expect(state.level, 'must reach postal-code level').toBe('postalCode')

			// US-19 — drill-down latency is recorded for monitoring (issue #687
			// open, 5s target not yet met).
			const latencyMs = settledAt - submittedAt
			console.log(`[journey-2] drill-down latency: ${latencyMs}ms (US-19 #687 budget=5000ms)`)

			// Structural — TimelineCompact must be present in DOM (CSS hides it
			// below 1280px so we check attachment, not visibility).
			await expect(
				cesiumPage.locator('.timeline-compact'),
				'TimelineCompact must be attached at postal-code level'
			).toBeAttached()

			// US-07 #713 — Area Properties heading + content live on the Details
			// tab. Soft-assert visibility (heading must be present) and then
			// soft-assert the panel body isn't "0 properties" — the empty-panel
			// regression that #713 tracks.
			await cesiumPage.getByRole('tab', { name: 'Details' }).click()
			const areaPropertiesHeading = cesiumPage.getByText('Area Properties', { exact: false })
			await expect
				.soft(
					areaPropertiesHeading,
					'US-07 #713 — Area Properties heading must be visible at postal-code level'
				)
				.toBeVisible()
			const detailsTabBody = await cesiumPage.locator('.tab-content').first().textContent()
			expect
				.soft(
					detailsTabBody ?? '',
					'US-07 #713 — Area Properties content must not be empty at postal-code level'
				)
				.not.toMatch(/\b0\s+properties\b/i)

			// Heat Distribution / NDVI Vegetation / Building Analysis buttons
			// live on the Analysis tab. Switch tabs before asserting so the
			// soft contracts fail for the *right* reason (#712 data/flag gates,
			// not "wrong tab active").
			await cesiumPage.getByRole('tab', { name: 'Analysis' }).click()

			// US-04 #712 — Heat Distribution button must be reachable.
			await expect
				.soft(
					cesiumPage.getByRole('button', { name: 'Heat Distribution' }),
					'US-04 #712 — Heat Distribution button must be reachable from ControlPanel'
				)
				.toBeVisible()

			// US-05 #712 — NDVI Vegetation button must be reachable.
			await expect
				.soft(
					cesiumPage.getByRole('button', { name: 'NDVI Vegetation' }),
					'US-05 #712 — NDVI Vegetation button must be reachable at postal-code level'
				)
				.toBeVisible()

			// US-06 #712 — Building Analysis (scatter plot) button must be reachable.
			await expect
				.soft(
					cesiumPage.getByRole('button', { name: 'Building Analysis' }),
					'US-06 #712 — Building Analysis (scatter) button must be reachable at postal-code level'
				)
				.toBeVisible()
		}
	)

	// ------------------------------------------------------------------
	// Journey 3 — Back navigation to region
	// Stories: US-08
	// ------------------------------------------------------------------
	cesiumTest(
		'journey-3: Mika navigates back from postal code to region',
		{ tag: ['@e2e', '@audit-2026-w19', '@journey-3'] },
		async ({ cesiumPage }) => {
			const helpers = new AccessibilityTestHelpers(cesiumPage)

			await helpers.drillToLevel('postalCode', '00100')
			const drillState = await readStoreState(cesiumPage)
			expect(drillState.level, 'must reach postal-code level before back-nav').toBe('postalCode')

			// Drive the back-navigation through the store rather than the UI so
			// the test does not depend on which back-button variant is rendered
			// at the current viewport. The store action is what every back-button
			// ultimately calls.
			await cesiumPage.evaluate(() => {
				const store = (window as any).globalStore
				store.setLevel('start')
				store.setPostalCode(null)
				store.setNameOfZone(null)
				store.setPickedEntity(null)
			})

			// Wait for reactive UI to catch up.
			await cesiumPage.waitForFunction(
				() => (window as any).globalStore?.level === 'start',
				undefined,
				{ timeout: 5000 }
			)

			const afterBack = await readStoreState(cesiumPage)
			expect(afterBack.level, 'must return to start level').toBe('start')
			expect(afterBack.postalcode, 'postal code must clear on back-nav').toBeNull()

			// US-08 #714 — URL params must clear too. Soft until fixed.
			const url = new URL(cesiumPage.url())
			expect
				.soft(url.searchParams.has('level'), 'US-08 #714 — ?level= param must clear after back-nav')
				.toBe(false)
			expect
				.soft(
					url.searchParams.has('postalcode'),
					'US-08 #714 — ?postalcode= param must clear after back-nav'
				)
				.toBe(false)

			// Deep-link consistency: reload should land at start level. Soft
			// because URL stickiness (#714) drives the same regression today.
			await cesiumPage.reload()
			await cesiumPage.waitForFunction(() => Boolean((window as any).globalStore), undefined, {
				timeout: 10000,
			})
			const afterReload = await readStoreState(cesiumPage)
			expect
				.soft(afterReload.level, 'US-08 #714 — reload after back-nav must preserve start level')
				.toBe('start')
		}
	)

	// ------------------------------------------------------------------
	// Journey 4 — View switch (Capital Region ↔ Statistical Grid)
	// Stories: US-12, US-13, US-14, US-15, US-20
	// ------------------------------------------------------------------
	cesiumTest(
		'journey-4: Mika toggles between Capital Region and Statistical Grid',
		{ tag: ['@e2e', '@audit-2026-w19', '@journey-4'] },
		async ({ cesiumPage }) => {
			const helpers = new AccessibilityTestHelpers(cesiumPage)
			await helpers.ensureControlPanelOpen()

			// US-13 — toggle presence at start level (Capital Region view).
			await expect(
				cesiumPage.getByText('NDVI', { exact: true }),
				'US-13 — NDVI toggle must be visible in Capital Region'
			).toBeVisible()
			await expect(
				cesiumPage.getByText(/Land Cover/i).first(),
				'US-13 — Land Cover toggle must be reachable'
			).toBeVisible()

			// US-14 — building filters.
			await expect(
				cesiumPage.getByText(/Public Buildings/i).first(),
				'US-14 — Public Buildings filter must be visible'
			).toBeVisible()
			await expect(
				cesiumPage.getByText(/Tall Buildings/i).first(),
				'US-14 — Tall Buildings filter must be visible'
			).toBeVisible()

			// US-12 — Background Maps group structure.
			await expect(
				cesiumPage.getByText('Background Maps'),
				'US-12 — Background Maps panel must be visible'
			).toBeVisible()

			// US-20 — switch to Statistical Grid via the helper (covers all
			// known selector variants).
			await helpers.navigateToView('gridView')

			const gridState = await readStoreState(cesiumPage)
			expect(gridState.view, 'US-20 — view must reflect grid after switch').toMatch(/grid/i)

			// Climate Adaptation + Grid Options live in the Analysis tab inside
			// ControlPanel (template v-if="currentView === 'grid'"). The default
			// active tab is "Layers", so activate Analysis before asserting.
			await cesiumPage.getByRole('tab', { name: 'Analysis' }).click()

			// US-15 — Climate Adaptation panel only appears in grid view.
			await expect(
				cesiumPage.getByText('Climate Adaptation'),
				'US-15 — Climate Adaptation must be visible in grid view'
			).toBeVisible()
			await expect(
				cesiumPage.getByText('Grid Options'),
				'US-15 — Grid Options must be visible in grid view'
			).toBeVisible()

			// Switch back — Climate Adaptation must hide again (view-scoped).
			// The view-mode buttons live in ViewModeCompact on the Layers tab,
			// so return there before driving navigateToView.
			await cesiumPage.getByRole('tab', { name: 'Layers' }).click()
			await helpers.navigateToView('capitalRegionView')
			await expect(
				cesiumPage.getByText('Climate Adaptation'),
				'US-15 — Climate Adaptation must hide outside grid view'
			).not.toBeVisible()
		}
	)

	// ------------------------------------------------------------------
	// Journey 5 — Building deep-dive (heat data + properties + tree stability)
	// Stories: US-11, US-18
	// ------------------------------------------------------------------
	cesiumTest(
		'journey-5: Emma drills into a building and toggles trees',
		{ tag: ['@e2e', '@audit-2026-w19', '@journey-5'] },
		async ({ cesiumPage }) => {
			const helpers = new AccessibilityTestHelpers(cesiumPage)

			// Pickable buildings are not reliable in the mock-Cesium CI path, so
			// drive the building-level transition through the store. This still
			// exercises every downstream subscriber of `level === 'building'`.
			// The second argument is the *postal code that owns the building*
			// (see AccessibilityTestHelpers.setNavigationLevel); the building
			// itself gets a synthetic id ('test-building-001') via the helper's
			// default entity payload.
			await helpers.drillToLevel('postalCode', '00100', { method: 'store' })
			await helpers.drillToLevel('building', '00100', { method: 'store' })

			const buildingState = await readStoreState(cesiumPage)
			expect(buildingState.level, 'must reach building level').toBe('building')

			// Building-level analysis lives on the Analysis tab, building
			// properties on the Details tab. The default active tab is "Layers".
			await cesiumPage.getByRole('tab', { name: 'Analysis' }).click()

			// US-18 — Building Heat Data button visible (exact casing matters).
			await expect(
				cesiumPage.getByRole('button', { name: 'Building Heat Data' }),
				'US-18 — Building Heat Data must be reachable'
			).toBeVisible({ timeout: 10000 })

			// US-18 — Building Properties section heading lives on the Details
			// tab (not a button — it's the heading above the AreaProperties
			// component when currentLevel === 'building').
			await cesiumPage.getByRole('tab', { name: 'Details' }).click()
			await expect(
				cesiumPage.getByText('Building Properties'),
				'US-18 — Building Properties must be reachable'
			).toBeVisible({ timeout: 10000 })

			// US-11 #679 — toggle Trees 5x and watch for DataCloneError.
			const dataCloneErrors: string[] = []
			cesiumPage.on('pageerror', (err) => {
				if (/DataCloneError/i.test(err.message)) dataCloneErrors.push(err.message)
			})
			cesiumPage.on('console', (msg) => {
				if (msg.type() === 'error' && /DataCloneError/i.test(msg.text())) {
					dataCloneErrors.push(msg.text())
				}
			})

			// US-11 #679 — the Trees toggle is rendered by PostalCodeView. Soft-
			// assert its presence so a missing toggle surfaces as part of the
			// regression contract instead of silently skipping the click loop.
			const treesToggle = cesiumPage.locator('#showTreesToggle')
			await expect
				.soft(
					treesToggle,
					'US-11 #679 — Trees toggle must be present for the DataCloneError contract'
				)
				.toBeAttached()
			if ((await treesToggle.count()) > 0) {
				for (let i = 0; i < 5; i++) {
					await treesToggle.click({ force: true })
					await cesiumPage.waitForTimeout(150)
				}
			}

			expect
				.soft(dataCloneErrors, 'US-11 #679 — toggling Trees must not raise DataCloneError')
				.toEqual([])
		}
	)

	// ------------------------------------------------------------------
	// Journey 6 — Race condition (rapid postal-code clicks, latest wins)
	// Stories: US-10
	// ------------------------------------------------------------------
	cesiumTest(
		'journey-6: Mika triggers rapid postal-code switches (latest wins)',
		{ tag: ['@e2e', '@audit-2026-w19', '@journey-6'] },
		async ({ cesiumPage }) => {
			const pageErrors: string[] = []
			cesiumPage.on('pageerror', (err) => pageErrors.push(err.message))
			cesiumPage.on('console', (msg) => {
				if (msg.type() === 'error') pageErrors.push(msg.text())
			})

			// Fire two postal-code transitions in the same tick — the second
			// must win regardless of in-flight loaders. This mirrors the
			// recipe documented in `docs/blueprint/user-journeys/06-race-condition.md`.
			await cesiumPage.evaluate(() => {
				const store = (window as any).globalStore
				store.setLevel('postalCode')
				store.setPostalCode('00100')
				// Race: same tick, second update should win
				store.setLevel('postalCode')
				store.setPostalCode('00120')
			})

			// Wait until level transitioned AND click-processing settled — the
			// isProcessing flag flips false only after pending navigation has
			// drained, so we don't need an additional fixed sleep on top.
			await cesiumPage.waitForFunction(
				() => {
					const s = (window as any).globalStore
					return s?.level === 'postalCode' && !s.clickProcessingState?.isProcessing
				},
				undefined,
				{ timeout: 10000 }
			)

			const finalState = await readStoreState(cesiumPage)

			// US-10 #681 — postalCode must reflect the latest click. Soft
			// because the audit lists this as an open race-condition gap.
			expect
				.soft(
					finalState.postalcode,
					'US-10 #681 — latest postal-code click must win after rapid switches'
				)
				.toBe('00120')

			// No console errors / pageerrors that mention undefined deref during
			// the transition (a common symptom of dropped pending navigation).
			const dropSymptoms = pageErrors.filter((m) =>
				/cannot read|cannot access|undefined is not/i.test(m)
			)
			expect
				.soft(
					dropSymptoms,
					'US-10 #681 — no undefined-deref errors during rapid postal-code switches'
				)
				.toEqual([])
		}
	)
})
