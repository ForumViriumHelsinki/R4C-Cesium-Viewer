import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import Wms from '@/services/wms.js';
import * as Cesium from 'cesium';

// Test configuration
const MOCK_WMS_URL = 'https://mock-helsinki-wms.example.com/geoserver/wms';

// Mock Cesium module
vi.mock('cesium', () => ({
	WebMapServiceImageryProvider: vi.fn(function (options) {
		// Constructor mock that stores the options
		this.url = options.url;
		this.layers = options.layers;
		this.tileWidth = options.tileWidth;
		this.tileHeight = options.tileHeight;
		this.minimumLevel = options.minimumLevel;
		this.maximumLevel = options.maximumLevel;
		this.tilingScheme = options.tilingScheme;
	}),
	GeographicTilingScheme: vi.fn(function () {
		this.name = 'GeographicTilingScheme';
	}),
	ImageryLayer: vi.fn(function (provider) {
		this.imageryProvider = provider;
	}),
}));

// Mock URL store
vi.mock('@/stores/urlStore.js', () => ({
	useURLStore: vi.fn(() => ({
		helsinkiWMS: MOCK_WMS_URL,
	})),
}));

describe('Wms Service', { tags: ['@unit', '@wms'] }, () => {
	let wms;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		wms = new Wms();
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe('constructor', () => {
		it('should create a new Wms instance', () => {
			expect(wms).toBeInstanceOf(Wms);
		});
	});

	describe('createHelsinkiImageryLayer', () => {
		it('should create imagery layer with optimized tile configuration', () => {
			const layerName = 'avoindata:Rakennukset_alue';
			const layer = wms.createHelsinkiImageryLayer(layerName);

			expect(layer).toBeDefined();
			expect(layer.imageryProvider).toBeDefined();

			// Verify performance optimizations are applied
			expect(layer.imageryProvider.tileWidth).toBe(512);
			expect(layer.imageryProvider.tileHeight).toBe(512);
			expect(layer.imageryProvider.maximumLevel).toBe(18);
			expect(layer.imageryProvider.minimumLevel).toBe(0);
		});

		it('should use correct WMS URL from store', () => {
			const layerName = 'avoindata:Rakennukset_alue';
			const layer = wms.createHelsinkiImageryLayer(layerName);

			expect(layer.imageryProvider.url).toBe(MOCK_WMS_URL);
		});

		it('should use GeographicTilingScheme for EPSG:4326', () => {
			const layerName = 'avoindata:Rakennukset_alue';
			const layer = wms.createHelsinkiImageryLayer(layerName);

			expect(layer.imageryProvider.tilingScheme).toBeDefined();
			expect(layer.imageryProvider.tilingScheme.name).toBe('GeographicTilingScheme');
		});

		it('should pass the correct layer name to WMS provider', () => {
			const layerName = 'avoindata:Test_Layer';
			const layer = wms.createHelsinkiImageryLayer(layerName);

			expect(layer.imageryProvider.layers).toBe(layerName);
		});

		it('should create different layers for different layer names', () => {
			const layer1 = wms.createHelsinkiImageryLayer('avoindata:Layer1');
			const layer2 = wms.createHelsinkiImageryLayer('avoindata:Layer2');

			expect(layer1.imageryProvider.layers).toBe('avoindata:Layer1');
			expect(layer2.imageryProvider.layers).toBe('avoindata:Layer2');
			expect(layer1).not.toBe(layer2);
		});

		describe('performance configuration', () => {
			it('should use 512x512 tiles to reduce request count', () => {
				const layer = wms.createHelsinkiImageryLayer('test:layer');

				// 512x512 provides ~75% reduction in requests vs 256x256 default
				expect(layer.imageryProvider.tileWidth).toBe(512);
				expect(layer.imageryProvider.tileHeight).toBe(512);
			});

			it('should limit maximum zoom to level 18 to prevent excessive requests', () => {
				const layer = wms.createHelsinkiImageryLayer('test:layer');

				// Level 18 provides ~0.6m resolution at equator, sufficient for building-level detail
				// This prevents N+1 API call issues at extreme zoom levels
				expect(layer.imageryProvider.maximumLevel).toBe(18);
			});

			it('should allow zooming from minimum level 0', () => {
				const layer = wms.createHelsinkiImageryLayer('test:layer');

				expect(layer.imageryProvider.minimumLevel).toBe(0);
			});
		});

		describe('coordinate system', () => {
			it('should use EPSG:4326 (WGS84) coordinate system', () => {
				const layer = wms.createHelsinkiImageryLayer('test:layer');

				// GeographicTilingScheme = EPSG:4326 (WGS84)
				// This is CesiumJS's default and compatible with Helsinki WMS
				expect(layer.imageryProvider.tilingScheme).toBeDefined();
				expect(Cesium.GeographicTilingScheme).toHaveBeenCalled();
			});
		});
	});

	describe('integration scenarios', () => {
		it('should support multiple simultaneous imagery layers', () => {
			const layers = [
				wms.createHelsinkiImageryLayer('avoindata:Rakennukset_alue'),
				wms.createHelsinkiImageryLayer('avoindata:NDVI'),
				wms.createHelsinkiImageryLayer('avoindata:Trees'),
			];

			expect(layers).toHaveLength(3);
			layers.forEach((layer) => {
				expect(layer.imageryProvider.tileWidth).toBe(512);
				expect(layer.imageryProvider.tileHeight).toBe(512);
				expect(layer.imageryProvider.maximumLevel).toBe(18);
			});
		});

		it('should handle special characters in layer names', () => {
			const specialLayerNames = [
				'avoindata:Rakennukset_alue_rekisteritiedot',
				'avoindata:HSY-trees-2020',
				'avoindata:Building.Properties',
			];

			specialLayerNames.forEach((layerName) => {
				const layer = wms.createHelsinkiImageryLayer(layerName);
				expect(layer.imageryProvider.layers).toBe(layerName);
			});
		});
	});
});
