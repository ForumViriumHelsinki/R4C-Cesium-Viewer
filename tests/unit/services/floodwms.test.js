import { describe, it, expect, beforeEach, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  createFloodImageryLayer,
  removeFloodLayers,
} from "@/services/floodwms.js";
import * as Cesium from "cesium";

// Mock Cesium module
vi.mock("cesium", () => ({
  WebMapServiceImageryProvider: vi.fn(function (options) {
    // Constructor mock that stores the options
    this.url = options.url;
    this.layers = options.layers;
    this.tileWidth = options.tileWidth;
    this.tileHeight = options.tileHeight;
    this.minimumLevel = options.minimumLevel;
    this.maximumLevel = options.maximumLevel;
    this.tilingScheme = options.tilingScheme;
    this.readyPromise = Promise.resolve(true);
  }),
  GeographicTilingScheme: vi.fn(function () {
    this.name = "GeographicTilingScheme";
  }),
}));

// Mock stores
vi.mock("@/stores/globalStore.js", () => ({
  useGlobalStore: vi.fn(() => ({
    cesiumViewer: {
      imageryLayers: {
        addImageryProvider: vi.fn((provider) => ({
          alpha: 1,
          imageryProvider: provider,
        })),
        contains: vi.fn(() => true),
        remove: vi.fn(),
      },
    },
  })),
}));

vi.mock("@/stores/backgroundMapStore.js", () => ({
  useBackgroundMapStore: vi.fn(() => ({
    floodLayers: [],
  })),
}));

describe("Flood WMS Service", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  describe("createFloodImageryLayer", () => {
    it("should create imagery layer with optimized tile configuration", async () => {
      const mockUrl =
        "https://mock-flood-wms.example.com/wms?SERVICE=WMS&VERSION=1.3.0";
      const mockLayerName = "flood:risk_100yr";

      await createFloodImageryLayer(mockUrl, mockLayerName);

      // Verify WebMapServiceImageryProvider was called with optimized config
      expect(Cesium.WebMapServiceImageryProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          layers: mockLayerName,
          tileWidth: 512,
          tileHeight: 512,
          maximumLevel: 18,
          minimumLevel: 0,
        }),
      );
    });

    it("should use GeographicTilingScheme for EPSG:4326", async () => {
      const mockUrl = "https://mock-flood-wms.example.com/wms?SERVICE=WMS";
      const mockLayerName = "flood:risk";

      await createFloodImageryLayer(mockUrl, mockLayerName);

      expect(Cesium.GeographicTilingScheme).toHaveBeenCalled();
    });

    it("should append format and transparency parameters to URL", async () => {
      const mockUrl = "https://mock-flood-wms.example.com/wms?SERVICE=WMS";
      const mockLayerName = "flood:risk";

      await createFloodImageryLayer(mockUrl, mockLayerName);

      expect(Cesium.WebMapServiceImageryProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("format=image/png"),
        }),
      );

      expect(Cesium.WebMapServiceImageryProvider).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining("transparent=true"),
        }),
      );
    });

    describe("performance configuration", () => {
      it("should use 512x512 tiles to reduce request count", async () => {
        const mockUrl = "https://example.com/wms?SERVICE=WMS";
        const mockLayerName = "test:layer";

        await createFloodImageryLayer(mockUrl, mockLayerName);

        const call = Cesium.WebMapServiceImageryProvider.mock.calls[0][0];
        // 512x512 provides ~75% reduction in requests vs 256x256 default
        expect(call.tileWidth).toBe(512);
        expect(call.tileHeight).toBe(512);
      });

      it("should limit maximum zoom to level 18 to prevent excessive requests", async () => {
        const mockUrl = "https://example.com/wms?SERVICE=WMS";
        const mockLayerName = "test:layer";

        await createFloodImageryLayer(mockUrl, mockLayerName);

        const call = Cesium.WebMapServiceImageryProvider.mock.calls[0][0];
        // Level 18 provides ~0.6m resolution at equator, sufficient for flood visualization
        // This prevents N+1 API call issues at extreme zoom levels
        expect(call.maximumLevel).toBe(18);
      });

      it("should allow zooming from minimum level 0", async () => {
        const mockUrl = "https://example.com/wms?SERVICE=WMS";
        const mockLayerName = "test:layer";

        await createFloodImageryLayer(mockUrl, mockLayerName);

        const call = Cesium.WebMapServiceImageryProvider.mock.calls[0][0];
        expect(call.minimumLevel).toBe(0);
      });
    });
  });

  describe("removeFloodLayers", () => {
    it("should remove all flood layers from viewer", () => {
      const { useGlobalStore } = require("@/stores/globalStore.js");
      const {
        useBackgroundMapStore,
      } = require("@/stores/backgroundMapStore.js");

      const mockStore = useGlobalStore();
      const mockBackgroundStore = useBackgroundMapStore();

      // Add mock layers
      mockBackgroundStore.floodLayers = [{ id: "layer1" }, { id: "layer2" }];

      removeFloodLayers();

      expect(mockStore.cesiumViewer.imageryLayers.remove).toHaveBeenCalledTimes(
        2,
      );
      expect(mockBackgroundStore.floodLayers).toEqual([]);
    });

    it("should handle empty flood layers array gracefully", () => {
      const {
        useBackgroundMapStore,
      } = require("@/stores/backgroundMapStore.js");
      const mockBackgroundStore = useBackgroundMapStore();

      mockBackgroundStore.floodLayers = [];

      expect(() => removeFloodLayers()).not.toThrow();
    });
  });
});
