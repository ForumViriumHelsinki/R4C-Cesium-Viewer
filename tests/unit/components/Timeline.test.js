import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import Timeline from '../../../src/components/Timeline.vue';
import { createPinia } from 'pinia';

// Mock stores
const mockPropsStore = {
  currentDataDate: '2024-06-26'
};

const mockGlobalStore = {
  cesiumViewer: null
};

vi.mock('../../../src/stores/propsStore.js', () => ({
  usePropsStore: () => mockPropsStore
}));

vi.mock('../../../src/stores/globalStore.js', () => ({
  useGlobalStore: () => mockGlobalStore
}));

// Mock Datasource service
vi.mock('../../../src/services/datasource.js', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      loadSentinelHeatData: vi.fn()
    }))
  };
});

describe('Timeline Component', () => {
  let wrapper;
  let vuetify;
  let pinia;

  beforeEach(() => {
    vuetify = createVuetify({
      components,
      directives,
    });
    pinia = createPinia();
    
    wrapper = mount(Timeline, {
      global: {
        plugins: [vuetify, pinia],
        stubs: {
          'v-slider': true // Stub the slider to avoid layout issues in tests
        }
      }
    });
  });

  describe('Component Initialization', () => {
    it('should mount successfully', () => {
      expect(wrapper.exists()).toBe(true);
    });

    it('should display the title', () => {
      const title = wrapper.find('h3');
      expect(title.text()).toBe('Landsat heatmap from satellites');
    });

    it('should display the selected date', () => {
      const dateDisplay = wrapper.find('.date-display');
      expect(dateDisplay.text()).toContain('2024-06-26');
    });
  });

  describe('2025 Satellite Data', () => {
    it('should include 2025-07-14 in the available dates', () => {
      const dates = wrapper.vm.dates;
      expect(dates).toContain('2025-07-14');
    });

    it('should have all satellite data dates from 2003 to 2025', () => {
      const expectedDates = [
        '2003-06-08',
        '2004-06-18',
        '2005-06-13',
        '2006-06-08',
        '2007-06-03',
        '2008-07-31',
        '2009-07-10',
        '2010-08-14',
        '2011-07-19',
        '2012-07-13',
        '2013-08-01',
        '2014-07-13',
        '2015-07-08',
        '2016-06-03',
        '2018-07-27',
        '2019-06-05',
        '2020-06-23',
        '2021-07-12',
        '2022-06-28',
        '2023-06-23',
        '2024-06-26',
        '2025-07-14'
      ];
      
      const dates = wrapper.vm.dates;
      expect(dates).toEqual(expectedDates);
      expect(dates.length).toBe(22);
    });

    it('should calculate correct index for 2025 date', () => {
      const dates = wrapper.vm.dates;
      const index2025 = dates.indexOf('2025-07-14');
      expect(index2025).toBe(21); // Last position
    });

    it('should handle selection of 2025 date', async () => {
      await wrapper.setData({ selectedDate: '2025-07-14' });
      expect(wrapper.vm.selectedDate).toBe('2025-07-14');
      
      const dateDisplay = wrapper.find('.date-display');
      expect(dateDisplay.text()).toContain('2025-07-14');
    });
  });

  describe('Date Navigation', () => {
    it('should navigate forward through dates', async () => {
      const initialDate = '2024-06-26';
      await wrapper.setData({ selectedDate: initialDate });
      
      const nextButton = wrapper.find('.mdi-chevron-right').element.closest('button');
      await wrapper.find('.mdi-chevron-right').trigger('click');
      
      expect(wrapper.vm.selectedDate).toBe('2025-07-14');
    });

    it('should navigate backward through dates', async () => {
      const initialDate = '2025-07-14';
      await wrapper.setData({ selectedDate: initialDate });
      
      await wrapper.find('.mdi-chevron-left').trigger('click');
      
      expect(wrapper.vm.selectedDate).toBe('2024-06-26');
    });

    it('should disable next button on last date', async () => {
      await wrapper.setData({ selectedDate: '2025-07-14' });
      await wrapper.vm.$nextTick();
      
      const nextButton = wrapper.find('.mdi-chevron-right').element.closest('button');
      expect(nextButton.disabled).toBe(true);
    });

    it('should disable previous button on first date', async () => {
      await wrapper.setData({ selectedDate: '2003-06-08' });
      await wrapper.vm.$nextTick();
      
      const prevButton = wrapper.find('.mdi-chevron-left').element.closest('button');
      expect(prevButton.disabled).toBe(true);
    });
  });

  describe('Data Loading', () => {
    it('should load satellite data when date changes', async () => {
      const datasourceService = wrapper.vm.datasourceService;
      const loadSpy = vi.spyOn(datasourceService, 'loadSentinelHeatData');
      
      await wrapper.setData({ selectedDate: '2025-07-14' });
      
      expect(loadSpy).toHaveBeenCalledWith('2025-07-14');
    });

    it('should update store when date changes', async () => {
      await wrapper.setData({ selectedDate: '2025-07-14' });
      expect(mockPropsStore.currentDataDate).toBe('2025-07-14');
    });
  });

  describe('Slider Integration', () => {
    it('should calculate correct slider width', () => {
      global.innerWidth = 1920;
      const expectedWidth = (1920 - Math.min(Math.max(1920 * 0.375, 400), 800)) * 0.88;
      expect(wrapper.vm.sliderWidth).toBeCloseTo(expectedWidth, 0);
    });

    it('should update slider width on window resize', async () => {
      global.innerWidth = 1024;
      window.dispatchEvent(new Event('resize'));
      await wrapper.vm.$nextTick();
      
      const newExpectedWidth = (1024 - Math.min(Math.max(1024 * 0.375, 400), 800)) * 0.88;
      expect(wrapper.vm.sliderWidth).toBeCloseTo(newExpectedWidth, 0);
    });

    it('should sync slider position with selected date', async () => {
      await wrapper.setData({ selectedDate: '2025-07-14' });
      const expectedIndex = wrapper.vm.dates.indexOf('2025-07-14');
      expect(wrapper.vm.currentPropertyIndex).toBe(expectedIndex);
    });
  });

  describe('Year Gap Handling', () => {
    it('should handle missing 2017 data correctly', () => {
      const dates = wrapper.vm.dates;
      const index2016 = dates.indexOf('2016-06-03');
      const index2018 = dates.indexOf('2018-07-27');
      
      // Verify 2017 is missing
      expect(index2018 - index2016).toBe(1);
      expect(dates.find(d => d.startsWith('2017'))).toBeUndefined();
    });
  });

  describe('Responsive Design', () => {
    it('should show timeline when width > 600px', async () => {
      global.innerWidth = 800;
      window.dispatchEvent(new Event('resize'));
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.showTimeline).toBe(true);
      expect(wrapper.find('.date-slider').exists()).toBe(true);
    });

    it('should hide timeline when width <= 600px', async () => {
      global.innerWidth = 500;
      window.dispatchEvent(new Event('resize'));
      await wrapper.vm.$nextTick();
      
      expect(wrapper.vm.showTimeline).toBe(false);
      expect(wrapper.find('.date-slider').exists()).toBe(false);
    });
  });

  describe('Lifecycle Hooks', () => {
    it('should add resize listener on mount', () => {
      const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
      mount(Timeline, {
        global: {
          plugins: [vuetify, pinia],
          stubs: { 'v-slider': true }
        }
      });
      
      expect(addEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });

    it('should remove resize listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      wrapper.unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    });
  });

  describe('Date Format and Display', () => {
    it('should format dates correctly', () => {
      const date = '2025-07-14';
      const dateDisplay = wrapper.find('.date-display');
      
      wrapper.vm.selectedDate = date;
      expect(dateDisplay.text()).toContain(date);
    });

    it('should handle all date formats consistently', () => {
      const dates = wrapper.vm.dates;
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      
      dates.forEach(date => {
        expect(date).toMatch(datePattern);
      });
    });
  });
});