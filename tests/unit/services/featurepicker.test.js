/**
 * Unit tests for FeaturePicker service
 * Tests entity picking, feature handling, and navigation between geographic levels
 * @see {@link file://./src/services/featurepicker.js}
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import FeaturePicker from "@/services/featurepicker.js";
import { useGlobalStore } from "@/stores/globalStore.js";
import { useToggleStore } from "@/stores/toggleStore.js";
import { usePropsStore } from "@/stores/propsStore.js";
import { eventBus } from "@/services/eventEmitter.js";

// Test constants for realistic test data
const TEST_POSTAL_CODE_1 = "00100"; // Helsinki city center
const TEST_POSTAL_CODE_2 = "67890";
const TEST_GRID_ID = "grid_123";
const TEST_BUILDING_ID = "building_123";
const TEST_POPULATION = 500;
const TEST_VULNERABILITY_SCORE = 0.75;
const TEST_TREE_AREA = 150;
const TEST_AVG_TEMP = 22.5;

// Mock all service dependencies
vi.mock("@/services/datasource.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    removeDataSourcesAndEntities: vi.fn(),
    removeDataSourcesByNamePrefix: vi.fn(),
  })),
}));

vi.mock("@/services/building.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    createBuildingCharts: vi.fn(),
    resetBuildingOutline: vi.fn(),
  })),
}));

vi.mock("@/services/plot.js", () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/services/traveltime.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    loadTravelTimeData: vi.fn(),
    markCurrentLocation: vi.fn(),
  })),
}));

vi.mock("@/services/hsybuilding.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    loadHSYBuildings: vi.fn(),
  })),
}));

vi.mock("@/services/address.js", () => ({
  findAddressForBuilding: vi.fn(),
}));

vi.mock("@/services/elementsDisplay.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    setSwitchViewElementsDisplay: vi.fn(),
    setViewDisplay: vi.fn(),
    setBuildingDisplay: vi.fn(),
  })),
}));

vi.mock("@/services/helsinki.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    loadHelsinkiElements: vi.fn(),
  })),
}));

vi.mock("@/services/capitalRegion.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    loadCapitalRegionElements: vi.fn(),
  })),
}));

vi.mock("@/services/sensor.js", () => ({
  default: vi.fn().mockImplementation(() => ({})),
}));

vi.mock("@/services/camera.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    switchTo3DView: vi.fn(),
  })),
}));

vi.mock("@/services/coldarea.js", () => ({
  default: vi.fn().mockImplementation(() => ({
    addColdPoint: vi.fn(),
  })),
}));

vi.mock("@/services/eventEmitter.js", () => ({
  eventBus: {
    emit: vi.fn(),
  },
}));

// Mock Cesium module
// Important: Entity must be a named class so instanceof checks work correctly
class MockEntity {}
vi.mock("cesium", () => ({
  Cartesian2: vi.fn((x, y) => ({ x, y })),
  Entity: MockEntity,
}));

describe("FeaturePicker service", () => {
  let featurePicker;
  let mockViewer;
  let mockScene;
  let mockCanvas;
  let mockPick;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup Pinia stores
    setActivePinia(createPinia());
    const globalStore = useGlobalStore();
    const toggleStore = useToggleStore();
    const propsStore = usePropsStore();

    // Create mock canvas
    mockCanvas = {
      clientWidth: 800,
      clientHeight: 600,
    };

    // Create mock pick function
    mockPick = vi.fn();

    // Create mock scene
    mockScene = {
      canvas: mockCanvas,
      pick: mockPick,
    };

    // Create mock viewer
    mockViewer = {
      scene: mockScene,
      entities: {
        _entities: {
          _array: [],
        },
        remove: vi.fn(),
      },
      dataSources: {
        _dataSources: [],
      },
    };

    // Set the viewer in the store
    globalStore.setCesiumViewer(mockViewer);

    // Create FeaturePicker instance
    featurePicker = new FeaturePicker();
  });

  describe("pickEntity", () => {
    let globalStore;

    beforeEach(() => {
      globalStore = useGlobalStore();
      // Spy on store methods
      vi.spyOn(globalStore, "setPickedEntity");
    });

    describe("edge cases for picked.primitive handling", () => {
      it("should handle case where picked.primitive is undefined (bug fix from #276)", () => {
        // Setup: picked object with id but undefined primitive
        // Create a proper Entity instance
        const mockEntity = Object.assign(new MockEntity(), {
          _polygon: true,
          properties: {
            posno: { _value: TEST_POSTAL_CODE_1 },
          },
        });

        const picked = {
          id: mockEntity,
          primitive: undefined, // This was causing the crash in #276
        };

        mockPick.mockReturnValue(picked);

        const windowPosition = { x: 100, y: 100 };

        // Should not throw error
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();

        // Verify scene.pick was called
        expect(mockPick).toHaveBeenCalledWith(windowPosition);

        // Verify behavioral changes: store should be updated
        expect(globalStore.setPickedEntity).toHaveBeenCalledWith(mockEntity);

        // Verify event was emitted
        expect(eventBus.emit).toHaveBeenCalledWith("entityPrintEvent");
      });

      it("should handle case where picked.id is undefined but picked.primitive.id exists", () => {
        // Setup: picked object with no direct id but primitive.id exists
        // This tests the fallback logic: picked.id ?? picked.primitive?.id
        const mockEntity = Object.assign(new MockEntity(), {
          _polygon: true,
          properties: {
            posno: { _value: TEST_POSTAL_CODE_2 },
          },
        });

        const picked = {
          id: undefined,
          primitive: {
            id: mockEntity,
          },
        };

        mockPick.mockReturnValue(picked);

        const windowPosition = { x: 200, y: 200 };

        // Should not throw error and should use primitive.id
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();

        // Verify scene.pick was called
        expect(mockPick).toHaveBeenCalledWith(windowPosition);

        // Verify that the fallback logic works: primitive.id should be used
        expect(globalStore.setPickedEntity).toHaveBeenCalledWith(mockEntity);
        expect(eventBus.emit).toHaveBeenCalledWith("entityPrintEvent");
      });

      it("should handle case where both picked.id and picked.primitive are undefined", () => {
        // Setup: picked object exists but both id and primitive are undefined
        const picked = {
          id: undefined,
          primitive: undefined,
        };

        mockPick.mockReturnValue(picked);

        const windowPosition = { x: 300, y: 300 };

        // Should not throw error even with both undefined
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();

        // Verify scene.pick was called
        expect(mockPick).toHaveBeenCalledWith(windowPosition);

        // Should not update store or emit events when no entity is found
        expect(globalStore.setPickedEntity).not.toHaveBeenCalled();
        expect(eventBus.emit).not.toHaveBeenCalledWith("entityPrintEvent");
      });

      it("should handle case where picked.primitive exists but picked.primitive.id is undefined", () => {
        // Setup: picked with primitive object but no id property
        const picked = {
          id: undefined,
          primitive: {
            // primitive exists but has no id property
            someOtherProperty: "value",
          },
        };

        mockPick.mockReturnValue(picked);

        const windowPosition = { x: 400, y: 400 };

        // Should not throw error
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();

        // Verify scene.pick was called
        expect(mockPick).toHaveBeenCalledWith(windowPosition);

        // Should not update store or emit events when no valid entity is found
        expect(globalStore.setPickedEntity).not.toHaveBeenCalled();
        expect(eventBus.emit).not.toHaveBeenCalledWith("entityPrintEvent");
      });

      it("should handle normal case where both picked.id and picked.primitive.id exist", () => {
        // Setup: normal case with both ids present
        const directEntity = Object.assign(new MockEntity(), {
          _polygon: true,
          properties: {
            posno: { _value: TEST_POSTAL_CODE_1 },
          },
        });

        const primitiveEntity = Object.assign(new MockEntity(), {
          _polygon: true,
          properties: {
            posno: { _value: TEST_POSTAL_CODE_2 },
          },
        });

        const picked = {
          id: directEntity, // Direct id takes precedence
          primitive: {
            id: primitiveEntity,
          },
        };

        mockPick.mockReturnValue(picked);

        const windowPosition = { x: 500, y: 500 };

        // Should not throw error
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();

        // Verify scene.pick was called
        expect(mockPick).toHaveBeenCalledWith(windowPosition);

        // Verify that picked.id takes precedence due to nullish coalescing
        // The code uses: let id = picked.id ?? picked.primitive?.id;
        expect(globalStore.setPickedEntity).toHaveBeenCalledWith(directEntity);
        expect(eventBus.emit).toHaveBeenCalledWith("entityPrintEvent");
      });
    });

    describe("guard conditions", () => {
      it("should return early if viewer is not available", () => {
        featurePicker.viewer = null;

        const windowPosition = { x: 100, y: 100 };

        // Should not throw and should not call pick
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).not.toHaveBeenCalled();
      });

      it("should return early if scene is not available", () => {
        featurePicker.viewer.scene = null;

        const windowPosition = { x: 100, y: 100 };

        // Should not throw and should not call pick
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).not.toHaveBeenCalled();
      });

      it("should return early if canvas has invalid dimensions (width = 0)", () => {
        mockCanvas.clientWidth = 0;
        mockCanvas.clientHeight = 600;

        const windowPosition = { x: 100, y: 100 };

        // Should not throw and should not call pick
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).not.toHaveBeenCalled();
      });

      it("should return early if canvas has invalid dimensions (height = 0)", () => {
        mockCanvas.clientWidth = 800;
        mockCanvas.clientHeight = 0;

        const windowPosition = { x: 100, y: 100 };

        // Should not throw and should not call pick
        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).not.toHaveBeenCalled();
      });

      it("should proceed normally if canvas dimensions are valid", () => {
        mockCanvas.clientWidth = 800;
        mockCanvas.clientHeight = 600;
        mockPick.mockReturnValue(null); // Nothing picked

        const windowPosition = { x: 100, y: 100 };

        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).toHaveBeenCalledWith(windowPosition);
      });
    });

    describe("nothing picked scenarios", () => {
      it("should handle case where nothing is picked (picked is undefined)", () => {
        mockPick.mockReturnValue(undefined);

        const windowPosition = { x: 100, y: 100 };

        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).toHaveBeenCalledWith(windowPosition);
      });

      it("should handle case where nothing is picked (picked is null)", () => {
        mockPick.mockReturnValue(null);

        const windowPosition = { x: 100, y: 100 };

        expect(() => featurePicker.pickEntity(windowPosition)).not.toThrow();
        expect(mockPick).toHaveBeenCalledWith(windowPosition);
      });
    });
  });

  describe("processClick", () => {
    it("should convert mouse event to Cartesian2 and call pickEntity", () => {
      // Spy on pickEntity
      const pickEntitySpy = vi.spyOn(featurePicker, "pickEntity");

      const mouseEvent = {
        x: 250,
        y: 350,
      };

      featurePicker.processClick(mouseEvent);

      // Verify pickEntity was called with Cartesian2
      expect(pickEntitySpy).toHaveBeenCalledWith(
        expect.objectContaining({ x: 250, y: 350 }),
      );
    });
  });

  describe("handleFeatureWithProperties", () => {
    let globalStore;
    let propsStore;

    beforeEach(() => {
      globalStore = useGlobalStore();
      propsStore = usePropsStore();
      vi.spyOn(propsStore, "setTreeArea");
      vi.spyOn(propsStore, "setHeatFloodVulnerability");
      vi.spyOn(featurePicker, "removeEntityByName");
    });

    it("should handle feature with grid_id and emit vulnerability chart event", () => {
      const mockId = {
        properties: {
          grid_id: { _value: TEST_GRID_ID },
          vulnerability_score: { _value: TEST_VULNERABILITY_SCORE },
        },
      };

      featurePicker.handleFeatureWithProperties(mockId);

      // Verify store updates
      expect(propsStore.setTreeArea).toHaveBeenCalledWith(null);
      expect(propsStore.setHeatFloodVulnerability).toHaveBeenCalledWith(
        mockId.properties,
      );

      // Verify event emission
      expect(eventBus.emit).toHaveBeenCalledWith(
        "createHeatFloodVulnerabilityChart",
      );

      // Verify cleanup
      expect(featurePicker.removeEntityByName).toHaveBeenCalledWith("coldpoint");
      expect(featurePicker.removeEntityByName).toHaveBeenCalledWith(
        "currentLocation",
      );
    });

    it("should handle postal code selection at start level", () => {
      globalStore.setLevel("start");
      const mockId = {
        properties: {
          posno: { _value: TEST_POSTAL_CODE_1 },
          name: { _value: "Helsinki Center" },
        },
      };

      vi.spyOn(globalStore, "setPostalCode");
      vi.spyOn(featurePicker, "loadPostalCode");

      featurePicker.handleFeatureWithProperties(mockId);

      // Verify postal code is set
      expect(globalStore.setPostalCode).toHaveBeenCalledWith(TEST_POSTAL_CODE_1);

      // Verify loadPostalCode is called
      expect(featurePicker.loadPostalCode).toHaveBeenCalled();
    });

    it("should not reload postal code if already selected", () => {
      globalStore.setLevel("postalCode");
      globalStore.setPostalCode(TEST_POSTAL_CODE_1);

      const mockId = {
        properties: {
          posno: { _value: TEST_POSTAL_CODE_1 }, // Same postal code
        },
      };

      vi.spyOn(featurePicker, "loadPostalCode");

      featurePicker.handleFeatureWithProperties(mockId);

      // Should not call loadPostalCode for the same postal code
      expect(featurePicker.loadPostalCode).not.toHaveBeenCalled();
    });

    it("should handle building feature at postalCode level", () => {
      globalStore.setLevel("postalCode");

      const mockId = {
        properties: {
          _postinumero: { _value: TEST_POSTAL_CODE_1 },
          treeArea: TEST_TREE_AREA,
          _avg_temp_c: TEST_AVG_TEMP,
          buildingId: { _value: TEST_BUILDING_ID },
        },
      };

      vi.spyOn(featurePicker, "handleBuildingFeature");

      featurePicker.handleFeatureWithProperties(mockId);

      // Verify building handler is called
      expect(featurePicker.handleBuildingFeature).toHaveBeenCalledWith(
        mockId.properties,
      );
    });

    it("should handle population grid with bounding box", () => {
      const mockId = {
        properties: {
          asukkaita: { _value: TEST_POPULATION },
          index: { _value: 123 },
        },
        polygon: {
          hierarchy: {
            getValue: vi.fn().mockReturnValue({
              positions: [],
            }),
          },
        },
      };

      vi.spyOn(globalStore, "setCurrentGridCell");
      vi.spyOn(featurePicker, "getBoundingBox").mockReturnValue({
        minLon: 24.9,
        maxLon: 25.0,
        minLat: 60.1,
        maxLat: 60.2,
      });

      featurePicker.handleFeatureWithProperties(mockId);

      // Verify grid cell is set
      expect(globalStore.setCurrentGridCell).toHaveBeenCalledWith(mockId);
    });

    it("should skip postal code loading at building level", () => {
      globalStore.setLevel("building");

      const mockId = {
        properties: {
          posno: { _value: TEST_POSTAL_CODE_1 },
        },
      };

      vi.spyOn(featurePicker, "loadPostalCode");

      featurePicker.handleFeatureWithProperties(mockId);

      // Should not load postal code when at building level
      expect(featurePicker.loadPostalCode).not.toHaveBeenCalled();
    });
  });

  describe("getBoundingBox", () => {
    const MOCK_POSTAL_CODE = "00100";
    const MOCK_GRID_ID = "grid_123";

    it("should calculate correct bounding box for polygon entity", () => {
      // Create mock positions in Cartesian3 format
      const mockPositions = [
        { x: 100, y: 200, z: 300 }, // Will be converted to cartographic
        { x: 150, y: 250, z: 350 },
        { x: 120, y: 220, z: 320 },
      ];

      const mockEntity = {
        polygon: {
          hierarchy: {
            getValue: vi.fn().mockReturnValue({
              positions: mockPositions,
            }),
          },
        },
        show: true,
      };

      // Mock Cesium.Cartographic.fromCartesian to return predictable values
      const mockCartographics = [
        { longitude: 0.4363, latitude: 1.0472 }, // ~25°E, ~60°N in radians
        { longitude: 0.4538, latitude: 1.0647 }, // Slightly larger
        { longitude: 0.4450, latitude: 1.0559 }, // In between
      ];

      vi.spyOn(Cesium.Cartographic, "fromCartesian").mockImplementation(
        (position, result) => {
          const index = mockPositions.indexOf(position);
          return mockCartographics[index];
        },
      );

      const boundingBox = featurePicker.getBoundingBox(mockEntity);

      // Verify bounding box is calculated
      expect(boundingBox).not.toBeNull();
      expect(boundingBox).toHaveProperty("minLon");
      expect(boundingBox).toHaveProperty("maxLon");
      expect(boundingBox).toHaveProperty("minLat");
      expect(boundingBox).toHaveProperty("maxLat");

      // Verify min/max logic
      expect(boundingBox.minLon).toBeLessThan(boundingBox.maxLon);
      expect(boundingBox.minLat).toBeLessThan(boundingBox.maxLat);

      // Verify entity is hidden after calculation
      expect(mockEntity.show).toBe(false);
    });

    it("should return null when entity has no polygon", () => {
      const mockEntity = {
        polygon: undefined,
        show: true,
      };

      const boundingBox = featurePicker.getBoundingBox(mockEntity);

      expect(boundingBox).toBeNull();
      // Entity should not be modified when there's no polygon
      expect(mockEntity.show).toBe(true);
    });

    it("should handle empty polygon hierarchy", () => {
      const mockEntity = {
        polygon: {
          hierarchy: {
            getValue: vi.fn().mockReturnValue(null),
          },
        },
        show: true,
      };

      const boundingBox = featurePicker.getBoundingBox(mockEntity);

      expect(boundingBox).toBeNull();
    });

    it("should handle polygon with single position", () => {
      const mockPositions = [{ x: 100, y: 200, z: 300 }];

      const mockEntity = {
        polygon: {
          hierarchy: {
            getValue: vi.fn().mockReturnValue({
              positions: mockPositions,
            }),
          },
        },
        show: true,
      };

      const mockCartographic = { longitude: 0.4363, latitude: 1.0472 };

      vi.spyOn(Cesium.Cartographic, "fromCartesian").mockReturnValue(
        mockCartographic,
      );

      const boundingBox = featurePicker.getBoundingBox(mockEntity);

      expect(boundingBox).not.toBeNull();
      // With single position, min and max should be the same
      expect(boundingBox.minLon).toBe(boundingBox.maxLon);
      expect(boundingBox.minLat).toBe(boundingBox.maxLat);
      expect(mockEntity.show).toBe(false);
    });
  });
});
