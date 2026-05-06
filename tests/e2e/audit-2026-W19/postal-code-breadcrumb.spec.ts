/**
 * Regression: US-03 — postal-code breadcrumb must not render "undefined" prefix.
 *
 * From docs/blueprint/audits/2026-W19-user-stories.md (US-03):
 *   Both the toolbar header and the sidebar header at postal-code level render the
 *   literal string "undefined Helsinki Keskusta - Etu-Töölö" — a string-interpolation
 *   bug where a leading prefix variable (likely `city`) is unset and falls through
 *   to the default `String(undefined)`.
 *
 * Acceptance criterion: AC1 — Breadcrumb at postal-code level concatenates city +
 * neighborhood with no spurious tokens.
 *
 * This spec drives navigation through the search input (deterministic, doesn't
 * depend on Cesium picking) and asserts the header text never contains "undefined".
 */

import { expect } from '@playwright/test'
import { cesiumDescribe, cesiumTest } from '../../fixtures/cesium-fixture'
import AccessibilityTestHelpers from '../helpers/test-helpers'

cesiumDescribe('Audit 2026-W19: postal-code breadcrumb', () => {
	cesiumTest.use({ tag: ['@e2e', '@navigation', '@audit-2026-w19'] })

	cesiumTest(
		'postal-code header should not contain "undefined" prefix (US-03)',
		async ({ cesiumPage }) => {
			const helpers = new AccessibilityTestHelpers(cesiumPage)

			// Navigate to postal code 00100 via search — this hits the same code path
			// as a Cesium polygon click but is deterministic in tests.
			await helpers.drillToLevel('postalCode', '00100')

			// Wait for the breadcrumb to populate. The bug shows up in both the
			// toolbar (banner) and the sidebar header. Look at the banner first —
			// it's the most visible to users.
			const banner = cesiumPage.locator('header, .v-toolbar, [role="banner"]').first()

			// Hard assertion: the literal string "undefined " (with trailing space) must
			// not appear. Using a regex ensures we catch both leading-undefined and
			// mid-string-undefined patterns.
			await expect(banner).not.toContainText(/\bundefined\b/i)

			// Soft assertion: the breadcrumb should actually contain the postal-code area name.
			await expect(banner).toContainText(/Helsinki Keskusta|Etu-Töölö|00100/i)
		}
	)

	cesiumTest(
		'sidebar header at postal-code level should not contain "undefined" prefix (US-03)',
		async ({ cesiumPage }) => {
			const helpers = new AccessibilityTestHelpers(cesiumPage)

			await helpers.drillToLevel('postalCode', '00100')

			// The sidebar header sits inside the navigation drawer; it duplicated the
			// "undefined" string in the audit walkthrough.
			const sidebar = cesiumPage.locator('nav, [role="navigation"]').first()

			await expect(sidebar).not.toContainText(/\bundefined\b/i)
			await expect(sidebar).toContainText(/Helsinki Keskusta|Etu-Töölö|00100/i)
		}
	)
})
