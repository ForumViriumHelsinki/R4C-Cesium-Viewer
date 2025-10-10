import { vi } from "vitest";
import { config } from "@vue/test-utils";

// Mock CSS imports
vi.mock("*.css", () => ({}));

// Mock Cesium to avoid loading heavy 3D library in tests
vi.mock("cesium", () => ({
  Viewer: vi.fn(),
  Cartesian3: {
    fromDegrees: vi.fn(() => ({ x: 0, y: 0, z: 0 })),
  },
  Color: {
    YELLOW: { withAlpha: vi.fn() },
    RED: { withAlpha: vi.fn() },
    BLUE: { withAlpha: vi.fn() },
    GREEN: { withAlpha: vi.fn() },
  },
  DataSource: vi.fn(),
  GeoJsonDataSource: {
    load: vi.fn(),
  },
  ImageryLayer: vi.fn(),
  WebMapServiceImageryProvider: vi.fn(),
  TileMapServiceImageryProvider: vi.fn(),
  Camera: {
    flyTo: vi.fn(),
    setView: vi.fn(),
  },
  Scene: {
    pick: vi.fn(),
  },
}));

// Mock browser APIs
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Set up global test configuration
config.global.mocks = {
  $route: {
    path: "/",
    query: {},
    params: {},
  },
  $router: {
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
  },
};

// Add global render stub for Vuetify components that need VApp wrapper
config.global.renderStubDefaultSlot = true;

// Mock window properties
Object.defineProperty(window, "location", {
  value: {
    href: "http://localhost:3000",
    search: "",
    pathname: "/",
  },
  writable: true,
});

// Mock fetch for API calls
global.fetch = vi.fn();
