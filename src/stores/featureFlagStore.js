import { defineStore } from "pinia";

/**
 * Feature Flag Store
 *
 * Manages feature flags with runtime toggling capability.
 * Flags can be initialized from environment variables and overridden at runtime.
 * User overrides are persisted to localStorage.
 */
export const useFeatureFlagStore = defineStore("featureFlags", {
  state: () => ({
    // Initialize from env vars with runtime override capability
    flags: {
      // Data layers
      ndvi: {
        enabled: import.meta.env.VITE_FEATURE_NDVI !== "false",
        label: "NDVI Vegetation Index",
        description:
          "Normalized Difference Vegetation Index visualization for vegetation health analysis",
        category: "data-layers",
        experimental: false,
      },
      floodLayers: {
        enabled: import.meta.env.VITE_FEATURE_FLOOD_LAYERS === "true",
        label: "Flood Risk Layers",
        description: "SYKE flood risk data visualization",
        category: "data-layers",
        experimental: true,
      },
      grid250m: {
        enabled: import.meta.env.VITE_FEATURE_250M_GRID !== "false",
        label: "250m Socioeconomic Grid",
        description:
          "Fine-grained socioeconomic data overlay at 250m resolution",
        category: "data-layers",
        experimental: false,
      },
      treeCoverage: {
        enabled: import.meta.env.VITE_FEATURE_TREE_COVERAGE !== "false",
        label: "Tree Coverage Visualization",
        description: "Display tree coverage and canopy data",
        category: "data-layers",
        experimental: false,
      },
      landCover: {
        enabled: import.meta.env.VITE_FEATURE_LAND_COVER !== "false",
        label: "Land Cover Analysis",
        description: "Land cover classification and analysis tools",
        category: "data-layers",
        experimental: false,
      },

      // Graphics & Performance features
      hdrRendering: {
        enabled: import.meta.env.VITE_FEATURE_HDR === "true",
        label: "HDR Rendering",
        description: "High Dynamic Range rendering for better lighting",
        category: "graphics",
        experimental: true,
        requiresSupport: true,
      },
      ambientOcclusion: {
        enabled: import.meta.env.VITE_FEATURE_AO === "true",
        label: "Ambient Occlusion",
        description: "Screen Space Ambient Occlusion for depth perception",
        category: "graphics",
        experimental: true,
        requiresSupport: true,
      },
      msaaOptions: {
        enabled: import.meta.env.VITE_FEATURE_MSAA !== "false",
        label: "MSAA Anti-aliasing",
        description: "Multi-Sample Anti-Aliasing options",
        category: "graphics",
        experimental: false,
      },
      fxaaOptions: {
        enabled: import.meta.env.VITE_FEATURE_FXAA !== "false",
        label: "FXAA Anti-aliasing",
        description: "Fast Approximate Anti-Aliasing",
        category: "graphics",
        experimental: false,
      },
      requestRenderMode: {
        enabled: import.meta.env.VITE_FEATURE_REQUEST_RENDER === "true",
        label: "Request Render Mode",
        description:
          "Performance optimization - only render when scene changes",
        category: "graphics",
        experimental: true,
      },
      terrain3d: {
        enabled: import.meta.env.VITE_FEATURE_3D_TERRAIN !== "false",
        label: "3D Terrain",
        description: "Helsinki 3D terrain rendering",
        category: "graphics",
        experimental: false,
      },

      // Analysis tools
      heatHistogram: {
        enabled: import.meta.env.VITE_FEATURE_HEAT_HISTOGRAM !== "false",
        label: "Heat Histogram Analysis",
        description: "Temperature distribution histogram visualization",
        category: "analysis",
        experimental: false,
      },
      buildingScatterPlot: {
        enabled: import.meta.env.VITE_FEATURE_BUILDING_SCATTER !== "false",
        label: "Building Scatter Plot",
        description: "Building attribute correlation analysis",
        category: "analysis",
        experimental: false,
      },
      coolingOptimizer: {
        enabled: import.meta.env.VITE_FEATURE_COOLING_OPTIMIZER !== "false",
        label: "Cooling Center Optimizer",
        description: "Tool to optimize cooling center placement",
        category: "analysis",
        experimental: false,
      },
      ndviAnalysis: {
        enabled: import.meta.env.VITE_FEATURE_NDVI_ANALYSIS !== "false",
        label: "NDVI Analysis Tools",
        description: "Vegetation analysis and health monitoring",
        category: "analysis",
        experimental: false,
      },
      socioeconomicViz: {
        enabled: import.meta.env.VITE_FEATURE_SOCIOECONOMIC !== "false",
        label: "Socioeconomic Visualizations",
        description: "Demographic and economic data overlays",
        category: "analysis",
        experimental: false,
      },

      // UI/UX features
      compactView: {
        enabled: import.meta.env.VITE_FEATURE_COMPACT_VIEW === "true",
        label: "Compact View Mode",
        description: "Reduced UI elements for smaller screens",
        category: "ui",
        experimental: false,
      },
      mobileOptimized: {
        enabled: import.meta.env.VITE_FEATURE_MOBILE_OPTIMIZED === "true",
        label: "Mobile Optimization",
        description: "Touch-optimized controls and layouts",
        category: "ui",
        experimental: true,
      },
      controlPanelDefault: {
        enabled: import.meta.env.VITE_FEATURE_CONTROL_PANEL_DEFAULT !== "false",
        label: "Control Panel Open by Default",
        description: "Show control panel on load",
        category: "ui",
        experimental: false,
      },
      dataSourceStatus: {
        enabled: import.meta.env.VITE_FEATURE_DATA_SOURCE_STATUS !== "false",
        label: "Data Source Status Indicators",
        description: "Show connection status for data sources",
        category: "ui",
        experimental: false,
      },
      loadingPerformanceInfo: {
        enabled: import.meta.env.VITE_FEATURE_LOADING_PERF === "true",
        label: "Loading Performance Info",
        description: "Display detailed performance metrics during loading",
        category: "ui",
        experimental: true,
      },
      backgroundPreload: {
        enabled: import.meta.env.VITE_FEATURE_BACKGROUND_PRELOAD === "true",
        label: "Background Data Preloading",
        description: "Preload data in background for faster transitions",
        category: "ui",
        experimental: true,
      },

      // Integration features
      sentryErrorTracking: {
        enabled:
          import.meta.env.VITE_SENTRY_DSN !== undefined &&
          import.meta.env.VITE_SENTRY_DSN !== "",
        label: "Sentry Error Tracking",
        description: "Error monitoring and reporting via Sentry",
        category: "integration",
        experimental: false,
      },
      digitransitIntegration: {
        enabled:
          import.meta.env.VITE_DIGITRANSIT_KEY !== undefined &&
          import.meta.env.VITE_DIGITRANSIT_KEY !== "",
        label: "Digitransit Public Transport",
        description: "Public transport route integration",
        category: "integration",
        experimental: false,
      },
      backgroundMapProviders: {
        enabled: import.meta.env.VITE_FEATURE_BG_MAP_PROVIDERS !== "false",
        label: "Multiple Background Map Providers",
        description: "Switch between different base map providers",
        category: "integration",
        experimental: false,
      },

      // Developer features
      debugMode: {
        enabled: import.meta.env.MODE === "development",
        label: "Debug Mode",
        description: "Enable debug logging and developer tools",
        category: "developer",
        experimental: false,
      },
      performanceMonitoring: {
        enabled: import.meta.env.VITE_FEATURE_PERF_MONITOR === "true",
        label: "Performance Monitoring",
        description: "Real-time performance metrics and profiling",
        category: "developer",
        experimental: false,
      },
      cacheVisualization: {
        enabled: import.meta.env.VITE_FEATURE_CACHE_VIZ === "true",
        label: "Cache Visualization",
        description: "Visualize data cache status and usage",
        category: "developer",
        experimental: true,
      },
      healthChecks: {
        enabled: import.meta.env.VITE_FEATURE_HEALTH_CHECKS === "true",
        label: "Health Checks Display",
        description: "Show system health check results",
        category: "developer",
        experimental: true,
      },
    },

    // User overrides (stored in localStorage)
    userOverrides: {},
  }),

  getters: {
    /**
     * Check if a feature flag is enabled
     * @param {string} flagName - The name of the feature flag
     * @returns {boolean} Whether the feature is enabled
     */
    isEnabled: (state) => (flagName) => {
      // Check user override first
      if (state.userOverrides[flagName] !== undefined) {
        return state.userOverrides[flagName];
      }

      // Fall back to default flag value
      return state.flags[flagName]?.enabled ?? false;
    },

    /**
     * Get all flags in a specific category
     * @param {string} category - The category name
     * @returns {Array} Array of flag objects with name
     */
    flagsByCategory: (state) => (category) => {
      return Object.entries(state.flags)
        .filter(([_, flag]) => flag.category === category)
        .map(([name, flag]) => ({ name, ...flag }));
    },

    /**
     * Get all experimental flags
     * @returns {Array} Array of experimental flag objects
     */
    experimentalFlags: (state) => {
      return Object.entries(state.flags)
        .filter(([_, flag]) => flag.experimental)
        .map(([name, flag]) => ({ name, ...flag }));
    },

    /**
     * Get all available categories
     * @returns {Array} Array of unique category names
     */
    categories: (state) => {
      const cats = new Set();
      Object.values(state.flags).forEach((flag) => {
        cats.add(flag.category);
      });
      return Array.from(cats).sort();
    },

    /**
     * Get count of enabled flags
     * @returns {number} Number of enabled flags
     */
    enabledCount: (state) => {
      return Object.keys(state.flags).filter((name) => {
        if (state.userOverrides[name] !== undefined) {
          return state.userOverrides[name];
        }
        return state.flags[name]?.enabled ?? false;
      }).length;
    },

    /**
     * Check if a flag has been overridden by the user
     * @param {string} flagName - The name of the feature flag
     * @returns {boolean} Whether the flag has a user override
     */
    hasOverride: (state) => (flagName) => {
      return state.userOverrides[flagName] !== undefined;
    },
  },

  actions: {
    /**
     * Set a feature flag state
     * @param {string} flagName - The name of the feature flag
     * @param {boolean} enabled - Whether to enable the feature
     */
    setFlag(flagName, enabled) {
      if (this.flags[flagName]) {
        this.userOverrides[flagName] = enabled;
        this.persistOverrides();
      }
    },

    /**
     * Reset a feature flag to its default value
     * @param {string} flagName - The name of the feature flag
     */
    resetFlag(flagName) {
      delete this.userOverrides[flagName];
      this.persistOverrides();
    },

    /**
     * Reset all feature flags to default values
     */
    resetAllFlags() {
      this.userOverrides = {};
      this.persistOverrides();
    },

    /**
     * Persist user overrides to localStorage
     */
    persistOverrides() {
      try {
        localStorage.setItem(
          "featureFlags",
          JSON.stringify(this.userOverrides),
        );
      } catch (error) {
        console.warn("Failed to persist feature flag overrides:", error);
      }
    },

    /**
     * Load user overrides from localStorage
     */
    loadOverrides() {
      try {
        const stored = localStorage.getItem("featureFlags");
        if (stored) {
          this.userOverrides = JSON.parse(stored);
        }
      } catch (error) {
        console.warn("Failed to load feature flag overrides:", error);
      }
    },

    /**
     * Check hardware support for a feature and disable if not supported
     * @param {string} flagName - The name of the feature flag
     * @param {boolean} isSupported - Whether the hardware supports this feature
     */
    checkHardwareSupport(flagName, isSupported) {
      const flag = this.flags[flagName];
      if (flag && flag.requiresSupport && !isSupported) {
        this.flags[flagName].enabled = false;
        console.info(`Feature '${flagName}' disabled: hardware not supported`);
      }
    },

    /**
     * Get feature flag metadata
     * @param {string} flagName - The name of the feature flag
     * @returns {Object|null} Flag metadata or null if not found
     */
    getFlagMetadata(flagName) {
      return this.flags[flagName] || null;
    },

    /**
     * Export current configuration as JSON
     * @returns {Object} Current flag configuration
     */
    exportConfig() {
      const config = {};
      Object.keys(this.flags).forEach((name) => {
        config[name] = this.isEnabled(name);
      });
      return config;
    },

    /**
     * Import configuration from JSON
     * @param {Object} config - Configuration object
     */
    importConfig(config) {
      Object.entries(config).forEach(([name, enabled]) => {
        if (this.flags[name]) {
          this.setFlag(name, enabled);
        }
      });
    },
  },
});
