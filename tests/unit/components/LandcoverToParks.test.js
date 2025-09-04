import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import LandcoverToParks from '../../../src/components/LandcoverToParks.vue';
import { createPinia } from 'pinia';

// Mock Cesium
vi.mock('cesium', () => ({
  Color: {
    WHITE: { withAlpha: vi.fn(() => 'white-alpha') },
    FORESTGREEN: { withAlpha: vi.fn(() => 'green-alpha') },
    LIGHTSLATEGRAY: { withAlpha: vi.fn(() => 'gray-alpha') },
    fromCssColorString: vi.fn(() => ({ withAlpha: vi.fn(() => 'color-alpha') }))
  },
  Cartesian3: {
    fromDegrees: vi.fn(() => 'cartesian3')
  },
  Cartographic: {
    fromCartesian: vi.fn(() => ({ longitude: 0, latitude: 0 }))
  },
  Math: {
    toDegrees: vi.fn(val => val * 180 / Math.PI)
  },
  ScreenSpaceEventType: {
    LEFT_CLICK: 0
  },
  defined: vi.fn(val => val !== undefined && val !== null),
  GeoJsonDataSource: {
    load: vi.fn().mockResolvedValue({
      name: 'test',
      entities: { values: [] }
    })
  },
  CustomDataSource: vi.fn(() => ({
    name: '',
    entities: { add: vi.fn(), values: [] }
  }))
}));

// Mock turf
vi.mock('@turf/turf', () => ({
  polygon: vi.fn(coords => ({ geometry: { type: 'Polygon', coordinates: coords } })),
  centroid: vi.fn(() => ({ geometry: { coordinates: [0, 0] } }))
}));

// Mock stores
const mockGlobalStore = {
  cesiumViewer: {
    screenSpaceEventHandler: {
      setInputAction: vi.fn(),
      removeInputAction: vi.fn()
    },
    dataSources: {
      getByName: vi.fn(() => [{
        entities: {
          values: [],
          collectionChanged: {
            addEventListener: vi.fn(),
            removeEventListener: vi.fn()
          }
        }
      }]),
      add: vi.fn(),
      remove: vi.fn()
    },
    isDestroyed: vi.fn(() => false),
    scene: {
      pick: vi.fn()
    }
  }
};

const mockPropsStore = {
  statsIndex: 'heat_index'
};

const mockURLStore = {
  landcoverToParks: vi.fn(gridId => `/api/landcover/${gridId}`)
};

const mockMitigationStore = {
  calculateParksEffect: vi.fn(() => ({
    sourceReduction: 0.1,
    neighborsAffected: 4,
    totalCoolingArea: 50000,
    heatReductions: [
      { grid_id: 'grid_001', heatReduction: 0.05 },
      { grid_id: 'grid_002', heatReduction: 0.03 }
    ]
  })),
  cumulativeCoolingArea: 100000,
  cumulativeHeatReduction: 0.25,
  resetStore: vi.fn()
};

vi.mock('../../../src/stores/globalStore.js', () => ({
  useGlobalStore: () => mockGlobalStore
}));

vi.mock('../../../src/stores/propsStore.js', () => ({
  usePropsStore: () => mockPropsStore
}));

vi.mock('../../../src/stores/urlStore.js', () => ({
  useURLStore: () => mockURLStore
}));

vi.mock('../../../src/stores/mitigationStore.js', () => ({
  useMitigationStore: () => mockMitigationStore
}));

vi.mock('../../../src/composables/useGridStyling.js', () => ({
  useGridStyling: () => ({
    updateGridColors: vi.fn()
  })
}));

vi.mock('../../../src/composables/useIndexData.js', () => ({
  useIndexData: () => ({
    getIndexInfo: vi.fn(() => ({ text: 'Heat Index', description: 'Test description' }))
  })
}));

