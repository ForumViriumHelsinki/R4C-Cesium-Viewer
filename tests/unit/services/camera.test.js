import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import Camera from "@/services/camera.js";
import { useGlobalStore } from "@/stores/globalStore.js";

// Mock Cesium additional methods
const mockFlyTo = vi.fn();
const mockSetView = vi.fn();
const mockZoomIn = vi.fn();
const mockZoomOut = vi.fn();
const mockPickEllipsoid = vi.fn();

const mockViewer = {
  camera: {
    setView: mockSetView,
    flyTo: mockFlyTo,
    zoomIn: mockZoomIn,
    zoomOut: mockZoomOut,
    pickEllipsoid: mockPickEllipsoid,
    position: { x: 1000, y: 2000, z: 3000 },
    pitch: -0.5,
    roll: 0.0,
    heading: 0.0,
    positionCartographic: {
      longitude: 0.4,
      latitude: 1.0,
      height: 1000,
    },
  },
  scene: {
    camera: {
      positionCartographic: {
        longitude: 0.4,
        latitude: 1.0,
        height: 1000,
      },
    },
    globe: {
      ellipsoid: {},
    },
    canvas: {
      clientWidth: 800,
      clientHeight: 600,
    },
  },
  dataSources: {
    _dataSources: [],
  },
};

// Mock Cesium module
vi.mock("cesium", () => ({
  Cartesian3: {
    fromDegrees: vi.fn((lon, lat, alt) => ({ x: lon, y: lat, z: alt })),
  },
  Math: {
    toRadians: vi.fn((degrees) => (degrees * Math.PI) / 180),
    toDegrees: vi.fn((radians) => (radians * 180) / Math.PI),
  },
  Cartesian2: vi.fn(function (x, y) {
    this.x = x;
    this.y = y;
  }),
  Cartographic: {
    fromCartesian: vi.fn((cartesian) => ({
      longitude: 0.4,
      latitude: 1.0,
      height: 1000,
    })),
  },
}));

