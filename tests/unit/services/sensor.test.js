import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import Sensor from '@/services/sensor.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Cesium module
vi.mock('cesium', () => ({
	GeoJsonDataSource: vi.fn(function () {
		this.load = vi.fn().mockResolvedValue({ name: 'test', entities: { values: [] } });
	}),
	Color: {
		ORANGE: 'ORANGE',
		BLUE: 'BLUE',
		YELLOW: 'YELLOW',
	},
	HorizontalOrigin: {
		CENTER: 'CENTER',
	},
	VerticalOrigin: {
		CENTER: 'CENTER',
	},
	Cartesian2: vi.fn((x, y) => ({ x, y })),
	Cartesian3: vi.fn((x, y, z) => ({ x, y, z })),
}));

// Mock datasource service
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.addDataSourceWithPolygonFix = vi.fn().mockResolvedValue([]);
	}),
}));

// Mock global store
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: vi.fn(() => ({
		cesiumViewer: {
			dataSources: {
				add: vi.fn(),
			},
		},
	})),
}));

describe('Sensor Service - Error Handling', { tags: ['@unit', '@sensor'] }, () => {
	let sensor;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		global.fetch.mockClear();

		sensor = new Sensor();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('loadSensorData - Network Error Handling', () => {
		it('should handle network errors gracefully', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('Network error');

			// Verify error was logged
			expect(console.error).toHaveBeenCalledWith('Error loading sensor data:', expect.any(Error));
		});

		it('should handle invalid JSON response', async () => {
			// Arrange
			global.fetch.mockResolvedValue({
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
			});

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('Invalid JSON');
		});

		it('should handle CORS errors from external API', async () => {
			// Arrange: Simulate CORS error
			global.fetch.mockRejectedValue(new TypeError('Failed to fetch'));

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('Failed to fetch');
		});

		it('should handle API unavailability (503)', async () => {
			// Arrange
			global.fetch.mockResolvedValue({
				status: 503,
				json: vi.fn().mockRejectedValue(new Error('Service unavailable')),
			});

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('Service unavailable');
		});

		it('should handle connection timeout', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Request timeout'));

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('Request timeout');
		});

		it('should handle malformed GeoJSON from sensor API', async () => {
			// Arrange: Return invalid GeoJSON
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue({ invalid: 'structure' }),
			});
			sensor.addSensorDataSource = vi.fn().mockRejectedValue(new Error('Invalid GeoJSON format'));

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('Invalid GeoJSON format');
		});

		it('should handle SSL/TLS certificate errors', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('SSL certificate problem'));

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('SSL certificate problem');
		});

		it('should handle DNS resolution errors', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

			// Act & Assert
			await expect(sensor.loadSensorData()).rejects.toThrow('getaddrinfo ENOTFOUND');
		});
	});

	describe('loadSensorData - Success Path', () => {
		it('should successfully load sensor data', async () => {
			// Arrange
			const mockData = {
				type: 'FeatureCollection',
				features: [
					{
						type: 'Feature',
						properties: {
							measurement: {
								temp_air: 23.5,
								rh_air: 65.2,
								time: '2023-06-23T12:00:00Z',
							},
						},
						geometry: { type: 'Point', coordinates: [24.9384, 60.1699] },
					},
				],
			};
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue(mockData),
			});
			sensor.addSensorDataSource = vi.fn().mockResolvedValue();

			// Act
			await sensor.loadSensorData();

			// Assert
			expect(global.fetch).toHaveBeenCalledWith('https://bri3.fvh.io/opendata/r4c/r4c_last.geojson');
			expect(sensor.addSensorDataSource).toHaveBeenCalledWith(mockData);
		});
	});

	describe('addSensorDataSource', () => {
		it('should process sensor entities and add labels', async () => {
			// Arrange
			const mockEntities = [
				{
					properties: {
						_measurement: {
							_value: {
								temp_air: 23.5,
								rh_air: 65.2,
								time: '2023-06-23T12:00:00Z',
							},
						},
					},
					billboard: {},
					point: {},
					polyline: {},
					polygon: {},
				},
			];
			sensor.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);
			const mockData = { type: 'FeatureCollection', features: [] };

			// Act
			await sensor.addSensorDataSource(mockData);

			// Assert
			expect(mockEntities[0].label).toBeDefined();
			expect(mockEntities[0].billboard).toBeUndefined();
			expect(mockEntities[0].point).toBeUndefined();
			expect(mockEntities[0].polyline).toBeUndefined();
			expect(mockEntities[0].polygon).toBeUndefined();
		});

		it('should handle entities without measurement data', async () => {
			// Arrange
			const mockEntities = [
				{
					properties: {
						_measurement: {
							_value: null, // No measurement
						},
					},
				},
			];
			sensor.datasourceService.addDataSourceWithPolygonFix = vi
				.fn()
				.mockResolvedValue(mockEntities);
			const mockData = { type: 'FeatureCollection', features: [] };

			// Act: Should not throw
			await expect(sensor.addSensorDataSource(mockData)).resolves.not.toThrow();

			// Assert: No label should be added
			expect(mockEntities[0].label).toBeUndefined();
		});
	});
});
