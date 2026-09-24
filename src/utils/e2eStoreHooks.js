/**
 * Pinia store hooks for the E2E test harness.
 *
 * Playwright helpers (`tests/e2e/helpers/test-helpers.ts`, the audit specs,
 * `map-click-feedback.spec.ts`) read the live stores from `window` to navigate
 * deterministically and to assert on state. The CI browser jobs serve a
 * production-mode bundle built with `VITE_E2E_TEST=true` (Build Frontend in
 * `.github/workflows/test.yml`), so a gate on `MODE` alone left those reads
 * `undefined` there (#1017). The gate below matches the viewer hooks in
 * `useViewerInitialization.js` and `PERF_STATS_ENABLED` in `perfStats.js`.
 *
 * @module utils/e2eStoreHooks
 */
import { useBuildingStore } from '../stores/buildingStore.js'
import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'

/**
 * `window` augmented with the store instances and factory functions that the
 * E2E test harness reads. Typed here so the assignments type-check without an
 * ambient `.d.ts`.
 *
 * @typedef {Window & {
 *   globalStore: ReturnType<typeof useGlobalStore>,
 *   useGlobalStore: () => ReturnType<typeof useGlobalStore>,
 *   buildingStore: ReturnType<typeof useBuildingStore>,
 *   useBuildingStore: () => ReturnType<typeof useBuildingStore>,
 *   toggleStore: ReturnType<typeof useToggleStore>,
 *   useToggleStore: () => ReturnType<typeof useToggleStore>,
 *   featureFlagStore: ReturnType<typeof useFeatureFlagStore>,
 *   useFeatureFlagStore: () => ReturnType<typeof useFeatureFlagStore>,
 * }} TestWindow
 */

/**
 * Whether this build exposes the stores on `window`: dev server, Vitest, and
 * any build with `VITE_E2E_TEST=true` regardless of `MODE`. Evaluated once at
 * module load; Vite replaces `import.meta.env` statically, so in a normal
 * production build (no `VITE_E2E_TEST`) this is `false` and the exposure
 * below is dead code.
 *
 * @type {boolean}
 */
export const E2E_STORE_HOOKS_ENABLED =
	import.meta.env.MODE === 'development' ||
	import.meta.env.MODE === 'test' ||
	import.meta.env.VITE_E2E_TEST === 'true'

/**
 * Attach the store instances and their `use*Store` getters to `window` when
 * {@link E2E_STORE_HOOKS_ENABLED} is set. Call after `app.use(pinia)` and
 * before `app.mount()` so the stores exist when components initialize.
 *
 * @returns {boolean} whether the stores were exposed
 */
export function exposeStoresForE2E() {
	if (!E2E_STORE_HOOKS_ENABLED) return false

	// Cast to the test-surface shape rather than declaring an ambient .d.ts,
	// since these properties are not on the standard Window type.
	const testWindow = /** @type {TestWindow} */ (/** @type {unknown} */ (window))

	const globalStore = useGlobalStore()
	testWindow.globalStore = globalStore
	testWindow.useGlobalStore = () => globalStore

	const buildingStore = useBuildingStore()
	testWindow.buildingStore = buildingStore
	testWindow.useBuildingStore = () => buildingStore

	const toggleStore = useToggleStore()
	testWindow.toggleStore = toggleStore
	testWindow.useToggleStore = () => toggleStore

	const featureFlagStore = useFeatureFlagStore()
	testWindow.featureFlagStore = featureFlagStore
	testWindow.useFeatureFlagStore = () => featureFlagStore

	return true
}