describe("Camera service", () => {
  let camera;
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGlobalStore();
    store.setCesiumViewer(mockViewer);

    // Reset all mocks
    vi.clearAllMocks();

    camera = new Camera();
  });

  describe("constructor", () => {
    it("should initialize with correct properties", () => {
      expect(camera.store).toBeDefined();
      expect(camera.viewer).toStrictEqual(mockViewer);
      expect(camera.isRotated).toBe(false);
    });
  });

  describe("init", () => {
    it("should set initial camera view with correct parameters", () => {
      camera.init();

      expect(mockSetView).toHaveBeenCalledWith({
        destination: { x: 24.931745, y: 60.190464, z: 35000 },
        orientation: {
          heading: 0,
          pitch: expect.any(Number),
          roll: 0.0,
        },
      });
    });
  });

  describe("switchTo2DView", () => {
    beforeEach(() => {
      store.setPostalCode("12345");

      const mockDataSource = {
        name: "PostCodes",
        _entityCollection: {
          _entities: {
            _array: [
              {
                _properties: {
                  _posno: { _value: "12345" },
                  _center_x: { _value: 24.95 },
                  _center_y: { _value: 60.17 },
                },
              },
            ],
          },
        },
      };

      mockViewer.dataSources._dataSources = [mockDataSource];
    });

    it("should fly to postal code area in 2D view", () => {
      camera.switchTo2DView();

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: { x: 24.95, y: 60.17, z: 3500 },
        orientation: {
          heading: 0,
          pitch: expect.any(Number), // -90 degrees in radians
        },
        duration: 3,
      });
    });

    it("should handle missing postal code data source", () => {
      mockViewer.dataSources._dataSources = [];

      expect(() => camera.switchTo2DView()).toThrow();
    });

    it("should handle postal code not found in entities", () => {
      store.setPostalCode("99999");

      expect(() => camera.switchTo2DView()).not.toThrow();
      expect(mockFlyTo).not.toHaveBeenCalled();
    });
  });

  describe("switchTo3DView", () => {
    beforeEach(() => {
      store.setPostalCode("12345");

      const mockDataSource = {
        name: "PostCodes",
        _entityCollection: {
          _entities: {
            _array: [
              {
                _properties: {
                  _posno: { _value: "12345" },
                  _center_x: { _value: 24.95 },
                  _center_y: { _value: 60.17 },
                },
              },
            ],
          },
        },
      };

      mockViewer.dataSources._dataSources = [mockDataSource];
    });

    it("should fly to postal code area in 3D view", () => {
      camera.switchTo3DView();

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: { x: 24.95, y: 60.145, z: 2000 }, // y - 0.025
        orientation: {
          heading: 0.0,
          pitch: expect.any(Number), // -35 degrees in radians
          roll: 0.0,
        },
        duration: 3,
      });
    });
  });

  describe("switchTo3DGrid", () => {
    it("should fly to default position when level is start", () => {
      store.setLevel("start");

      camera.switchTo3DGrid();

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: { x: 24.991745, y: 60.045, z: 12000 },
        orientation: {
          heading: 0.0,
          pitch: expect.any(Number), // -35 degrees in radians
          roll: 0.0,
        },
        duration: 1,
      });
    });

    it("should preserve current position when level is not start", () => {
      store.setLevel("building");

      camera.switchTo3DGrid();

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: expect.any(Object),
        orientation: {
          heading: 0.0,
          pitch: expect.any(Number),
          roll: 0.0,
        },
        duration: 1,
      });

      expect(store.level).toBeNull();
    });
  });

  describe("flyCamera3D", () => {
    it("should fly camera to specified coordinates", () => {
      const lat = 25.0;
      const lon = 60.0;
      const z = 1000;

      camera.flyCamera3D(lat, lon, z);

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: { x: lat, y: lon, z: z },
        orientation: {
          heading: 0.0,
          pitch: expect.any(Number), // -35 degrees in radians
          roll: 0.0,
        },
        duration: 1,
      });
    });
  });

  describe("setCameraView", () => {
    it("should set camera view to specified coordinates", () => {
      const longitude = 24.95;
      const latitude = 60.17;

      camera.setCameraView(longitude, latitude);

      expect(mockSetView).toHaveBeenCalledWith({
        destination: { x: longitude, y: latitude - 0.0065, z: 500.0 },
        orientation: {
          heading: 0.0,
          pitch: expect.any(Number), // -35 degrees in radians
          roll: 0.0,
        },
      });
    });
  });

  describe("zoom", () => {
    it("should zoom in when multiplier > 1", () => {
      camera.zoom(2);

      expect(mockZoomIn).toHaveBeenCalledWith(500); // 1000 * (1 - 1/2)
    });

    it("should zoom out when multiplier < 1", () => {
      camera.zoom(0.5);

      expect(mockZoomOut).toHaveBeenCalledWith(500); // 1000 * (1 - 0.5)
    });

    it("should handle multiplier of 1 (zoom out with 0)", () => {
      camera.zoom(1);

      expect(mockZoomOut).toHaveBeenCalledWith(0); // 1000 * (1 - 1)
    });
  });

  describe("setHeading", () => {
    it("should set camera heading to specified degrees", () => {
      const headingInDegrees = 90;

      camera.setHeading(headingInDegrees);

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: mockViewer.camera.position,
        orientation: {
          heading: expect.any(Number), // 90 degrees in radians
          pitch: mockViewer.camera.pitch,
          roll: mockViewer.camera.roll,
        },
        duration: 1.0,
      });
    });

    it("should handle negative heading values", () => {
      camera.setHeading(-45);

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: mockViewer.camera.position,
        orientation: {
          heading: expect.any(Number), // -45 degrees in radians
          pitch: mockViewer.camera.pitch,
          roll: mockViewer.camera.roll,
        },
        duration: 1.0,
      });
    });
  });

  describe("resetNorth", () => {
    it("should reset camera orientation to north-facing", () => {
      camera.resetNorth();

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: mockViewer.camera.position,
        orientation: {
          heading: 0, // North
          pitch: expect.any(Number), // -35 degrees in radians
          roll: 0.0,
        },
        duration: 1.0,
      });
    });
  });

  describe("rotate180Degrees", () => {
    beforeEach(() => {
      const mockCartesian = { x: 100, y: 200, z: 300 };
      mockPickEllipsoid.mockReturnValue(mockCartesian);
    });

    it("should rotate camera 180 degrees when not previously rotated", () => {
      store.isCameraRotated = false;

      camera.rotate180Degrees();

      expect(mockSetView).toHaveBeenCalledWith({
        destination: expect.objectContaining({
          y: expect.any(Number), // latitude + 0.015
          z: 1200.0,
        }),
        orientation: {
          heading: Math.PI, // 180 degrees rotation
          pitch: expect.any(Number), // -35 degrees in radians
          roll: 0.0,
        },
      });

      expect(store.isCameraRotated).toBe(true);
    });

    it("should rotate camera 180 degrees when previously rotated", () => {
      store.isCameraRotated = true;

      camera.rotate180Degrees();

      expect(mockSetView).toHaveBeenCalledWith({
        destination: expect.objectContaining({
          y: expect.any(Number), // latitude - 0.015
          z: 1200.0,
        }),
        orientation: {
          heading: Math.PI,
          pitch: expect.any(Number),
          roll: 0.0,
        },
      });

      expect(store.isCameraRotated).toBe(false);
    });

    it("should handle case when no ellipsoid point is found", () => {
      mockPickEllipsoid.mockReturnValue(null);
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      camera.rotate180Degrees();

      expect(consoleSpy).toHaveBeenCalledWith(
        "No ellipsoid point was found at the center of the screen.",
      );
      expect(mockSetView).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("edge cases", () => {
    it("should handle zero coordinates", () => {
      camera.flyCamera3D(0, 0, 0);

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: { x: 0, y: 0, z: 0 },
        orientation: expect.any(Object),
        duration: 1,
      });
    });

    it("should handle negative coordinates", () => {
      camera.setCameraView(-180, -90);

      expect(mockSetView).toHaveBeenCalledWith({
        destination: { x: -180, y: -90 - 0.0065, z: 500.0 },
        orientation: expect.any(Object),
      });
    });

    it("should handle extreme zoom values", () => {
      camera.zoom(100);
      expect(mockZoomIn).toHaveBeenCalledWith(990); // 1000 * (1 - 1/100)

      camera.zoom(0.01);
      expect(mockZoomOut).toHaveBeenCalledWith(990); // 1000 * (1 - 0.01)
    });

    it("should handle 360 degree heading", () => {
      camera.setHeading(360);

      expect(mockFlyTo).toHaveBeenCalledWith({
        destination: mockViewer.camera.position,
        orientation: {
          heading: expect.any(Number), // 360 degrees in radians
          pitch: mockViewer.camera.pitch,
          roll: mockViewer.camera.roll,
        },
        duration: 1.0,
      });
    });
  });
});
