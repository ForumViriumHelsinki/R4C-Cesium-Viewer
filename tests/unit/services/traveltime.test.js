import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import Traveltime from '@/services/traveltime.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Cesium module
vi.mock('cesium', () => ({
	CustomDataSource: vi.fn(function (name) {
		this.name = name;
	}),
	GeoJsonDataSource: vi.fn(function () {
		this.load = vi.fn().mockResolvedValue({ name: 'test', entities: { values: [] } });
	}),
	Color: {
		ORANGE: 'ORANGE',
		BLACK: 'BLACK',
		WHITE: 'WHITE',
	},
	HorizontalOrigin: {
		CENTER: 'CENTER',
	},
	VerticalOrigin: {
		CENTER: 'CENTER',
	},
	Cartesian2: vi.fn((x, y) => ({ x, y })),
	Cartesian3: vi.fn((x, y, z) => ({ x, y, z })),
	NearFarScalar: vi.fn((near, nearValue, far, farValue) => ({
		near,
		nearValue,
		far,
		farValue,
	})),
	BoundingSphere: {
		fromPoints: vi.fn(() => ({
			center: { x: 0, y: 0, z: 0 },
		})),
	},
	Cartographic: {
		fromCartesian: vi.fn(() => ({
			latitude: 1.05,
			longitude: 0.44,
		})),
	},
	Math: {
		toDegrees: vi.fn((val) => val * 57.2958),
	},
}));

// Mock datasource service
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.removeDataSourcesByNamePrefix = vi.fn();
		this.getDataSourceByName = vi.fn().mockReturnValue(null);
	}),
}));

// Mock population grid service
vi.mock('@/services/populationgrid.js', () => ({
	default: vi.fn(function () {
		this.createPopulationGrid = vi.fn().mockResolvedValue();
		this.setGridEntityPolygonToGreen = vi.fn();
	}),
}));

// Mock URL store
vi.mock('@/stores/urlStore.js', () => ({
	useURLStore: vi.fn(() => ({
		hkiTravelTime: vi.fn((from_id) => `https://api.example.com/traveltime/${from_id}`),
	})),
}));

// Mock toggle store
vi.mock('@/stores/toggleStore.js', () => ({
	useToggleStore: vi.fn(() => ({
		travelTime: false,
		setTravelTime: vi.fn(),
	})),
}));

// Mock global store
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: vi.fn(() => ({
		cesiumViewer: {
			dataSources: {
				add: vi.fn(),
				getByName: vi.fn().mockReturnValue([
					{
						_entityCollection: {
							_entities: {
								_array: [],
							},
						},
					},
				]),
			},
			entities: {
				add: vi.fn(),
			},
		},
		showError: vi.fn(),
	})),
}));

