# Building Data Pipeline - Performance Analysis

## Overview

This document maps the complete data flow from user interaction to rendered buildings on screen, identifying critical paths and optimization opportunities.

## Pipeline Diagram

```mermaid
flowchart TB
    subgraph UserInteraction["1. User Interaction"]
        Click["Click Postal Code"]
        Camera["Camera Movement"]
    end

    subgraph Routing["2. Loading Strategy Router"]
        FF{{"Feature Flag:<br/>viewportStreaming"}}
        PostalPath["Postal Code Path"]
        ViewportPath["Viewport Streaming Path"]
    end

    subgraph ViewportCalc["3a. Viewport Tile Calculation"]
        CamPos["Get Camera Position"]
        AltCheck{{"Altitude < 3000m?"}}
        GetRect["computeViewRectangle()"]
        CalcTiles["Calculate Tile Grid<br/>(0.01° tiles ≈ 1km)"]
        SortTiles["Sort Tiles<br/>(center-out priority)"]
        TileQueue["Tile Loading Queue<br/>(max 3 concurrent)"]
    end

    subgraph PostalCalc["3b. Postal Code Resolution"]
        GetPostal["Get Selected Postal Code"]
        ValidatePC["validatePostalCode()"]
    end

    subgraph URLGen["4. URL Generation (urlStore)"]
        HSYUrl["hsyBuildings(postalCode)<br/>limit=10,000"]
        GridUrl["hsyGridBuildings(bbox)<br/>limit=2,000"]
        HeatUrl["urbanHeatHelsinki(postalCode)"]
    end

    subgraph Caching["5. Caching Layer"]
        CacheCheck{{"IndexedDB<br/>Cache Hit?"}}
        IDBCache[("IndexedDB<br/>TTL: 1 hour")]
        PiniaCache[("Pinia Store<br/>LRU: 50 postal codes")]
    end

    subgraph Fetch["6. Data Fetching (unifiedLoader)"]
        HTTPFetch["HTTP Fetch<br/>(retry: 2 attempts)"]
        PyGeoAPI[("PyGeoAPI<br/>/hsy_buildings_optimized")]
        HeatAPI[("Heat Exposure API")]
    end

    subgraph Processing["7. Data Processing"]
        ParseGeoJSON["Parse GeoJSON"]
        CreateDS["GeoJsonDataSource.load()"]
        PolygonFix["Apply Polygon Fix<br/>(arcType=GEODESIC)"]
        DedupDS["Remove Duplicate<br/>DataSources"]
    end

    subgraph Styling["8. Entity Styling (Batched)"]
        BatchProc["processBatch()<br/>(25 entities/batch)"]
        CalcHeight["calculateBuildingHeight()<br/>measured_height || floors×3.2m"]
        HeatColor["Heat Exposure Color<br/>(material assignment)"]
        Extrude["Set extrudedHeight"]
    end

    subgraph Rendering["9. Cesium Rendering"]
        AddToViewer["Add to viewer.dataSources"]
        SetVis["Set Initial Visibility"]
        ReqRender["requestRender()"]
        GPURender["GPU Render"]
    end

    subgraph State["10. State Updates"]
        BuildingStore["buildingStore<br/>setBuildingFeatures()"]
        GlobalStore["globalStore<br/>level='postalCode'"]
        LRUEvict["LRU Eviction<br/>(if > 50 postal codes)"]
    end

    %% Flow connections
    Click --> FF
    Camera --> FF

    FF -->|disabled| PostalPath
    FF -->|enabled| ViewportPath

    PostalPath --> GetPostal
    ViewportPath --> CamPos

    CamPos --> AltCheck
    AltCheck -->|Yes| GetRect
    AltCheck -->|No, skip| End["Skip Loading"]
    GetRect --> CalcTiles
    CalcTiles --> SortTiles
    SortTiles --> TileQueue
    TileQueue --> GridUrl

    GetPostal --> ValidatePC
    ValidatePC --> HSYUrl

    HSYUrl --> CacheCheck
    GridUrl --> CacheCheck

    CacheCheck -->|Hit| IDBCache
    CacheCheck -->|Miss| HTTPFetch
    IDBCache --> ParseGeoJSON

    HTTPFetch --> PyGeoAPI
    PyGeoAPI --> ParseGeoJSON
    HTTPFetch -.->|Parallel| HeatUrl
    HeatUrl --> HeatAPI

    ParseGeoJSON --> CreateDS
    CreateDS --> PolygonFix
    PolygonFix --> DedupDS
    DedupDS --> BatchProc

    BatchProc --> CalcHeight
    CalcHeight --> HeatColor
    HeatColor --> Extrude

    HeatAPI -.-> HeatColor

    Extrude --> AddToViewer
    AddToViewer --> SetVis
    SetVis --> ReqRender
    ReqRender --> GPURender

    ParseGeoJSON --> BuildingStore
    BuildingStore --> LRUEvict
    LRUEvict --> PiniaCache

    Click --> GlobalStore

    %% Styling
    classDef bottleneck fill:#ff6b6b,stroke:#333,stroke-width:2px
    classDef cache fill:#4ecdc4,stroke:#333,stroke-width:2px
    classDef critical fill:#ffe66d,stroke:#333,stroke-width:2px
    classDef async fill:#a8e6cf,stroke:#333,stroke-width:2px

    class HTTPFetch,PyGeoAPI,HeatAPI bottleneck
    class IDBCache,PiniaCache cache
    class BatchProc,CreateDS critical
    class TileQueue async
```

