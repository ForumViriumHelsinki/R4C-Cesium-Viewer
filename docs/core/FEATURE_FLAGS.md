# Feature Flags

This document describes the feature flag system used in the R4C-Cesium-Viewer application.

## Overview

Feature flags allow you to enable or disable specific features at build time (via environment variables) or at runtime (via the Feature Flags panel). This system provides:

- **Build-time configuration** via `.env` files
- **Runtime toggling** via the Feature Flags panel (accessible in the app UI)
- **User preferences** that persist in browser localStorage
- **Hardware capability detection** for features that require specific GPU support
- **Category organization** for easier management

## Architecture

The feature flag system is implemented using:

- **Pinia Store** (`src/stores/featureFlagStore.ts`) - Core state management with TypeScript type safety
- **Vue Component** (`src/components/FeatureFlagsPanel.vue`) - UI for managing flags
- **Environment Variables** (`.env` files) - Default configuration

## Available Feature Flags

### Data Layers

| Flag           | Default | Description                                                        | Experimental |
| -------------- | ------- | ------------------------------------------------------------------ | ------------ |
| `ndvi`         | `true`  | NDVI Vegetation Index visualization for vegetation health analysis | No           |
| `floodLayers`  | `false` | SYKE flood risk data visualization                                 | Yes          |
| `grid250m`     | `true`  | Fine-grained socioeconomic data overlay at 250m resolution         | No           |
| `treeCoverage` | `true`  | Display tree coverage and canopy data                              | No           |
| `landCover`    | `true`  | Land cover classification and analysis tools                       | No           |

**Environment Variables:**

```bash
VITE_FEATURE_NDVI=true
VITE_FEATURE_FLOOD_LAYERS=false
VITE_FEATURE_250M_GRID=true
VITE_FEATURE_TREE_COVERAGE=true
VITE_FEATURE_LAND_COVER=true
```

### Graphics & Performance

| Flag                | Default | Description                                               | Experimental | Hardware Check |
| ------------------- | ------- | --------------------------------------------------------- | ------------ | -------------- |
| `hdrRendering`      | `false` | High Dynamic Range rendering for better lighting          | Yes          | Yes            |
| `ambientOcclusion`  | `false` | Screen Space Ambient Occlusion for depth perception       | Yes          | Yes            |
| `msaaOptions`       | `true`  | Multi-Sample Anti-Aliasing options                        | No           | No             |
| `fxaaOptions`       | `true`  | Fast Approximate Anti-Aliasing                            | No           | No             |
| `requestRenderMode` | `false` | Performance optimization - only render when scene changes | Yes          | No             |
| `terrain3d`         | `true`  | Helsinki 3D terrain rendering                             | No           | No             |

**Environment Variables:**

```bash
VITE_FEATURE_HDR=false
VITE_FEATURE_AO=false
VITE_FEATURE_MSAA=true
VITE_FEATURE_FXAA=true
VITE_FEATURE_REQUEST_RENDER=false
VITE_FEATURE_3D_TERRAIN=true
```

**Note:** HDR and Ambient Occlusion require WebGL2 support and will be automatically disabled if the hardware doesn't support them.

### Analysis Tools

| Flag                  | Default | Description                                      | Experimental |
| --------------------- | ------- | ------------------------------------------------ | ------------ |
| `heatHistogram`       | `true`  | Temperature distribution histogram visualization | No           |
| `buildingScatterPlot` | `true`  | Building attribute correlation analysis          | No           |
| `coolingOptimizer`    | `true`  | Tool to optimize cooling center placement        | No           |
| `ndviAnalysis`        | `true`  | Vegetation analysis and health monitoring        | No           |
| `socioeconomicViz`    | `true`  | Demographic and economic data overlays           | No           |

**Environment Variables:**

```bash
VITE_FEATURE_HEAT_HISTOGRAM=true
VITE_FEATURE_BUILDING_SCATTER=true
VITE_FEATURE_COOLING_OPTIMIZER=true
VITE_FEATURE_NDVI_ANALYSIS=true
VITE_FEATURE_SOCIOECONOMIC=true
```

### UI & UX

| Flag                     | Default | Description                                         | Experimental |
| ------------------------ | ------- | --------------------------------------------------- | ------------ |
| `controlPanelDefault`    | `true`  | Show control panel on load                          | No           |
| `dataSourceStatus`       | `true`  | Show connection status for data sources             | No           |
| `loadingPerformanceInfo` | `false` | Display detailed performance metrics during loading | Yes          |
| `backgroundPreload`      | `false` | Preload data in background for faster transitions   | Yes          |

