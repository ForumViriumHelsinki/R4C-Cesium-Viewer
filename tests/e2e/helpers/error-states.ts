import type { Locator, Page } from '@playwright/test'

/**
 * Error surfaces the app can render, named by component rather than by colour.
 *
 * Do not probe for errors by class substring (`class*=` on "error"): Vuetify turns
 * `color="error"` into a `bg-error` / `text-error` utility class on whatever
 * component takes it, and the compass North button is coloured `error`
 * whenever the heading is north (CameraControls.vue getButtonColor). The
 * substring probe therefore counts a working button as an error state (#947).
 * tests/unit/testContracts/ enforces both halves: no substring colour probes in
 * tests/, and this selector matching the real error components but not the
 * compass button.
 */
export const ERROR_STATE_SELECTOR = [
	// v-alert type="error": flat variant renders bg-error, tonal renders text-error
	'.v-alert.bg-error',
	'.v-alert.text-error',
	// v-snackbar color="error" (CesiumViewer.vue init and runtime error snackbars)
	'.v-snackbar__wrapper.bg-error',
	// v-text-field / v-select with a failed validation rule
	'.v-input--error',
	// Cesium's own rendering-error panel
	'.cesium-widget-errorPanel',
	// App-specific error blocks, each rendered only in an error branch (v-if)
	'.error-state', // BackgroundMapBrowser.vue: HSY layer list failed to load
	'.error-text', // ViewportLoadingIndicator.vue: viewport load failed
	'.error-section', // LoadingIndicator.vue: per-layer load errors
	'.error-msg', // DataSourceStatusBadge.vue: a data source reports status 'error'
].join(', ')

/**
 * Error surfaces currently visible on the page. Hidden ones are excluded, so a
 * snackbar that has already auto-dismissed does not count.
 */
export function visibleErrorStates(page: Page): Locator {
	return page.locator(ERROR_STATE_SELECTOR).filter({ visible: true })
}
