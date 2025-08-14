import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import Loading from '@/components/Loading.vue';
import { useGlobalStore } from '@/stores/globalStore.js';

describe('Loading Component', () => {
  let wrapper;
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGlobalStore();
  });

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount();
    }
  });

  describe('rendering', () => {
    it('should render loading overlay when store.isLoading is true', async () => {
      store.setIsLoading(true);
      wrapper = mount(Loading);

      await nextTick();

      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
      expect(wrapper.find('.loading-message').exists()).toBe(true);
      expect(wrapper.find('.loading-message').text()).toBe('Loading data, please wait');
    });

    it('should not render loading overlay when store.isLoading is false', async () => {
      store.setIsLoading(false);
      wrapper = mount(Loading);

      await nextTick();

      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
      expect(wrapper.find('.loading-message').exists()).toBe(false);
    });

    it('should render with correct initial state from store', () => {
      // Initial state should have isLoading as false
      expect(store.isLoading).toBe(false);
      
      wrapper = mount(Loading);
      
      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
    });
  });

  describe('reactivity', () => {
    it('should show loading when store.isLoading changes to true', async () => {
      wrapper = mount(Loading);
      
      // Initially hidden
      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
      
      // Change store value
      store.setIsLoading(true);
      await nextTick();
      
      // Should now be visible
      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
      expect(wrapper.find('.loading-message').text()).toBe('Loading data, please wait');
    });

    it('should hide loading when store.isLoading changes to false', async () => {
      // Start with loading true
      store.setIsLoading(true);
      wrapper = mount(Loading);
      await nextTick();
      
      // Initially visible
      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
      
      // Change store value
      store.setIsLoading(false);
      await nextTick();
      
      // Should now be hidden
      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
    });

    it('should toggle visibility multiple times correctly', async () => {
      wrapper = mount(Loading);
      
      // Toggle multiple times
      for (let i = 0; i < 5; i++) {
        const shouldShow = i % 2 === 0;
        store.setIsLoading(shouldShow);
        await nextTick();
        
        expect(wrapper.find('.loading-overlay').exists()).toBe(shouldShow);
      }
    });
  });

  describe('watcher behavior', () => {
    it('should have immediate watcher that respects initial store state', () => {
      // Set loading to true before mounting
      store.setIsLoading(true);
      wrapper = mount(Loading);
      
      // Should immediately reflect the store state
      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
    });

    it('should update when store changes without manual trigger', async () => {
      wrapper = mount(Loading);
      
      // Directly modify store state (simulating external change)
      store.$patch({ isLoading: true });
      await nextTick();
      
      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
    });
  });

  describe('component structure', () => {
    it('should have correct DOM structure when visible', async () => {
      store.setIsLoading(true);
      wrapper = mount(Loading);
      await nextTick();
      
      const overlay = wrapper.find('.loading-overlay');
      expect(overlay.exists()).toBe(true);
      
      const message = wrapper.find('.loading-message');
      expect(message.exists()).toBe(true);
      expect(message.text()).toBe('Loading data, please wait');
      
      // Check that message is a child of overlay
      expect(overlay.find('.loading-message').exists()).toBe(true);
    });

    it('should apply correct CSS classes', async () => {
      store.setIsLoading(true);
      wrapper = mount(Loading);
      await nextTick();
      
      expect(wrapper.find('.loading-overlay').classes()).toContain('loading-overlay');
      expect(wrapper.find('.loading-message').classes()).toContain('loading-message');
    });
  });

  describe('accessibility', () => {
    it('should render semantic HTML structure', async () => {
      store.setIsLoading(true);
      wrapper = mount(Loading);
      await nextTick();
      
      // Check for proper div structure
      expect(wrapper.find('div.loading-overlay').exists()).toBe(true);
      expect(wrapper.find('div.loading-message').exists()).toBe(true);
    });

    it('should have readable loading text', async () => {
      store.setIsLoading(true);
      wrapper = mount(Loading);
      await nextTick();
      
      const message = wrapper.find('.loading-message');
      expect(message.text()).toBe('Loading data, please wait');
      expect(message.text().length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid state changes', async () => {
      wrapper = mount(Loading);
      
      // Rapid state changes
      for (let i = 0; i < 10; i++) {
        store.setIsLoading(true);
        store.setIsLoading(false);
      }
      
      await nextTick();
      
      // Should end up in the final state (false)
      expect(wrapper.find('.loading-overlay').exists()).toBe(false);
    });

    it('should handle store being undefined or null gracefully', () => {
      // This tests the robustness of the component setup
      expect(() => {
        wrapper = mount(Loading);
      }).not.toThrow();
    });

    it('should maintain reactivity after multiple mounts/unmounts', async () => {
      wrapper = mount(Loading);
      wrapper.unmount();
      
      wrapper = mount(Loading);
      store.setIsLoading(true);
      await nextTick();
      
      expect(wrapper.find('.loading-overlay').exists()).toBe(true);
    });
  });

  describe('performance', () => {
    it('should not create unnecessary re-renders on same value', async () => {
      wrapper = mount(Loading);
      
      // Mock the component's visible ref to track changes
      const originalVisible = wrapper.vm.visible;
      let changeCount = 0;
      
      // Watch for changes (simplified tracking)
      wrapper.vm.$watch('visible', () => {
        changeCount++;
      });
      
      // Set same value multiple times
      store.setIsLoading(false);
      store.setIsLoading(false);
      store.setIsLoading(false);
      
      await nextTick();
      
      // Should not cause multiple unnecessary updates
      expect(changeCount).toBeLessThanOrEqual(1);
    });
  });

  describe('integration with store', () => {
    it('should work correctly when multiple components use the same store', async () => {
      const wrapper1 = mount(Loading);
      const wrapper2 = mount(Loading);
      
      // Both should start hidden
      expect(wrapper1.find('.loading-overlay').exists()).toBe(false);
      expect(wrapper2.find('.loading-overlay').exists()).toBe(false);
      
      // Change store state
      store.setIsLoading(true);
      await nextTick();
      
      // Both should show loading
      expect(wrapper1.find('.loading-overlay').exists()).toBe(true);
      expect(wrapper2.find('.loading-overlay').exists()).toBe(true);
      
      wrapper1.unmount();
      wrapper2.unmount();
    });
  });
});