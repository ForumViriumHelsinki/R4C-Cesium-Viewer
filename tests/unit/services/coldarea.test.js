import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import ColdArea from '@/services/coldarea.js';

// Mock fetch globally
global.fetch = vi.fn();

// Mock Cesium module
vi.mock('cesium', () => ({
	Cartesian3: {
		fromDegrees: vi.fn((lon, lat) => ({ lon, lat })),
	},
	Color: {
		ROYALBLUE: 'ROYALBLUE',
		LIGHTYELLOW: 'LIGHTYELLOW',
		BLACK: 'BLACK',
	},
}));

// Mock datasource service
vi.mock('@/services/datasource.js', () => ({
	default: vi.fn(function () {
		this.addDataSourceWithPolygonFix = vi.fn().mockResolvedValue([]);
	}),
}));

// Mock elements display service
vi.mock('@/services/elementsDisplay.js', () => ({
	default: vi.fn(function () {
		this.setColdAreasElementsDisplay = vi.fn();
	}),
}));

// Mock URL store
vi.mock('@/stores/urlStore.js', () => ({
	useURLStore: vi.fn(() => ({
		coldAreas: vi.fn((postalcode) => `https://api.example.com/coldareas/${postalcode}`),
	})),
}));

// Mock global store
vi.mock('@/stores/globalStore.js', () => ({
	useGlobalStore: vi.fn(() => ({
		postalcode: '00100',
		setIsLoading: vi.fn(),
		showError: vi.fn(),
		cesiumViewer: {
			entities: {
				add: vi.fn(),
			},
		},
	})),
}));

describe('ColdArea Service - Error Handling', { tags: ['@unit', '@coldarea'] }, () => {
	let coldArea;
	let mockStore;

	beforeEach(() => {
		setActivePinia(createPinia());
		vi.clearAllMocks();
		global.fetch.mockClear();
		vi.spyOn(console, 'error').mockImplementation(() => {});

		coldArea = new ColdArea();
		mockStore = coldArea.store;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('loadColdAreas - Network Error Handling', () => {
		it('should handle network errors gracefully', async () => {
			// Arrange: Mock fetch to reject with network error
			global.fetch.mockRejectedValue(new Error('Network error'));

			// Act & Assert
			await expect(coldArea.loadColdAreas()).rejects.toThrow('Network error');

			// Verify loading state was set and then cleared
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(true);
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(false);

			// Verify error was logged
			expect(console.error).toHaveBeenCalledWith('Error loading cold areas:', expect.any(Error));
		});

		it('should handle invalid JSON response', async () => {
			// Arrange: Mock fetch to return invalid JSON
			global.fetch.mockResolvedValue({
				json: vi.fn().mockRejectedValue(new Error('Invalid JSON')),
			});

			// Act & Assert
			await expect(coldArea.loadColdAreas()).rejects.toThrow('Invalid JSON');

			// Verify loading state cleanup in finally block
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(false);
		});

		it.each([
			[404, 'Not found'],
			[500, 'Internal server error'],
			[503, 'Service unavailable'],
		])('should handle %i HTTP error (%s)', async (status, message) => {
			// Arrange: Mock fetch to return HTTP error
			global.fetch.mockResolvedValue({
				status,
				json: vi.fn().mockResolvedValue({ error: message }),
			});

			// Act: Should not throw if JSON parsing succeeds
			await coldArea.loadColdAreas();

			// Assert: Loading state was cleaned up
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(false);
		});

		it('should handle timeout errors', async () => {
			// Arrange: Mock fetch to reject with timeout
			global.fetch.mockRejectedValue(new Error('Request timeout'));

			// Act & Assert
			await expect(coldArea.loadColdAreas()).rejects.toThrow('Request timeout');

			// Verify loading indicator is cleared even on timeout
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(false);
		});

		it('should cleanup loading state even if addDataSource fails', async () => {
			// Arrange: Mock successful fetch but failing addDataSource
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue({ type: 'FeatureCollection', features: [] }),
			});
			coldArea.addColdAreaDataSource = vi.fn().mockRejectedValue(new Error('Cesium error'));

			// Act & Assert
			await expect(coldArea.loadColdAreas()).rejects.toThrow('Cesium error');

			// Verify finally block executed
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(false);
			// Verify error was logged
			expect(console.error).toHaveBeenCalledWith('Error loading cold areas:', expect.any(Error));
		});
	});

	describe('loadColdAreas - Success Path', () => {
		it('should successfully load cold areas data', async () => {
			// Arrange
			const mockData = {
				type: 'FeatureCollection',
				features: [{ type: 'Feature', properties: { id: 1 } }],
			};
			global.fetch.mockResolvedValue({
				json: vi.fn().mockResolvedValue(mockData),
			});
			coldArea.addColdAreaDataSource = vi.fn().mockResolvedValue();

			// Act
			await coldArea.loadColdAreas();

			// Assert
			expect(global.fetch).toHaveBeenCalledWith('https://api.example.com/coldareas/00100');
			expect(coldArea.addColdAreaDataSource).toHaveBeenCalledWith(mockData);
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(true);
			expect(mockStore.setIsLoading).toHaveBeenCalledWith(false);
		});
	});

	describe('addColdPoint', () => {
		it('should add cold point entity to viewer', () => {
			// Act
			coldArea.addColdPoint('60.1699,24.9384');

			// Assert
			expect(mockStore.cesiumViewer.entities.add).toHaveBeenCalledWith(
				expect.objectContaining({
					name: 'coldpoint',
					position: expect.any(Object),
					point: expect.objectContaining({
						show: true,
						pixelSize: 15,
					}),
				})
			);
		});
	});
});
