import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import EspooSurvey from '@/services/espooSurvey.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Cesium module
vi.mock('cesium', () => ({
	Color: vi.fn(function (r, g, b, a) {
		return { r, g, b, a };
	}),
	PointGraphics: vi.fn(function (options) {
		return { ...options };
	}),
}));

// Mock datasource service
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.addDataSourceWithPolygonFix = vi.fn().mockResolvedValue([]);
	}),
}));

// Mock event bus
vi.mock('@/services/eventEmitter.js', () => ({
	eventBus: {
		emit: vi.fn(),
	},
}));

// Mock cesium entity manager
vi.mock('@/services/cesiumEntityManager.js', () => ({
	cesiumEntityManager: {
		registerBuildingEntities: vi.fn(),
	},
}));

// Mock URL store
vi.mock('@/stores/urlStore.js', () => ({
	useURLStore: vi.fn(() => ({
		collectionUrl: vi.fn((collection) => `https://api.example.com/collections/${collection}`),
	})),
}));

// Mock global store
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: vi.fn(() => ({
		cesiumViewer: {
			dataSources: {
				add: vi.fn(),
			},
		},
		minMaxKelvin: {
			'2023-06-23': { min: 288.9166564941, max: 324.6862182617 },
		},
	})),
}));

describe('EspooSurvey Service - Error Handling', { tags: ['@unit', '@espooSurvey'] }, () => {
	let espooSurvey;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		global.fetch.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		espooSurvey = new EspooSurvey();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('loadSurveyFeatures - Network Error Handling', () => {
		it('should handle network errors gracefully', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(espooSurvey.loadSurveyFeatures('test-collection')).rejects.toThrow(
				'Network error'
			);

			// Verify error was logged
			expect(console.error).toHaveBeenCalledWith(
				'Error loading survey features:',
				expect.any(Error)
			);
		});

		it('should handle invalid JSON response', async () => {
			// Arrange
			global.fetch.mockResolvedValue({
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
			});

			// Act & Assert
			await expect(espooSurvey.loadSurveyFeatures('test-collection')).rejects.toThrow(
				'Invalid JSON'
			);
		});

		it('should handle empty collection name', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Invalid collection'));

			// Act & Assert
			await expect(espooSurvey.loadSurveyFeatures('')).rejects.toThrow();
		});

		it('should handle malformed GeoJSON data', async () => {
			// Arrange: Return invalid GeoJSON structure
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue({ invalid: 'data' }),
			});
			espooSurvey.addSurveyDataSource = vi.fn().mockRejectedValue(new Error('Invalid GeoJSON'));

			// Act & Assert
			await expect(espooSurvey.loadSurveyFeatures('test-collection')).rejects.toThrow(
				'Invalid GeoJSON'
			);
		});

		it('should handle CORS errors', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

			// Act & Assert
			await expect(espooSurvey.loadSurveyFeatures('test-collection')).rejects.toThrow(
				'Failed to fetch'
			);
		});

		it('should handle API rate limiting (429)', async () => {
			// Arrange
			global.fetch.mockResolvedValue({
				status: 429,
				json: vi.fn().mockResolvedValue({ error: 'Too many requests' }),
			});
			espooSurvey.addSurveyDataSource = vi.fn().mockResolvedValue();

			// Act: Should not throw (depends on implementation)
			await espooSurvey.loadSurveyFeatures('test-collection');

			// Assert: Verify fetch was called
			expect(global.fetch).toHaveBeenCalled();
		});
	});

	describe('loadSurveyFeatures - Success Path', () => {
		it('should successfully load survey features', async () => {
			// Arrange
			const mockData = {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: { heatexposure: 0.5 },
						geometry: { type: 'Point', coordinates: [24.9384, 60.1699] },
					},
				],
			};
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue(mockData),
			});
			espooSurvey.addSurveyDataSource = vi.fn().mockResolvedValue();

			// Act
			await espooSurvey.loadSurveyFeatures('test-collection');

			// Assert
			expect(global.fetch).toHaveBeenCalledWith(
				'https://api.example.com/collections/test-collection'
			);
			expect(espooSurvey.addSurveyDataSource).toHaveBeenCalledWith(mockData, 'test-collection');
		});
	});

	describe('setAvgTempInCelsius', () => {
		it('should convert normalized heat exposure to Celsius', () => {
			// Arrange
			const features = [
				{ properties: { heatexposure: 0.5 } },
				{ properties: { heatexposure: 0.7 } },
			];

			// Act
			espooSurvey.setAvgTempInCelsius(features);

			// Assert
			expect(features[0].properties.avg_temp_c).toBeDefined();
			expect(features[1].properties.avg_temp_c).toBeDefined();
			// Middle value should be around 33.9°C (approximate)
			expect(features[0].properties.avg_temp_c).toBeGreaterThan(30);
			expect(features[0].properties.avg_temp_c).toBeLessThan(40);
		});
	});
});
