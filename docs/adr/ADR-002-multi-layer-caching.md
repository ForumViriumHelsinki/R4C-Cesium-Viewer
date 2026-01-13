# ADR-002: Multi-Layer Caching Architecture

## Status

Proposed

## Date

2026-01-13

## Context

The application currently implements caching at two levels:

1. **IndexedDB** (via unifiedLoader): Building GeoJSON with 1-hour TTL
2. **Pinia Store** (buildingStore): In-memory LRU cache of 50 postal codes for tooltip data

However, **heat exposure data is not cached** and is fetched every time buildings are loaded, even when the building geometry comes from cache. This results in:

- Redundant API calls for the same heat data
- Increased latency even on "cached" loads (200-500ms for heat fetch)
- Wasted bandwidth and server resources

### Current Cache Flow

```
Building Request
    ↓
Check IndexedDB (buildings)
    ↓ (hit or miss)
Fetch Heat Data (ALWAYS)  ← Problem: No caching
    ↓
Merge & Style
```

### Data Characteristics

| Data Type           | Size       | Update Frequency | TTL Appropriate |
| ------------------- | ---------- | ---------------- | --------------- |
| Building GeoJSON    | 100KB-2MB  | Monthly          | 1 hour ✓        |
| Heat Exposure       | 50KB-500KB | Daily/Seasonal   | 1 hour ✓        |
| Building Properties | 10KB-100KB | Rarely           | 24 hours        |

## Decision

Implement a **unified multi-layer caching strategy** that treats heat data as a separate cacheable layer, parallel to building data:

### Layer 1: IndexedDB (Persistent)

```javascript
// Building geometry cache
const buildingConfig = {
	layerId: `buildings_${postalCode}`,
	url: urlStore.hsyBuildings(postalCode),
	type: 'geojson',
	cacheTTL: 3600000, // 1 hour
};

// Heat exposure cache (NEW)
const heatConfig = {
	layerId: `heat_${postalCode}`,
	url: urlStore.urbanHeatHelsinki(postalCode),
	type: 'geojson',
	cacheTTL: 3600000, // 1 hour
};
```

### Layer 2: Memory Cache (Session)

```javascript
// buildingStore.js - existing LRU
maxPostalCodes: 50; // Building features for tooltips

// NEW: heatExposureStore.js
maxPostalCodes: 50; // Heat data for styling
```

### Layer 3: Cesium Entity Cache (Runtime)

Entities remain in `viewer.dataSources` until explicitly removed or LRU evicted.

### New Cache Flow

```
Building + Heat Request (Parallel)
    ↓                    ↓
Check IndexedDB      Check IndexedDB
(buildings)          (heat)
    ↓                    ↓
Fetch if miss        Fetch if miss
    ↓                    ↓
    └────── Merge ───────┘
              ↓
           Style
```

## Consequences

### Positive

- **Reduced Latency**: Heat data served from cache eliminates 200-500ms per load
- **Parallel Fetching**: Both caches can be checked/fetched simultaneously
- **Bandwidth Savings**: ~50% reduction in API calls for repeat visits
- **Consistent Architecture**: All API data follows same caching pattern

### Negative

- **Increased Storage**: Additional IndexedDB space for heat data (~50MB max)
- **Cache Invalidation Complexity**: Two caches to manage per postal code
- **Memory Pressure**: Additional in-memory LRU cache

### Neutral

- **TTL Strategy**: Same 1-hour TTL for both (heat data rarely changes intra-day)
- **Eviction Policy**: Same LRU policy applies to both caches

## Alternatives Considered

### Alternative 1: Embedded Heat Data in Building Response

Modify PyGeoAPI to include heat data in building response.

**Not chosen because:**

- Requires backend changes
- Couples two data sources with different update frequencies
- Increases building response size significantly

### Alternative 2: Service Worker Cache

Use Service Worker to cache all API responses.

**Not chosen because:**

- Less control over cache invalidation
- Harder to implement selective TTLs
- IndexedDB already provides what we need

### Alternative 3: Redis/Server-Side Cache

Add Redis caching layer on backend.

**Not chosen because:**

- Infrastructure overhead
- Client-side caching sufficient for this use case
- Heat data is user-specific (date selection)

## Implementation Notes

### New Store: heatExposureStore.js

```javascript
import { defineStore } from 'pinia';

export const useHeatExposureStore = defineStore('heatExposure', {
	state: () => ({
		heatDataCache: new Map(),
		postalCodeOrder: [],
		maxPostalCodes: 50,
	}),

	actions: {
		setHeatData(heatFeatures, postalCode) {
			// LRU eviction logic (same as buildingStore)
			if (this.postalCodeOrder.length >= this.maxPostalCodes) {
				const oldest = this.postalCodeOrder.shift();
				this.heatDataCache.delete(oldest);
			}

			this.heatDataCache.set(postalCode, heatFeatures);
			this.postalCodeOrder.push(postalCode);
		},

		getHeatData(postalCode) {
			return this.heatDataCache.get(postalCode);
		},
	},
});
```

### Modify unifiedLoader.js

Add heat data as separate cacheable layer type:

```javascript
// In loadLayer()
if (config.type === 'heat') {
	// Check memory cache first
	const cached = heatExposureStore.getHeatData(config.postalCode);
	if (cached) return cached;

	// Fall through to IndexedDB/network
}
```

### Modify urbanheat.js

```javascript
// Before
const heatResponse = await fetch(urlStore.urbanHeatHelsinki(postcode));

// After
const heatData = await unifiedLoader.loadLayer({
	layerId: `heat_${postcode}`,
	url: urlStore.urbanHeatHelsinki(postcode),
	type: 'geojson',
	cacheTTL: 3600000,
});
```

### Cache Key Strategy

```
IndexedDB Keys:
- buildings_{postalCode}
- heat_{postalCode}_{date}  // Include date for temporal data

Memory Cache Keys:
- Same structure in respective stores
```

### Migration

No migration needed - new cache entries will be created on first access.

## References

- [Building Pipeline Analysis](../building-pipeline.md)
- [IndexedDB Best Practices](https://web.dev/indexeddb-best-practices/)
- [LRU Cache Implementation](<https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU)>)
