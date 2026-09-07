import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHSYImageryLayer, removeLandcover } from '@/services/landcover.js'
import { useBackgroundMapStore } from '@/stores/backgroundMapStore.js'
import { useGlobalStore } from '@/stores/globalStore.js'

// Shared spy for the error-listener remover returned by errorEvent.addEventListener.
const removeErrorListenerSpy = vi.fn()

// Create Cesium mock to be used by cesiumProvider
const WebMapServiceImageryProviderMock = vi.fn(function (options) {
	this.url = options.url
	this.layers = options.layers
	this.tileWidth = options.tileWidth
	this.tileHeight = options.tileHeight
	this.minimumLevel = options.minimumLevel
	this.maximumLevel = options.maximumLevel
	this.tilingScheme = options.tilingScheme
	this.readyPromise = Promise.resolve(true)
	// Real WebMapServiceImageryProvider always exposes errorEvent; the HSY
	// outage-resilience handler attaches to it.
	this.errorEvent = {
		addEventListener: vi.fn(() => removeErrorListenerSpy),
	}
})

const GeographicTilingSchemeMock = vi.fn(function () {
	this.name = 'GeographicTilingScheme'
})

// Mock cesiumProvider
vi.mock('@/services/cesiumProvider', () => ({
	getCesium: vi.fn(() => ({
		WebMapServiceImageryProvider: WebMapServiceImageryProviderMock,
		GeographicTilingScheme: GeographicTilingSchemeMock,
	})),
}))

// Mock stores - functions will be initialized in beforeEach
let mockRemove
let mockAddImageryProvider
let mockContains
let mockGlobalStore
let mockBackgroundStore
let mockURLStore

vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: vi.fn(() => mockGlobalStore),
}))

vi.mock('@/stores/backgroundMapStore.js', () => ({
	useBackgroundMapStore: vi.fn(() => mockBackgroundStore),
}))

vi.mock('@/stores/urlStore.js', () => ({
	useURLStore: vi.fn(() => mockURLStore),
}))

