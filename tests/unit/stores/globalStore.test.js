import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useGlobalStore } from '@/stores/globalStore.js';

describe('globalStore', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('initial state', () => {
		it('should have correct default values', () => {
			const store = useGlobalStore();

			expect(store.view).toBe('capitalRegion');
			expect(store.postalcode).toBeNull();
			expect(store.nameOfZone).toBeNull();
			expect(store.averageHeatExposure).toBe(0);
			expect(store.averageTreeArea).toBe(0);
			expect(store.level).toBe('start');
			expect(store.heatDataDate).toBe('2022-06-28');
			expect(store.currentGridCell).toBeNull();
			expect(store.cesiumViewer).toBeNull();
			expect(store.buildingAddress).toBeNull();
			expect(store.pickedEntity).toBeNull();
			expect(store.isLoading).toBe(false);
			expect(store.showBuildingInfo).toBe(true);
			expect(store.isCameraRotated).toBe(false);
		});

		it('should have predefined minMaxKelvin data', () => {
			const store = useGlobalStore();

			expect(store.minMaxKelvin).toHaveProperty('2015-07-03');
			expect(store.minMaxKelvin).toHaveProperty('2024-06-26');
			expect(store.minMaxKelvin['2022-06-28']).toEqual({
				min: 291.5040893555,
				max: 332.274230957,
			});
		});

		it('should calculate navbar width correctly', () => {
			const store = useGlobalStore();
			const expectedWidth = Math.min(Math.max(window.innerWidth * 0.375, 400), 800);

			expect(store.navbarWidth).toBe(expectedWidth);
		});
	});

	describe('actions', () => {
		it('should set loading state', () => {
			const store = useGlobalStore();

			store.setIsLoading(true);
			expect(store.isLoading).toBe(true);

			store.setIsLoading(false);
			expect(store.isLoading).toBe(false);
		});

		it('should set heat data date', () => {
			const store = useGlobalStore();
			const testDate = '2023-06-23';

			store.setHeatDataDate(testDate);
			expect(store.heatDataDate).toBe(testDate);
		});

		it('should set level', () => {
			const store = useGlobalStore();
			const testLevel = 'building';

			store.setLevel(testLevel);
			expect(store.level).toBe(testLevel);
		});

		it('should set view', () => {
			const store = useGlobalStore();
			const testView = 'helsinki';

			store.setView(testView);
			expect(store.view).toBe(testView);
		});

		it('should set postal code', () => {
			const store = useGlobalStore();
			const testCode = '00100';

			store.setPostalCode(testCode);
			expect(store.postalcode).toBe(testCode);
		});

		it('should set name of zone', () => {
			const store = useGlobalStore();
			const testName = 'Helsinki Center';

			store.setNameOfZone(testName);
			expect(store.nameOfZone).toBe(testName);
		});

		it('should set average heat exposure', () => {
			const store = useGlobalStore();
			const testExposure = 75.5;

			store.setAverageHeatExposure(testExposure);
			expect(store.averageHeatExposure).toBe(testExposure);
		});

		it('should set average tree area', () => {
			const store = useGlobalStore();
			const testArea = 45.2;

			store.setAverageTreeArea(testArea);
			expect(store.averageTreeArea).toBe(testArea);
		});

		it('should set building address', () => {
			const store = useGlobalStore();
			const testAddress = 'Test Street 123';

			store.setBuildingAddress(testAddress);
			expect(store.buildingAddress).toBe(testAddress);
		});

		it('should set picked entity', () => {
			const store = useGlobalStore();
			const testEntity = { id: 'test', properties: {} };

			store.setPickedEntity(testEntity);
			expect(store.pickedEntity).toStrictEqual(testEntity);
		});

		it('should set current grid cell', () => {
			const store = useGlobalStore();
			const testCell = { x: 10, y: 20 };

			store.setCurrentGridCell(testCell);
			expect(store.currentGridCell).toStrictEqual(testCell);
		});

		it('should set cesium viewer', () => {
			const store = useGlobalStore();
			const mockViewer = { scene: {}, camera: {} };

			store.setCesiumViewer(mockViewer);
			expect(store.cesiumViewer).toStrictEqual(mockViewer);
		});

		it('should set building info visibility', () => {
			const store = useGlobalStore();

			store.setShowBuildingInfo(false);
			expect(store.showBuildingInfo).toBe(false);

			store.setShowBuildingInfo(true);
			expect(store.showBuildingInfo).toBe(true);
		});

		it('should toggle camera rotation', () => {
			const store = useGlobalStore();
			const initialState = store.isCameraRotated;

			store.toggleCameraRotation();
			expect(store.isCameraRotated).toBe(!initialState);

			store.toggleCameraRotation();
			expect(store.isCameraRotated).toBe(initialState);
		});
	});

	describe('clickProcessingState', () => {
		it('should have correct initial clickProcessingState', () => {
			const store = useGlobalStore();

			expect(store.clickProcessingState).toEqual({
				isProcessing: false,
				postalCode: null,
				postalCodeName: null,
				stage: null,
				startTime: null,
				canCancel: false,
				error: null,
				partialData: null,
				retryCount: 0,
				previousViewState: null,
				loadingProgress: null,
			});
		});

		it('should update click processing state', () => {
			const store = useGlobalStore();

			store.setClickProcessingState({
				isProcessing: true,
				postalCode: '00100',
				postalCodeName: 'Helsinki Center',
				stage: 'loading',
				startTime: performance.now(),
			});

			expect(store.clickProcessingState.isProcessing).toBe(true);
			expect(store.clickProcessingState.postalCode).toBe('00100');
			expect(store.clickProcessingState.postalCodeName).toBe('Helsinki Center');
			expect(store.clickProcessingState.stage).toBe('loading');
			expect(store.clickProcessingState.startTime).toBeGreaterThan(0);
		});

		it('should merge partial state updates', () => {
			const store = useGlobalStore();

			// Initial state
			store.setClickProcessingState({
				isProcessing: true,
				postalCode: '00100',
				stage: 'loading',
			});

			// Partial update
			store.setClickProcessingState({
				stage: 'animating',
				canCancel: true,
			});

			// Should preserve previous values
			expect(store.clickProcessingState.isProcessing).toBe(true);
			expect(store.clickProcessingState.postalCode).toBe('00100');
			// Should update new values
			expect(store.clickProcessingState.stage).toBe('animating');
			expect(store.clickProcessingState.canCancel).toBe(true);
		});

		it('should reset click processing state', () => {
			const store = useGlobalStore();

			// Set some state
			store.setClickProcessingState({
				isProcessing: true,
				postalCode: '00100',
				stage: 'animating',
				error: { message: 'Test error' },
			});

			// Reset
			store.resetClickProcessingState();

			// Should be back to initial state
			expect(store.clickProcessingState).toEqual({
				isProcessing: false,
				postalCode: null,
				postalCodeName: null,
				stage: null,
				startTime: null,
				canCancel: false,
				error: null,
				partialData: null,
				retryCount: 0,
				previousViewState: null,
				loadingProgress: null,
			});
		});

		it('should handle error state', () => {
			const store = useGlobalStore();

			store.setClickProcessingState({
				error: {
					message: 'Failed to load postal code',
					details: 'Network error',
				},
			});

			expect(store.clickProcessingState.error).toEqual({
				message: 'Failed to load postal code',
				details: 'Network error',
			});
		});

		it('should track retry count', () => {
			const store = useGlobalStore();

			store.setClickProcessingState({ retryCount: 1 });
			expect(store.clickProcessingState.retryCount).toBe(1);

			store.setClickProcessingState({ retryCount: 2 });
			expect(store.clickProcessingState.retryCount).toBe(2);
		});

		it('should capture view state', () => {
			const store = useGlobalStore();

			// Mock Cesium viewer
			const mockViewer = {
				camera: {
					position: { clone: () => ({ x: 1, y: 2, z: 3 }) },
					heading: 0.5,
					pitch: -0.5,
					roll: 0,
				},
			};

			store.setCesiumViewer(mockViewer);
			store.setShowBuildingInfo(true);
			store.setBuildingAddress('Test Street 1');

			// Capture state
			store.captureViewState();

			expect(store.clickProcessingState.previousViewState).toBeDefined();
			expect(store.clickProcessingState.previousViewState.position).toEqual({ x: 1, y: 2, z: 3 });
			expect(store.clickProcessingState.previousViewState.orientation).toEqual({
				heading: 0.5,
				pitch: -0.5,
				roll: 0,
			});
			expect(store.clickProcessingState.previousViewState.showBuildingInfo).toBe(true);
			expect(store.clickProcessingState.previousViewState.buildingAddress).toBe('Test Street 1');
		});

		it('should restore previous view state', () => {
			const store = useGlobalStore();

			// Mock Cesium viewer with setView method
			const mockViewer = {
				camera: {
					position: { clone: () => ({ x: 1, y: 2, z: 3 }) },
					heading: 0.5,
					pitch: -0.5,
					roll: 0,
					setView: () => {}, // Mock setView
				},
			};

			store.setCesiumViewer(mockViewer);

			// Set up previous state
			store.clickProcessingState.previousViewState = {
				position: { x: 10, y: 20, z: 30 },
				orientation: { heading: 1.0, pitch: -1.0, roll: 0.1 },
				showBuildingInfo: false,
				buildingAddress: 'Old Street 1',
			};

			// Restore
			store.restorePreviousViewState();

			// Verify UI state was restored
			expect(store.showBuildingInfo).toBe(false);
			expect(store.buildingAddress).toBe('Old Street 1');
		});

		it('should handle missing viewer when capturing state', () => {
			const store = useGlobalStore();

			// No viewer set
			store.captureViewState();

			// Should not crash, state should remain unchanged
			expect(store.clickProcessingState.previousViewState).toBeNull();
		});

		it('should handle missing viewer when restoring state', () => {
			const store = useGlobalStore();

			// Set initial UI state
			store.setShowBuildingInfo(true);
			store.setBuildingAddress('Current Street 1');

			// Set up previous state
			store.clickProcessingState.previousViewState = {
				position: { x: 10, y: 20, z: 30 },
				orientation: { heading: 1.0, pitch: -1.0, roll: 0.1 },
				showBuildingInfo: false,
				buildingAddress: 'Old Street 1',
			};

			// Try to restore without viewer - should return early and not crash
			store.restorePreviousViewState();

			// UI state should NOT be restored when viewer is missing (early return)
			expect(store.showBuildingInfo).toBe(true); // Stays at current value
			expect(store.buildingAddress).toBe('Current Street 1'); // Stays at current value
		});

		it('should handle missing previous state when restoring', () => {
			const store = useGlobalStore();

			const mockViewer = {
				camera: {
					setView: () => {},
				},
			};

			store.setCesiumViewer(mockViewer);

			// No previous state
			store.restorePreviousViewState();

			// Should not crash
			expect(store.clickProcessingState.previousViewState).toBeNull();
		});
	});

	describe('errorNotification', () => {
		it('should have correct initial errorNotification state', () => {
			const store = useGlobalStore();

			expect(store.errorNotification).toEqual({
				show: false,
				message: '',
				context: '',
			});
		});

		it('should show error with message and context', () => {
			const store = useGlobalStore();
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			store.showError('Test error message', 'Technical context details');

			expect(store.errorNotification.show).toBe(true);
			expect(store.errorNotification.message).toBe('Test error message');
			expect(store.errorNotification.context).toBe('Technical context details');
			expect(consoleSpy).toHaveBeenCalledWith('[GlobalStore] Error context:', 'Technical context details');

			consoleSpy.mockRestore();
		});

		it('should show error without context', () => {
			const store = useGlobalStore();
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			store.showError('Test error message');

			expect(store.errorNotification.show).toBe(true);
			expect(store.errorNotification.message).toBe('Test error message');
			expect(store.errorNotification.context).toBe('');
			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});

		it('should hide error notification', () => {
			const store = useGlobalStore();

			// First show an error
			store.showError('Test error', 'Test context');
			expect(store.errorNotification.show).toBe(true);

			// Then hide it
			store.hideError();

			expect(store.errorNotification.show).toBe(false);
			expect(store.errorNotification.message).toBe('');
			expect(store.errorNotification.context).toBe('');
		});

		it('should handle multiple error notifications', () => {
			const store = useGlobalStore();

			store.showError('First error', 'First context');
			expect(store.errorNotification.message).toBe('First error');

			store.showError('Second error', 'Second context');
			expect(store.errorNotification.message).toBe('Second error');
			expect(store.errorNotification.context).toBe('Second context');
		});

		it('should handle empty context string (not log to console)', () => {
			const store = useGlobalStore();
			const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

			store.showError('Error message', '');

			expect(store.errorNotification.context).toBe('');
			expect(consoleSpy).not.toHaveBeenCalled();

			consoleSpy.mockRestore();
		});
	});

	describe('edge cases', () => {
		it('should handle null and undefined values', () => {
			const store = useGlobalStore();

			store.setPostalCode(null);
			expect(store.postalcode).toBeNull();

			store.setNameOfZone(undefined);
			expect(store.nameOfZone).toBeUndefined();

			store.setAverageHeatExposure(0);
			expect(store.averageHeatExposure).toBe(0);
		});

		it('should handle extreme numeric values', () => {
			const store = useGlobalStore();

			store.setAverageHeatExposure(Number.MAX_VALUE);
			expect(store.averageHeatExposure).toBe(Number.MAX_VALUE);

			store.setAverageTreeArea(-100);
			expect(store.averageTreeArea).toBe(-100);
		});

		it('should handle empty strings', () => {
			const store = useGlobalStore();

			store.setHeatDataDate('');
			expect(store.heatDataDate).toBe('');

			store.setBuildingAddress('');
			expect(store.buildingAddress).toBe('');
		});
	});
});
