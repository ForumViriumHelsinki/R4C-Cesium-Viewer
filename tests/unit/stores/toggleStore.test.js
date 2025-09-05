import { describe, it, expect, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useToggleStore } from '@/stores/toggleStore.js';

describe('toggleStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('initial state', () => {
    it('should have correct default boolean values', () => {
      const store = useToggleStore();
      
      expect(store.postalCode).toBe(false);
      expect(store.natureGrid).toBe(false);
      expect(store.travelTime).toBe(false);
      expect(store.resetGrid).toBe(false);
      expect(store.gridView).toBe(false);
      expect(store.helsinkiView).toBe(false);
      expect(store.showPlot).toBe(true);
      expect(store.print).toBe(true);
      expect(store.showVegetation).toBe(false);
      expect(store.showOtherNature).toBe(false);
      expect(store.hideNewBuildings).toBe(false);
      expect(store.hideNonSote).toBe(false);
      expect(store.hideLow).toBe(false);
      expect(store.showTrees).toBe(false);
      expect(store.hideColdAreas).toBe(false);
      expect(store.landCover).toBe(false);
      expect(store.switchView).toBe(false);
      expect(store.surveyPlaces).toBe(false);
      expect(store.capitalRegionCold).toBe(false);
      expect(store.grid250m).toBe(false);
      expect(store.ndvi).toBe(false);
    });

    it('should have exactly the expected number of state properties', () => {
      const store = useToggleStore();
      const stateKeys = Object.keys(store.$state);
      
      expect(stateKeys).toHaveLength(21);
    });
  });

  describe('toggle actions', () => {
    it('should set NDVI toggle', () => {
      const store = useToggleStore();
      
      store.setNDVI(true);
      expect(store.ndvi).toBe(true);
      
      store.setNDVI(false);
      expect(store.ndvi).toBe(false);
    });

    it('should set Grid250m toggle', () => {
      const store = useToggleStore();
      
      store.setGrid250m(true);
      expect(store.grid250m).toBe(true);
      
      store.setGrid250m(false);
      expect(store.grid250m).toBe(false);
    });

    it('should set Capital Region Cold toggle', () => {
      const store = useToggleStore();
      
      store.setCapitalRegionCold(true);
      expect(store.capitalRegionCold).toBe(true);
      
      store.setCapitalRegionCold(false);
      expect(store.capitalRegionCold).toBe(false);
    });

    it('should set Postal Code toggle', () => {
      const store = useToggleStore();
      
      store.setPostalCode(true);
      expect(store.postalCode).toBe(true);
      
      store.setPostalCode(false);
      expect(store.postalCode).toBe(false);
    });

    it('should set Nature Grid toggle', () => {
      const store = useToggleStore();
      
      store.setNatureGrid(true);
      expect(store.natureGrid).toBe(true);
      
      store.setNatureGrid(false);
      expect(store.natureGrid).toBe(false);
    });

    it('should set Travel Time toggle', () => {
      const store = useToggleStore();
      
      store.setTravelTime(true);
      expect(store.travelTime).toBe(true);
      
      store.setTravelTime(false);
      expect(store.travelTime).toBe(false);
    });

    it('should set Reset Grid toggle', () => {
      const store = useToggleStore();
      
      store.setResetGrid(true);
      expect(store.resetGrid).toBe(true);
      
      store.setResetGrid(false);
      expect(store.resetGrid).toBe(false);
    });

    it('should set Grid View toggle', () => {
      const store = useToggleStore();
      
      store.setGridView(true);
      expect(store.gridView).toBe(true);
      
      store.setGridView(false);
      expect(store.gridView).toBe(false);
    });

    it('should set Helsinki View toggle', () => {
      const store = useToggleStore();
      
      store.setHelsinkiView(true);
      expect(store.helsinkiView).toBe(true);
      
      store.setHelsinkiView(false);
      expect(store.helsinkiView).toBe(false);
    });

    it('should set Show Plot toggle', () => {
      const store = useToggleStore();
      
      store.setShowPlot(false);
      expect(store.showPlot).toBe(false);
      
      store.setShowPlot(true);
      expect(store.showPlot).toBe(true);
    });

    it('should set Print toggle', () => {
      const store = useToggleStore();
      
      store.setPrint(false);
      expect(store.print).toBe(false);
      
      store.setPrint(true);
      expect(store.print).toBe(true);
    });

    it('should set Show Vegetation toggle', () => {
      const store = useToggleStore();
      
      store.setShowVegetation(true);
      expect(store.showVegetation).toBe(true);
      
      store.setShowVegetation(false);
      expect(store.showVegetation).toBe(false);
    });

    it('should set Show Other Nature toggle', () => {
      const store = useToggleStore();
      
      store.setShowOtherNature(true);
      expect(store.showOtherNature).toBe(true);
      
      store.setShowOtherNature(false);
      expect(store.showOtherNature).toBe(false);
    });

    it('should set Hide New Buildings toggle', () => {
      const store = useToggleStore();
      
      store.setHideNewBuildings(true);
      expect(store.hideNewBuildings).toBe(true);
      
      store.setHideNewBuildings(false);
      expect(store.hideNewBuildings).toBe(false);
    });

    it('should set Hide Non Sote toggle', () => {
      const store = useToggleStore();
      
      store.setHideNonSote(true);
      expect(store.hideNonSote).toBe(true);
      
      store.setHideNonSote(false);
      expect(store.hideNonSote).toBe(false);
    });

    it('should set Hide Low toggle', () => {
      const store = useToggleStore();
      
      store.setHideLow(true);
      expect(store.hideLow).toBe(true);
      
      store.setHideLow(false);
      expect(store.hideLow).toBe(false);
    });

    it('should set Show Trees toggle', () => {
      const store = useToggleStore();
      
      store.setShowTrees(true);
      expect(store.showTrees).toBe(true);
      
      store.setShowTrees(false);
      expect(store.showTrees).toBe(false);
    });

    it('should set Hide Cold Areas toggle', () => {
      const store = useToggleStore();
      
      store.setHideColdAreas(true);
      expect(store.hideColdAreas).toBe(true);
      
      store.setHideColdAreas(false);
      expect(store.hideColdAreas).toBe(false);
    });

    it('should set Land Cover toggle', () => {
      const store = useToggleStore();
      
      store.setLandCover(true);
      expect(store.landCover).toBe(true);
      
      store.setLandCover(false);
      expect(store.landCover).toBe(false);
    });

    it('should set Switch View toggle', () => {
      const store = useToggleStore();
      
      store.setSwitchView(true);
      expect(store.switchView).toBe(true);
      
      store.setSwitchView(false);
      expect(store.switchView).toBe(false);
    });

    it('should set Survey Places toggle', () => {
      const store = useToggleStore();
      
      store.setSurveyPlaces(true);
      expect(store.surveyPlaces).toBe(true);
      
      store.setSurveyPlaces(false);
      expect(store.surveyPlaces).toBe(false);
    });
  });

  describe('reset functionality', () => {
    it('should reset all state to initial values', () => {
      const store = useToggleStore();
      
      // Change multiple state values
      store.setNDVI(true);
      store.setGrid250m(true);
      store.setPostalCode(true);
      store.setShowPlot(false);
      store.setPrint(false);
      store.setShowVegetation(true);
      
      // Verify changes
      expect(store.ndvi).toBe(true);
      expect(store.grid250m).toBe(true);
      expect(store.postalCode).toBe(true);
      expect(store.showPlot).toBe(false);
      expect(store.print).toBe(false);
      expect(store.showVegetation).toBe(true);
      
      // Reset
      store.reset();
      
      // Verify reset to initial state
      expect(store.ndvi).toBe(false);
      expect(store.grid250m).toBe(false);
      expect(store.postalCode).toBe(false);
      expect(store.showPlot).toBe(true);
      expect(store.print).toBe(true);
      expect(store.showVegetation).toBe(false);
    });

    it('should reset all toggles to their default values', () => {
      const store = useToggleStore();
      const initialState = { ...store.$state };
      
      // Change all values
      Object.keys(store.$state).forEach(key => {
        if (typeof store.$state[key] === 'boolean') {
          store.$state[key] = !store.$state[key];
        }
      });
      
      // Reset
      store.reset();
      
      // Verify all values match initial state
      Object.keys(initialState).forEach(key => {
        expect(store.$state[key]).toBe(initialState[key]);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle non-boolean values gracefully', () => {
      const store = useToggleStore();
      
      // Test passing non-boolean values (should still work due to JavaScript's truthy/falsy)
      store.setNDVI(1);
      expect(store.ndvi).toBe(1);
      
      store.setGrid250m(0);
      expect(store.grid250m).toBe(0);
      
      store.setPostalCode(null);
      expect(store.postalCode).toBe(null);
      
      store.setShowPlot(undefined);
      expect(store.showPlot).toBe(undefined);
      
      store.setShowVegetation('');
      expect(store.showVegetation).toBe('');
      
      store.setShowTrees('true');
      expect(store.showTrees).toBe('true');
    });

    it('should maintain state consistency when methods are called multiple times', () => {
      const store = useToggleStore();
      
      // Call the same method multiple times
      store.setNDVI(true);
      store.setNDVI(true);
      store.setNDVI(true);
      expect(store.ndvi).toBe(true);
      
      store.setNDVI(false);
      store.setNDVI(false);
      store.setNDVI(false);
      expect(store.ndvi).toBe(false);
    });

    it('should handle rapid toggle changes', () => {
      const store = useToggleStore();
      
      // Rapid toggling
      for (let i = 0; i < 100; i++) {
        store.setGridView(i % 2 === 0);
      }
      
      expect(store.gridView).toBe(false); // Should be false after 100 iterations (last call with i=99, 99%2===0 is false)
    });
  });
});