describe('Landcover Service', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.clearAllMocks()

		// Create fresh mocks for each test
		mockRemove = vi.fn()
		mockAddImageryProvider = vi.fn((provider) => ({
			imageryProvider: provider,
		}))
		mockContains = vi.fn(() => true)

		mockGlobalStore = {
			cesiumViewer: {
				imageryLayers: {
					addImageryProvider: mockAddImageryProvider,
					contains: mockContains,
					remove: mockRemove,
				},
			},
		}

		mockBackgroundStore = {
			landcoverLayers: [],
			hsyYear: '2023',
			clearLandcoverLayers: vi.fn(function () {
				this.landcoverLayers = []
			}),
		}

		mockURLStore = {
			wmsProxy: 'https://mock-wms-proxy.example.com/wms',
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	describe('createHSYImageryLayer', () => {
		it('should create imagery layer with optimized tile configuration', async () => {
			await createHSYImageryLayer()

			// Verify WebMapServiceImageryProvider was called with optimized config
			expect(WebMapServiceImageryProviderMock).toHaveBeenCalledWith(
				expect.objectContaining({
					tileWidth: 512,
					tileHeight: 512,
					maximumLevel: 18,
					minimumLevel: 0,
				})
			)
		})

		it('should use GeographicTilingScheme for EPSG:4326', async () => {
			await createHSYImageryLayer()

			expect(GeographicTilingSchemeMock).toHaveBeenCalled()
		})

		it('should use correct WMS proxy URL from store', async () => {
			await createHSYImageryLayer()

			expect(WebMapServiceImageryProviderMock).toHaveBeenCalledWith(
				expect.objectContaining({
					url: 'https://mock-wms-proxy.example.com/wms',
				})
			)
		})

		it('should generate all 13 landcover layers when no custom layers provided', async () => {
			await createHSYImageryLayer()

			const call = WebMapServiceImageryProviderMock.mock.calls[0][0]
			const layers = call.layers.split(',')

			// Should have all 13 landcover types with year suffix
			expect(layers).toHaveLength(13)
			expect(call.layers).toContain('2023') // Year suffix
			expect(call.layers).toContain('maanpeite_avokalliot')
			expect(call.layers).toContain('maanpeite_vesi')
			expect(call.layers).toContain('maanpeite_puusto_yli20m')
		})

		it('should use custom layers when provided', async () => {
			const customLayers = 'asuminen_ja_maankaytto:maanpeite_vesi_2023'

			await createHSYImageryLayer(customLayers)

			expect(WebMapServiceImageryProviderMock).toHaveBeenCalledWith(
				expect.objectContaining({
					layers: customLayers,
				})
			)
		})

		it('attaches a tile error handler for HSY-outage resilience', async () => {
			await createHSYImageryLayer()

			const providerInstance = WebMapServiceImageryProviderMock.mock.instances[0]
			expect(providerInstance.errorEvent.addEventListener).toHaveBeenCalledTimes(1)

			// The added layer carries a remover so removeLandcover can detach it.
			const addedLayer = mockBackgroundStore.landcoverLayers[0]
			expect(typeof addedLayer._removeErrorHandler).toBe('function')
		})

		it('is idempotent — a second default call does not stack a duplicate layer', async () => {
			await createHSYImageryLayer()
			await createHSYImageryLayer()

			// Without the guard the second call stacks a second provider on the
			// same viewer, doubling the per-tile /wms/proxy request count.
			expect(mockBackgroundStore.landcoverLayers).toHaveLength(1)
		})

		it('leaves the live provider untouched on a redundant default call', async () => {
			await createHSYImageryLayer()
			const liveLayer = mockBackgroundStore.landcoverLayers[0]
			mockAddImageryProvider.mockClear()
			mockRemove.mockClear()

			await createHSYImageryLayer()

			// The guard is a no-op, not a remove-and-recreate: tearing the
			// provider down would re-request every visible tile through
			// /wms/proxy, which is the traffic this guard exists to remove.
			expect(mockRemove).not.toHaveBeenCalled()
			expect(mockAddImageryProvider).not.toHaveBeenCalled()
			expect(mockBackgroundStore.landcoverLayers[0]).toBe(liveLayer)
		})

		it('does not orphan the live layer error listener', async () => {
			await createHSYImageryLayer()
			await createHSYImageryLayer()

			// Nothing was replaced, so nothing had to be detached and the
			// listener on the still-live layer stays attached.
			expect(removeErrorListenerSpy).not.toHaveBeenCalled()
		})

		it('leaves the explicit-layers caller path unchanged', async () => {
			// HSYWMS.vue / HSYYearSelect.vue call removeLandcover() themselves
			// before passing an explicit layer list; the guard must not alter
			// that sequence.
			await createHSYImageryLayer()
			removeLandcover()
			await createHSYImageryLayer('asuminen_ja_maankaytto:maanpeite_vesi_2023')

			expect(mockBackgroundStore.landcoverLayers).toHaveLength(1)
			const lastCall = WebMapServiceImageryProviderMock.mock.calls.at(-1)[0]
			expect(lastCall.layers).toBe('asuminen_ja_maankaytto:maanpeite_vesi_2023')
			// Exactly one removal: the caller's own. (This sequence empties the
			// store first, so it does not by itself exercise the guard's
			// argument scoping — the next case does.)
			expect(mockRemove).toHaveBeenCalledTimes(1)
		})

		it('does not fire the guard when an explicit layer list is passed', async () => {
			// No removeLandcover() in between, so landcoverLayers is non-empty
			// when the explicit call runs: only the `newLayers` scoping clause
			// keeps the guard from dropping the caller's existing layer.
			await createHSYImageryLayer()
			mockRemove.mockClear()

			await createHSYImageryLayer('asuminen_ja_maankaytto:maanpeite_vesi_2023')

			expect(mockRemove).not.toHaveBeenCalled()
			expect(mockBackgroundStore.landcoverLayers).toHaveLength(2)
		})

		it.each([null, ''])('treats %o like the no-argument default path', async (falsy) => {
			// `layersList` picks the default set for any falsy argument, so the
			// guard must use the same truthiness test — otherwise these values
			// load the default layers while skipping the idempotency guard.
			await createHSYImageryLayer()
			await createHSYImageryLayer(falsy)

			expect(mockBackgroundStore.landcoverLayers).toHaveLength(1)
			// Still the first call's provider — the falsy argument took the
			// guard, so no second default provider was constructed.
			expect(WebMapServiceImageryProviderMock).toHaveBeenCalledTimes(1)
			expect(WebMapServiceImageryProviderMock.mock.calls.at(-1)[0].layers.split(',')).toHaveLength(
				13
			)
		})

		it('rebuilds the default set after the caller removes it (year refresh)', async () => {
			// HSYYearSelect.vue is the only setHSYYear caller and it calls
			// removeLandcover() before re-invoking the default path, so the
			// guard is not reached and the year change still takes effect.
			await createHSYImageryLayer()
			mockBackgroundStore.hsyYear = 2018
			removeLandcover()

			await createHSYImageryLayer()

			expect(mockBackgroundStore.landcoverLayers).toHaveLength(1)
			expect(WebMapServiceImageryProviderMock.mock.calls.at(-1)[0].layers).toContain('_2018')
		})

		describe('performance configuration', () => {
			it('should use 512x512 tiles to reduce request count', async () => {
				await createHSYImageryLayer()

				const call = WebMapServiceImageryProviderMock.mock.calls[0][0]
				// 512x512 provides ~75% reduction in requests vs 256x256 default
				expect(call.tileWidth).toBe(512)
				expect(call.tileHeight).toBe(512)
			})

			it('should limit maximum zoom to level 18 to prevent excessive requests', async () => {
				await createHSYImageryLayer()

				const call = WebMapServiceImageryProviderMock.mock.calls[0][0]
				// Level 18 provides ~0.6m resolution at equator, sufficient for landcover visualization
				// This prevents N+1 API call issues at extreme zoom levels
				expect(call.maximumLevel).toBe(18)
			})

			it('should allow zooming from minimum level 0', async () => {
				await createHSYImageryLayer()

				const call = WebMapServiceImageryProviderMock.mock.calls[0][0]
				expect(call.minimumLevel).toBe(0)
			})
		})

		describe('coordinate system', () => {
			it('should use EPSG:4326 (WGS84) coordinate system', async () => {
				await createHSYImageryLayer()

				// GeographicTilingScheme = EPSG:4326 (WGS84)
				// This is CesiumJS's default and compatible with HSY WMS
				expect(GeographicTilingSchemeMock).toHaveBeenCalled()
			})
		})
	})

	describe('removeLandcover', () => {
		it('should remove all landcover layers from viewer', () => {
			const mockStore = useGlobalStore()
			const mockBackgroundStore = useBackgroundMapStore()

			// Add mock layers
			mockBackgroundStore.landcoverLayers = [{ id: 'layer1' }, { id: 'layer2' }, { id: 'layer3' }]

			removeLandcover()

			expect(mockStore.cesiumViewer.imageryLayers.remove).toHaveBeenCalledTimes(3)
			expect(mockBackgroundStore.clearLandcoverLayers).toHaveBeenCalled()
		})

		it('should handle empty landcover layers array gracefully', () => {
			const mockBackgroundStore = useBackgroundMapStore()

			mockBackgroundStore.landcoverLayers = []

			expect(() => removeLandcover()).not.toThrow()
		})

		it('detaches the tile error listener on removal (no listener leak)', async () => {
			// Create a real layer so it carries the _removeErrorHandler remover.
			await createHSYImageryLayer()
			expect(removeErrorListenerSpy).not.toHaveBeenCalled()

			removeLandcover()

			expect(removeErrorListenerSpy).toHaveBeenCalledTimes(1)
		})
	})
})
