# Feature Flag Implementation PRDs

This document contains Product Requirement Documents (PRDs) for partially implemented feature flags that require additional work to be fully functional.

## Table of Contents

1. [terrain3d - 3D Terrain Toggle](#1-terrain3d---3d-terrain-toggle)
2. [loadingPerformanceInfo - Loading Performance Display](#2-loadingperformanceinfo---loading-performance-display)
3. [backgroundMapProviders - Background Map Provider Switching](#3-backgroundmapproviders---background-map-provider-switching)
4. [cacheVisualization - Cache Visualization](#4-cachevisualization---cache-visualization)
5. [healthChecks - Health Check Display](#5-healthchecks---health-check-display)

---

## 1. terrain3d - 3D Terrain Toggle

### Executive Summary

**Problem Statement**

The application currently uses a flat `EllipsoidTerrainProvider` as the terrain provider. Users have no way to switch between flat terrain and 3D elevation terrain, which limits the ability to visualize building heights in the context of actual topography.

**Proposed Solution**

Implement a UI toggle that allows users to switch between:
- Flat terrain (EllipsoidTerrainProvider) - faster rendering
- 3D terrain (Cesium World Terrain or Helsinki custom terrain) - realistic topography

**Expected Benefits**

- Enhanced visualization of buildings in context of actual terrain elevation
- Better understanding of flood risk areas (low elevation)
- Improved perception of building heights relative to ground level

### Current Infrastructure (20% Complete)

**What Exists:**
- Feature flag defined in `featureFlagStore.ts` with default `true`
- Hard-coded `EllipsoidTerrainProvider` in `useViewerInitialization.js` (line 123)
- Terrain health tracking in `loadingStore.js`
- Terrain WMS service URL building via `useURLStore`

**What's Missing:**
- Terrain provider switching logic
- UI toggle component
- Dynamic terrain provider configuration
- Integration with feature flag

### Technical Requirements

#### TR-1: Terrain Provider Configuration

```typescript
interface TerrainConfig {
  type: 'flat' | '3d';
  provider: Cesium.TerrainProvider;
  label: string;
  description: string;
}

const terrainProviders: TerrainConfig[] = [
  {
    type: 'flat',
    provider: new Cesium.EllipsoidTerrainProvider(),
    label: 'Flat Terrain',
    description: 'Fast rendering, no elevation data'
  },
  {
    type: '3d',
    provider: await Cesium.CesiumTerrainProvider.fromUrl(
      'https://kartta.hel.fi/3d/datasource-data/e9e1ba2a-c68a-4ed0-b209-b34fe6db6e9c/quantized-mesh'
    ),
    label: '3D Terrain',
    description: 'Helsinki region elevation data'
  }
];
```

#### TR-2: Terrain Switching Logic

```javascript
// In useViewerInitialization.js
async function switchTerrainProvider(type: 'flat' | '3d') {
  const viewer = useGlobalStore().cesiumViewer;

  if (type === 'flat') {
    viewer.terrainProvider = new Cesium.EllipsoidTerrainProvider();
  } else {
    viewer.terrainProvider = await Cesium.CesiumTerrainProvider.fromUrl(
      helsinkiTerrainUrl,
      { requestWaterMask: false, requestVertexNormals: true }
    );
  }

  // Request render to show new terrain
  viewer.scene.requestRender();
}
```

#### TR-3: UI Integration

Add toggle in `GraphicsQuality.vue` or `BackgroundMapBrowser.vue`:

```vue
<v-switch
  v-if="featureFlagStore.isEnabled('terrain3d')"
  v-model="terrain3dEnabled"
  label="3D Terrain"
  hint="Show Helsinki region elevation"
/>
```

### Implementation Tasks

1. **Create terrain service** - `src/services/terrain.js`
   - Terrain provider factory
   - Async terrain loading with error handling
   - Terrain switching method

2. **Add UI toggle** - Modify `GraphicsQuality.vue`
   - Add terrain switch under "Advanced Rendering" section
   - Connect to graphics store

3. **Integrate feature flag** - Modify `useViewerInitialization.js`
   - Check `terrain3d` flag during initialization
   - Set initial terrain provider based on flag

4. **Add store state** - Modify `graphicsStore.js`
   - Add `terrain3dEnabled` state
   - Add `setTerrain3dEnabled()` action

### Complexity: Medium
### Estimated Effort: 2-3 days

---

## 2. loadingPerformanceInfo - Loading Performance Display

### Executive Summary

**Problem Statement**

Users and developers have no visibility into loading performance metrics during data fetching. This makes it difficult to identify slow-loading layers, debug performance issues, or understand application behavior.

**Proposed Solution**

Display real-time loading performance metrics including:
- Layer load times (individual and aggregate)
- Cache hit/miss rates
- Network request timing
- FPS during loading

**Expected Benefits**

- Better debugging of performance issues
- User awareness of data loading progress
- Performance regression detection

### Current Infrastructure (40% Complete)

**What Exists:**
- `loadingStore.js` tracks `loadingTimes` per layer
- `dataSourceHealth` tracks response times
- `cacheStatus` tracks cache hit times
- `LoadingIndicator` component has `show-performance-info` prop (unused)
- Performance reporter in tests: `tests/reporters/performance-reporter.ts`

**What's Missing:**
- Runtime performance display component
- Integration with `show-performance-info` prop
- Real-time metric visualization

### Technical Requirements

#### TR-1: Performance Metrics Data Structure

```typescript
interface PerformanceMetrics {
  layers: {
    [layerName: string]: {
      loadTime: number;      // ms
      cacheHit: boolean;
      size: number;          // bytes
      timestamp: number;
    }
  };
  aggregate: {
    totalLoadTime: number;
    cacheHitRate: number;
    avgResponseTime: number;
  };
  fps: number;
}
```

#### TR-2: Performance Display Component

Create `src/components/PerformanceInfo.vue`:

```vue
<template>
  <v-card v-if="showPerformanceInfo" class="performance-info">
    <v-card-title>Loading Performance</v-card-title>
    <v-card-text>
      <div class="metric">
        <span>Total Load Time:</span>
        <span>{{ totalLoadTime }}ms</span>
      </div>
      <div class="metric">
        <span>Cache Hit Rate:</span>
        <span>{{ cacheHitRate }}%</span>
      </div>
      <div class="metric">
        <span>FPS:</span>
        <span>{{ fps }}</span>
      </div>
      <v-divider class="my-2" />
      <div v-for="(layer, name) in layerMetrics" :key="name" class="layer-metric">
        <span>{{ name }}:</span>
        <span>{{ layer.loadTime }}ms</span>
        <v-chip size="x-small" :color="layer.cacheHit ? 'success' : 'warning'">
          {{ layer.cacheHit ? 'cached' : 'network' }}
        </v-chip>
      </div>
    </v-card-text>
  </v-card>
</template>
```

#### TR-3: Integration Points

- Wire `LoadingIndicator` `show-performance-info` prop to feature flag
- Connect to `loadingStore` metrics
- Add FPS monitoring from Cesium scene

### Implementation Tasks

1. **Create PerformanceInfo component** - `src/components/PerformanceInfo.vue`
   - Display layer load times
   - Show cache hit rates
   - Display FPS counter

2. **Integrate with LoadingIndicator** - Modify `LoadingIndicator.vue`
   - Wire `show-performance-info` prop to feature flag
   - Show PerformanceInfo when enabled

3. **Add FPS monitoring** - Modify `graphicsStore.js`
   - Track FPS from Cesium scene
   - Expose as computed property

4. **Connect feature flag** - Modify `App.vue`
   - Pass flag state to LoadingIndicator

### Complexity: Medium
### Estimated Effort: 2 days

---

## 3. backgroundMapProviders - Background Map Provider Switching

### Executive Summary

**Problem Statement**

Users cannot switch between different base map providers (OpenStreetMap, satellite, terrain maps). The current implementation hard-codes OpenStreetMap as the only base layer.

**Proposed Solution**

Implement a provider selector allowing users to choose from:
- OpenStreetMap (default)
- HSY Aerial Imagery
- Google Maps (if API key available)
- Custom WMS providers

**Expected Benefits**

- Enhanced map context for different use cases
- Satellite imagery for building verification
- Terrain visualization for elevation context

### Current Infrastructure (60% Complete)

**What Exists:**
- `BackgroundMapBrowser.vue` with basic map category UI
- OpenStreetMapImageryProvider in `useViewerInitialization.js`
- `backgroundMapStore.js` for tracking selected layers
- Basic maps array defined in BackgroundMapBrowser (default, satellite, terrain)

**What's Missing:**
- Actual imagery provider switching implementation
- Feature flag integration
- Provider configuration registry
- Save/restore user preference

### Technical Requirements

#### TR-1: Provider Registry

```typescript
interface MapProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  createProvider: () => Cesium.ImageryProvider;
  requiresApiKey?: boolean;
}

const mapProviders: MapProvider[] = [
  {
    id: 'osm',
    name: 'OpenStreetMap',
    description: 'Standard base map',
    icon: 'mdi-map',
    createProvider: () => new Cesium.OpenStreetMapImageryProvider({ url: 'https://tile.openstreetmap.org/' })
  },
  {
    id: 'hsy-aerial',
    name: 'HSY Aerial',
    description: 'Helsinki region aerial imagery',
    icon: 'mdi-satellite-variant',
    createProvider: () => new Cesium.WebMapServiceImageryProvider({
      url: 'https://kartta.hsy.fi/geoserver/wms',
      layers: 'taustakartat:ortoilmakuva_2022'
    })
  }
];
```

#### TR-2: Provider Switching

```javascript
async function switchBaseMapProvider(providerId: string) {
  const viewer = useGlobalStore().cesiumViewer;
  const provider = mapProviders.find(p => p.id === providerId);

  if (!provider) return;

  // Remove existing base layer
  viewer.imageryLayers.remove(viewer.imageryLayers.get(0));

  // Add new base layer
  const imageryProvider = provider.createProvider();
  viewer.imageryLayers.addImageryProvider(imageryProvider, 0);

  // Save preference
  localStorage.setItem('preferredMapProvider', providerId);
}
```

### Implementation Tasks

1. **Create provider registry** - `src/config/mapProviders.ts`
   - Define all available providers
   - Include creation functions

2. **Implement switching logic** - `src/services/backgroundMap.js`
   - Provider switching method
   - User preference persistence

3. **Connect UI** - Modify `BackgroundMapBrowser.vue`
   - Wire provider selection to actual implementation
   - Gate provider options with feature flag

4. **Feature flag integration** - Check flag before showing provider options

### Complexity: Small
### Estimated Effort: 1-2 days

---

## 4. cacheVisualization - Cache Visualization

### Executive Summary

**Problem Statement**

Users and developers have no visibility into cache state, utilization, or effectiveness. This makes it difficult to understand if caching is working properly or debug cache-related issues.

**Proposed Solution**

Create a cache visualization panel showing:
- Total cache size and utilization
- Cache entries by type (buildings, heat data, WMS tiles)
- Cache age and TTL remaining
- Clear cache controls

**Expected Benefits**

- Better understanding of cache behavior
- Debug cache issues
- Manual cache management

### Current Infrastructure (60% Complete)

**What Exists:**
- `cacheService.js` with full IndexedDB implementation
- `cacheService.getStats()` returns detailed cache info
- `loadingStore.cacheStatus` tracks per-layer cache state
- DataSourceStatus shows "Checking cache..." status

**What's Missing:**
- Visualization component
- Cache management UI (clear, refresh)
- Integration with feature flag

### Technical Requirements

#### TR-1: Cache Stats Display

```typescript
interface CacheStats {
  totalSize: number;        // bytes
  totalEntries: number;
  utilizationPercent: number;
  entriesByType: {
    buildings: number;
    heatData: number;
    wmsTiles: number;
    postalCodes: number;
  };
  expiredCount: number;
  oldestEntry: Date;
  newestEntry: Date;
}
```

#### TR-2: CacheVisualization Component

```vue
<template>
  <v-card class="cache-visualization">
    <v-card-title>
      <v-icon class="mr-2">mdi-database</v-icon>
      Cache Status
    </v-card-title>
    <v-card-text>
      <!-- Utilization bar -->
      <v-progress-linear
        :model-value="stats.utilizationPercent"
        :color="utilizationColor"
        height="20"
      >
        {{ formatBytes(stats.totalSize) }} / {{ formatBytes(maxSize) }}
      </v-progress-linear>

      <!-- Entry breakdown -->
      <v-list density="compact">
        <v-list-item v-for="(count, type) in stats.entriesByType" :key="type">
          <template #prepend>
            <v-icon>{{ getTypeIcon(type) }}</v-icon>
          </template>
          <v-list-item-title>{{ type }}</v-list-item-title>
          <template #append>{{ count }} entries</template>
        </v-list-item>
      </v-list>

      <!-- Actions -->
      <v-btn color="warning" @click="clearCache">
        <v-icon>mdi-delete</v-icon>
        Clear Cache
      </v-btn>
    </v-card-text>
  </v-card>
</template>
```

### Implementation Tasks

1. **Create CacheVisualization component** - `src/components/CacheVisualization.vue`
   - Display cache stats
   - Show utilization bar
   - Entry breakdown by type

2. **Add cache management actions**
   - Clear all cache
   - Clear by type
   - Refresh stats

3. **Integrate with developer tools**
   - Add to FeatureFlagsPanel or separate dev tools section
   - Gate with feature flag

4. **Connect to cacheService**
   - Subscribe to cache stat updates
   - Real-time visualization

### Complexity: Medium
### Estimated Effort: 2 days

---

## 5. healthChecks - Health Check Display

### Executive Summary

**Problem Statement**

Users have no visibility into the health status of various data sources. When a data source is degraded or down, users don't understand why certain features aren't working.

**Proposed Solution**

Display health status for all data sources with:
- Status indicator (healthy/degraded/error)
- Response time metrics
- Last successful check timestamp
- Retry/refresh controls

**Expected Benefits**

- User awareness of data source issues
- Faster debugging of connectivity problems
- Transparent system status

### Current Infrastructure (70% Complete)

**What Exists:**
- `loadingStore.dataSourceHealth` tracks health per source
- `DataSourceStatus.vue` displays health summary
- `DataSourceStatusCompact.vue` compact variant
- Health tracking for: pygeoapi, hsyAction, paavo, digitransit, terrain

**What's Missing:**
- Automated periodic health checks
- Feature flag integration
- Enhanced health check UI with retry buttons
- Response time thresholds

### Technical Requirements

#### TR-1: Health Check Service

```typescript
interface HealthCheckConfig {
  sourceId: string;
  endpoint: string;
  interval: number;         // ms
  timeout: number;          // ms
  thresholds: {
    healthy: number;        // response time < this = healthy
    degraded: number;       // response time < this = degraded, else error
  };
}

class HealthCheckService {
  private checks: Map<string, HealthCheckConfig>;
  private timers: Map<string, number>;

  async runCheck(sourceId: string): Promise<HealthStatus>;
  startPeriodicChecks(): void;
  stopPeriodicChecks(): void;
}
```

#### TR-2: Enhanced Health Display

```vue
<template>
  <v-expansion-panels v-if="featureFlagStore.isEnabled('healthChecks')">
    <v-expansion-panel title="System Health">
      <v-expansion-panel-text>
        <v-list density="compact">
          <v-list-item v-for="source in dataSources" :key="source.id">
            <template #prepend>
              <v-icon :color="getStatusColor(source.status)">
                {{ getStatusIcon(source.status) }}
              </v-icon>
            </template>

            <v-list-item-title>{{ source.name }}</v-list-item-title>
            <v-list-item-subtitle>
              {{ source.responseTime }}ms | {{ formatTimestamp(source.lastCheck) }}
            </v-list-item-subtitle>

            <template #append>
              <v-btn icon size="small" @click="retryCheck(source.id)">
                <v-icon>mdi-refresh</v-icon>
              </v-btn>
            </template>
          </v-list-item>
        </v-list>
      </v-expansion-panel-text>
    </v-expansion-panel>
  </v-expansion-panels>
</template>
```

### Implementation Tasks

1. **Create HealthCheckService** - `src/services/healthCheck.js`
   - Periodic health check runner
   - Response time measurement
   - Threshold-based status classification

2. **Enhance DataSourceStatus** - Modify `DataSourceStatus.vue`
   - Add retry buttons
   - Show response times
   - Gate with feature flag

3. **Add periodic checks** - Integrate in `App.vue`
   - Start checks on mount (if flag enabled)
   - Stop on unmount

4. **Configure thresholds** - Add to config
   - healthy: < 500ms
   - degraded: < 2000ms
   - error: >= 2000ms or timeout

### Complexity: Small
### Estimated Effort: 1-2 days

---

## Implementation Priority

Based on infrastructure completeness and user value:

| Priority | Flag | Completeness | Effort | Value |
|----------|------|--------------|--------|-------|
| 1 | healthChecks | 70% | 1-2 days | High - user transparency |
| 2 | backgroundMapProviders | 60% | 1-2 days | High - user flexibility |
| 3 | cacheVisualization | 60% | 2 days | Medium - debugging |
| 4 | loadingPerformanceInfo | 40% | 2 days | Medium - debugging |
| 5 | terrain3d | 20% | 2-3 days | Medium - visualization |

---

**Document Version**: 1.0
**Last Updated**: 2025-01-14
**Author**: Claude Code
**Status**: Planning
