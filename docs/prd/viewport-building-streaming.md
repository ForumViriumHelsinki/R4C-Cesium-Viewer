# Viewport-Based Building Streaming PRD

## Executive Summary

### Problem Statement

The R4C-Cesium-Viewer currently loads all buildings for a postal code at once when users navigate to postal code level. This approach creates several limitations:

- **Memory inefficiency**: Large postal codes load hundreds of building entities that may not be in viewport
- **Long initial load times**: Users must wait for all buildings to load before seeing any data
- **Unnecessary network usage**: Buildings outside viewport are loaded but never seen
- **Poor scalability**: As dataset grows, postal code-based loading becomes increasingly problematic
- **Abrupt visibility changes**: Switching postal codes causes complete unload/reload of all buildings

### Proposed Solution

Implement viewport-based building streaming that:

1. **Loads buildings based on visible viewport** - Only load buildings within camera view
2. **Uses spatial tile grid system** - Divide region into ~0.01° tiles (~1km at Helsinki latitude)
3. **Implements buffer zone preloading** - 20% buffer around viewport to prevent pop-in
4. **Manages entity visibility efficiently** - Toggle `entity.show` property (not create/destroy)
5. **Debounces camera updates** - 300ms debounce on `camera.moveEnd` event to prevent excessive loading

### Expected Benefits

**Memory Efficiency**

- 60-80% reduction in active building entities for typical use cases
- Keep distant postal code buildings in memory but hidden (via `entity.show = false`)
- Leverage existing IndexedDB caching infrastructure

**User Experience**

- Progressive loading - buildings appear as user pans without abrupt changes
- Smooth viewport transitions - buffer zone prevents pop-in artifacts
- Faster initial load - only visible buildings load first
- Maintained postal code navigation - hybrid approach preserves existing UX

**Performance**

- Reduced render overhead from culling non-visible entities
- Efficient WFS BBOX queries reduce network payload
- Cache reuse across viewport changes within same postal code

## Goals & Non-Goals

### Primary Goals

1. **Viewport-based tile streaming** - Load buildings based on camera viewport rectangle
2. **Viewport culling** - Hide buildings outside viewport to reduce render load
3. **Buffer zone management** - Preload 20% buffer around viewport to prevent pop-in
4. **Hybrid navigation** - Support both viewport streaming AND postal code navigation
5. **Cache integration** - Leverage existing `unifiedLoader` caching infrastructure
6. **Memory management** - Hide (not delete) datasources for postal codes outside viewport

### Secondary Goals

1. **Progressive loading** - Show buildings as tiles load (non-blocking)
2. **Predictive warming** - Preload adjacent tiles based on camera movement direction
3. **Performance monitoring** - Track tile load times, cache hit rates, memory usage

### Non-Goals

1. **3D Tiles conversion** - Not replacing GeoJSON with 3D Tiles format (separate initiative)
2. **Level of Detail (LOD)** - Not implementing multi-resolution building models
3. **Server-side tiling** - Backend changes out of scope; use existing WFS BBOX queries
4. **Building geometry optimization** - Focus on loading strategy, not data compression
5. **Real-time collaboration** - Multi-user features out of scope
6. **Mobile-specific optimizations** - Desktop experience takes priority (mobile follow-up)

## User Stories

### Primary User Stories

**US-1: Automatic Viewport Loading**

- **As a** user exploring the capital region map
- **I want** buildings to load automatically as I pan and zoom the camera
- **So that** I can discover building data without manually selecting postal codes
- **Acceptance Criteria:**
  - Buildings load when viewport intersects their tile
  - Loading happens within 500ms of camera stopping
  - No user action required beyond camera movement

**US-2: Smooth Visual Transitions**

- **As a** user panning across the map
- **I want** buildings to appear/disappear smoothly without abrupt pop-in
- **So that** the experience feels polished and professional
- **Acceptance Criteria:**
  - Buffer zone loads buildings before they enter viewport
  - Buildings fade in/out with 200ms transition (if feasible)
  - No sudden loading spinners during normal panning

**US-3: Postal Code Navigation Preserved**

- **As a** user clicking on a postal code boundary
- **I want** to see all buildings for that postal code immediately
- **So that** my existing workflow is not disrupted
- **Acceptance Criteria:**
  - Clicking postal code loads all buildings for that code
  - Postal code loading takes priority over viewport streaming
  - Camera animation to postal code works as before

**US-4: Memory Efficiency**

- **As a** user exploring large areas of the map
- **I want** the application to remain responsive without memory issues
- **So that** I can work with the map for extended sessions
- **Acceptance Criteria:**
  - Distant buildings are hidden (not deleted) to preserve cache
  - Memory usage stays under 500MB for typical session
  - No memory leaks during extended panning

### Secondary User Stories

**US-5: Offline Cache Support**

- **As a** user revisiting previously explored areas
- **I want** cached buildings to load instantly from IndexedDB
- **So that** I don't waste bandwidth re-downloading the same data
- **Acceptance Criteria:**
  - Cache hit rate >80% for repeat visits to same tiles
  - Cached tiles load in <50ms
  - Cache survives page refresh

**US-6: Progressive Loading Feedback**

- **As a** user waiting for buildings to load
- **I want** visual feedback about loading progress
- **So that** I know the system is working
- **Acceptance Criteria:**
  - Subtle loading indicator shows when tiles are loading
  - Indicator disappears when all viewport tiles complete
  - No blocking modal dialogs

## Technical Requirements

### TR-1: Spatial Tile Grid System

**Tile Dimensions**

- **Tile size**: 0.01° × 0.01° (~1.1km × 0.7km at Helsinki latitude 60.17°)
- **Coverage area**: Capital region bounding box (24.5°E to 25.5°E, 60.0°N to 60.5°N)
- **Total tiles**: ~5,000 tiles for full capital region
- **Typical viewport**: 4-9 tiles visible at zoom level for postal code view

