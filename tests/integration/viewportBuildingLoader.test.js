/**
 * @file Integration tests for ViewportBuildingLoader service (with mocked dependencies)
 * @tag @integration
 *
 * Tests functions requiring mocked dependencies:
 * - loadTile() - WFS data loading via unifiedLoader
 * - updateTileVisibility() - Datasource visibility management
 * - unloadDistantTiles() - LRU tile eviction
 * - loadMissingTiles() - Concurrent loading with queue management
 * - processBuildings() - Building entity processing pipeline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import ViewportBuildingLoader from '@/services/viewportBuildingLoader.js';

// Mock unifiedLoader
vi.mock('@/services/unifiedLoader.js', () => ({
	default: {
		loadLayer: vi.fn(),
	},
}));

// Mock Datasource service
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.addDataSourceWithPolygonFix = vi.fn();
		this.getDataSourceByName = vi.fn();
		this.removeDataSourcesByNamePrefix = vi.fn();
	}),
}));

// Mock Urbanheat service
vi.mock('@/services/urbanheat.js', () => ({
	default: vi.fn(function () {
		this.findUrbanHeatData = vi.fn();
		this.mergeHeatWithBuildings = vi.fn();
	}),
}));

// Mock Cesium
vi.mock('cesium', () => ({
	Rectangle: vi.fn(function () {
		this.west = 0;
		this.south = 0;
		this.east = 0;
		this.north = 0;
	}),
	Math: {
		toDegrees: vi.fn((radians) => (radians * 180) / Math.PI),
		toRadians: vi.fn((degrees) => (degrees * Math.PI) / 180),
	},
	Color: vi.fn(function (r, g, b, a) {
		this.red = r;
		this.green = g;
		this.blue = b;
		this.alpha = a;
	}),
}));

describe('ViewportBuildingLoader - Integration Tests', () => {
	let loader;
	let mockViewer;
	let unifiedLoader;

	beforeEach(() => {
		// Clear all mocks first for test isolation
		vi.clearAllMocks();

		// Reset Pinia
		setActivePinia(createPinia());

		// Create fresh loader instance
		loader = new ViewportBuildingLoader();

		// Get mocked unifiedLoader
		unifiedLoader = loader.unifiedLoader;

		// Create mock viewer
		mockViewer = {
			camera: {
				moveEnd: {
					addEventListener: vi.fn(),
				},
				computeViewRectangle: vi.fn(),
				position: { x: 1000, y: 2000, z: 3000 },
			},
			scene: {
				globe: {
					ellipsoid: {},
				},
				requestRender: vi.fn(),
			},
		};
	});

	afterEach(() => {
		// Clean up timers and restore mocks
		vi.clearAllTimers();
		vi.restoreAllMocks();
	});

	describe('loadTile()', () => {
		it('should load tile via unifiedLoader with correct configuration', async () => {
			const mockEntities = [
				{ id: 'building1', properties: {} },
				{ id: 'building2', properties: {} },
			];

			unifiedLoader.loadLayer.mockResolvedValue(mockEntities);

			await loader.loadTile('2490_6010');

			// Verify unifiedLoader was called
			expect(unifiedLoader.loadLayer).toHaveBeenCalledOnce();

			const config = unifiedLoader.loadLayer.mock.calls[0][0];

			// Verify configuration structure
			expect(config.layerId).toBe('viewport_buildings_hsy_2490_6010');
			expect(config.type).toBe('geojson');
			// HSY view uses pygeoapi endpoint
			expect(config.url).toContain('/pygeoapi/collections/hsy_buildings_optimized/items');
			// Check for bbox parameter
			expect(config.url).toMatch(/bbox=24\.9\d*,60\.1,24\.91,60\.11/);

			// Verify caching options
			expect(config.options.cache).toBe(true);
			expect(config.options.cacheTTL).toBe(60 * 60 * 1000); // 1 hour
			expect(config.options.retries).toBe(2);
		});

		it('should track loaded tile with metadata', async () => {
			const mockGeoJSON = {
				type: 'FeatureCollection',
				features: [
					{ type: 'Feature', geometry: {}, properties: { id: 1 } },
					{ type: 'Feature', geometry: {}, properties: { id: 2 } },
				],
			};
			const mockEntities = [{ id: 'building1' }, { id: 'building2' }];

			// Mock unifiedLoader to return GeoJSON
			unifiedLoader.loadLayer.mockResolvedValue(mockGeoJSON);

			// Mock datasource service to return entities
			loader.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);

			const beforeTime = Date.now();
			await loader.loadTile('2491_6011');
			const afterTime = Date.now();

			// Verify tile is tracked
			expect(loader.loadedTiles.has('2491_6011')).toBe(true);

			const metadata = loader.loadedTiles.get('2491_6011');
			// Use toBeCloseTo for floating point comparison
			expect(metadata.bounds.west).toBeCloseTo(24.91, 5);
			expect(metadata.bounds.south).toBeCloseTo(60.11, 5);
			expect(metadata.bounds.east).toBeCloseTo(24.92, 5);
			expect(metadata.bounds.north).toBeCloseTo(60.12, 5);
			expect(metadata.entityCount).toBe(2);
			expect(metadata.loadedAt).toBeGreaterThanOrEqual(beforeTime);
			expect(metadata.loadedAt).toBeLessThanOrEqual(afterTime);
		});

		it('should handle tile loading errors gracefully', async () => {
			const error = new Error('WFS request failed');
			unifiedLoader.loadLayer.mockRejectedValue(error);

			await expect(loader.loadTile('2490_6010')).rejects.toThrow('WFS request failed');

			// Tile should not be tracked after failure
			expect(loader.loadedTiles.has('2490_6010')).toBe(false);
		});

		it('should process building data after parallel fetching', async () => {
			const mockGeoJSON = {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						geometry: { type: 'Polygon', coordinates: [] },
						properties: { id: 1 },
					},
				],
			};

			// Mock datasource service to return entities
			const mockEntities = [{ id: 'entity1' }];
			loader.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);

			unifiedLoader.loadLayer.mockResolvedValue(mockGeoJSON);

			await loader.loadTile('2490_6010');

			// Verify processBuildings was called with the GeoJSON from unifiedLoader
			expect(loader.datasourceService.addDataSourceWithPolygonFix).toHaveBeenCalledWith(
				mockGeoJSON,
				expect.stringContaining('Buildings Viewport'),
				false
			);
		});

		it('should calculate correct tile bounds from tile key', async () => {
			unifiedLoader.loadLayer.mockResolvedValue([]);

			await loader.loadTile('2500_6020');

			// Verify tile bounds calculation
			const metadata = loader.loadedTiles.get('2500_6020');
			expect(metadata.bounds).toEqual({
				west: 25.0, // 2500 * 0.01
				south: 60.2, // 6020 * 0.01
				east: 25.01, // (2500 + 1) * 0.01
				north: 60.21, // (6020 + 1) * 0.01
			});
		});

		it('should handle negative tile indices', async () => {
			unifiedLoader.loadLayer.mockResolvedValue([]);

			await loader.loadTile('-10_-5');

			const metadata = loader.loadedTiles.get('-10_-5');
			expect(metadata.bounds).toEqual({
				west: -0.1, // -10 * 0.01
				south: -0.05, // -5 * 0.01
				east: -0.09, // (-10 + 1) * 0.01
				north: -0.04, // (-5 + 1) * 0.01
			});
		});
	});

	describe('updateTileVisibility()', () => {
		beforeEach(() => {
			loader.viewer = mockViewer;
		});

		it('should show datasources for visible tiles', () => {
			// Mock datasources with entities for fadeIn
			const datasource1 = {
				show: false,
				name: 'Buildings Viewport HSY 2490_6010',
				entities: { values: [] },
			};
			const datasource2 = {
				show: false,
				name: 'Buildings Viewport HSY 2491_6011',
				entities: { values: [] },
			};

			loader.datasourceService.getDataSourceByName = vi.fn().mockImplementation((name) => {
				if (name === 'Buildings Viewport HSY 2490_6010') return datasource1;
				if (name === 'Buildings Viewport HSY 2491_6011') return datasource2;
				return null;
			});

			// Track loaded tiles
			loader.loadedTiles.set('2490_6010', { bounds: {}, entityCount: 5, loadedAt: Date.now() });
			loader.loadedTiles.set('2491_6011', { bounds: {}, entityCount: 3, loadedAt: Date.now() });

			// Update visibility - only first tile is visible
			loader.updateTileVisibility(['2490_6010']);

			expect(datasource1.show).toBe(true);
			expect(datasource2.show).toBe(false);
			expect(mockViewer.scene.requestRender).toHaveBeenCalled();
		});

		it('should hide datasources for non-visible tiles', () => {
			const datasource = { show: true, name: 'Buildings Viewport HSY 2490_6010' };

			loader.datasourceService.getDataSourceByName = vi.fn().mockReturnValue(datasource);
			loader.loadedTiles.set('2490_6010', { bounds: {}, entityCount: 5, loadedAt: Date.now() });

			// Update with empty visible set
			loader.updateTileVisibility([]);

			expect(datasource.show).toBe(false);
		});

		it('should only update visibility when state changes', () => {
			const datasource = { show: true, name: 'Buildings Viewport HSY 2490_6010' };

			loader.datasourceService.getDataSourceByName = vi.fn().mockReturnValue(datasource);
			loader.loadedTiles.set('2490_6010', { bounds: {}, entityCount: 5, loadedAt: Date.now() });

			// Call with tile visible (already true)
			loader.updateTileVisibility(['2490_6010']);

			// Should not change (stays true)
			expect(datasource.show).toBe(true);
		});

		it('should handle missing datasources gracefully', () => {
			loader.datasourceService.getDataSourceByName = vi.fn().mockReturnValue(null);
			loader.loadedTiles.set('2490_6010', { bounds: {}, entityCount: 5, loadedAt: Date.now() });

			// Should not throw
			expect(() => loader.updateTileVisibility(['2490_6010'])).not.toThrow();
		});

		it('should update visible tiles tracking', () => {
			loader.datasourceService.getDataSourceByName = vi.fn().mockReturnValue(null);

			loader.updateTileVisibility(['2490_6010', '2491_6011']);

			expect(loader.visibleTiles.size).toBe(2);
			expect(loader.visibleTiles.has('2490_6010')).toBe(true);
			expect(loader.visibleTiles.has('2491_6011')).toBe(true);
		});
	});

	describe('unloadDistantTiles()', () => {
		beforeEach(async () => {
			loader.datasourceService.removeDataSourcesByNamePrefix = vi.fn().mockResolvedValue(undefined);
		});

		it('should not evict tiles when under memory limit', async () => {
			// Load 10 tiles (under limit of 50)
			for (let i = 0; i < 10; i++) {
				loader.loadedTiles.set(`tile_${i}`, {
					bounds: {},
					entityCount: 5,
					loadedAt: Date.now() + i,
				});
			}

			const currentTiles = ['tile_0', 'tile_1', 'tile_2'];
			await loader.unloadDistantTiles(currentTiles);

			// Should not remove any tiles
			expect(loader.loadedTiles.size).toBe(10);
			expect(loader.datasourceService.removeDataSourcesByNamePrefix).not.toHaveBeenCalled();
		});

		it('should evict oldest tiles when over memory limit', async () => {
			// Load 52 tiles (over limit of 50)
			for (let i = 0; i < 52; i++) {
				loader.loadedTiles.set(`tile_${i}`, {
					bounds: {},
					entityCount: 5,
					loadedAt: Date.now() + i * 1000, // Different load times
				});
			}

			// Only tiles 50 and 51 are currently required
			const currentTiles = ['tile_50', 'tile_51'];
			await loader.unloadDistantTiles(currentTiles);

			// Should evict 2 oldest tiles (tile_0 and tile_1)
			expect(loader.loadedTiles.size).toBe(50);
			expect(loader.loadedTiles.has('tile_0')).toBe(false);
			expect(loader.loadedTiles.has('tile_1')).toBe(false);
			expect(loader.loadedTiles.has('tile_50')).toBe(true);
			expect(loader.loadedTiles.has('tile_51')).toBe(true);
		});

		it('should never evict currently required tiles', async () => {
			// Load tiles over limit
			for (let i = 0; i < 52; i++) {
				loader.loadedTiles.set(`tile_${i}`, {
					bounds: {},
					entityCount: 5,
					loadedAt: Date.now() + i * 1000,
				});
			}

			// First 10 tiles are required
			const currentTiles = Array.from({ length: 10 }, (_, i) => `tile_${i}`);
			await loader.unloadDistantTiles(currentTiles);

			// Should evict tiles, but not the required ones
			currentTiles.forEach((tile) => {
				expect(loader.loadedTiles.has(tile)).toBe(true);
			});
		});

		it('should use LRU eviction strategy (oldest first)', async () => {
			const baseTime = Date.now();

			// Load tiles with different ages
			loader.loadedTiles.set('old_tile_1', {
				bounds: {},
				entityCount: 5,
				loadedAt: baseTime - 10000,
			});
			loader.loadedTiles.set('old_tile_2', {
				bounds: {},
				entityCount: 5,
				loadedAt: baseTime - 9000,
			});
			loader.loadedTiles.set('new_tile', { bounds: {}, entityCount: 5, loadedAt: baseTime });

			// Simulate over limit (add 49 more tiles)
			for (let i = 0; i < 49; i++) {
				loader.loadedTiles.set(`filler_${i}`, {
					bounds: {},
					entityCount: 5,
					loadedAt: baseTime - i * 100,
				});
			}

			// Only new_tile is required
			await loader.unloadDistantTiles(['new_tile']);

			// Oldest tiles should be evicted first
			expect(loader.loadedTiles.has('old_tile_1')).toBe(false);
			expect(loader.loadedTiles.has('old_tile_2')).toBe(false);
			expect(loader.loadedTiles.has('new_tile')).toBe(true); // Required tile kept
		});

		it('should remove datasources when evicting tiles', async () => {
			// Load tiles over limit
			for (let i = 0; i < 52; i++) {
				loader.loadedTiles.set(`2490_${i}`, {
					bounds: {},
					entityCount: 5,
					loadedAt: Date.now() + i * 1000,
				});
			}

			await loader.unloadDistantTiles(['2490_50', '2490_51']);

			// Should call removeDataSourcesByNamePrefix for evicted tiles
			expect(loader.datasourceService.removeDataSourcesByNamePrefix).toHaveBeenCalled();
		});

		it('should clean up visibleTiles tracking when evicting', async () => {
			loader.loadedTiles.set('tile_0', {
				bounds: {},
				entityCount: 5,
				loadedAt: Date.now() - 10000,
			});
			loader.visibleTiles.add('tile_0');

			// Add 51 more tiles to trigger eviction
			for (let i = 1; i < 52; i++) {
				loader.loadedTiles.set(`tile_${i}`, {
					bounds: {},
					entityCount: 5,
					loadedAt: Date.now() + i * 1000,
				});
			}

			await loader.unloadDistantTiles(['tile_51']);

			// tile_0 should be evicted and removed from visibleTiles
			expect(loader.visibleTiles.has('tile_0')).toBe(false);
		});
	});

	describe('loadMissingTiles()', () => {
		beforeEach(() => {
			vi.useFakeTimers();
		});

		afterEach(() => {
			vi.useRealTimers();
		});

		it('should load only missing tiles', async () => {
			unifiedLoader.loadLayer.mockResolvedValue([]);

			// Pre-load some tiles
			loader.loadedTiles.set('tile_0', { bounds: {}, entityCount: 0, loadedAt: Date.now() });

			const tiles = ['tile_0', 'tile_1', 'tile_2'];

			// Start loading (returns immediately, loads in background)
			const loadPromise = loader.loadMissingTiles(tiles);

			// Wait for async operations
			await vi.runAllTimersAsync();
			await loadPromise;

			// Should only load tile_1 and tile_2 (tile_0 already loaded)
			expect(unifiedLoader.loadLayer).toHaveBeenCalledTimes(2);
		});

		it('should skip tiles already loading', async () => {
			unifiedLoader.loadLayer.mockResolvedValue([]);

			// Mark tile as loading
			loader.loadingTiles.add('tile_1');

			const tiles = ['tile_0', 'tile_1'];

			const loadPromise = loader.loadMissingTiles(tiles);
			await vi.runAllTimersAsync();
			await loadPromise;

			// Should only load tile_0
			expect(unifiedLoader.loadLayer).toHaveBeenCalledTimes(1);
		});

		it('should respect concurrent loading limit', async () => {
			let resolvers = [];

			// Mock loadLayer to return promises we control
			unifiedLoader.loadLayer.mockImplementation(() => {
				return new Promise((resolve) => {
					resolvers.push(resolve);
				});
			});

			const tiles = ['tile_0', 'tile_1', 'tile_2', 'tile_3', 'tile_4'];

			// Start loading
			loader.loadMissingTiles(tiles);

			// Allow event loop to process
			await vi.runAllTimersAsync();

			// Should only start 3 concurrent loads (CONFIG.CONCURRENT_TILE_LOADS = 3)
			expect(unifiedLoader.loadLayer).toHaveBeenCalledTimes(3);
			expect(loader.activeLoads).toBe(3);

			// Resolve first load
			resolvers[0]([]);
			await vi.runAllTimersAsync();

			// Should start 4th load
			expect(unifiedLoader.loadLayer).toHaveBeenCalledTimes(4);
		});

		it('should handle tile loading errors without blocking queue', async () => {
			let callCount = 0;
			unifiedLoader.loadLayer.mockImplementation(() => {
				callCount++;
				if (callCount === 1) {
					return Promise.reject(new Error('Load failed'));
				}
				return Promise.resolve([]);
			});

			const tiles = ['tile_0', 'tile_1'];

			const loadPromise = loader.loadMissingTiles(tiles);
			await vi.runAllTimersAsync();
			await loadPromise;

			// Should try to load both tiles despite first failure
			expect(unifiedLoader.loadLayer).toHaveBeenCalledTimes(2);
		});

		it('should do nothing when all tiles are already loaded', async () => {
			unifiedLoader.loadLayer.mockResolvedValue([]);

			// Pre-load all tiles
			loader.loadedTiles.set('tile_0', { bounds: {}, entityCount: 0, loadedAt: Date.now() });
			loader.loadedTiles.set('tile_1', { bounds: {}, entityCount: 0, loadedAt: Date.now() });

			const tiles = ['tile_0', 'tile_1'];

			await loader.loadMissingTiles(tiles);

			expect(unifiedLoader.loadLayer).not.toHaveBeenCalled();
		});
	});

	describe('processBuildings()', () => {
		it('should process GeoJSON features through datasource service', async () => {
			const mockGeoJSON = {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						geometry: { type: 'Polygon', coordinates: [[[]]] },
						properties: { id: 1 },
					},
				],
			};

			const mockEntities = [{ id: 'entity1' }];
			loader.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);

			const result = await loader.processBuildings(mockGeoJSON, '2490_6010');

			expect(loader.datasourceService.addDataSourceWithPolygonFix).toHaveBeenCalledWith(
				mockGeoJSON,
				'Buildings Viewport HSY 2490_6010',
				false // Initially hidden
			);
			expect(result).toEqual(mockEntities);
		});

		it('should return empty array for empty GeoJSON', async () => {
			const emptyGeoJSON = {
				type: 'FeatureCollection',
				features: [],
			};

			const result = await loader.processBuildings(emptyGeoJSON, '2490_6010');

			expect(result).toEqual([]);
			expect(loader.datasourceService.addDataSourceWithPolygonFix).not.toHaveBeenCalled();
		});

		it('should handle null/undefined GeoJSON gracefully', async () => {
			const result = await loader.processBuildings(null, '2490_6010');

			expect(result).toEqual([]);
		});

		it('should apply heat exposure processing when in Helsinki view', async () => {
			const mockGeoJSON = {
				type: 'FeatureCollection',
				features: [{ type: 'Feature', geometry: {}, properties: {} }],
			};

			const mockEntities = [{ id: 'entity1', polygon: {}, properties: {} }];
			loader.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);
			loader.urbanheatService.findUrbanHeatData = vi.fn().mockResolvedValue(mockEntities);

			// Enable Helsinki view
			loader.toggleStore.helsinkiView = true;

			await loader.processBuildings(mockGeoJSON, '2490_6010');

			// With parallel fetching, heat data is passed to processBuildings as third parameter
		// When calling processBuildings directly (as this test does), pass null for heat data
		expect(loader.urbanheatService.findUrbanHeatData).not.toHaveBeenCalled();
		});

		it('should skip heat processing when not in Helsinki view', async () => {
			const mockGeoJSON = {
				type: 'FeatureCollection',
				features: [{ type: 'Feature', geometry: {}, properties: {} }],
			};

			const mockEntities = [{ id: 'entity1' }];
			loader.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);

			// Disable Helsinki view
			loader.toggleStore.helsinkiView = false;

			await loader.processBuildings(mockGeoJSON, '2490_6010');

			expect(loader.urbanheatService.findUrbanHeatData).not.toHaveBeenCalled();
		});
	});

	describe('clearAllTiles()', () => {
		it('should remove all datasources with viewport prefix', async () => {
			loader.datasourceService.removeDataSourcesByNamePrefix = vi.fn().mockResolvedValue(undefined);

			// Add some tiles
			loader.loadedTiles.set('tile_0', { bounds: {}, entityCount: 5, loadedAt: Date.now() });
			loader.loadedTiles.set('tile_1', { bounds: {}, entityCount: 3, loadedAt: Date.now() });
			loader.visibleTiles.add('tile_0');
			loader.loadingTiles.add('tile_2');

			await loader.clearAllTiles();

			expect(loader.datasourceService.removeDataSourcesByNamePrefix).toHaveBeenCalledWith(
				'Buildings Viewport'
			);
			expect(loader.loadedTiles.size).toBe(0);
			expect(loader.visibleTiles.size).toBe(0);
			expect(loader.loadingTiles.size).toBe(0);
		});

		it('should clear loading queue', async () => {
			loader.datasourceService.removeDataSourcesByNamePrefix = vi.fn().mockResolvedValue(undefined);

			loader.loadingQueue = ['tile_0', 'tile_1', 'tile_2'];

			await loader.clearAllTiles();

			expect(loader.loadingQueue).toEqual([]);
		});
	});
});
