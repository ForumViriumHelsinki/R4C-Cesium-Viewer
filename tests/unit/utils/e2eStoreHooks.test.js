/**
 * E2E store hooks gate (#1017).
 *
 * CI's Build Frontend job runs `vite build` (MODE=production) with
 * VITE_E2E_TEST=true. The store exposure used to be gated on MODE alone, so
 * the bundle the E2E, accessibility and performance jobs serve had no
 * `window.globalStore`, and store-based navigation in the Playwright helpers
 * threw. These tests pin both directions: exposed in an E2E build regardless
 * of MODE, absent from a normal production build.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

const WINDOW_KEYS = [
	'globalStore',
	'useGlobalStore',
	'buildingStore',
	'useBuildingStore',
	'toggleStore',
	'useToggleStore',
	'featureFlagStore',
	'useFeatureFlagStore',
]

/** @type {Record<string, unknown>} */
const testWindow = /** @type {any} */ (window)

function clearWindowHooks() {
	for (const key of WINDOW_KEYS) delete testWindow[key]
}

/**
 * Re-import the hooks module under the given env. E2E_STORE_HOOKS_ENABLED is
 * evaluated at module load, as it is in a build, so the module registry is
 * reset first.
 * @param {Record<string, string | boolean>} env
 */
async function loadHooks(env) {
	vi.resetModules()
	for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value)
	const { createPinia, setActivePinia } = await import('pinia')
	setActivePinia(createPinia())
	const hooks = await import('../../../src/utils/e2eStoreHooks.js')
	const { useGlobalStore } = await import('../../../src/stores/globalStore.js')
	return { hooks, useGlobalStore }
}

const PRODUCTION = { MODE: 'production', DEV: false, PROD: true }

describe('e2eStoreHooks', () => {
	afterEach(() => {
		vi.unstubAllEnvs()
		vi.resetModules()
		clearWindowHooks()
	})

	it('exposes the stores in a production-mode build with VITE_E2E_TEST=true (the CI bundle)', async () => {
		clearWindowHooks()
		const { hooks, useGlobalStore } = await loadHooks({ ...PRODUCTION, VITE_E2E_TEST: 'true' })
		// Guard against a vacuous pass: the stub must actually put us in production mode.
		expect(import.meta.env.MODE).toBe('production')

		expect(hooks.E2E_STORE_HOOKS_ENABLED).toBe(true)
		expect(hooks.exposeStoresForE2E()).toBe(true)

		for (const key of WINDOW_KEYS) expect(testWindow[key], key).toBeDefined()
		// The live store instance, not a copy: helpers mutate it to navigate.
		expect(testWindow.globalStore).toBe(useGlobalStore())
		expect(/** @type {() => unknown} */ (testWindow.useGlobalStore)()).toBe(testWindow.globalStore)
		expect(/** @type {() => unknown} */ (testWindow.useToggleStore)()).toBe(testWindow.toggleStore)
	})

	it('does not expose the stores in a normal production build (VITE_E2E_TEST unset)', async () => {
		clearWindowHooks()
		const { hooks } = await loadHooks({ ...PRODUCTION, VITE_E2E_TEST: '' })
		expect(import.meta.env.MODE).toBe('production')

		expect(hooks.E2E_STORE_HOOKS_ENABLED).toBe(false)
		expect(hooks.exposeStoresForE2E()).toBe(false)

		for (const key of WINDOW_KEYS) expect(testWindow[key], key).toBeUndefined()
	})

	it('treats VITE_E2E_TEST values other than "true" as off in production mode', async () => {
		clearWindowHooks()
		const { hooks } = await loadHooks({ ...PRODUCTION, VITE_E2E_TEST: 'false' })

		expect(hooks.E2E_STORE_HOOKS_ENABLED).toBe(false)
		expect(hooks.exposeStoresForE2E()).toBe(false)
		expect(testWindow.globalStore).toBeUndefined()
	})

	it('keeps exposing the stores on the dev server without VITE_E2E_TEST', async () => {
		clearWindowHooks()
		const { hooks } = await loadHooks({
			MODE: 'development',
			DEV: true,
			PROD: false,
			VITE_E2E_TEST: '',
		})

		expect(hooks.E2E_STORE_HOOKS_ENABLED).toBe(true)
		expect(hooks.exposeStoresForE2E()).toBe(true)
		expect(testWindow.globalStore).toBeDefined()
	})
})