## Sequence Diagram (Critical Path)

```mermaid
sequenceDiagram
    autonumber
    participant User
    participant Vue as Vue Component
    participant Store as Pinia Stores
    participant Loader as unifiedLoader
    participant Cache as IndexedDB
    participant API as PyGeoAPI
    participant Cesium as CesiumJS

    User->>Vue: Click postal code
    Vue->>Store: globalStore.setLevel('postalCode')

    alt Viewport Streaming Enabled
        Vue->>Loader: ViewportBuildingLoader.updateViewport()
        Note over Loader: Debounce 300ms
        Loader->>Loader: Calculate visible tiles
        Loader->>Loader: Sort center-out
    else Postal Code Mode
        Vue->>Loader: HSYBuilding.loadHSYBuildings(postalCode)
    end

    Loader->>Cache: Check IndexedDB (1hr TTL)

    alt Cache Hit
        Cache-->>Loader: Return cached GeoJSON
        Note over Loader: Skip network request
    else Cache Miss
        Loader->>API: GET /hsy_buildings_optimized
        Note over API: ~500ms-2s latency
        API-->>Loader: GeoJSON (up to 10k features)
        Loader->>Cache: Store in IndexedDB
    end

    par Heat Data (Parallel)
        Loader->>API: GET /urban_heat_helsinki
        API-->>Loader: Heat exposure data
    end

    Loader->>Cesium: GeoJsonDataSource.load()
    Note over Cesium: Parse & create entities

    loop Batch Processing (25/batch)
        Loader->>Cesium: Style entity (height, color)
        Cesium->>Cesium: requestIdleCallback()
    end

    Cesium->>Cesium: Add to dataSources
    Cesium->>Store: buildingStore.setBuildingFeatures()
    Cesium->>User: Render buildings
```

## Performance Metrics by Stage

| Stage                   | Typical Duration | Bottleneck Risk | Optimization Potential   |
| ----------------------- | ---------------- | --------------- | ------------------------ |
| URL Generation          | <1ms             | None            | -                        |
| Cache Check             | 5-20ms           | Low             | -                        |
| HTTP Fetch (cache miss) | 500ms-2s         | **High**        | Prefetching, compression |
| GeoJSON Parse           | 50-200ms         | Medium          | Streaming parse          |
| Entity Creation         | 100-500ms        | **High**        | Web Workers              |
| Batch Styling           | 200-800ms        | **High**        | Parallel processing      |
| Cesium Render           | 50-200ms         | Medium          | LOD, culling             |
| **Total (cache miss)**  | **1-4s**         | -               | -                        |
| **Total (cache hit)**   | **400ms-1.5s**   | -               | -                        |

## Current Optimizations

### Already Implemented ✅

1. **IndexedDB Caching** (1-hour TTL)
   - Location: `unifiedLoader.js`
   - Impact: Eliminates network latency on repeat visits

2. **LRU Memory Cache** (50 postal codes)
   - Location: `buildingStore.js:29`
   - Impact: Fast tooltip data access

3. **Batch Processing** (25 entities/batch with idle callbacks)
   - Location: `batchProcessor.js`
   - Impact: Prevents UI blocking during styling

4. **Camera Debouncing** (300ms)
   - Location: `viewportBuildingLoader.js:60`
   - Impact: Prevents API hammering during pan/zoom

