/**
 * The sidebar when Cesium viewer initialisation fails (#951 follow-up on PR #1010, #1153).
 *
 * ControlPanel keeps its tab content inert until globalStore.cesiumViewer is set. If
 * useViewerInitialization fails, the viewer is never set: either the Cesium chunk does
 * not load (the composable catches it) or `new Cesium.Viewer` throws (no WebGL; the
 * composable rethrows). On both paths the composable's top snackbar owns the failure
 * and offers Retry (#1153). The sidebar must then say that the map failed, as a passive
 * hint with no competing recovery button, not show "Loading map…" forever. Its controls
 * stay inert, because none of them can work without a viewer.
 *
 * These tests run the real composable against a mounted ControlPanel. Only the Cesium
 * module (through spies on the real provider) and the service-module loader are
 * replaced.
 */

import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { h } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import { useViewerInitialization } from '@/composables/useViewerInitialization.js'
import { VIEWER_INIT_MESSAGES } from '@/constants/errorMessages.js'
import ControlPanel from '@/pages/ControlPanel.vue'
import { cesiumProvider } from '@/services/cesiumProvider.js'
import { useGlobalStore } from '@/stores/globalStore.js'

// tests/setup.js mocks the provider as already initialised; these tests need the real one.
vi.mock('@/services/cesiumProvider', async () => vi.importActual('@/services/cesiumProvider.js'))

// The composable's five service modules (datasource, wms, featurepicker, camera,
// graphics) all resolve to one stub; only viewer construction is under test.
// destroyViewer() calls graphics.destroy(), which stops the graphicsStore watchers.
vi.mock('@/utils/moduleLoader.js', () => ({
	loadWithRetry: async () =>
		class StubService {
			init() {}
			destroy() {}
			createHelsinkiImageryLayer() {
				return {}
			}
		},
}))

// jsdom has no `inert` IDL property; model the browser's boolean attribute so that
// `[inert]` means what it means in a browser (same shim as ControlPanel.preinit.test.js).
if (!('inert' in HTMLElement.prototype)) {
	Object.defineProperty(HTMLElement.prototype, 'inert', {
		configurable: true,
		get() {
			return this.hasAttribute('inert')
		},
		set(value) {
			this.toggleAttribute('inert', Boolean(value))
		},
	})
}

/** A Cesium module whose Viewer is built by `makeViewer`. */
const fakeCesium = (makeViewer) => ({
	Ion: {},
	EllipsoidTerrainProvider: function EllipsoidTerrainProvider() {},
	OpenStreetMapImageryProvider: function OpenStreetMapImageryProvider() {},
	Viewer: function Viewer() {
		return makeViewer()
	},
})

/** What CesiumWidget throws when WebGL cannot be initialised. */
const constructionError = () => {
	throw new Error('Error constructing CesiumWidget.')
}

const fakeViewer = () => ({
	imageryLayers: { add: vi.fn() },
	scene: { requestRender: vi.fn() },
	isDestroyed: () => false,
	destroy: vi.fn(),
})

/** Makes the real provider hand out `cesium` as if its chunk had loaded. */
const provideCesium = (cesium) => {
	vi.spyOn(cesiumProvider, 'initialize').mockResolvedValue(/** @type {any} */ (cesium))
	vi.spyOn(cesiumProvider, 'get').mockReturnValue(/** @type {any} */ (cesium))
}

const settle = async () => {
	await flushPromises()
	await new Promise((resolve) => setTimeout(resolve, 0))
	await flushPromises()
}

/** The failure hint, or null. */
const failureHint = () => document.body.querySelector('.viewer-init-error')