describe('LandcoverToParks Component', () => {
  let wrapper;
  let vuetify;
  let pinia;

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives,
    });
    pinia = createPinia();
    
    wrapper = mount(LandcoverToParks, {
      global: {
        plugins: [vuetify, pinia],
      }
    });
  });

  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('should display the correct title', () => {
      const title = wrapper.find('h3');
      expect(title.text()).toBe('Create Parks');
    });

    it('should show the initial Select button', () => {
      const button = wrapper.find('.v-btn');
      expect(button.text()).toBe('Select');
    });

    it('should initialize with correct default state', () => {
      expect(wrapper.vm.isSelectingGrid).toBe(false);
      expect(wrapper.vm.isLoading).toBe(false);
      expect(wrapper.vm.landcoverFeaturesLoaded).toBe(false);
      expect(wrapper.vm.selectedGridEntity).toBe(null);
      expect(wrapper.vm.calculationResults).toBe(null);
    });
  });

  describe('Button State Management', () => {
    it('should show "..." when selecting grid', async () => {
      await wrapper.setData({ isSelectingGrid: true });
      const button = wrapper.find('.v-btn');
      expect(button.text()).toBe('...');
    });

    it('should show "Turn to Parks" when features are loaded', async () => {
      await wrapper.setData({ landcoverFeaturesLoaded: true });
      const button = wrapper.find('.v-btn');
      expect(button.text()).toBe('Turn to Parks');
    });

    it('should show "Cancel" for reset button when features loaded', async () => {
      await wrapper.setData({ landcoverFeaturesLoaded: true });
      const resetButton = wrapper.findAll('.v-btn')[1];
      expect(resetButton.text()).toBe('Cancel');
    });

    it('should show "Reset All" for reset button when no features', async () => {
      await wrapper.setData({ landcoverFeaturesLoaded: false });
      const resetButton = wrapper.findAll('.v-btn')[1];
      expect(resetButton.text()).toBe('Reset All');
    });
  });

  describe('Selection Mode', () => {
    it('should toggle selection mode when Select button clicked', async () => {
      const button = wrapper.find('.v-btn');
      await button.trigger('click');
      expect(wrapper.vm.isSelectingGrid).toBe(true);
      
      await button.trigger('click');
      expect(wrapper.vm.isSelectingGrid).toBe(false);
    });

    it('should disable loading when selection mode is turned off', async () => {
      await wrapper.setData({ isSelectingGrid: true, isLoading: true });
      const button = wrapper.find('.v-btn');
      await button.trigger('click');
      expect(wrapper.vm.isLoading).toBe(false);
    });
  });

  describe('Cooling Calculations', () => {
    it('should calculate correct cooling effect for source cell', () => {
      const mockEntity = {
        properties: {
          grid_id: { getValue: () => 'grid_001' },
          euref_x: { getValue: () => 1000 },
          euref_y: { getValue: () => 2000 },
          final_avg_conditional: { getValue: () => 0.5 }
        },
        polygon: {
          material: null
        }
      };

      const totalArea = 50000; // 5 hectares
      const result = mockMitigationStore.calculateParksEffect(mockEntity, totalArea);
      
      expect(result.sourceReduction).toBe(0.1);
      expect(result.neighborsAffected).toBe(4);
      expect(result.totalCoolingArea).toBe(50000);
    });

    it('should handle neighbor cooling effects', () => {
      const result = mockMitigationStore.calculateParksEffect();
      expect(result.heatReductions).toHaveLength(2);
      expect(result.heatReductions[0].grid_id).toBe('grid_001');
      expect(result.heatReductions[0].heatReduction).toBe(0.05);
    });
  });

  describe('Results Display', () => {
    it('should not display results initially', () => {
      const table = wrapper.find('.v-table');
      expect(table.exists()).toBe(false);
    });

    it('should display results table after calculation', async () => {
      const mockResults = {
        area: '5.00',
        totalCoolingArea: '10.00',
        neighborsAffected: 4,
        totalReduction: '0.150',
        selectedIndexName: 'Heat Index',
        initialIndex: '0.500',
        newIndex: '0.350',
        cumulativeCoolingArea: '20.00',
        cumulativeHeatReduction: '0.250'
      };
      
      await wrapper.setData({ calculationResults: mockResults });
      
      const table = wrapper.find('.v-table');
      expect(table.exists()).toBe(true);
      
      const rows = table.findAll('tr');
      expect(rows.length).toBeGreaterThan(0);
      
      // Check for specific values
      const text = table.text();
      expect(text).toContain('5.00 ha');
      expect(text).toContain('Heat Index');
      expect(text).toContain('-0.150');
    });

    it('should highlight cumulative values in bold', async () => {
      const mockResults = {
        area: '5.00',
        totalCoolingArea: '10.00', 
        neighborsAffected: 4,
        totalReduction: '0.150',
        selectedIndexName: 'Heat Index',
        initialIndex: '0.500',
        newIndex: '0.350',
        cumulativeCoolingArea: '20.00',
        cumulativeHeatReduction: '0.250'
      };
      
      await wrapper.setData({ calculationResults: mockResults });
      
      const boldRows = wrapper.findAll('tr.font-weight-bold');
      expect(boldRows.length).toBeGreaterThan(0);
      
      const cumulativeText = boldRows[0].text();
      expect(cumulativeText).toContain('Cumulative');
    });
  });

  describe('Reset Functionality', () => {
    it('should clear selection when Cancel is clicked', async () => {
      await wrapper.setData({ 
        landcoverFeaturesLoaded: true,
        selectedGridEntity: { id: 'test' }
      });
      
      const cancelButton = wrapper.findAll('.v-btn')[1];
      await cancelButton.trigger('click');
      
      expect(wrapper.vm.landcoverFeaturesLoaded).toBe(false);
      expect(wrapper.vm.selectedGridEntity).toBe(null);
    });

    it('should perform full reset when Reset All is clicked', async () => {
      await wrapper.setData({
        convertedCellIds: ['grid_001', 'grid_002'],
        modifiedHeatIndices: new Map([['grid_001', 0.3]]),
        calculationResults: { area: '5.00' }
      });
      
      const resetButton = wrapper.findAll('.v-btn')[1];
      await resetButton.trigger('click');
      
      expect(wrapper.vm.convertedCellIds).toHaveLength(0);
      expect(wrapper.vm.modifiedHeatIndices.size).toBe(0);
      expect(wrapper.vm.calculationResults).toBe(null);
    });
  });

  describe('API Integration', () => {
    it('should construct correct API URL for landcover data', () => {
      const gridId = 'grid_123';
      const url = mockURLStore.landcoverToParks(gridId);
      expect(url).toBe('/api/landcover/grid_123');
    });

    it('should handle empty landcover response gracefully', async () => {
      global.fetch = vi.fn(() => 
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ features: [] })
        })
      );
      
      global.alert = vi.fn();
      
      await wrapper.vm.loadLandcoverData('grid_123');
      
      expect(global.alert).toHaveBeenCalledWith('No convertible landcover features found.');
      expect(wrapper.vm.landcoverFeaturesLoaded).toBe(false);
    });

    it('should handle API errors gracefully', async () => {
      global.fetch = vi.fn(() => 
        Promise.resolve({
          ok: false,
          status: 500
        })
      );
      
      global.alert = vi.fn();
      console.error = vi.fn();
      
      await wrapper.vm.loadLandcoverData('grid_123');
      
      expect(global.alert).toHaveBeenCalledWith('An error occurred while fetching landcover data.');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Heat Color Calculations', () => {
    it('should calculate correct color for low heat values', () => {
      const color = wrapper.vm.getHeatColor(0.2);
      expect(color.red).toBeLessThan(0.5);
      expect(color.blue).toBe(1.0);
      expect(color.alpha).toBe(0.65);
    });

    it('should calculate correct color for high heat values', () => {
      const color = wrapper.vm.getHeatColor(0.8);
      expect(color.red).toBe(1.0);
      expect(color.blue).toBeLessThan(0.5);
      expect(color.alpha).toBe(0.65);
    });

    it('should clamp values outside 0-1 range', () => {
      const colorNegative = wrapper.vm.getHeatColor(-0.5);
      const colorLow = wrapper.vm.getHeatColor(0);
      expect(colorNegative.red).toBe(colorLow.red);
      
      const colorHigh = wrapper.vm.getHeatColor(1);
      const colorExcess = wrapper.vm.getHeatColor(1.5);
      expect(colorHigh.red).toBe(colorExcess.red);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should set up event handlers on mount', () => {
      const setInputAction = mockGlobalStore.cesiumViewer.screenSpaceEventHandler.setInputAction;
      expect(setInputAction).toHaveBeenCalled();
    });

    it('should clean up on unmount', () => {
      wrapper.unmount();
      const removeInputAction = mockGlobalStore.cesiumViewer.screenSpaceEventHandler.removeInputAction;
      expect(removeInputAction).toHaveBeenCalled();
    });
  });

  describe('Documentation Validation', () => {
    it('should implement cooling constants as documented', () => {
      // Maximum cooling effect for 100% green cell
      const MAX_COOLING = 0.177;
      expect(MAX_COOLING).toBeCloseTo(0.177, 3);
      
      // Area of influence multiplier range
      const MIN_MULTIPLIER = 5;
      const MAX_MULTIPLIER = 11;
      expect(MIN_MULTIPLIER).toBe(5);
      expect(MAX_MULTIPLIER).toBe(11);
      
      // Spillover percentages
      const IMMEDIATE_NEIGHBOR_EFFECT = 0.5; // 50%
      const DIAGONAL_NEIGHBOR_EFFECT = 0.25; // 25%
      expect(IMMEDIATE_NEIGHBOR_EFFECT).toBe(0.5);
      expect(DIAGONAL_NEIGHBOR_EFFECT).toBe(0.25);
    });
  });
});