5. **Center-Out Tile Priority**
   - Location: `viewportBuildingLoader.js:378-417`
   - Impact: Loads visible content first

6. **Concurrent Load Limiting** (3 parallel tiles)
   - Location: `viewportBuildingLoader.js:425`
   - Impact: Balances throughput vs resource usage

7. **Altitude-Based Loading** (skip if >3000m)
   - Location: `viewportBuildingLoader.js:261`
   - Impact: Avoids loading invisible buildings

## Identified Bottlenecks 🔴

### 1. Sequential Heat Data Fetch

**Location:** `urbanheat.js:111`

```
Building fetch → Wait → Heat fetch → Wait → Merge
```

**Impact:** Adds 200-500ms to critical path

### 2. Single-Threaded Entity Styling

**Location:** `buildingStyler.js:76-98`

```
For each entity: calculate height → apply color → set extrusion
```

**Impact:** 200-800ms for 1000+ buildings, blocks main thread between batches

### 3. No Progressive Rendering

**Current:** Wait for all processing → render all at once
**Impact:** User sees nothing until complete pipeline finishes

### 4. Building Count Limits May Truncate

**Location:** `urlStore.js:136, 149`

- `hsyBuildings`: 10,000 limit
- `hsyGridBuildings`: 2,000 limit
  **Impact:** Dense areas may have missing buildings

### 5. Heat Data Not Separately Cached

**Location:** `urbanheat.js`
**Impact:** Re-fetched even when building geometry cached

## Optimization Recommendations 🚀

### High Impact (Recommended)

#### 1. Parallel Heat + Building Fetch

**Current:** Sequential
**Proposed:**

```javascript
// In buildingLoader.js or hsybuilding.js
const [buildingData, heatData] = await Promise.all([
	unifiedLoader.loadLayer(buildingConfig),
	unifiedLoader.loadLayer(heatConfig), // Separate cached layer
]);
mergeBuildingWithHeat(buildingData, heatData);
```

**Expected Improvement:** 200-500ms reduction
**Effort:** Low

#### 2. Progressive Rendering (Show Geometry First)

**Current:** Wait for full styling before render
**Proposed:**

```javascript
// Phase 1: Immediate render with default styling
const dataSource = await addDataSourceWithPolygonFix(data, name);
viewer.dataSources.add(dataSource);
requestRender(); // User sees buildings immediately

// Phase 2: Background styling (non-blocking)
queueMicrotask(async () => {
	await applyHeightExtrusion(dataSource.entities);
	await applyHeatColors(dataSource.entities, heatData);
	requestRender();
});
```

**Expected Improvement:** Perceived load time from 1-4s → <500ms
**Effort:** Medium

#### 3. Web Worker for Entity Styling

**Current:** Main thread batch processing
**Proposed:** Offload calculations to Web Worker

```javascript
// worker.js
self.onmessage = ({ data: { features, heatData } }) => {
	const styled = features.map((f) => ({
		id: f.id,
		height: calculateHeight(f.properties),
		color: calculateHeatColor(f.properties, heatData),
	}));
	self.postMessage(styled);
};

// main thread - just apply pre-calculated values
worker.onmessage = ({ data: styled }) => {
	styled.forEach((s) => applyToEntity(s.id, s.height, s.color));
};
```

**Expected Improvement:** 50-70% reduction in main thread blocking
**Effort:** High

#### 4. Separate Heat Data Cache Layer

**Current:** Heat data fetched per building load
**Proposed:**

```javascript
// Add to unifiedLoader config
const heatConfig = {
	layerId: `heat_${postalCode}`,
	url: urlStore.urbanHeatHelsinki(postalCode),
	type: 'geojson',
	cacheTTL: 3600000, // 1 hour, same as buildings
};
```

**Expected Improvement:** Eliminates redundant heat API calls
**Effort:** Low

### Medium Impact

#### 5. Predictive Prefetching

**Current:** Load on demand
**Proposed:** Prefetch adjacent tiles/postal codes

```javascript
// In viewportBuildingLoader.js after loading visible tiles
const adjacentTiles = getAdjacentTiles(visibleTiles);
adjacentTiles.forEach((tile) => {
	// Low priority prefetch
	requestIdleCallback(() => prefetchTile(tile));
});
```

**Expected Improvement:** Instant load on pan to adjacent areas
**Effort:** Medium