describe('Traveltime Service - Error Handling', { tags: ['@unit', '@traveltime'] }, () => {
	let traveltime;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		global.fetch.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		traveltime = new Traveltime();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('loadTravelTimeData - Network Error Handling', () => {
		it('should handle network errors gracefully', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(traveltime.loadTravelTimeData(5975375)).rejects.toThrow('Network error');

			// Verify error was logged
			expect(console.error).toHaveBeenCalledWith(
				'Error loading travel time data:',
				expect.any(Error)
			);
		});

		it('should handle invalid JSON response', async () => {
			// Arrange
			global.fetch.mockResolvedValue({
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
			});

			// Act & Assert
			await expect(traveltime.loadTravelTimeData(5975375)).rejects.toThrow('Invalid JSON');
		});

		it('should handle missing travel_data property', async () => {
			// Arrange: Return data without travel_data
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue({
					type: 'FeatureCollection',
					features: [{ properties: {} }], // Missing travel_data
				}),
			});

			// Act & Assert: Should throw when accessing undefined property
			await expect(traveltime.loadTravelTimeData(5975375)).rejects.toThrow();
		});

		it('should handle travel_data with empty array', async () => {
			// Arrange: Return data with empty travel_data array
			const mockData = {
				type: 'FeatureCollection',
				features: [{ properties: { travel_data: [] } }], // Empty but present
			};
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue(mockData),
			});
			traveltime.addTravelTimeLabels = vi.fn();

			// Act: Should not throw
			await expect(traveltime.loadTravelTimeData(5975375)).resolves.not.toThrow();

			// Assert: addTravelTimeLabels should be called with empty array
			expect(traveltime.addTravelTimeLabels).toHaveBeenCalledWith([]);
		});

		it('should handle empty features array', async () => {
			// Arrange
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue({
					type: 'FeatureCollection',
					features: [], // Empty array
				}),
			});

			// Act & Assert: Should throw when accessing features[0]
			await expect(traveltime.loadTravelTimeData(5975375)).rejects.toThrow();
		});

		it.each([
			[404, 'Not found'],
			[500, 'Server error'],
			[503, 'Service unavailable'],
		])('should handle %i HTTP error (%s)', async (status, message) => {
			// Arrange
			global.fetch.mockResolvedValue({
				status,
				json: vi.fn().mockRejectedValue(new Error(message)),
			});

			// Act & Assert
			await expect(traveltime.loadTravelTimeData(5975375)).rejects.toThrow(message);
		});

		it('should handle invalid from_id parameter', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Invalid grid cell ID'));

			// Act & Assert
			await expect(traveltime.loadTravelTimeData('invalid')).rejects.toThrow();
		});

		it('should handle connection timeout', async () => {
			// Arrange
			global.fetch.mockRejectedValue(new Error('Request timeout'));

			// Act & Assert
			await expect(traveltime.loadTravelTimeData(5975375)).rejects.toThrow('Request timeout');
		});
	});

	describe('loadTravelTimeData - Success Path', () => {
		it('should successfully load travel time data', async () => {
			// Arrange
			const mockData = {
				type: 'FeatureCollection',
				features: [
					{
						properties: {
							travel_data: [
								{ to_id: 5975376, pt_m_walk_avg: 12.5 },
								{ to_id: 5975377, pt_m_walk_avg: 18.3 },
							],
						},
					},
				],
			};
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue(mockData),
			});
			traveltime.addTravelTimeLabels = vi.fn();

			// Act
			await traveltime.loadTravelTimeData(5975375);

			// Assert
			expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/traveltime/5975375');
			expect(traveltime.addTravelTimeLabels).toHaveBeenCalledWith(
				mockData.features[0].properties.travel_data
			);
		});
	});

	describe('addTravelTimeLabels - Error Handling', () => {
		it('should handle missing TravelTimeGrid datasource', () => {
			// Arrange: Mock getByName to return null
			traveltime.viewer.dataSources.getByName = vi.fn().mockReturnValue(null);
			const traveldata = [{ to_id: 5975376, pt_m_walk_avg: 12.5 }];

			// Act: Should not throw
			expect(() => traveltime.addTravelTimeLabels(traveldata)).not.toThrow();

			// Assert: Console error should be logged
			expect(console.error).toHaveBeenCalledWith('TravelTimeGrid data source not found.');
		});

		it('should handle empty travel data array', () => {
			// Act & Assert: Should not throw
			expect(() => traveltime.addTravelTimeLabels([])).not.toThrow();
		});
	});

	describe('markCurrentLocation', () => {
		it('should add a marker entity at polygon center', () => {
			// Arrange
			const mockEntity = {
				polygon: {
					hierarchy: {
						getValue: vi.fn().mockReturnValue({
							positions: [{ x: 1, y: 2, z: 3 }],
						}),
					},
				},
			};

			// Act
			traveltime.markCurrentLocation(mockEntity);

			// Assert
			expect(traveltime.viewer.entities.add).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'currentLocation',
					position: expect.any(Object),
					point: expect.objectContaining({
						show: true,
						pixelSize: 42,
					}),
				})
			);
		});
	});
});
