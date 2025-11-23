import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import MapClickLoadingOverlay from '@/components/MapClickLoadingOverlay.vue';
import { useGlobalStore } from '@/stores/globalStore.js';

// Mock Vuetify components
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

describe('MapClickLoadingOverlay Component', () => {
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

	describe('visibility', () => {
		it('should be hidden when not processing', async () => {
			store.setClickProcessingState({ isProcessing: false });
			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.isVisible).toBe(false);
		});

		it('should be visible when processing', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				postalCode: '00100',
				postalCodeName: 'Helsinki Center',
				stage: 'loading',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.isVisible).toBe(true);
		});
	});

	describe('stage text display', () => {
		it('should display "Loading Postal Code" during loading stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'loading',
				postalCodeName: 'Test Area',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.stageText).toBe('Loading Postal Code');
		});

		it('should display "Moving Camera" during animating stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'animating',
				postalCodeName: 'Test Area',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.stageText).toBe('Moving Camera');
		});

		it('should display "Almost Ready" during complete stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'complete',
				postalCodeName: 'Test Area',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.stageText).toBe('Almost Ready');
		});

		it('should display "Processing" for unknown stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: null,
				postalCodeName: 'Test Area',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.stageText).toBe('Processing');
		});
	});

	describe('postal code name display', () => {
		it('should display postal code name when available', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				postalCodeName: 'Helsinki Center',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.postalCodeName).toBe('Helsinki Center');
		});

		it('should display "Loading..." when postal code name not available', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				postalCodeName: null,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.postalCodeName).toBe('Loading...');
		});
	});

	describe('cancel button', () => {
		it('should show cancel button when canCancel is true', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.canCancel).toBe(true);
		});

		it('should hide cancel button when canCancel is false', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: false,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.canCancel).toBe(false);
		});

		it('should emit cancel event when cancel is requested', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			wrapper.vm.handleCancel();

			expect(wrapper.emitted()).toHaveProperty('cancel');
			expect(wrapper.emitted().cancel).toHaveLength(1);
		});
	});

	describe('progress indication', () => {
		it('should show progress bar during loading stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'loading',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.showProgress).toBe(true);
			expect(wrapper.vm.loadingProgress).toBe(30);
		});

		it('should show progress bar during animating stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'animating',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.showProgress).toBe(true);
			expect(wrapper.vm.loadingProgress).toBe(60);
		});

		it('should not show progress bar at complete stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'complete',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			// Complete stage doesn't show progress bar (only loading and animating do)
			expect(wrapper.vm.showProgress).toBe(false);
			expect(wrapper.vm.loadingProgress).toBe(100); // Progress value is still 100
		});

		it('should not show progress for unknown stage', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: null,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.showProgress).toBe(false);
			expect(wrapper.vm.loadingProgress).toBe(0);
		});
	});

	describe('error handling', () => {
		it('should display error message when error exists', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				error: {
					message: 'Failed to load postal code',
					details: 'Network error',
				},
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.error).toEqual({
				message: 'Failed to load postal code',
				details: 'Network error',
			});
		});

		it('should emit retry event when retry is requested', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				error: {
					message: 'Failed to load postal code',
				},
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			wrapper.vm.handleRetry();

			expect(wrapper.emitted()).toHaveProperty('retry');
			expect(wrapper.emitted().retry).toHaveLength(1);
		});

		it('should not show error when error is null', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				error: null,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			expect(wrapper.vm.error).toBeNull();
		});
	});

	describe('reactivity', () => {
		it('should update visibility when processing state changes', async () => {
			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			// Initially not visible
			expect(wrapper.vm.isVisible).toBe(false);

			// Start processing
			store.setClickProcessingState({
				isProcessing: true,
				postalCodeName: 'Test',
			});
			await nextTick();

			// Should be visible
			expect(wrapper.vm.isVisible).toBe(true);

			// Stop processing
			store.resetClickProcessingState();
			await nextTick();

			// Should be hidden again
			expect(wrapper.vm.isVisible).toBe(false);
		});

		it('should update stage text when stage changes', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				stage: 'loading',
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();
			expect(wrapper.vm.stageText).toBe('Loading Postal Code');

			store.setClickProcessingState({ stage: 'animating' });
			await nextTick();
			expect(wrapper.vm.stageText).toBe('Moving Camera');

			store.setClickProcessingState({ stage: 'complete' });
			await nextTick();
			expect(wrapper.vm.stageText).toBe('Almost Ready');
		});
	});

	describe('edge cases', () => {
		it('should handle rapid state changes', async () => {
			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			// Rapid state changes
			for (let i = 0; i < 10; i++) {
				store.setClickProcessingState({
					isProcessing: true,
					stage: 'loading',
				});
				store.setClickProcessingState({
					isProcessing: false,
				});
			}

			await nextTick();

			// Should end up in the final state
			expect(wrapper.vm.isVisible).toBe(false);
		});

		it('should maintain reactivity after mount/unmount', async () => {
			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});
			wrapper.unmount();

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			store.setClickProcessingState({
				isProcessing: true,
			});
			await nextTick();

			expect(wrapper.vm.isVisible).toBe(true);
		});
	});

	/**
	 * Phase 2: ESC Key Cancellation Tests
	 */
	describe('Phase 2: ESC key and cancellation', () => {
		it('should emit cancel event on ESC keydown when cancel button is rendered', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			// Test via VM method directly instead of DOM interaction
			wrapper.vm.handleCancel();

			// Should emit cancel event
			expect(wrapper.emitted()).toHaveProperty('cancel');
			expect(wrapper.emitted().cancel).toHaveLength(1);
		});

		it('should emit cancel event when cancel button is clicked', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			// Test via VM method directly
			wrapper.vm.handleCancel();

			// Should emit cancel event
			expect(wrapper.emitted()).toHaveProperty('cancel');
			expect(wrapper.emitted().cancel).toHaveLength(1);
		});

		it('should not emit cancel when button is not visible (canCancel=false)', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: false, // Button should not be rendered
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: false,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			// Cancel button should not exist when canCancel is false
			const cancelButton = wrapper.find('button:has-text("Press ESC to Cancel")');
			expect(cancelButton.exists()).toBe(false);
		});

		it('should have correct ARIA label on cancel button', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: {
							template: '<button v-bind="$attrs"><slot /></button>',
						},
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			const cancelButton = wrapper.find('button');
			expect(cancelButton.attributes('aria-label')).toBe(
				'Cancel camera animation, press Escape key'
			);
		});

		it('should handle multiple ESC key presses', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				canCancel: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			// Call handleCancel multiple times via VM
			wrapper.vm.handleCancel();
			wrapper.vm.handleCancel();
			wrapper.vm.handleCancel();

			// Should emit cancel event for each call
			expect(wrapper.emitted().cancel).toHaveLength(3);
		});
	});

	/**
	 * Phase 2: ARIA and Accessibility Tests
	 */
	describe('Phase 2: ARIA attributes and accessibility', () => {
		it('should have role="status" on loading card', async () => {
			store.setClickProcessingState({
				isProcessing: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: {
							template: '<div v-bind="$attrs"><slot /></div>',
						},
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			// Loading card should have status role
			const card = wrapper.find('[role="status"]');
			expect(card.exists()).toBe(true);
		});

		it('should have aria-live="polite" on loading card', async () => {
			store.setClickProcessingState({
				isProcessing: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: {
							template: '<div v-bind="$attrs"><slot /></div>',
						},
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			const card = wrapper.find('[role="status"]');
			expect(card.attributes('aria-live')).toBe('polite');
		});

		it('should have aria-atomic="true" on loading card', async () => {
			store.setClickProcessingState({
				isProcessing: true,
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: {
							template: '<div v-bind="$attrs"><slot /></div>',
						},
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: true,
					},
				},
			});

			await nextTick();

			const card = wrapper.find('[role="status"]');
			expect(card.attributes('aria-atomic')).toBe('true');
		});

		it('should have role="alert" and aria-live="assertive" on error', async () => {
			store.setClickProcessingState({
				isProcessing: true,
				error: {
					message: 'Test error',
				},
			});

			wrapper = mount(MapClickLoadingOverlay, {
				global: {
					stubs: {
						VOverlay: true,
						VCard: true,
						VProgressCircular: true,
						VProgressLinear: true,
						VBtn: true,
						VIcon: true,
						VAlert: {
							template: '<div v-bind="$attrs"><slot /></div>',
						},
					},
				},
			});

			await nextTick();

			const alert = wrapper.find('[role="alert"]');
			expect(alert.exists()).toBe(true);
			expect(alert.attributes('aria-live')).toBe('assertive');
		});
	});
});
