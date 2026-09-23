/**
 * Graphics service: graphicsStore changes must reach the live Cesium scene (#983).
 *
 * Every graphicsStore setter mutates state directly. The service previously
 * decided what to re-apply by reading Pinia's `mutation.events`, which is
 * dev-only debugger data and not an array for direct mutations, so no setting
 * changed after init ever reached the scene. These tests drive the real store
 * and assert on the fake scene the service writes to.
 */
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { useGraphicsFlagSync } from '@/composables/useGraphicsFlagSync.js'
import Graphics from '@/services/graphics.js'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import { useGraphicsStore } from '@/stores/graphicsStore.js'

// Flags come from local overrides in these tests; keep the OpenFeature
// client out of the picture.
vi.mock('@/services/featureFlagProvider', () => ({
	getClient: () => ({
		getBooleanValue: (_flagId, defaultValue) => defaultValue,
	}),
}))

// Run the deferred support detection synchronously so init() applies the
// initial settings before each test's assertions.
vi.mock('@/utils/idle.js', () => ({
	requestIdle: (callback) => {
		callback({ didTimeout: false, timeRemaining: () => 50 })
		return 0
	},
	cancelIdle: vi.fn(),
}))

vi.mock('@/services/cesiumProvider', () => ({
	getCesium: () => ({
		PostProcessStageLibrary: {
			isAmbientOcclusionSupported: () => true,
		},
	}),
}))

function createFakeViewer() {
	const scene = {
		msaaSupported: true,
		highDynamicRangeSupported: true,
		msaaSamples: 1,
		highDynamicRange: false,
		requestRenderMode: true,
		requestRender: vi.fn(),
		debugShowFramesPerSecond: false,
		postProcessStages: {
			fxaa: { enabled: false },
			ambientOcclusion: { enabled: false, uniforms: {} },
		},
	}
	let destroyed = false
	return {
		scene,
		isDestroyed: () => destroyed,
		destroy: () => {
			destroyed = true
		},
	}
}

describe(
	'Graphics service applies graphicsStore changes to the live scene',
	{ tags: ['@unit'] },
	() => {
		let graphicsStore
		let viewer
		let graphics

		beforeEach(() => {
			setActivePinia(createPinia())
			graphicsStore = useGraphicsStore()
			viewer = createFakeViewer()
			graphics = new Graphics()
			graphics.init(viewer)
		})

		it('applies the defaults at init (MSAA 4x, FXAA/HDR/AO off)', () => {
			expect(viewer.scene.msaaSamples).toBe(4)
			expect(viewer.scene.postProcessStages.fxaa.enabled).toBe(false)
			expect(viewer.scene.highDynamicRange).toBe(false)
			expect(viewer.scene.postProcessStages.ambientOcclusion.enabled).toBe(false)
		})

		it('applies setMsaaSettings to scene.msaaSamples', async () => {
			graphicsStore.setMsaaSettings(true, 8)
			await nextTick()
			expect(viewer.scene.msaaSamples).toBe(8)

			graphicsStore.setMsaaSettings(false, 8)
			await nextTick()
			expect(viewer.scene.msaaSamples).toBe(1)
		})

		it('applies setFxaaEnabled to the FXAA post-process stage', async () => {
			graphicsStore.setFxaaEnabled(true)
			await nextTick()
			expect(viewer.scene.postProcessStages.fxaa.enabled).toBe(true)
		})

		it('applies setHdrEnabled to scene.highDynamicRange', async () => {
			graphicsStore.setHdrEnabled(true)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(true)
		})

		it('applies setAmbientOcclusionEnabled to the AO post-process stage', async () => {
			graphicsStore.setAmbientOcclusionEnabled(true)
			await nextTick()
			expect(viewer.scene.postProcessStages.ambientOcclusion.enabled).toBe(true)
		})

		it('applies setRequestRenderMode to scene.requestRenderMode and kicks a render when turning it off', async () => {
			graphicsStore.setRequestRenderMode(false)
			await nextTick()
			expect(viewer.scene.requestRenderMode).toBe(false)
			expect(viewer.scene.requestRender).toHaveBeenCalled()

			graphicsStore.setRequestRenderMode(true)
			await nextTick()
			expect(viewer.scene.requestRenderMode).toBe(true)
		})

		it('also applies $patch updates, not only setter calls', async () => {
			graphicsStore.$patch({ hdrEnabled: true, fxaaEnabled: true })
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(true)
			expect(viewer.scene.postProcessStages.fxaa.enabled).toBe(true)
		})

		it('stops applying changes after destroy()', async () => {
			graphics.destroy()
			graphicsStore.setHdrEnabled(true)
			graphicsStore.setRequestRenderMode(false)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(false)
			expect(viewer.scene.requestRenderMode).toBe(true)
		})

		it('releases its store watchers on destroy()', async () => {
			graphics.destroy()
			// Re-attach the scene directly: only a watcher that destroy() left
			// registered could now write to it.
			graphics.viewer = viewer
			graphics.scene = viewer.scene
			graphicsStore.setHdrEnabled(true)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(false)
		})

		it('does not write to a destroyed viewer', async () => {
			viewer.destroy()
			graphicsStore.setHdrEnabled(true)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(false)
		})
	}
)

