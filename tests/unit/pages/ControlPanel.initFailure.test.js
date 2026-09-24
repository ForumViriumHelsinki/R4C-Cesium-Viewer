/**
 * The sidebar when Cesium viewer initialisation fails (#951 follow-up on PR #1010).
 *
 * ControlPanel keeps its tab content inert until globalStore.cesiumViewer is set. If
 * useViewerInitialization fails, the viewer is never set: either the Cesium chunk does
 * not load (the composable catches it and shows its error snackbar) or
 * `new Cesium.Viewer` throws (no WebGL; the composable rethrows). The sidebar must then
 * say that the map failed and offer a reload, not show "Loading map…" forever. Its
 * controls stay inert, because none of them can work without a viewer.
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

/** The failure notice's Reload control, if it is rendered and reachable by the user. */
const reachableReloadButton = () =>
	[...document.body.querySelectorAll('button')].find(
		(el) => /reload/i.test(el.textContent ?? '') && !el.closest('[inert]')
	)

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

	/** Asserts the sidebar shows the failure notice, not the loading hint, and stays inert. */
	const expectFailureNotice = () => {
		expect(useGlobalStore().cesiumViewer).toBeNull()
		expect(document.body.querySelector('.viewer-loading-hint')).toBeNull()
		expect(document.body.querySelector('[role="alert"]')?.textContent).toMatch(
			/map failed to load/i
		)
		expect(reachableReloadButton()).toBeDefined()
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

	it('shows a failure notice with a reload when the Cesium chunk fails to load', async () => {
		vi.spyOn(cesiumProvider, 'initialize').mockRejectedValue(
			new Error('Failed to fetch dynamically imported module: /assets/cesiumSymbols.js')
		)
		await settle()
		// Precondition: the gate starts closed behind the loading hint.
		expect(document.body.querySelector('.viewer-loading-hint')?.textContent).toMatch(/loading map/i)

		await viewerInit?.initViewer()
		await settle()

		// The composable's own error path still runs.
		expect(viewerInit?.errorSnackbar.value).toBe(true)
		expectFailureNotice()
	})

	it('shows a failure notice with a reload when the viewer constructor throws', async () => {
		provideCesium(fakeCesium(constructionError))

		await expect(viewerInit?.initViewer()).rejects.toThrow(/constructing CesiumWidget/)
		await settle()

		expectFailureNotice()
	})

	it('reloads the page when Reload is clicked', async () => {
		const reload = vi.fn()
		vi.stubGlobal('location', { ...window.location, reload })
		provideCesium(fakeCesium(constructionError))
		await expect(viewerInit?.initViewer()).rejects.toThrow()
		await settle()

		reachableReloadButton()?.click()

		expect(reload).toHaveBeenCalledTimes(1)
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
		expectFailureNotice()

		await viewerInit?.retryInit()
		await settle()

		expect(useGlobalStore().cesiumViewer).not.toBeNull()
		expect(useGlobalStore().viewerInitFailed).toBe(false)
		expect(document.body.querySelector('[role="alert"]')).toBeNull()
		expect(document.body.querySelector('.sidebar-content')?.hasAttribute('inert')).toBe(false)
	})
})
