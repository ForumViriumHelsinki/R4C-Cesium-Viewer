import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import CoolingCenterOptimiser from '../../../src/components/CoolingCenterOptimiser.vue';
import { createPinia } from 'pinia';
import { TEST_COORDINATES, DATASET_SIZES, CAMERA_CONSTANTS } from '../../config/constants';

// Mock Cesium
vi.mock('cesium', () => {
	// Create the Color constructor
	const Color = vi.fn(function (r, g, b, a) {
		this.red = r;
		this.green = g;
		this.blue = b;
		this.alpha = a;
		this.withAlpha = vi.fn((alpha) => new Color(r, g, b, alpha));
	});

	// Add static color properties
	Color.BLUE = new Color(0, 0, 1, 1);
	Color.RED = new Color(1, 0, 0, 1);
	Color.GREEN = new Color(0, 1, 0, 1);
	Color.WHITE = new Color(1, 1, 1, 1);
	Color.BLACK = new Color(0, 0, 0, 1);
	Color.YELLOW = new Color(1, 1, 0, 1);
	Color.CYAN = new Color(0, 1, 1, 1);
	Color.MAGENTA = new Color(1, 0, 1, 1);

	return {
		Color,
		Cartesian3: Object.assign(
			vi.fn(function (x, y, z) {
				this.x = x;
				this.y = y;
				this.z = z;
			}),
			{
				fromDegrees: vi.fn((lon, lat, height = 0) => ({
					x: lon,
					y: lat,
					z: height,
				})),
			}
		),
		Cartographic: {
			fromCartesian: vi.fn(() => ({
				longitude: 0,
				latitude: 0,
			})),
		},
		Math: {
			toDegrees: vi.fn((val) => (val * 180) / Math.PI),
		},
		CustomDataSource: vi.fn(function (name) {
			this.name = name;
			this.entities = {
				add: vi.fn(),
				values: [],
			};
		}),
	};
});

// Mock turf
vi.mock('@turf/turf', () => ({
	polygon: vi.fn((coords) => ({
		type: 'Feature',
		geometry: {
			type: 'Polygon',
			coordinates: coords,
		},
	})),
	centroid: vi.fn(() => ({
		geometry: {
			coordinates: [TEST_COORDINATES.HELSINKI.LNG, TEST_COORDINATES.HELSINKI.LAT], // Helsinki coordinates
		},
	})),
}));

// Mock stores
const mockCoolingCentersDataSource = {
	entities: {
		add: vi.fn(),
		values: [],
	},
};

const mockGlobalStore = {
	cesiumViewer: {
		dataSources: {
			getByName: vi.fn(() => [mockCoolingCentersDataSource]),
			add: vi.fn(),
			remove: vi.fn(),
		},
	},
};

const mockMitigationStore = {
	resetStore: vi.fn(),
	optimised: false,
	gridCells: [
		{
			id: 'grid_001',
			x: TEST_COORDINATES.TEST_POINT_1.X,
			y: TEST_COORDINATES.TEST_POINT_1.Y,
			entity: {
				properties: {
					grid_id: { getValue: () => 'grid_001' },
					euref_x: { getValue: () => TEST_COORDINATES.TEST_POINT_1.X },
					euref_y: { getValue: () => TEST_COORDINATES.TEST_POINT_1.Y },
				},
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [
								{ x: 0, y: 0, z: 0 },
								{ x: 1, y: 0, z: 0 },
								{ x: 1, y: 1, z: 0 },
								{ x: 0, y: 1, z: 0 },
							],
						}),
					},
				},
			},
		},
		{
			id: 'grid_002',
			x: 1500,
			y: 2500,
			entity: {
				properties: {
					grid_id: { getValue: () => 'grid_002' },
					euref_x: { getValue: () => 1500 },
					euref_y: { getValue: () => 2500 },
				},
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [
								{ x: 0, y: 0, z: 0 },
								{ x: 1, y: 0, z: 0 },
								{ x: 1, y: 1, z: 0 },
								{ x: 0, y: 1, z: 0 },
							],
						}),
					},
				},
			},
		},
		{
			id: 'grid_003',
			x: 2000,
			y: 3000,
			entity: {
				properties: {
					grid_id: { getValue: () => 'grid_003' },
					euref_x: { getValue: () => 2000 },
					euref_y: { getValue: () => 3000 },
				},
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [
								{ x: 0, y: 0, z: 0 },
								{ x: 1, y: 0, z: 0 },
								{ x: 1, y: 1, z: 0 },
								{ x: 0, y: 1, z: 0 },
							],
						}),
					},
				},
			},
		},
	],
	getGridImpact: vi.fn((id) => {
		const impacts = {
			grid_001: 5,
			grid_002: 8,
			grid_003: 3,
		};
		return impacts[id] || 0;
	}),
	coolingCenters: [],
	addCoolingCenter: vi.fn(function (center) {
		this.coolingCenters.push(center);
	}),
	getCoolingCenterCount: vi.fn(() => 1),
	optimalEffect: 7,
};