describe(
	'graphics feature flags reach the scene through graphicsStore',
	{ tags: ['@unit'] },
	() => {
		let featureFlagStore
		let viewer
		let graphics
		let stopSync

		beforeEach(() => {
			setActivePinia(createPinia())
			localStorage.clear()
			featureFlagStore = useFeatureFlagStore()
			// Production order: App.vue starts the flag sync in setup, before the
			// viewer (and its graphics service) exists.
			stopSync = useGraphicsFlagSync()
			viewer = createFakeViewer()
			graphics = new Graphics()
		})

		afterEach(() => {
			stopSync()
			graphics.destroy()
		})

		it('keeps request render mode on with the flag at its default', async () => {
			graphics.init(viewer)
			await nextTick()
			expect(featureFlagStore.isEnabled('requestRenderMode')).toBe(true)
			expect(viewer.scene.requestRenderMode).toBe(true)
		})

		it('turns request render mode off and on with the requestRenderMode flag', async () => {
			graphics.init(viewer)
			featureFlagStore.setFlag('requestRenderMode', false)
			await nextTick()
			expect(viewer.scene.requestRenderMode).toBe(false)

			featureFlagStore.resetFlag('requestRenderMode')
			await nextTick()
			expect(viewer.scene.requestRenderMode).toBe(true)
		})

		it('turns HDR on and off with the hdrRendering flag', async () => {
			graphics.init(viewer)
			featureFlagStore.setFlag('hdrRendering', true)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(true)

			featureFlagStore.setFlag('hdrRendering', false)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(false)
		})

		it('turns ambient occlusion on and off with the ambientOcclusion flag', async () => {
			graphics.init(viewer)
			featureFlagStore.setFlag('ambientOcclusion', true)
			await nextTick()
			expect(viewer.scene.postProcessStages.ambientOcclusion.enabled).toBe(true)

			featureFlagStore.setFlag('ambientOcclusion', false)
			await nextTick()
			expect(viewer.scene.postProcessStages.ambientOcclusion.enabled).toBe(false)
		})

		it('applies HDR and AO flags that resolve before hardware support is detected', async () => {
			// Flags usually load before the viewer's idle-time support detection.
			featureFlagStore.setFlag('hdrRendering', true)
			featureFlagStore.setFlag('ambientOcclusion', true)
			await nextTick()

			graphics.init(viewer)
			await nextTick()

			expect(viewer.scene.highDynamicRange).toBe(true)
			expect(viewer.scene.postProcessStages.ambientOcclusion.enabled).toBe(true)
		})

		it('applies flag values already set when the sync starts', async () => {
			graphics.init(viewer)
			stopSync()
			featureFlagStore.setFlag('requestRenderMode', false)
			featureFlagStore.setFlag('hdrRendering', true)
			featureFlagStore.setFlag('ambientOcclusion', true)
			await nextTick()
			// No sync running: the flag changes have not reached the scene.
			expect(viewer.scene.requestRenderMode).toBe(true)
			expect(viewer.scene.highDynamicRange).toBe(false)

			stopSync = useGraphicsFlagSync()
			await nextTick()
			expect(viewer.scene.requestRenderMode).toBe(false)
			expect(viewer.scene.highDynamicRange).toBe(true)
			expect(viewer.scene.postProcessStages.ambientOcclusion.enabled).toBe(true)
		})

		it('leaves HDR off when the hardware does not support it', async () => {
			viewer.scene.highDynamicRangeSupported = false
			featureFlagStore.setFlag('hdrRendering', true)
			graphics.init(viewer)
			await nextTick()
			expect(viewer.scene.highDynamicRange).toBe(false)
		})
	}
)
