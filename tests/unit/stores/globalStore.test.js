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
        max: 332.2742309570
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
      expect(store.pickedEntity).toBe(testEntity);
    });

    it('should set current grid cell', () => {
      const store = useGlobalStore();
      const testCell = { x: 10, y: 20 };
      
      store.setCurrentGridCell(testCell);
      expect(store.currentGridCell).toBe(testCell);
    });

    it('should set cesium viewer', () => {
      const store = useGlobalStore();
      const mockViewer = { scene: {}, camera: {} };
      
      store.setCesiumViewer(mockViewer);
      expect(store.cesiumViewer).toBe(mockViewer);
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