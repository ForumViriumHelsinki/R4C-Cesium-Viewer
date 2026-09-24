/**
 * useViewerInitialization: tab-visibility handler vs graphicsStore (#1018).
 *
 * The handler paused rendering on tab hide (requestRenderMode = true) and on
 * tab return forced requestRenderMode = false, ignoring graphicsStore. After
 * the first tab switch the scene rendered every frame for the rest of the
 * session. These tests drive the real composable with a fake Cesium viewer
 * and assert the scene flag after hide + show.
 */
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGraphicsStore } from '../../../src/stores/graphicsStore.js'

/** Minimal stand-in for Cesium.Viewer: only what initViewer touches. */
class FakeViewer {
	constructor(_container, options) {
		this.options = options
		// initViewer wraps scene.requestRender for perf counters in dev/E2E, so
		// keep a handle on the original spy.
		this.requestRenderSpy = vi.fn()
		this.scene = {
			requestRenderMode: options.requestRenderMode === true,
			requestRender: this.requestRenderSpy,
		}
		this.imageryLayers = { add: vi.fn() }
		this._destroyed = false
	}
	isDestroyed() {
		return this._destroyed
	}
	destroy() {
		this._destroyed = true
	}
}

const fakeCesium = {
	Ion: { defaultAccessToken: 'unset' },
	EllipsoidTerrainProvider: class {},
	OpenStreetMapImageryProvider: class {},
	Viewer: FakeViewer,
}

vi.mock('../../../src/services/cesiumProvider.js', () => ({
	cesiumProvider: { initialize: vi.fn(async () => fakeCesium) },
	getCesium: () => fakeCesium,
}))
vi.mock('../../../src/services/datasource.js', () => ({ default: class {} }))
vi.mock('../../../src/services/featurepicker.js', () => ({ default: class {} }))
vi.mock('../../../src/services/wms.js', () => ({
	default: class {
		createHelsinkiImageryLayer() {
			return {}
		}
	},
}))
vi.mock('../../../src/services/camera.js', () => ({
	default: class {
		init() {}
	},
}))
vi.mock('../../../src/services/graphics.js', () => ({
	default: class {
		init() {}
		destroy() {}
	},
}))

let hidden = false

/** Flip document.hidden and fire the event the handler listens for. */
function setTabHidden(value) {
	hidden = value
	document.dispatchEvent(new Event('visibilitychange'))
}

describe('useViewerInitialization visibility handler', () => {
	/** @type {ReturnType<typeof import('../../../src/composables/useViewerInitialization.js').useViewerInitialization>} */
	let api

	beforeEach(async () => {
		setActivePinia(createPinia())
		hidden = false
		Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
		const { useViewerInitialization } = await import(
			'../../../src/composables/useViewerInitialization.js'
		)
		api = useViewerInitialization()
	})

	afterEach(() => {
		api?.destroyViewer()
		// Drop the own-property override so jsdom's prototype getter applies again.
		delete (/** @type {any} */ (document).hidden)
		vi.unstubAllEnvs()
		// The E2E case exposes the viewer hooks on window.
		const testWindow = /** @type {any} */ (window)
		delete testWindow.__viewer
		delete testWindow.__cesium
		delete testWindow.__featurepicker
	})

	it('restores request-render mode on tab return when the store has it on (the default)', async () => {
		const graphicsStore = useGraphicsStore()
		expect(graphicsStore.requestRenderMode).toBe(true)

		await api.initViewer()
		const scene = api.viewer.value.scene
		expect(scene.requestRenderMode).toBe(true)

		setTabHidden(true)
		expect(scene.requestRenderMode).toBe(true)

		const requestRenderSpy = api.viewer.value.requestRenderSpy
		requestRenderSpy.mockClear()
		setTabHidden(false)
		expect(scene.requestRenderMode).toBe(true)
		// One frame after return so the scene is not stale.
		expect(requestRenderSpy).toHaveBeenCalled()
	})

	it('restores continuous rendering on tab return when the store has request-render mode off', async () => {
		const graphicsStore = useGraphicsStore()
		graphicsStore.setRequestRenderMode(false)

		await api.initViewer()
		const scene = api.viewer.value.scene
		expect(scene.requestRenderMode).toBe(false)

		setTabHidden(true)
		expect(scene.requestRenderMode).toBe(true)

		setTabHidden(false)
		expect(scene.requestRenderMode).toBe(false)
	})

	it('reads the store at tab return, so a later flag write is honoured', async () => {
		const graphicsStore = useGraphicsStore()
		graphicsStore.setRequestRenderMode(false)
		await api.initViewer()
		const scene = api.viewer.value.scene

		// App.vue writes the r4c-request-render-mode flag after viewer creation.
		graphicsStore.setRequestRenderMode(true)
		setTabHidden(true)
		setTabHidden(false)
		expect(scene.requestRenderMode).toBe(true)
	})

	it('keeps request-render mode on after tab return in an E2E build, matching viewer creation', async () => {
		vi.stubEnv('VITE_E2E_TEST', 'true')
		const graphicsStore = useGraphicsStore()
		graphicsStore.setRequestRenderMode(false)

		await api.initViewer()
		const scene = api.viewer.value.scene
		expect(scene.requestRenderMode).toBe(true)

		setTabHidden(true)
		setTabHidden(false)
		expect(scene.requestRenderMode).toBe(true)
	})
})