**Environment Variables:**

```bash
VITE_FEATURE_CONTROL_PANEL_DEFAULT=true
VITE_FEATURE_DATA_SOURCE_STATUS=true
VITE_FEATURE_LOADING_PERF=false
VITE_FEATURE_BACKGROUND_PRELOAD=false
```

### Integrations

| Flag                     | Default | Description                                                                          | Experimental |
| ------------------------ | ------- | ------------------------------------------------------------------------------------ | ------------ |
| `sentryErrorTracking`    | auto    | Error monitoring and reporting via Sentry (auto-enabled if `VITE_SENTRY_DSN` is set) | No           |
| `digitransitIntegration` | auto    | Public transport route integration (auto-enabled if `VITE_DIGITRANSIT_KEY` is set)   | No           |
| `backgroundMapProviders` | `true`  | Switch between different base map providers                                          | No           |

**Environment Variables:**

```bash
# Sentry and Digitransit are automatically enabled when their API keys are present
VITE_SENTRY_DSN=your-sentry-dsn
VITE_DIGITRANSIT_KEY=your-digitransit-key

VITE_FEATURE_BG_MAP_PROVIDERS=true
```

### Developer Tools

| Flag                 | Default | Description                                                                 | Experimental |
| -------------------- | ------- | --------------------------------------------------------------------------- | ------------ |
| `debugMode`          | auto    | Enable debug logging and developer tools (auto-enabled in development mode) | No           |
| `cacheVisualization` | `false` | Visualize data cache status and usage                                       | Yes          |
| `healthChecks`       | `false` | Show system health check results                                            | Yes          |

**Environment Variables:**

```bash
# Debug mode is automatically enabled in development
VITE_FEATURE_CACHE_VIZ=false
VITE_FEATURE_HEALTH_CHECKS=false
```

## Usage

### In Vue Components

```vue
<template>
	<div v-if="featureFlagStore.isEnabled('coolingOptimizer')">
		<CoolingCenterOptimiser />
	</div>

	<v-btn
		v-if="featureFlagStore.isEnabled('ndvi')"
		@click="toggleNDVI"
	>
		Toggle NDVI
	</v-btn>
</template>

<script setup>
import { useFeatureFlagStore } from '@/stores/featureFlagStore';

const featureFlagStore = useFeatureFlagStore();

// Check if a feature is enabled
const isNdviEnabled = featureFlagStore.isEnabled('ndvi');

// Get feature metadata
const ndviMetadata = featureFlagStore.getFlagMetadata('ndvi');
console.log(ndviMetadata.description);
</script>
```

### In JavaScript/TypeScript

```javascript
import { useFeatureFlagStore } from '@/stores/featureFlagStore';

const featureFlagStore = useFeatureFlagStore();

if (featureFlagStore.isEnabled('debugMode')) {
	// Log debug information
	console.time('operation');
	// ... do work ...
	console.timeEnd('operation');
}
```

### Programmatic Control

```javascript
// Set a flag
featureFlagStore.setFlag('ndvi', true);

// Reset a flag to default
featureFlagStore.resetFlag('ndvi');

// Reset all flags
featureFlagStore.resetAllFlags();

// Check if a flag has been overridden
const hasOverride = featureFlagStore.hasOverride('ndvi');

// Export configuration
const config = featureFlagStore.exportConfig();

// Import configuration
featureFlagStore.importConfig(config);
```

### Hardware Support Checks

For features that require specific hardware support (like HDR rendering):

```javascript
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useGraphicsStore } from '@/stores/graphicsStore';

const featureFlagStore = useFeatureFlagStore();
const graphicsStore = useGraphicsStore();

// Check if HDR is supported by hardware
featureFlagStore.checkHardwareSupport('hdrRendering', graphicsStore.hdrSupported);
```

## UI Panel

The Feature Flags panel is accessible in the application UI and provides:

- **Visual toggle switches** for each feature
- **Category organization** (Data Layers, Graphics, Analysis, etc.)
- **Status indicators**:
  - 🟡 "Experimental" badge for experimental features
  - 🔵 "Modified" badge for user-overridden flags
  - 🔴 "Not Supported" badge for hardware-incompatible features
- **Reset functionality** (individual flags or all at once)
- **Export/Import** configuration as JSON

## Configuration Files

### Development

Create a `.env.development` file:

```bash
# Enable all features for development
VITE_FEATURE_NDVI=true
VITE_FEATURE_FLOOD_LAYERS=true
VITE_FEATURE_HDR=true
VITE_FEATURE_AO=true
VITE_FEATURE_CACHE_VIZ=true
VITE_FEATURE_HEALTH_CHECKS=true
```

### Production

Create a `.env.production` file:

```bash
# Conservative defaults for production
VITE_FEATURE_NDVI=true
VITE_FEATURE_FLOOD_LAYERS=false
VITE_FEATURE_HDR=false
VITE_FEATURE_AO=false
```

### Testing

Create a `.env.test` file:

```bash
# Test with experimental features enabled
VITE_FEATURE_FLOOD_LAYERS=true
VITE_FEATURE_BACKGROUND_PRELOAD=true
VITE_FEATURE_CACHE_VIZ=true
```

## Best Practices

### 1. Naming Conventions

- Use clear, descriptive names
- Follow the pattern: `category.feature` (e.g., `dataLayers.ndvi`)
- Use camelCase for flag names

### 2. Lifecycle Management

When adding a new feature flag:

1. Add it to `featureFlagStore.ts` with appropriate metadata (see `FeatureFlagName` type for all flag names)
2. Add the environment variable to `.env.example`
3. Document it in this file
4. Use it in your components with `v-if` or programmatic checks

When deprecating a feature flag:

1. Mark it as `experimental: true` and add deprecation warning
2. After 2-3 releases, remove it from the store
3. Update documentation

### 3. Testing

Always test features in both enabled and disabled states:

```javascript
describe('NDVI Feature', () => {
	it('should show NDVI controls when flag is enabled', () => {
		const featureFlagStore = useFeatureFlagStore();
		featureFlagStore.setFlag('ndvi', true);
		// ... test with flag enabled
	});

	it('should hide NDVI controls when flag is disabled', () => {
		const featureFlagStore = useFeatureFlagStore();
		featureFlagStore.setFlag('ndvi', false);
		// ... test with flag disabled
	});
});
```

### 4. Performance Considerations

- Feature flags have minimal performance impact
- Checks are simple boolean lookups
- User overrides are persisted to localStorage automatically
- Hardware support checks are done once at initialization

## Migration Guide

### Migrating Existing Toggles

If you have existing toggle logic (e.g., in `toggleStore`), you can gradually migrate to feature flags:

**Before:**

```vue
<template>
	<div v-if="toggleStore.ndvi">
		<NDVILayer />
	</div>
</template>

<script setup>
import { useToggleStore } from '@/stores/toggleStore';
const toggleStore = useToggleStore();
</script>
```

**After:**

```vue
<template>
	<div v-if="featureFlagStore.isEnabled('ndvi') && toggleStore.ndvi">
		<NDVILayer />
	</div>
</template>

<script setup>
import { useFeatureFlagStore } from '@/stores/featureFlagStore';
import { useToggleStore } from '@/stores/toggleStore';

const featureFlagStore = useFeatureFlagStore();
const toggleStore = useToggleStore();
</script>
```

**Note:** The difference between `toggleStore` and `featureFlagStore`:

- **`toggleStore`** manages user-facing runtime toggles (visibility, on/off states)
- **`featureFlagStore`** manages feature availability (whether features exist at all)

## Troubleshooting

### Flag Not Working

1. Check if the flag is properly defined in `featureFlagStore.ts`
2. Verify the environment variable is set correctly in `.env`
3. Clear localStorage and restart: `localStorage.removeItem('featureFlags')`
4. Check browser console for warnings

### Hardware-Dependent Features

If a feature requires hardware support but isn't working:

1. Check the graphics store for support detection
2. Verify the `requiresSupport` flag is set
3. Use the Feature Flags panel to see if it's marked as "Not Supported"

### Performance Issues

If feature flags cause performance issues:

1. Minimize flag checks in render loops
2. Cache flag values in computed properties
3. Use `v-if` instead of `v-show` for better performance

## Future Enhancements

Potential future improvements:

- **Remote Configuration**: Fetch flags from a remote server
- **A/B Testing**: Percentage-based rollouts
- **User Targeting**: Enable flags for specific user groups
- **Analytics Integration**: Track feature usage
- **Time-based Flags**: Auto-enable/disable based on dates

## References

- [Feature Flags Blog Post](https://deployandpray.com/blog/feature-flags.html)
- [Pinia Store Documentation](https://pinia.vuejs.org/)
- [Vue 3 Composition API](https://vuejs.org/guide/extras/composition-api-faq.html)
