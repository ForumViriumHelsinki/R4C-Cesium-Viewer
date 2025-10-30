import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import FeaturePicker from "@/services/featurepicker.js";
import { useGlobalStore } from "@/stores/globalStore.js";
import { useToggleStore } from "@/stores/toggleStore.js";
import { usePropsStore } from "@/stores/propsStore.js";
import { eventBus } from "@/services/eventEmitter.js";

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
            posno: { _value: "12345" },
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
            posno: { _value: "67890" },
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

        // This tests the fallback logic when picked.id is undefined
        // The code uses optional chaining (picked.id?._polygon) to safely handle this case
        // The fallback logic on line 106 (picked.id ?? picked.primitive?.id) ensures
        // the correct entity is used even when picked.id is undefined
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
      });

      it("should handle normal case where both picked.id and picked.primitive.id exist", () => {
        // Setup: normal case with both ids present
        const directEntity = Object.assign(new MockEntity(), {
          _polygon: true,
          properties: {
            posno: { _value: "11111" },
          },
        });

        const primitiveEntity = Object.assign(new MockEntity(), {
          _polygon: true,
          properties: {
            posno: { _value: "22222" },
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
          grid_id: { _value: "grid_123" },
          vulnerability_score: { _value: 0.75 },
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
          posno: { _value: "00100" },
          name: { _value: "Helsinki Center" },
        },
      };

      vi.spyOn(globalStore, "setPostalCode");
      vi.spyOn(featurePicker, "loadPostalCode");

      featurePicker.handleFeatureWithProperties(mockId);

      // Verify postal code is set
      expect(globalStore.setPostalCode).toHaveBeenCalledWith("00100");

      // Verify loadPostalCode is called
      expect(featurePicker.loadPostalCode).toHaveBeenCalled();
    });

    it("should not reload postal code if already selected", () => {
      globalStore.setLevel("postalCode");
      globalStore.setPostalCode("00100");

      const mockId = {
        properties: {
          posno: { _value: "00100" }, // Same postal code
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
          _postinumero: { _value: "00100" },
          treeArea: 150,
          _avg_temp_c: 22.5,
          buildingId: { _value: "building_123" },
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
          asukkaita: { _value: 500 },
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
          posno: { _value: "00100" },
        },
      };

      vi.spyOn(featurePicker, "loadPostalCode");

      featurePicker.handleFeatureWithProperties(mockId);

      // Should not load postal code when at building level
      expect(featurePicker.loadPostalCode).not.toHaveBeenCalled();
    });
  });
});