**Tile Indexing**

```javascript
// Tile ID format: "tile_{latIndex}_{lonIndex}"
// Example: "tile_142_87" for tile at ~60.42°N, 24.87°E
getTileId(lat, lon) {
  const latIndex = Math.floor(lat / TILE_SIZE);
  const lonIndex = Math.floor(lon / TILE_SIZE);
  return `tile_${latIndex}_${lonIndex}`;
}
```

**Tile Metadata**

- Track loaded state: `notLoaded | loading | loaded | cached`
- Track visibility: `visible | buffered | hidden`
- Track last accessed timestamp for cache eviction
- Store building count per tile for progress estimation

### TR-2: Camera Viewport Detection

**Viewport Rectangle Calculation**

- Use existing `camera.getViewportRectangle()` method (lines 562-605 in `camera.js`)
- Returns `{ west, south, east, north }` in degrees
- Handle edge cases: camera looking at space returns `null`
- Account for camera pitch angle affecting ground coverage

**Buffer Zone Calculation**

```javascript
// Expand viewport by 20% in each direction
const bufferFactor = 0.2;
const lonRange = east - west;
const latRange = north - south;

const bufferedViewport = {
	west: west - lonRange * bufferFactor,
	south: south - latRange * bufferFactor,
	east: east + lonRange * bufferFactor,
	north: north + latRange * bufferFactor,
};
```

**Tile Intersection Detection**

- Find all tiles that intersect buffered viewport rectangle
- Use simple bounding box intersection test
- Return Set of tile IDs for efficient diffing

### TR-3: Camera Event Handling

**Event Listener Setup**

```javascript
// In CesiumViewer.vue onMounted()
viewer.camera.moveEnd.addEventListener(() => {
	viewportBuildingLoader.handleCameraMove();
});
```

**Debouncing Strategy**

- **Debounce delay**: 300ms after `camera.moveEnd` event
- **Rationale**: Prevents excessive loads during rapid panning
- **Implementation**: Use `setTimeout` with clear on rapid moves
- **Cancel handling**: Allow ESC key to cancel pending loads

**Loading Priority**

1. **Current viewport tiles** - Load immediately (critical priority)
2. **Buffer zone tiles** - Load after viewport (high priority)
3. **Cached tiles** - Show instantly from IndexedDB (background priority)
4. **Out-of-viewport tiles** - Hide but keep in memory (lowest priority)

### TR-4: Entity Visibility Management

**Visibility Toggle Strategy (NOT Create/Destroy)**

```javascript
// CORRECT: Memory-efficient visibility toggle
entity.show = false; // Hides entity, keeps in memory
entity.show = true; // Shows entity instantly (no reload)

// INCORRECT: Creates memory pressure and reload delay
viewer.entities.remove(entity); // Destroys entity, loses cache
viewer.dataSources.remove(datasource); // Forces complete reload
```

**Benefits of Toggle Approach**

- Instant show/hide (no network request)
- Preserves heat exposure data processing
- Maintains entity references in datasources
- Enables smooth fade transitions

**Datasource Visibility Management**

```javascript
// Hide entire datasource for postal codes outside viewport + buffer
datasource.show = false;

// Existing method in featurepicker.js (lines 1029-1038, 1048-1069)
hideBuildingsForPostalCode(postalCode);
hideTreesForPostalCode(postalCode);
```

### TR-5: WFS BBOX Query Format

**Helsinki Buildings WFS Endpoint**

```
https://kartta.hel.fi/ws/geoserver/avoindata/wfs
  ?service=wfs
  &version=2.0.0
  &request=GetFeature
  &typeNames=avoindata:Rakennukset_alue_rekisteritiedot
  &outputFormat=application/json
  &srsName=urn:ogc:def:crs:EPSG::4326
  &BBOX={minLat},{minLon},{maxLat},{maxLon}
```

**Capital Region Buildings WFS Endpoint**

```
https://kartta.hsy.fi/geoserver/wfs
  ?service=wfs
  &version=2.0.0
  &request=GetFeature
  &typeNames=asuminen_ja_maankaytto:rakennus_rekisteritiedot
  &outputFormat=application/json
  &srsName=EPSG:4326
  &BBOX={minLat},{minLon},{maxLat},{maxLon}
```

**Query Parameters**

- **BBOX format**: `minLat,minLon,maxLat,maxLon` (WGS84 decimal degrees)
- **Max features**: Default 1000 (server limit), request increase if needed
- **Response format**: GeoJSON FeatureCollection
- **Projection**: EPSG:4326 (WGS84) to match existing code

### TR-6: Memory Management

**Tile Unloading Strategy**

- **Never delete tiles** - Only hide via `datasource.show = false`
- **Max loaded tiles**: Unlimited (rely on browser IndexedDB limits ~1GB)
- **Visibility culling**: Hide tiles >2 viewports away from current position
- **Cache eviction**: Let `cacheService` handle TTL-based eviction (1 hour default)

**Memory Budget**

- **Target**: <500MB for typical session (10-20 postal codes visited)
- **Per building entity**: ~5KB (geometry + properties)
- **Per tile**: ~50-500 entities = 250KB-2.5MB
- **Max concurrent visible tiles**: ~20 tiles = 5-50MB

**Memory Monitoring**

```javascript
// Track memory usage in ViewportBuildingLoader
getTotalLoadedBuildings() {
  return Object.values(this.tiles)
    .reduce((sum, tile) => sum + tile.buildingCount, 0);
}

// Log memory stats on camera move
console.log('[ViewportLoader] Loaded:', this.getTotalLoadedBuildings(),
            'buildings across', Object.keys(this.tiles).length, 'tiles');
```

### TR-7: Integration with Existing Architecture

**UnifiedLoader Integration**

