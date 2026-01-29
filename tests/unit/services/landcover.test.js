import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHSYImageryLayer, removeLandcover } from '@/services/landcover.js'
import { useBackgroundMapStore } from '@/stores/backgroundMapStore.js'
import { useGlobalStore } from '@/stores/globalStore.js'

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
	})
})