describe('ControlPanel when Cesium viewer initialisation fails', { tags: ['@unit'] }, () => {
	/** @type {import('@vue/test-utils').VueWrapper | null} */
	let wrapper = null
	/** @type {ReturnType<typeof useViewerInitialization> | null} */
	let viewerInit = null

	const mountPanel = () => {
		const vuetify = createVuetify({ components, directives })
		wrapper = mount(
			{ render: () => h(components.VApp, null, { default: () => h(ControlPanel) }) },
			{ attachTo: document.body, global: { plugins: [vuetify] } }
		)
	}

	/**
	 * Asserts the snackbar owns the failure with Retry, and the sidebar shows a passive
	 * hint (no button, not a second alert) instead of the loading hint, and stays inert.
	 */
	const expectFailureNotice = (expectedMessage) => {
		expect(viewerInit?.errorSnackbar.value).toBe(true)
		expect(viewerInit?.errorMessage.value).toBe(expectedMessage)
		expect(useGlobalStore().cesiumViewer).toBeNull()
		expect(document.body.querySelector('.viewer-loading-hint')).toBeNull()
		expect(failureHint()?.textContent).toContain(VIEWER_INIT_MESSAGES.sidebarHint)
		expect(failureHint()?.getAttribute('role')).toBe('status')
		expect(failureHint()?.querySelector('button')).toBeNull()
		expect(document.body.querySelector('.sidebar-content')?.hasAttribute('inert')).toBe(true)
	}

	beforeEach(() => {
		setActivePinia(createPinia())
		// Every request the panel makes on mount stays pending; none of them is under test.
		globalThis.fetch = vi.fn(() => new Promise(() => {}))
		// jsdom lacks visualViewport, which Vuetify's overlay positioning reads.
		vi.stubGlobal(
			'visualViewport',
			Object.assign(new EventTarget(), { width: 1280, height: 800, scale: 1 })
		)
		vi.spyOn(console, 'error').mockImplementation(() => {})
		mountPanel()
		viewerInit = useViewerInitialization()
	})

	afterEach(() => {
		viewerInit?.destroyViewer()
		viewerInit = null
		wrapper?.unmount()
		wrapper = null
		vi.restoreAllMocks()
		vi.unstubAllGlobals()
		document.body.innerHTML = ''
	})

	it('the snackbar owns a Cesium chunk load failure; the sidebar hint is passive', async () => {
		vi.spyOn(cesiumProvider, 'initialize').mockRejectedValue(
			new Error('Failed to fetch dynamically imported module: /assets/cesiumSymbols.js')
		)
		await settle()
		// Precondition: the gate starts closed behind the loading hint.
		expect(document.body.querySelector('.viewer-loading-hint')?.textContent).toMatch(/loading map/i)

		await viewerInit?.initViewer()
		await settle()

		expectFailureNotice(VIEWER_INIT_MESSAGES.network)
	})

	it('the snackbar also owns a viewer construction failure (no WebGL)', async () => {
		provideCesium(fakeCesium(constructionError))

		await expect(viewerInit?.initViewer()).rejects.toThrow(/constructing CesiumWidget/)
		await settle()

		expectFailureNotice(VIEWER_INIT_MESSAGES.construction)
	})

	it('a retry that fails again keeps the snackbar up and settles the loading state', async () => {
		provideCesium(fakeCesium(constructionError))
		await expect(viewerInit?.initViewer()).rejects.toThrow()
		await settle()

		await expect(viewerInit?.retryInit()).resolves.toBeUndefined()
		await settle()

		expectFailureNotice(VIEWER_INIT_MESSAGES.construction)
		expect(useGlobalStore().isLoading).toBe(false)
	})

	it('opens the gate when a retry builds the viewer', async () => {
		let attempts = 0
		provideCesium(
			fakeCesium(() => {
				attempts++
				return attempts === 1 ? constructionError() : fakeViewer()
			})
		)
		await expect(viewerInit?.initViewer()).rejects.toThrow()
		await settle()
		expectFailureNotice(VIEWER_INIT_MESSAGES.construction)

		await viewerInit?.retryInit()
		await settle()

		expect(useGlobalStore().cesiumViewer).not.toBeNull()
		expect(useGlobalStore().viewerInitFailed).toBe(false)
		expect(viewerInit?.errorSnackbar.value).toBe(false)
		expect(failureHint()).toBeNull()
		expect(document.body.querySelector('.sidebar-content')?.hasAttribute('inert')).toBe(false)
	})
})