vi.mock('../../../src/stores/globalStore.js', () => ({
	useGlobalStore: () => mockGlobalStore,
}));

vi.mock('../../../src/stores/mitigationStore.js', () => ({
	useMitigationStore: () => mockMitigationStore,
}));

describe('CoolingCenterOptimiser Component', () => {
	let wrapper;
	let vuetify;
	let pinia;

	beforeEach(() => {
		vuetify = createVuetify({
			components,
			directives,
		});
		pinia = createPinia();

		// Reset mock state
		mockMitigationStore.coolingCenters = [];
		mockMitigationStore.resetStore.mockClear();
		mockMitigationStore.addCoolingCenter.mockClear();

		wrapper = mount(CoolingCenterOptimiser, {
			global: {
				plugins: [vuetify, pinia],
			},
		});
	});

	describe('Component Initialization', () => {
		it('should mount successfully', () => {
			expect(wrapper.exists()).toBe(true);
		});

		it('should display the correct title', () => {
			const title = wrapper.find('.v-card-title');
			expect(title.text()).toContain('Cooling Center');
			expect(title.text()).toContain('Optimization');
		});

		it('should initialize with default number of cooling centers', () => {
			expect(wrapper.vm.numCoolingCenters).toBe(DATASET_SIZES.SMALL);
		});

		it('should display the slider for number of centers', () => {
			const slider = wrapper.find('.v-slider');
			expect(slider.exists()).toBe(true);
		});

		it('should display the optimize button', () => {
			const button = wrapper.find('.v-btn');
			expect(button.text()).toBe('Optimise Locations');
		});
	});

	describe('Slider Configuration', () => {
		it('should have correct min and max values', () => {
			const slider = wrapper.findComponent({ name: 'VSlider' });
			expect(slider.props('min')).toBe('1');
			expect(slider.props('max')).toBe('50');
		});

		it('should update value when slider changes', async () => {
			wrapper.vm.numCoolingCenters = 30;
			await wrapper.vm.$nextTick();
			expect(wrapper.vm.numCoolingCenters).toBe(30);
		});
	});

	describe('Optimization Logic', () => {
		it('should reset store before optimization', async () => {
			await wrapper.vm.findOptimalCoolingCenters();
			expect(mockMitigationStore.resetStore).toHaveBeenCalled();
		});

		it('should set optimised flag to true', async () => {
			await wrapper.vm.findOptimalCoolingCenters();
			expect(mockMitigationStore.optimised).toBe(true);
		});

		it('should filter high impact grids', async () => {
			const getGridImpactSpy = vi.spyOn(mockMitigationStore, 'getGridImpact');
			await wrapper.vm.findOptimalCoolingCenters();

			// Should check impact for all grid cells
			expect(getGridImpactSpy).toHaveBeenCalledWith('grid_001');
			expect(getGridImpactSpy).toHaveBeenCalledWith('grid_002');
			expect(getGridImpactSpy).toHaveBeenCalledWith('grid_003');
		});

		it('should select cells with highest impact first', async () => {
			wrapper.vm.numCoolingCenters = 1;
			await wrapper.vm.$nextTick();
			await wrapper.vm.findOptimalCoolingCenters();

			// grid_002 has highest impact (8), should be selected first
			expect(mockMitigationStore.addCoolingCenter).toHaveBeenCalledWith(
				expect.objectContaining({
					grid_id: 'grid_002',
				})
			);
		});
	});

	describe('Distance Calculation', () => {
		it('should prevent cooling centers too close together', () => {
			// Add a cooling center at position (1000, 2000)
			mockMitigationStore.coolingCenters.push({
				grid_id: 'grid_001',
				euref_x: 1000,
				euref_y: 2000,
			});

			// Check if a cell at (1200, 2200) is too close (distance < 500)
			const tooClose = wrapper.vm.isCoolingCenterTooClose({
				x: 1200,
				y: 2200,
			});

			expect(tooClose).toBe(true);
		});

		it('should allow cooling centers at sufficient distance', () => {
			// Add a cooling center at position (1000, 2000)
			mockMitigationStore.coolingCenters.push({
				grid_id: 'grid_001',
				euref_x: 1000,
				euref_y: 2000,
			});

			// Check if a cell at (2000, 3000) is far enough (distance > 500)
			const tooClose = wrapper.vm.isCoolingCenterTooClose({
				x: 2000,
				y: 3000,
			});

			expect(tooClose).toBe(false);
		});

		it('should calculate distance correctly using Euclidean formula', () => {
			mockMitigationStore.coolingCenters.push({
				grid_id: 'grid_001',
				euref_x: 0,
				euref_y: 0,
			});

			// 3-4-5 triangle: distance should be 500
			const tooClose = wrapper.vm.isCoolingCenterTooClose({
				x: 300,
				y: 400,
			});

			expect(tooClose).toBe(true); // Exactly at 500m threshold (using <=)
		});
	});

	describe('Entity Centroid Calculation', () => {
		it('should calculate centroid from polygon positions', () => {
			const mockEntity = {
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [
								{ x: 0, y: 0, z: 0 },
								{ x: 1, y: 0, z: 0 },
								{ x: 1, y: 1, z: 0 },
								{ x: 0, y: 1, z: 0 },
							],
						}),
					},
				},
			};

			const centroid = wrapper.vm.getEntityCentroid(mockEntity);
			expect(centroid).toBeDefined();
		});

		it('should handle polygons without proper closure', () => {
			const mockEntity = {
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [
								{ x: 0, y: 0, z: 0 },
								{ x: 1, y: 0, z: 0 },
								{ x: 1, y: 1, z: 0 },
							],
						}),
					},
				},
			};

			const centroid = wrapper.vm.getEntityCentroid(mockEntity);
			expect(centroid).toBeDefined();
		});

		it('should return null for entities without polygon', () => {
			const mockEntity = {};
			const centroid = wrapper.vm.getEntityCentroid(mockEntity);
			expect(centroid).toBeNull();
		});
	});

	describe('Cooling Center Addition', () => {
		it('should add cooling center with correct properties', () => {
			const mockEntity = {
				properties: {
					grid_id: { getValue: () => 'test_grid' },
					euref_x: { getValue: () => 1500 },
					euref_y: { getValue: () => 2500 },
				},
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [{ x: 0, y: 0, z: 0 }],
						}),
					},
				},
			};

			wrapper.vm.addCoolingCenter(mockEntity);

			expect(mockMitigationStore.addCoolingCenter).toHaveBeenCalledWith({
				grid_id: 'test_grid',
				euref_x: 1500,
				euref_y: 2500,
				capacity: 1000,
			});
		});

		it('should add visual representation to data source', () => {
			const mockEntity = {
				properties: {
					grid_id: { getValue: () => 'test_grid' },
					euref_x: { getValue: () => 1500 },
					euref_y: { getValue: () => 2500 },
				},
				polygon: {
					hierarchy: {
						getValue: () => ({
							positions: [{ x: 0, y: 0, z: 0 }],
						}),
					},
				},
			};

			const addSpy = vi.spyOn(wrapper.vm.coolingCentersDataSource.entities, 'add');
			wrapper.vm.addCoolingCenter(mockEntity);

			expect(addSpy).toHaveBeenCalledWith(
				expect.objectContaining({
					id: expect.stringContaining('cooling_test_grid'),
					box: expect.objectContaining({
						dimensions: expect.objectContaining({
							x: 160,
							y: 160,
							z: 160,
						}),
					}),
				})
			);
		});
	});

	describe('Optimization Button', () => {
		it('should trigger optimization when clicked', async () => {
			const button = wrapper.find('.v-btn');

			// Clear previous calls
			mockMitigationStore.resetStore.mockClear();

			await button.trigger('click');

			// Verify optimization was triggered by checking its effects
			expect(mockMitigationStore.resetStore).toHaveBeenCalled();
			expect(mockMitigationStore.optimised).toBe(true);
		});
	});

	describe('Shuffle Algorithm', () => {
		it('should randomize array order', () => {
			const testArray = [1, 2, 3, 4, 5];
			const originalArray = [...testArray];

			wrapper.vm.shuffleArray(testArray);

			// Array length should remain the same
			expect(testArray.length).toBe(originalArray.length);

			// All original elements should still be present
			originalArray.forEach((item) => {
				expect(testArray).toContain(item);
			});
		});
	});

	describe('Optimal Effect Threshold', () => {
		it('should stop early if optimal effect is reached', async () => {
			// Set a low optimal effect threshold
			mockMitigationStore.optimalEffect = 5;

			// Only grid_002 (impact 8) exceeds the threshold
			wrapper.vm.numCoolingCenters = 3;
			await wrapper.vm.$nextTick();
			await wrapper.vm.findOptimalCoolingCenters();

			// Should only add centers for high impact grids
			expect(mockMitigationStore.addCoolingCenter).toHaveBeenCalled();
		});
	});

	describe('Edge Cases', () => {
		it('should handle zero cooling centers request', async () => {
			wrapper.vm.numCoolingCenters = 0;
			await wrapper.vm.$nextTick();
			await wrapper.vm.findOptimalCoolingCenters();

			expect(mockMitigationStore.addCoolingCenter).not.toHaveBeenCalled();
		});

		it('should handle more centers than available grids', async () => {
			wrapper.vm.numCoolingCenters = 100;
			await wrapper.vm.$nextTick();
			await wrapper.vm.findOptimalCoolingCenters();

			// Should only add as many as there are valid grids
			const callCount = mockMitigationStore.addCoolingCenter.mock.calls.length;
			expect(callCount).toBeLessThanOrEqual(mockMitigationStore.gridCells.length);
		});

		it('should handle empty grid cells array', async () => {
			mockMitigationStore.gridCells = [];

			await wrapper.vm.findOptimalCoolingCenters();

			expect(mockMitigationStore.addCoolingCenter).not.toHaveBeenCalled();
		});
	});
});