```javascript
// Use existing caching infrastructure (unifiedLoader.js)
await unifiedLoader.loadLayer({
	layerId: `viewport_tile_${tileId}`,
	url: wfsBboxUrl,
	type: 'geojson',
	processor: async (data, metadata) => {
		// Process building entities with heat data enrichment
		await this.urbanheatService.findUrbanHeatData(data, postalCode);
		await this.buildingService.setHeatExposureToBuildings(entities);
		await this.buildingService.setHelsinkiBuildingsHeight(entities);
	},
	options: {
		cache: true,
		cacheTTL: 60 * 60 * 1000, // 1 hour
		retries: 2,
		progressive: false,
		priority: 'high',
	},
});
```

**Datasource Naming Convention**

- **Tile datasources**: `Buildings_tile_{latIndex}_{lonIndex}`
- **Postal code datasources**: `Buildings {postalCode}` (existing format)
- **Hybrid mode**: Both can coexist, viewport loader manages visibility

**Heat Data Enrichment**

- Reuse existing `urbanheatService.findUrbanHeatData()` (building.js:307)
- Maintain postal code context for heat data lookup
- Batch processing with existing `setHeatExposureToBuildings()` method (building.js:82-98)

## API Design

### ViewportBuildingLoader Class Interface

```javascript
/**
 * ViewportBuildingLoader Service
 * Manages viewport-based building streaming with tile grid system.
 *
 * @class ViewportBuildingLoader
 */
export default class ViewportBuildingLoader {
	constructor() {
		this.viewer = useGlobalStore().cesiumViewer;
		this.buildingService = new Building();
		this.cameraService = new Camera();
		this.unifiedLoader = unifiedLoader;

		// Tile state management
		this.tiles = new Map(); // tileId -> { state, datasource, buildingCount, lastAccessed }
		this.visibleTileIds = new Set(); // Currently visible tile IDs
		this.bufferedTileIds = new Set(); // Buffer zone tile IDs

		// Debouncing
		this.cameraMoveTimeout = null;
		this.debounceDelay = 300; // ms

		// Configuration
		this.tileSize = 0.01; // degrees (~1km at Helsinki)
		this.bufferFactor = 0.2; // 20% buffer
		this.maxConcurrentLoads = 3; // Parallel tile loads
	}

	/**
	 * Initialize viewport loader and attach camera listeners
	 * @returns {void}
	 */
	initialize() {
		this.viewer.camera.moveEnd.addEventListener(() => {
			this.handleCameraMove();
		});
	}

	/**
	 * Handle camera movement with debouncing
	 * @private
	 */
	handleCameraMove() {
		clearTimeout(this.cameraMoveTimeout);
		this.cameraMoveTimeout = setTimeout(() => {
			this.updateVisibleBuildings();
		}, this.debounceDelay);
	}

	/**
	 * Update visible buildings based on current viewport
	 * Core method that orchestrates tile loading/hiding
	 * @returns {Promise<void>}
	 */
	async updateVisibleBuildings() {
		// 1. Get viewport rectangle
		const viewportRect = this.cameraService.getViewportRectangle();
		if (!viewportRect) return;

		// 2. Calculate buffered viewport
		const bufferedRect = this.calculateBufferedViewport(viewportRect);

		// 3. Find tiles that intersect viewport + buffer
		const viewportTileIds = this.getTilesInRectangle(viewportRect);
		const bufferedTileIds = this.getTilesInRectangle(bufferedRect);

		// 4. Determine which tiles need loading
		const tilesToLoad = this.findTilesToLoad(viewportTileIds, bufferedTileIds);

		// 5. Determine which tiles need hiding
		const tilesToHide = this.findTilesToHide(viewportTileIds, bufferedTileIds);

		// 6. Load new tiles (with concurrency limit)
		await this.loadTiles(tilesToLoad);

		// 7. Hide distant tiles (async, non-blocking)
		this.hideTiles(tilesToHide);

		// 8. Update tracked state
		this.visibleTileIds = viewportTileIds;
		this.bufferedTileIds = bufferedTileIds;
	}

	/**
	 * Calculate buffered viewport rectangle
	 * @param {Object} viewportRect - { west, south, east, north }
	 * @returns {Object} Buffered rectangle
	 * @private
	 */
	calculateBufferedViewport(viewportRect) {
		const lonRange = viewportRect.east - viewportRect.west;
		const latRange = viewportRect.north - viewportRect.south;

		return {
			west: viewportRect.west - lonRange * this.bufferFactor,
			south: viewportRect.south - latRange * this.bufferFactor,
			east: viewportRect.east + lonRange * this.bufferFactor,
			north: viewportRect.north + latRange * this.bufferFactor,
		};
	}

	/**
	 * Get all tile IDs that intersect a rectangle
	 * @param {Object} rect - { west, south, east, north }
	 * @returns {Set<string>} Set of tile IDs
	 * @private
	 */
	getTilesInRectangle(rect) {
		const tileIds = new Set();

		const minLatIndex = Math.floor(rect.south / this.tileSize);
		const maxLatIndex = Math.floor(rect.north / this.tileSize);
		const minLonIndex = Math.floor(rect.west / this.tileSize);
		const maxLonIndex = Math.floor(rect.east / this.tileSize);

		for (let lat = minLatIndex; lat <= maxLatIndex; lat++) {
			for (let lon = minLonIndex; lon <= maxLonIndex; lon++) {
				tileIds.add(`tile_${lat}_${lon}`);
			}
		}

		return tileIds;
	}

	/**
	 * Find tiles that need to be loaded
	 * @param {Set<string>} viewportTileIds - Visible tiles
	 * @param {Set<string>} bufferedTileIds - Buffer zone tiles
	 * @returns {Array<Object>} Array of { tileId, priority }
	 * @private
	 */
	findTilesToLoad(viewportTileIds, bufferedTileIds) {
		const toLoad = [];

		// Viewport tiles (high priority)
		for (const tileId of viewportTileIds) {
			if (!this.tiles.has(tileId) || this.tiles.get(tileId).state === 'notLoaded') {
				toLoad.push({ tileId, priority: 'high' });
			}
		}

		// Buffer tiles (normal priority)
		for (const tileId of bufferedTileIds) {
			if (!viewportTileIds.has(tileId)) {
				if (!this.tiles.has(tileId) || this.tiles.get(tileId).state === 'notLoaded') {
					toLoad.push({ tileId, priority: 'normal' });
				}
			}
		}

		return toLoad;
	}

	/**
	 * Find tiles that should be hidden (outside buffer zone)
	 * @param {Set<string>} viewportTileIds - Visible tiles
	 * @param {Set<string>} bufferedTileIds - Buffer zone tiles
	 * @returns {Array<string>} Array of tile IDs to hide
	 * @private
	 */
	findTilesToHide(viewportTileIds, bufferedTileIds) {
		const toHide = [];

		for (const [tileId, tile] of this.tiles.entries()) {
			if (!bufferedTileIds.has(tileId) && tile.datasource?.show) {
				toHide.push(tileId);
			}
		}

		return toHide;
	}

	/**
	 * Load tiles with concurrency limit
	 * @param {Array<Object>} tilesToLoad - Array of { tileId, priority }
	 * @returns {Promise<void>}
	 * @private
	 */
	async loadTiles(tilesToLoad) {
		// Sort by priority (high priority first)
		tilesToLoad.sort((a, b) => (a.priority === 'high' ? -1 : 1));

		// Load in batches to limit concurrent requests
		for (let i = 0; i < tilesToLoad.length; i += this.maxConcurrentLoads) {
			const batch = tilesToLoad.slice(i, i + this.maxConcurrentLoads);
			await Promise.all(batch.map(({ tileId }) => this.loadTile(tileId)));
		}
	}

	/**
	 * Load a single tile
	 * @param {string} tileId - Tile ID to load
	 * @returns {Promise<void>}
	 * @private
	 */
	async loadTile(tileId) {
		// Set loading state
		this.tiles.set(tileId, {
			state: 'loading',
			datasource: null,
			buildingCount: 0,
			lastAccessed: Date.now(),
		});

		try {
			// Calculate tile bounding box
			const bounds = this.getTileBounds(tileId);

			// Construct WFS BBOX URL
			const url = this.buildWFSBboxUrl(bounds);

			// Load via unifiedLoader
			await unifiedLoader.loadLayer({
				layerId: `viewport_tile_${tileId}`,
				url: url,
				type: 'geojson',
				processor: async (data, metadata) => {
					// Process buildings with existing heat enrichment pipeline
					const entities = await this.buildingService.urbanheatService.findUrbanHeatData(
						data,
						this.getPostalCodeForTile(bounds)
					);
					await this.buildingService.setHeatExposureToBuildings(entities);
					await this.buildingService.setHelsinkiBuildingsHeight(entities);

					// Update tile state
					const datasource = this.getDatasourceByName(`viewport_tile_${tileId}`);
					this.tiles.set(tileId, {
						state: 'loaded',
						datasource: datasource,
						buildingCount: entities.length,
						lastAccessed: Date.now(),
					});
				},
				options: {
					cache: true,
					cacheTTL: 60 * 60 * 1000, // 1 hour
					retries: 2,
					priority: 'high',
				},
			});
		} catch (error) {
			console.error(`[ViewportLoader] Failed to load tile ${tileId}:`, error);
			this.tiles.set(tileId, { state: 'error', datasource: null, buildingCount: 0 });
		}
	}

	/**
	 * Hide tiles by setting datasource.show to false
	 * @param {Array<string>} tileIds - Tile IDs to hide
	 * @private
	 */
	hideTiles(tileIds) {
		for (const tileId of tileIds) {
			const tile = this.tiles.get(tileId);
			if (tile?.datasource) {
				tile.datasource.show = false;
			}
		}
	}

	/**
	 * Get tile bounding box from tile ID
	 * @param {string} tileId - Tile ID (format: "tile_{latIndex}_{lonIndex}")
	 * @returns {Object} { west, south, east, north }
	 * @private
	 */
	getTileBounds(tileId) {
		const parts = tileId.split('_');
		const latIndex = parseInt(parts[1]);
		const lonIndex = parseInt(parts[2]);

		return {
			west: lonIndex * this.tileSize,
			south: latIndex * this.tileSize,
			east: (lonIndex + 1) * this.tileSize,
			north: (latIndex + 1) * this.tileSize,
		};
	}

	/**
	 * Build WFS BBOX query URL
	 * @param {Object} bounds - { west, south, east, north }
	 * @returns {string} WFS URL
	 * @private
	 */
	buildWFSBboxUrl(bounds) {
		const helsinkiView = useToggleStore().helsinkiView;

		if (helsinkiView) {
			return `https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata:Rakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn:ogc:def:crs:EPSG::4326&BBOX=${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
		} else {
			return `https://kartta.hsy.fi/geoserver/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=asuminen_ja_maankaytto:rakennus_rekisteritiedot&outputFormat=application/json&srsName=EPSG:4326&BBOX=${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;
		}
	}

	/**
	 * Enable viewport-based loading mode
	 */
	enableViewportMode() {
		this.isEnabled = true;
		this.updateVisibleBuildings();
	}

	/**
	 * Disable viewport-based loading (revert to postal code mode)
	 */
	disableViewportMode() {
		this.isEnabled = false;
		// Hide all viewport tiles
		for (const [tileId, tile] of this.tiles.entries()) {
			if (tile.datasource) {
				tile.datasource.show = false;
			}
		}
	}

	/**
	 * Clear all loaded tiles and reset state
	 */
	reset() {
		this.tiles.clear();
		this.visibleTileIds.clear();
		this.bufferedTileIds.clear();
		clearTimeout(this.cameraMoveTimeout);
	}
}
```

### Integration with Building.js Service

**Add BBOX Loading Method**

```javascript
// In building.js

/**
 * Load buildings for a bounding box using viewport streaming
 * @param {Object} bounds - { west, south, east, north } in degrees
 * @param {string} tileId - Tile identifier for caching
 * @returns {Promise<void>}
 */
async loadBuildingsByBbox(bounds, tileId) {
  const url =
    'https://kartta.hel.fi/ws/geoserver/avoindata/wfs?service=wfs&version=2.0.0&request=GetFeature&typeNames=avoindata%3ARakennukset_alue_rekisteritiedot&outputFormat=application/json&srsName=urn%3Aogc%3Adef%3Acrs%3AEPSG%3A%3A4326&BBOX=' +
    `${bounds.south},${bounds.west},${bounds.north},${bounds.east}`;

  console.log('[Building] Loading buildings for tile:', tileId, 'BBOX:', bounds);

  try {
    const loadingConfig = {
      layerId: `viewport_tile_${tileId}`,
      url: url,
      type: 'geojson',
      processor: async (data, metadata) => {
        console.log('[Building] Received', data.features?.length || 0, 'buildings for tile', tileId);

        // Determine postal code from tile centroid for heat data lookup
        const centerLat = (bounds.north + bounds.south) / 2;
        const centerLon = (bounds.east + bounds.west) / 2;
        const postalCode = this.getPostalCodeAtCoordinate(centerLat, centerLon);

        const entities = await this.urbanheatService.findUrbanHeatData(data, postalCode);
        await this.setHeatExposureToBuildings(entities);
        await this.setHelsinkiBuildingsHeight(entities);

        return entities;
      },
      options: {
        cache: true,
        cacheTTL: 60 * 60 * 1000, // 1 hour
        retries: 2,
        progressive: false,
        priority: 'high'
      }
    };

    await this.unifiedLoader.loadLayer(loadingConfig);
  } catch (error) {
    console.error('[Building] Error loading buildings for tile', tileId, ':', error);
  }
}

/**
 * Get postal code at specific coordinate
 * Looks up postal code entity that contains the point
 * @param {number} lat - Latitude in degrees
 * @param {number} lon - Longitude in degrees
 * @returns {string|null} Postal code or null if not found
 * @private
 */
getPostalCodeAtCoordinate(lat, lon) {
  const postalCodeData = usePropsStore().postalCodeData;
  if (!postalCodeData?._entityCollection) return null;

  const point = Cesium.Cartographic.fromDegrees(lon, lat);
  const entities = postalCodeData._entityCollection._entities._array;

  for (const entity of entities) {
    if (!entity.polygon || !entity.properties?.posno) continue;

    const hierarchy = entity.polygon.hierarchy.getValue();
    if (!hierarchy?.positions) continue;

    // Simple point-in-polygon check using Cesium
    if (Cesium.PolygonGeometry.computeHierarchy(hierarchy).positions) {
      // This is simplified - use proper point-in-polygon algorithm
      return entity.properties.posno._value;
    }
  }

  return null;
}
```

### Integration with CesiumViewer.vue

**Component Setup**

```vue
<script setup>
import { onMounted, onBeforeUnmount } from 'vue';
import ViewportBuildingLoader from '@/services/viewportBuildingLoader.js';

const viewportBuildingLoader = new ViewportBuildingLoader();

onMounted(() => {
	// Initialize viewport loader after Cesium viewer is ready
	viewportBuildingLoader.initialize();

	// Optional: Enable viewport mode by default at capital region level
	if (globalStore.level === 'start') {
		viewportBuildingLoader.enableViewportMode();
	}
});

onBeforeUnmount(() => {
	// Clean up camera listeners
	viewportBuildingLoader.reset();
});
</script>
```

**Toggle Between Viewport and Postal Code Modes**

```javascript
// When user clicks postal code boundary (existing behavior)
function handlePostalCodeClick(postalCode) {
  // Disable viewport mode temporarily
  viewportBuildingLoader.disableViewportMode();

  // Load all buildings for postal code (existing logic)
  await featurePickerService.loadPostalCode(postalCode);

  // Re-enable viewport mode after load completes
  setTimeout(() => {
    viewportBuildingLoader.enableViewportMode();
  }, 1000);
}
```

## Implementation Phases

### Phase 1: Core Viewport Loader (Week 1-2)

**Goal**: Implement basic viewport tile loading without heat data enrichment

**Tasks**:

1. Create `src/services/viewportBuildingLoader.js` with tile grid system
2. Implement `getTilesInRectangle()` and tile ID generation
3. Implement `calculateBufferedViewport()` with 20% buffer
4. Add camera `moveEnd` listener with 300ms debounce
5. Implement basic WFS BBOX query building
6. Test with Helsinki dataset (simpler than Capital Region)

**Deliverables**:

- ViewportBuildingLoader class with tile management
- Unit tests for tile intersection calculations
- Integration test: Buildings load when camera moves

**Success Criteria**:

- Tiles load correctly based on viewport
- Buffer zone prevents pop-in during panning
- Debouncing prevents excessive requests
- No errors in console

**Risks**:

- Tile boundary artifacts (buildings split across tiles) → Accept as limitation
- WFS query performance → Monitor response times, optimize if needed

### Phase 2: Heat Data Enrichment Integration (Week 3)

**Goal**: Integrate with existing heat data pipeline

**Tasks**:

1. Add postal code lookup from tile coordinates
2. Integrate `urbanheatService.findUrbanHeatData()` in tile processor
3. Integrate `setHeatExposureToBuildings()` for tile entities
4. Integrate `setHelsinkiBuildingsHeight()` for 3D extrusion
5. Test heat visualization colors on viewport-loaded buildings
6. Verify histogram updates work with viewport buildings

**Deliverables**:

- Viewport-loaded buildings show correct heat colors
- Building height extrusion works
- Heat histogram updates reflect viewport buildings

**Success Criteria**:

- Heat colors match postal code-loaded buildings
- No visual differences between load methods
- Performance remains acceptable (<1s per tile)

**Risks**:

- Heat data lookup misses (building in tile but postal code lookup fails) → Log warnings, show building without heat data
- Performance regression from heat enrichment → Use same batching as postal code loader

### Phase 3: Cache Integration & Optimization (Week 4)

**Goal**: Leverage existing cache infrastructure for instant loads

**Tasks**:

1. Integrate with `unifiedLoader.loadLayer()` for caching
2. Set appropriate cache TTL (1 hour like postal code buildings)
3. Implement predictive warming for adjacent tiles
4. Add cache hit rate monitoring
5. Optimize concurrent tile loading (max 3 parallel)
6. Add performance instrumentation (load times, memory)

**Deliverables**:

- Cached tiles load in <50ms
- Cache warming improves perceived performance
- Performance dashboard shows cache hit rates

**Success Criteria**:

- Cache hit rate >80% for repeat visits
- Memory usage <500MB for typical session
- Predictive warming reduces cache misses by 30%

**Risks**:

- Cache invalidation issues → Use same TTL as postal code buildings
- Memory leaks from unreleased tiles → Ensure proper cleanup in hideTiles()

### Phase 4: Hybrid Mode & Postal Code Navigation (Week 5)

**Goal**: Support both viewport streaming AND postal code navigation

**Tasks**:

1. Implement mode toggle in ViewportBuildingLoader
2. Preserve existing postal code click behavior
3. Hide viewport tiles when postal code mode active
4. Re-enable viewport mode after postal code navigation complete
5. Handle edge cases: clicking same postal code, switching postal codes
6. Add UI toggle for viewport mode (optional)

**Deliverables**:

- Seamless switching between viewport and postal code modes
- No breaking changes to existing postal code workflows
- Optional UI control for mode selection

**Success Criteria**:

- Clicking postal code loads all buildings (existing behavior preserved)
- Viewport mode automatically resumes after navigation
- No visual glitches during mode transitions
- User can manually toggle modes via UI (if implemented)

**Risks**:

- Mode confusion (both modes active simultaneously) → Ensure mutual exclusion
- Performance hit from dual mode management → Lazy hide viewport tiles

### Phase 5: Testing & Refinement (Week 6)

**Goal**: Comprehensive testing and performance optimization

**Tasks**:

1. Write Playwright E2E tests for viewport loading
2. Write unit tests for tile intersection calculations
3. Performance testing: memory profiling, load time benchmarks
4. Accessibility testing: keyboard navigation, screen reader support
5. Edge case testing: high zoom, low zoom, rapid panning
6. Documentation: API docs, user guide, troubleshooting

**Deliverables**:

- 90% code coverage for ViewportBuildingLoader
- Performance regression tests
- User documentation in `docs/features/viewport-streaming.md`

**Success Criteria**:

- All tests passing
- No memory leaks detected
- Performance targets met (see Success Metrics)
- Documentation approved by stakeholders

**Risks**:

- Testing complexity due to CesiumJS async rendering → Use generous timeouts, visual regression testing
- Performance varies by hardware → Test on low-end devices

## Success Metrics

### Primary Metrics (Must Achieve)

**Memory Efficiency**

- **Baseline**: 200MB for single postal code with ~500 buildings
- **Target**: <500MB for typical session visiting 10 postal codes
- **Measurement**: Chrome DevTools Memory Profiler
- **Success Threshold**: ≤ 60% of baseline memory usage

**Initial Load Time**

- **Baseline**: 2-3 seconds for full postal code (all buildings)
- **Target**: <1 second for initial viewport load
- **Measurement**: Performance API (`performance.now()`)
- **Success Threshold**: ≤ 50% of baseline load time

**Cache Hit Rate**

- **Target**: ≥80% cache hits for revisited tiles within same session
- **Measurement**: `unifiedLoader` cache hit/miss counters
- **Success Threshold**: ≥80% hit rate after 5 minutes of exploration

**User-Perceived Performance**

- **Target**: No visible pop-in during normal panning (buffer prevents)
- **Measurement**: Manual testing, user feedback
- **Success Threshold**: 0 pop-in artifacts during 10 pan operations

### Secondary Metrics (Nice to Have)

**Network Efficiency**

- **Target**: 50% reduction in data transfer for typical session
- **Measurement**: Network DevTools (KB transferred)
- **Baseline**: Full postal code loads all buildings (~2-5MB per postal code)

**Rendering Performance**

- **Target**: Maintain 30 FPS during camera movement
- **Measurement**: Cesium `Scene.debugShowFramesPerSecond`
- **Success Threshold**: ≥30 FPS during panning

**Predictive Cache Warming**

- **Target**: 30% reduction in cache misses via predictive warming
- **Measurement**: Compare cache hit rates with/without warming
- **Success Threshold**: ≥30% improvement

### Quality Metrics

**Code Coverage**

- **Target**: ≥90% line coverage for ViewportBuildingLoader
- **Measurement**: Vitest coverage report
- **Tools**: `npm run test:coverage`

**Error Rate**

- **Target**: <1% tile load failures
- **Measurement**: Error logging, Sentry integration (if available)
- **Success Threshold**: <1% error rate in production

**User Satisfaction**

- **Target**: Positive feedback from 80% of beta testers
- **Measurement**: User survey, qualitative feedback
- **Questions**: "Viewport loading feels smooth/responsive" (Likert scale)

## Out of Scope

### Explicitly Excluded Features

**3D Tiles Format Conversion**

- Rationale: Separate infrastructure initiative requiring backend changes
- Future Consideration: Phase 2 project after viewport streaming proven
- Blocked By: Backend team capacity, format conversion pipeline

**Server-Side Tiling Infrastructure**

- Rationale: Use existing WFS BBOX queries to minimize backend changes
- Future Consideration: Dedicated tile server for improved performance
- Blocked By: DevOps resources, tile generation pipeline

**Multi-Resolution LOD (Level of Detail)**

- Rationale: Complexity not justified for current dataset sizes
- Future Consideration: Implement if building counts exceed 10,000 per viewport
- Blocked By: 3D model generation, multi-resolution geometry

**Mobile-Specific Optimizations**

- Rationale: Desktop experience takes priority for initial release
- Future Consideration: Phase 2 mobile optimizations (smaller tiles, aggressive culling)
- Blocked By: Mobile testing infrastructure, performance benchmarking

**Real-Time Collaboration Features**

- Rationale: Out of scope for this initiative
- Future Consideration: Separate project for multi-user scenarios
- Blocked By: Backend websocket infrastructure, conflict resolution

**Geometry Simplification/Compression**

- Rationale: Focus on loading strategy, not data optimization
- Future Consideration: Geometry processing pipeline for faster parsing
- Blocked By: Build-time processing, geometry library integration

## Timeline & Resources

### Development Timeline (6 Weeks)

**Week 1-2: Phase 1 - Core Viewport Loader**

- Developer: 1 frontend engineer (full-time)
- Tasks: Tile grid, viewport detection, WFS BBOX queries
- Deliverable: Basic viewport loading working

**Week 3: Phase 2 - Heat Data Integration**

- Developer: 1 frontend engineer (full-time)
- Tasks: Heat enrichment, height extrusion, histogram integration
- Deliverable: Heat visualization on viewport buildings

**Week 4: Phase 3 - Cache Optimization**

- Developer: 1 frontend engineer (full-time)
- Tasks: Cache integration, predictive warming, performance monitoring
- Deliverable: Optimized caching with instrumentation

**Week 5: Phase 4 - Hybrid Mode**

- Developer: 1 frontend engineer (full-time)
- Tasks: Mode toggle, postal code navigation preservation
- Deliverable: Seamless postal code + viewport modes

**Week 6: Phase 5 - Testing & Documentation**

- Developer: 1 frontend engineer (50%)
- QA: 1 QA engineer (50%)
- Tasks: E2E tests, performance testing, documentation
- Deliverable: Production-ready feature with docs

### Resource Requirements

**Engineering**

- 1 Senior Frontend Engineer (Vue 3 + CesiumJS expertise)
- 1 QA Engineer (Playwright experience)
- 0.25 Backend Engineer (WFS query support, if needed)

**Infrastructure**

- No new infrastructure required
- Use existing WFS endpoints (kartta.hel.fi, kartta.hsy.fi)
- Use existing IndexedDB caching (no backend changes)

**Design**

- 0.25 UX Designer (optional loading indicators, mode toggle UI)

**Stakeholders**

- Product Owner (sign-off on PRD, success metrics)
- Helsinki Region Environmental Services (confirm WFS usage acceptable)
- End Users (beta testing in Week 5-6)

### Risk Assessment

**High Risk**

| Risk                                          | Probability | Impact | Mitigation                                                                |
| --------------------------------------------- | ----------- | ------ | ------------------------------------------------------------------------- |
| WFS rate limiting causes load failures        | Medium      | High   | Implement exponential backoff, respect server limits, coordinate with HSY |
| Tile boundary artifacts confuse users         | High        | Medium | Accept as limitation, document in user guide, consider overlap strategy   |
| Memory leaks from improper datasource cleanup | Medium      | High   | Thorough testing, memory profiling, automated leak detection              |

**Medium Risk**

| Risk | Probability | Impact | Mitigation |
| Browser IndexedDB limits exceeded | Low | Medium | Monitor cache size, implement LRU eviction, warn users at 80% capacity |
| Heat data lookup failures (building not in postal code) | Medium | Medium | Log warnings, show building without heat data, implement fallback lookup |
| Performance regression on low-end devices | Medium | Medium | Test on reference hardware, provide "reduce motion" mode, disable viewport mode if needed |

**Low Risk**

| Risk                                   | Probability | Impact | Mitigation                                                                    |
| -------------------------------------- | ----------- | ------ | ----------------------------------------------------------------------------- |
| User confusion from dual loading modes | Low         | Low    | Clear UI indicators, onboarding tutorial, mode toggle with explanation        |
| Cache invalidation bugs                | Low         | Medium | Use same TTL as postal code cache, implement manual cache clear option        |
| WFS query parameter errors             | Low         | Low    | Unit test query building, validate against WFS spec, test with real endpoints |

### Rollout Strategy

**Phase 1: Internal Testing (Week 6)**

- Deploy to staging environment
- Internal team testing (5-10 users)
- Performance benchmarking on reference hardware
- Bug fixing based on internal feedback

**Phase 2: Beta Testing (Week 7-8)**

- Deploy to production with feature flag (disabled by default)
- Enable for 10% of users randomly
- Monitor error rates, performance metrics
- Collect user feedback via in-app survey

**Phase 3: Gradual Rollout (Week 9-10)**

- Increase to 50% of users if metrics positive
- Monitor for regressions
- Prepare rollback plan if issues detected

**Phase 4: Full Release (Week 11)**

- Enable for 100% of users
- Make viewport mode default for new sessions
- Announce feature in release notes
- Monitor support tickets for issues

**Rollback Criteria**

- Error rate >5% for tile loads
- Memory usage >1GB for typical session
- User complaints >10% of feedback
- Critical bug discovered (data corruption, crashes)

## Integration Considerations

### CI/CD Pipeline Requirements

**Build Process**

- No changes required to existing Vite build
- ViewportBuildingLoader is standard ES6 module

**Testing Integration**

- Add Playwright E2E tests to existing test suite
- Add Vitest unit tests for tile calculations
- Add performance regression tests (baseline snapshots)

**Deployment Strategy**

- Deploy as part of normal frontend deployment
- No backend changes required
- Feature flag controlled via environment variable

### Monitoring and Alerting Needs

**Application Performance Monitoring (APM)**

- Track tile load times (p50, p95, p99)
- Track cache hit/miss rates
- Track memory usage trends
- Track error rates by tile, postal code

**Error Logging**

- Log WFS query failures with query parameters
- Log tile processing errors with tile ID
- Log cache errors with cache key
- Send errors to existing error tracking (Sentry if available)

**User Analytics**

- Track viewport mode usage (% of sessions)
- Track average tiles loaded per session
- Track cache hit rates per user
- Track performance metrics by browser/device

### Documentation Requirements

**Developer Documentation**

- API reference for ViewportBuildingLoader class
- Architecture diagram showing tile grid system
- Integration guide for adding viewport loading to other layers (trees, vegetation)
- Performance optimization guide (tile size tuning, buffer factor)

**User Documentation**

- Feature announcement in release notes
- User guide: "Exploring Buildings with Viewport Streaming"
- Troubleshooting guide: "Why are buildings not loading?"
- FAQ: Viewport mode vs postal code mode

**Operational Documentation**

- Monitoring dashboard setup guide
- Alert threshold configuration
- Rollback procedure
- Cache management guide (clearing, invalidation)

---

## Appendix

### A. Technical Dependencies

**Required Libraries** (All Already Installed)

- CesiumJS ^1.119.0 (viewport detection, entity management)
- Vue 3 ^3.5.11 (reactive UI integration)
- Pinia ^2.2.4 (state management)

**Browser APIs**

- IndexedDB (caching via cacheService)
- Performance API (performance monitoring)
- requestIdleCallback (non-blocking batching)

**External Services**

- Helsinki WFS: `https://kartta.hel.fi/ws/geoserver/avoindata/wfs`
- HSY WFS: `https://kartta.hsy.fi/geoserver/wfs`

### B. Performance Testing Scenarios

**Scenario 1: Initial Load**

- Start at capital region overview (level: 'start')
- Enable viewport mode
- Measure time to load initial viewport tiles
- **Expected**: <1 second for 4-9 tiles

**Scenario 2: Rapid Panning**

- Pan quickly across 10 postal codes
- Verify debouncing prevents excessive loads
- **Expected**: <5 tile loads per second, no memory leaks

**Scenario 3: Cache Hit Testing**

- Load viewport area A
- Navigate away to area B
- Return to area A
- **Expected**: <50ms load time from cache (100% cache hit)

**Scenario 4: Memory Stress Test**

- Explore 20 different postal codes
- Monitor memory usage continuously
- **Expected**: <500MB total memory, no leaks

**Scenario 5: Hybrid Mode Switching**

- Enable viewport mode
- Click postal code (switches to postal code mode)
- Wait for load
- Resume panning (re-enables viewport mode)
- **Expected**: Smooth transitions, no visual glitches

### C. Open Questions & Assumptions

**Open Questions**

1. **WFS Server Limits**: What is the max concurrent requests allowed by kartta.hel.fi and kartta.hsy.fi?
   - **Action**: Contact HSY to confirm acceptable usage patterns
   - **Assumption**: 3 concurrent requests is acceptable

2. **Tile Size Optimization**: Is 0.01° (1km) the optimal tile size?
   - **Action**: A/B test with 0.005° (500m) and 0.02° (2km) tiles
   - **Assumption**: 0.01° balances granularity and request count

3. **Heat Data Postal Code Lookup**: How to handle buildings near postal code boundaries?
   - **Action**: Implement point-in-polygon check using tile centroid
   - **Assumption**: Centroid postal code is sufficient for 90% of tiles

4. **Capital Region vs Helsinki**: Should both regions use identical tile systems?
   - **Action**: Start with Helsinki, expand to Capital Region in Phase 2
   - **Assumption**: Same tile size works for both regions

**Assumptions**

- WFS BBOX queries support unlimited spatial extents (not limited to postal codes)
- Browser IndexedDB storage limit is ≥1GB for typical users
- User sessions average <30 minutes of active exploration
- Network latency is <200ms for WFS queries (within Finland)
- Cesium entity visibility toggle (`entity.show`) is instant (<16ms)

### D. Glossary

- **BBOX**: Bounding Box - Geographic rectangle defined by west, south, east, north coordinates
- **Buffer Zone**: Extended viewport area preloaded to prevent pop-in (20% larger than viewport)
- **Datasource**: CesiumJS container for entity collections (e.g., "Buildings 00100")
- **Entity**: CesiumJS object representing a geographic feature (building, tree, etc.)
- **Heat Enrichment**: Process of adding heat exposure data to building entities
- **IndexedDB**: Browser storage API for caching large datasets locally
- **Postal Code Mode**: Loading mode that loads all buildings for a selected postal code
- **Tile**: Geographic grid cell (0.01° x 0.01°) used for spatial partitioning
- **Viewport**: Visible area of the 3D map determined by camera position and orientation
- **Viewport Mode**: Loading mode that loads buildings based on visible viewport
- **WFS**: Web Feature Service - OGC standard for serving geographic features
- **Pop-in**: Visual artifact where geometry suddenly appears without smooth transition

---

**Document Version**: 1.0
**Last Updated**: 2025-11-26
**Author**: Claude Code (PRD Writer Agent)
**Stakeholders**: Frontend Engineering Team, Product Owner, HSY Data Team
**Status**: Draft - Awaiting Review