#### 6. Streaming GeoJSON Parse

**Current:** Parse entire response before processing
**Proposed:** Use streaming JSON parser for large responses

```javascript
import { parser } from 'stream-json';
import { pick } from 'stream-json/filters/Pick';
import { streamArray } from 'stream-json/streamers/StreamArray';

// Process features as they arrive
const pipeline = response.body
	.pipeThrough(new TextDecoderStream())
	.pipeThrough(parser())
	.pipeThrough(pick({ filter: 'features' }))
	.pipeThrough(streamArray());
```

**Expected Improvement:** First buildings render 50% faster for large datasets
**Effort:** High

#### 7. Dynamic Batch Sizing

**Current:** Fixed 25 entities/batch
**Proposed:** Adjust based on frame budget

```javascript
const FRAME_BUDGET_MS = 16; // Target 60fps

async function adaptiveBatch(entities, processor) {
	let batchSize = 25;
	let i = 0;

	while (i < entities.length) {
		const start = performance.now();
		const batch = entities.slice(i, i + batchSize);
		await Promise.all(batch.map(processor));

		const elapsed = performance.now() - start;
		// Adjust batch size to stay within frame budget
		batchSize = Math.max(5, Math.min(100, Math.floor(batchSize * (FRAME_BUDGET_MS / elapsed))));

		i += batch.length;
		await yieldToMain();
	}
}
```

**Expected Improvement:** Smoother UI during loading
**Effort:** Medium

### Lower Priority

#### 8. LOD (Level of Detail) for Buildings

**Current:** Full detail always
**Proposed:** Simplified geometry at distance

```javascript
const distanceDisplayCondition = new Cesium.DistanceDisplayCondition(0, 5000);
entity.polygon.distanceDisplayCondition = distanceDisplayCondition;

// Add simplified version for far view
const simplifiedEntity = createSimplifiedBuilding(entity);
simplifiedEntity.polygon.distanceDisplayCondition = new Cesium.DistanceDisplayCondition(
	5000,
	50000
);
```

**Expected Improvement:** Better performance when zoomed out
**Effort:** High

#### 9. Increase API Limits with Pagination

**Current:** Hard limits (10k/2k)
**Proposed:** Implement pagination for dense areas

```javascript
async function* paginatedFetch(baseUrl, pageSize = 2000) {
	let offset = 0;
	let hasMore = true;

	while (hasMore) {
		const url = `${baseUrl}&limit=${pageSize}&offset=${offset}`;
		const data = await fetch(url).then((r) => r.json());
		yield data.features;
		hasMore = data.features.length === pageSize;
		offset += pageSize;
	}
}
```

**Expected Improvement:** No truncated results in dense areas
**Effort:** Medium

## Optimization Priority Matrix

```mermaid
quadrantChart
    title Optimization Impact vs Effort
    x-axis Low Effort --> High Effort
    y-axis Low Impact --> High Impact
    quadrant-1 "Do First"
    quadrant-2 "Plan Carefully"
    quadrant-3 "Fill-in Work"
    quadrant-4 "Consider Later"

    "Parallel Fetch": [0.2, 0.75]
    "Heat Cache": [0.25, 0.6]
    "Progressive Render": [0.45, 0.9]
    "Predictive Prefetch": [0.5, 0.55]
    "Dynamic Batching": [0.55, 0.5]
    "Web Workers": [0.75, 0.8]
    "Streaming Parse": [0.8, 0.6]
    "LOD": [0.85, 0.45]
    "Pagination": [0.6, 0.4]
```

## Recommended Implementation Order

1. **Parallel Heat + Building Fetch** - Quick win, low risk
2. **Separate Heat Data Cache** - Complements #1
3. **Progressive Rendering** - Major UX improvement
4. **Predictive Prefetching** - Seamless panning experience
5. **Dynamic Batch Sizing** - Smoother loading animation
6. **Web Workers** - For high-density areas

## Metrics to Track

After implementing optimizations, measure:

| Metric                         | Current Baseline | Target |
| ------------------------------ | ---------------- | ------ |
| Time to First Building (TTFB)  | ~1-2s            | <500ms |
| Time to Interactive (TTI)      | ~2-4s            | <1.5s  |
| Frame drops during load        | 10-30            | <5     |
| Cache hit rate                 | ~60%             | >80%   |
| Memory usage (50 postal codes) | ~200MB           | <150MB |
