import { test as base, Page } from "@playwright/test";
import {
  waitForCesiumReady,
  setupCesiumForCI,
  waitForAppReady,
} from "../e2e/helpers/cesium-helper";
import { createCesiumMock } from "../mocks/cesium-mock";

/**
 * Cesium Test Fixture
 *
 * Provides optimized Cesium initialization for tests by:
 * - Using a mock Cesium implementation in CI to avoid WebGL issues
 * - Pre-initializing Cesium viewer once per test
 * - Configuring optimal settings for CI environment
 * - Handling cleanup automatically
 * - Reducing test initialization overhead
 */

export interface CesiumFixtures {
  cesiumPage: Page;
}

/**
 * Extended test with Cesium fixture
 *
 * Usage in tests:
 * ```typescript
 * import { cesiumTest } from '../fixtures/cesium-fixture';
 *
 * cesiumTest('my test', async ({ cesiumPage }) => {
 *   // Cesium is already initialized
 *   await cesiumPage.click('.some-button');
 * });
 * ```
 */
export const cesiumTest = base.extend<CesiumFixtures>({
  cesiumPage: async ({ page }, use) => {
    // In CI, use the mock instead of real Cesium
    if (process.env.CI) {
      console.log("CI environment detected - using Cesium mock");

      // Inject the mock implementation directly
      await page.addInitScript(() => {
        // Inject Cesium mock implementation inline
        console.log("Injecting Cesium mock...");

        // Mock implementation embedded directly
        function createCesiumMock() {
          // Mock entity collection
          class MockEntityCollection {
            _entities = { _array: [] };
            values = [];

            add(entity) {
              this.values.push(entity);
              this._entities._array.push(entity);
              return entity;
            }

            remove(entity) {
              const index = this.values.indexOf(entity);
              if (index > -1) {
                this.values.splice(index, 1);
              }
              const arrayIndex = this._entities._array.indexOf(entity);
              if (arrayIndex > -1) {
                this._entities._array.splice(arrayIndex, 1);
              }
              return true;
            }

            removeAll() {
              this.values = [];
              this._entities._array = [];
            }

            getById(id) {
              return this.values.find((e) => e.id === id);
            }
          }

          // Mock data source collection
          class MockDataSourceCollection {
            _dataSources = [];

            add(dataSource) {
              this._dataSources.push(dataSource);
              return Promise.resolve(dataSource);
            }

            remove(dataSource) {
              const index = this._dataSources.indexOf(dataSource);
              if (index > -1) {
                this._dataSources.splice(index, 1);
              }
              return true;
            }

            getByName(name) {
              return this._dataSources.filter((ds) => ds.name === name);
            }

            get length() {
              return this._dataSources.length;
            }
          }

          // Mock camera
          class MockCamera {
            position = { x: 0, y: 0, z: 1000000 };
            direction = { x: 0, y: 0, z: -1 };
            up = { x: 0, y: 1, z: 0 };
            right = { x: 1, y: 0, z: 0 };
            frustum = {
              fov: Math.PI / 3,
              aspectRatio: 1,
              near: 1,
              far: 10000000,
            };
            positionCartographic = {
              longitude: 0.4366,
              latitude: 1.0472,
              height: 1000000,
            };
            heading = 0;
            pitch = -Math.PI / 2;
            roll = 0;

            setView(options) {
              if (options.destination) {
                this.position = options.destination;
              }
              if (options.orientation) {
                if (options.orientation.heading !== undefined)
                  this.heading = options.orientation.heading;
                if (options.orientation.pitch !== undefined)
                  this.pitch = options.orientation.pitch;
                if (options.orientation.roll !== undefined)
                  this.roll = options.orientation.roll;
              }
            }

            flyTo(options) {
              this.setView(options);
              return Promise.resolve();
            }

            zoomIn(amount) {
              this.positionCartographic.height -= amount || 100000;
            }

            zoomOut(amount) {
              this.positionCartographic.height += amount || 100000;
            }

            lookAt(target, offset) {
              // Mock implementation
            }

            flyToBoundingSphere(boundingSphere, options) {
              return Promise.resolve();
            }
          }

          // Mock scene
          class MockScene {
            canvas = document.createElement("canvas");
            camera = new MockCamera();
            globe = {
              enableLighting: false,
              showGroundAtmosphere: false,
              showWaterEffect: false,
              depthTestAgainstTerrain: false,
              show: true,
              baseColor: { red: 1, green: 1, blue: 1, alpha: 1 },
            };
            primitives = {
              add: () => ({}),
              remove: () => true,
              removeAll: () => {},
            };
            skyBox = { show: false };
            sun = { show: false };
            moon = { show: false };
            requestRenderMode = false;
            maximumRenderTimeChange = Infinity;
            debugShowFramesPerSecond = false;
            frameState = {
              creditDisplay: {
                _currentFrameCredits: { screenCredits: [] },
              },
              passes: {
                render: true,
              },
            };

            constructor() {
              // Set canvas dimensions for tests
              Object.defineProperty(this.canvas, "offsetWidth", {
                value: 800,
                writable: true,
              });
              Object.defineProperty(this.canvas, "offsetHeight", {
                value: 600,
                writable: true,
              });
              this.canvas.classList.add("cesium-widget-canvas");
            }

            pick(windowPosition) {
              // Return a mock picked object for testing
              return {
                id: { id: "mock-entity-1", name: "Mock Entity" },
                primitive: {},
                position: windowPosition,
              };
            }

            drillPick(windowPosition) {
              return [this.pick(windowPosition)];
            }

            requestRender() {
              // Mock render request
            }

            render() {
              // Mock render
            }
          }

          // Mock viewer
          class MockViewer {
            container;
            scene = new MockScene();
            camera = this.scene.camera;
            canvas = this.scene.canvas;
            entities = new MockEntityCollection();
            dataSources = new MockDataSourceCollection();
            clock = {
              currentTime: { dayNumber: 2458119, secondsOfDay: 0 },
              startTime: { dayNumber: 2458119, secondsOfDay: 0 },
              stopTime: { dayNumber: 2458120, secondsOfDay: 0 },
              shouldAnimate: false,
              multiplier: 1,
            };
            imageryLayers = {
              addImageryProvider: () => ({}),
              remove: () => true,
              removeAll: () => {},
            };
            terrainProvider = {};
            cesiumWidget = {
              creditContainer: document.createElement("div"),
            };
            selectedEntity = null;
            trackedEntity = null;
            screenSpaceEventHandler = {
              setInputAction: () => {},
              removeInputAction: () => {},
              destroy: () => {},
            };

            constructor(container, options) {
              if (typeof container === "string") {
                this.container =
                  document.getElementById(container) ||
                  document.createElement("div");
              } else {
                this.container = container;
              }

              // Append canvas to container
              this.container.appendChild(this.canvas);

              // Store reference globally
              window.viewer = this;
            }

            destroy() {
              if (this.container && this.canvas && this.canvas.parentNode) {
                this.canvas.parentNode.removeChild(this.canvas);
              }
              this.entities.removeAll();
              this.dataSources._dataSources = [];
              if (window.viewer === this) {
                delete window.viewer;
              }
            }

            zoomTo(target, offset) {
              return Promise.resolve();
            }

            flyTo(target, options) {
              return Promise.resolve();
            }

            resize() {
              // Mock resize
            }
          }

          // Mock Cartesian3
          class MockCartesian3 {
            constructor(x = 0, y = 0, z = 0) {
              this.x = x;
              this.y = y;
              this.z = z;
            }

            static fromDegrees(longitude, latitude, height = 0) {
              return new MockCartesian3(longitude, latitude, height);
            }

            static fromRadians(longitude, latitude, height = 0) {
              return new MockCartesian3(longitude, latitude, height);
            }

            static ZERO = new MockCartesian3(0, 0, 0);
          }

          // Mock Color
          class MockColor {
            constructor(red = 1, green = 1, blue = 1, alpha = 1) {
              this.red = red;
              this.green = green;
              this.blue = blue;
              this.alpha = alpha;
            }

            static WHITE = new MockColor(1, 1, 1, 1);
            static BLACK = new MockColor(0, 0, 0, 1);
            static RED = new MockColor(1, 0, 0, 1);
            static GREEN = new MockColor(0, 1, 0, 1);
            static BLUE = new MockColor(0, 0, 1, 1);
            static TRANSPARENT = new MockColor(1, 1, 1, 0);

            static fromCssColorString(color) {
              return new MockColor();
            }
          }

          // Mock GeoJsonDataSource
          class MockGeoJsonDataSource {
            name = "";
            entities = new MockEntityCollection();

            static load(data, options) {
              const dataSource = new MockGeoJsonDataSource();
              if (options?.clampToGround) {
                // Mock clamp to ground behavior
              }
              return Promise.resolve(dataSource);
            }
          }

          // Mock other required classes
          const MockEllipsoidTerrainProvider = class {
            constructor(options) {}
          };

          const MockFeatureDetection = {
            supportsWebGL: () => true,
            supportsImageRenderingPixelated: () => true,
          };

          const MockShadowMode = {
            DISABLED: 0,
            ENABLED: 1,
            CAST_ONLY: 2,
            RECEIVE_ONLY: 3,
          };

          const MockScreenSpaceEventType = {
            LEFT_CLICK: 0,
            LEFT_DOUBLE_CLICK: 1,
            LEFT_DOWN: 2,
            LEFT_UP: 3,
            MOUSE_MOVE: 4,
            RIGHT_CLICK: 5,
            RIGHT_DOWN: 6,
            RIGHT_UP: 7,
            WHEEL: 8,
            PINCH_START: 9,
            PINCH_END: 10,
            PINCH_MOVE: 11,
          };

          const MockScreenSpaceEventHandler = class {
            setInputAction() {}
            removeInputAction() {}
            destroy() {}
          };

          // Create the mock Cesium object
          const CesiumMock = {
            Viewer: MockViewer,
            EntityCollection: MockEntityCollection,
            DataSourceCollection: MockDataSourceCollection,
            Cartesian3: MockCartesian3,
            Color: MockColor,
            GeoJsonDataSource: MockGeoJsonDataSource,
            EllipsoidTerrainProvider: MockEllipsoidTerrainProvider,
            FeatureDetection: MockFeatureDetection,
            ShadowMode: MockShadowMode,
            ScreenSpaceEventType: MockScreenSpaceEventType,
            ScreenSpaceEventHandler: MockScreenSpaceEventHandler,
            Ion: {
              defaultAccessToken: "mock-token",
            },
            defined: (value) => value !== undefined && value !== null,
            Math: {
              toDegrees: (radians) => (radians * 180) / Math.PI,
              toRadians: (degrees) => (degrees * Math.PI) / 180,
            },
            Rectangle: class {
              constructor(west = 0, south = 0, east = 0, north = 0) {
                this.west = west;
                this.south = south;
                this.east = east;
                this.north = north;
              }
              static fromDegrees(west, south, east, north) {
                return new this(west, south, east, north);
              }
            },
            HeadingPitchRoll: class {
              constructor(heading = 0, pitch = 0, roll = 0) {
                this.heading = heading;
                this.pitch = pitch;
                this.roll = roll;
              }
            },
            JulianDate: class {
              constructor(dayNumber = 2458119, secondsOfDay = 0) {
                this.dayNumber = dayNumber;
                this.secondsOfDay = secondsOfDay;
              }
              static now() {
                return new this();
              }
            },
            CallbackProperty: class {
              constructor(callback, isConstant) {}
            },
            ConstantProperty: class {
              constructor(value) {}
            },
            SampledProperty: class {
              constructor(type) {}
              addSample(time, value) {}
            },
            BoundingSphere: class {
              constructor(center, radius = 1000) {
                this.center = center || new MockCartesian3();
                this.radius = radius;
              }
            },
          };

          return CesiumMock;
        }

        // Inject the mock
        window.Cesium = createCesiumMock();
        window.CESIUM_BASE_URL = "/cesium";
        console.log("Cesium mock injected successfully");
      });

      // Navigate to the application
      await page.goto("/");

      // Wait for app to be ready (but not for real Cesium)
      await waitForAppReady(page, 30000);

      // Close the disclaimer dialog if it appears
      const dialogButton = page.getByRole("button", {
        name: /close disclaimer|explore map/i,
      });
      const dialogVisible = await dialogButton.isVisible().catch(() => false);
      if (dialogVisible) {
        await dialogButton.click();
        await page.waitForTimeout(500); // Wait for dialog to close
      }

      // Disable navigation drawer overlay in tests
      // The drawer creates an overlay by default which blocks interactions
      // We'll hide the overlay scrim via CSS instead of closing the drawer
      await page.addStyleTag({
        content: ".v-overlay__scrim { display: none !important; }",
      });

      // Wait a moment for any initial animations
      await page.waitForTimeout(500);

      // Initialize mock viewer if not already created
      await page.evaluate(() => {
        if (!(window as any).viewer) {
          const container =
            document.getElementById("cesiumContainer") ||
            document.querySelector(".cesium-container");
          if (container && (window as any).Cesium) {
            (window as any).viewer = new (window as any).Cesium.Viewer(
              container,
            );
            console.log("Mock viewer created");
          }
        }
      });

      // Use the page with mock Cesium
      await use(page);

      // Cleanup
      await page
        .evaluate(() => {
          if ((window as any).viewer) {
            try {
              (window as any).viewer.destroy();
            } catch (e) {
              console.warn("Failed to destroy mock viewer:", e);
            }
          }
        })
        .catch(() => {});

      return;
    }

    // Original implementation for non-CI environments
    // Setup Cesium for CI if needed
    await setupCesiumForCI(page);

    // Navigate to the application
    await page.goto("/");

    // Pre-initialize Cesium with optimized settings
    await page.evaluate(() => {
      // Set performance-optimized defaults before Cesium loads
      if (typeof window !== "undefined") {
        // Store original settings to restore later
        (window as any).__originalCesiumSettings = {};

        // Configure Cesium for test environment
        (window as any).CESIUM_BASE_URL = "/cesium";

        // Wait for Cesium to be available and configure it
        const configureCesium = () => {
          if ((window as any).Cesium) {
            const Cesium = (window as any).Cesium;

            // Store viewer creation function
            const originalViewer = Cesium.Viewer;

            // Override Viewer constructor with test-optimized settings
            Cesium.Viewer = function (container: any, options: any = {}) {
              // Merge with performance-optimized defaults
              const testOptions = {
                ...options,
                // Disable expensive features for tests
                requestRenderMode: true, // Only render on demand
                maximumRenderTimeChange: Infinity, // Disable time-based rendering
                targetFrameRate: 10, // Lower frame rate for tests

                // Disable unnecessary widgets
                animation: false,
                baseLayerPicker: false,
                fullscreenButton: false,
                vrButton: false,
                homeButton: false,
                infoBox: false,
                sceneModePicker: false,
                selectionIndicator: false,
                timeline: false,
                navigationHelpButton: false,
                navigationInstructionsInitiallyVisible: false,

                // Simplify scene
                scene3DOnly: true,
                shadows: false,
                terrainShadows: Cesium.ShadowMode.DISABLED,

                // Optimize rendering
                msaaSamples: 1, // Minimal anti-aliasing
                useBrowserRecommendedResolution: false,
                resolutionScale: 0.5, // Lower resolution for tests

                // Disable globe features we don't need for tests
                globe: {
                  ...((options.globe as any) || {}),
                  enableLighting: false,
                  showGroundAtmosphere: false,
                  showWaterEffect: false,
                  depthTestAgainstTerrain: false,
                },

                // Use simple imagery provider
                imageryProvider: false,
                terrainProvider: new Cesium.EllipsoidTerrainProvider(),
              };

              // Create viewer with optimized settings
              const viewer = originalViewer.call(this, container, testOptions);

              // Store reference for tests
              (window as any).viewer = viewer;

              // CRITICAL: Freeze clock to prevent time-based animations
              if (viewer.clock) {
                viewer.clock.shouldAnimate = false;
              }

              // Disable animations and effects
              if (viewer.scene) {
                viewer.scene.debugShowFramesPerSecond = false;
                viewer.scene.requestRenderMode = true;
                viewer.scene.maximumRenderTimeChange = Infinity;

                if (viewer.scene.globe) {
                  viewer.scene.globe.enableLighting = false;
                  viewer.scene.globe.showGroundAtmosphere = false;
                }

                if (viewer.scene.skyBox) {
                  viewer.scene.skyBox.show = false;
                }

                if (viewer.scene.sun) {
                  viewer.scene.sun.show = false;
                }

                if (viewer.scene.moon) {
                  viewer.scene.moon.show = false;
                }
              }

              return viewer;
            };

            // Copy static properties
            Object.keys(originalViewer).forEach((key) => {
              Cesium.Viewer[key] = originalViewer[key];
            });

            // Mark as configured
            (window as any).__cesiumConfigured = true;
          }
        };

        // Try to configure immediately if Cesium is already loaded
        configureCesium();

        // Also set up observer for when Cesium loads
        if (!(window as any).Cesium) {
          const observer = new MutationObserver(() => {
            if ((window as any).Cesium && !(window as any).__cesiumConfigured) {
              configureCesium();
              observer.disconnect();
            }
          });

          observer.observe(document, {
            childList: true,
            subtree: true,
          });

          // Disconnect observer after timeout
          setTimeout(() => observer.disconnect(), 30000);
        }
      }
    });

    // Wait for app to be ready
    await waitForAppReady(page, process.env.CI ? 60000 : 30000);

    // Enable performance mode via graphics store
    await page.evaluate(() => {
      // Wait for store to be available and set performance preset
      const checkStore = setInterval(() => {
        if ((window as any).useGraphicsStore) {
          const graphicsStore = (window as any).useGraphicsStore();
          if (graphicsStore) {
            graphicsStore.applyQualityPreset("performance");
            console.log("[Test] Graphics store set to performance mode");
            clearInterval(checkStore);
          }
        }
      }, 100);
      // Timeout after 5 seconds
      setTimeout(() => clearInterval(checkStore), 5000);
    });

    // Close the disclaimer dialog if it appears
    const dialogButton = page.getByRole("button", {
      name: /close disclaimer|explore map/i,
    });
    const dialogVisible = await dialogButton.isVisible().catch(() => false);
    if (dialogVisible) {
      await dialogButton.click();
      await page.waitForTimeout(500); // Wait for dialog to close
    }

    // Disable navigation drawer overlay in tests
    // The drawer creates an overlay by default which blocks interactions
    // We'll hide the overlay scrim via CSS instead of closing the drawer
    await page.addStyleTag({
      content: ".v-overlay__scrim { display: none !important; }",
    });

    // Wait a moment for any initial animations
    await page.waitForTimeout(500);

    // Wait for Cesium to be ready with extended timeout for CI
    await waitForCesiumReady(page, process.env.CI ? 60000 : 30000);

    // Ensure viewer is initialized with our settings
    await page.evaluate(() => {
      // If viewer doesn't exist, try to trigger its creation
      if (!(window as any).viewer) {
        // Look for cesium container
        const container =
          document.getElementById("cesiumContainer") ||
          document.querySelector(".cesium-container");

        if (container && (window as any).Cesium) {
          (window as any).viewer = new (window as any).Cesium.Viewer(container);
        }
      }

      // Force initial render
      if ((window as any).viewer?.scene) {
        (window as any).viewer.scene.requestRender();
      }
    });

    // Use the page with pre-initialized Cesium
    await use(page);

    // Cleanup
    await page
      .evaluate(() => {
        // Destroy viewer if it exists
        if ((window as any).viewer) {
          try {
            (window as any).viewer.destroy();
          } catch (e) {
            console.warn("Failed to destroy viewer:", e);
          }
          delete (window as any).viewer;
        }

        // Restore original settings
        if ((window as any).__originalCesiumSettings) {
          Object.keys((window as any).__originalCesiumSettings).forEach(
            (key) => {
              (window as any)[key] = (window as any).__originalCesiumSettings[
                key
              ];
            },
          );
        }
      })
      .catch(() => {
        // Cleanup errors are not critical
      });
  },
});

/**
 * Helper to skip Cesium tests in environments where WebGL is not available
 */
export const cesiumDescribe = (title: string, fn: () => void) => {
  // In CI, always run the tests (even if they might fail)
  if (process.env.CI) {
    cesiumTest.describe(title, fn);
  } else {
    // In local development, check WebGL availability
    cesiumTest.describe(title, () => {
      cesiumTest.beforeAll(async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();

        const hasWebGL = await page.evaluate(() => {
          try {
            const canvas = document.createElement("canvas");
            return !!(
              canvas.getContext("webgl") || canvas.getContext("webgl2")
            );
          } catch {
            return false;
          }
        });

        await context.close();

        if (!hasWebGL) {
          cesiumTest.skip();
        }
      });

      fn();
    });
  }
};
