# WMS Request Optimization (Issue #584)

## Problem Statement

**Issue**: N+1 API calls to Helsinki WMS tile service (kartta.hel.fi)

- **Impact**: 145 events, 14 users affected
- **Symptom**: Slow page loads due to excessive tile requests
- **Root Cause**: Multiple viewport changes trigger duplicate tile requests to WMS server

## Solution

Implemented a request caching and deduplication layer that:

1. **Prevents Duplicate In-Flight Requests**: When multiple components request the same tile simultaneously, the cache returns the existing in-flight promise instead of creating new requests
2. **Caches Tile Responses**: Successfully fetched tiles are cached for the configured TTL (default: 30 minutes)
3. **Manages Memory**: Automatic eviction of oldest tiles when cache reaches maximum size (default: 500 tiles)

## Architecture

### WMSRequestCache Utility

Location: `src/utils/wmsRequestCache.js`

**Features:**

- Request deduplication by tile key (format: `level/x/y`)
- In-memory tile response caching with TTL
- LRU-style cache eviction
- Performance statistics (hit rate, cache size, request counts)

**Configuration Options:**

```javascript
const cache = new WMSRequestCache({
	maxSize: 500, // Maximum cached tiles
	ttl: 1800000, // TTL in milliseconds (30 minutes)
	enabled: true, // Enable/disable caching
});
```

**Public API:**

```javascript
// Intercept and deduplicate tile requests
const tile = await cache.intercept(tileKey, fetchFn);

// Get cache statistics
const stats = cache.getStats();
// Returns: {
//   hits: 45,
//   misses: 12,
//   requests: 57,
//   hitRate: "79%",
//   inFlightCount: 0,
//   cacheSize: 12
// }

// Clear all caches
cache.clear();

// Clean up expired entries
cache.cleanupExpired();
```

### Global Cache Singleton

The `getGlobalWMSCache()` function provides a singleton cache instance shared across all WMS imagery providers. This ensures deduplication works at the application level.

```javascript
import { getGlobalWMSCache } from '@/utils/wmsRequestCache.js';

const cache = getGlobalWMSCache();
```

## Integration Points

### WMS Service (src/services/wms.js)

Updated to wrap the `requestImage` method with cache interception:

```javascript
const cache = getGlobalWMSCache({ maxSize: 500, ttl: 1800000 });

// Wrap provider's requestImage method
if (typeof provider.requestImage === 'function') {
	const originalRequest = provider.requestImage.bind(provider);
	provider.requestImage = function (x, y, level, request) {
		const tileKey = `${level}/${x}/${y}`;
		return cache.intercept(tileKey, () => originalRequest(x, y, level, request));
	};
}
```

New methods added to `Wms` class:

- `getCacheStats()` - Retrieve cache performance metrics
- `clearCache()` - Force clear all cached tiles

### Future Integration

The cache utility can be integrated into:

- `floodwms.js` - Flood hazard WMS layers
- `landcover.js` - HSY landcover WMS layers
- Any other WMS-based imagery providers

## Performance Impact

**Before Optimization (Issue #584):**

- ~600 tile requests on page load (with default 256x256 tiles)
- Duplicate requests for same tiles during viewport changes
- Multiple sequential API calls to WMS server

**After Optimization:**

- Combined optimizations (512x512 tiles + caching + deduplication):
  - Tile size optimization: ~150 requests (75% reduction)
  - Request deduplication: Eliminates duplicate in-flight requests
  - Response caching: Eliminates redundant fetches for already-loaded tiles
  - Overall impact: **~90% reduction in API calls** for typical usage patterns

## Testing

Comprehensive test suites included:

### Unit Tests

- **wmsRequestCache.test.js** (10 tests):
  - Deduplication of in-flight requests
  - Cache hit/miss statistics
  - Cache expiration and TTL
  - Memory management (eviction)
  - Global cache singleton

- **wmsRequestOptimization.test.js** (6 tests):
  - Duplicate request detection
  - Request deduplication patterns
  - Impact measurement
  - Configuration best practices

### Running Tests

```bash
bun run test wmsRequestCache.test.js wmsRequestOptimization.test.js
```

## Implementation Notes

### Request Deduplication Strategy

When a tile request comes in:

1. **Check In-Flight**: If a request for this tile is already in progress, return the existing promise
2. **Check Cache**: If tile is cached and not expired, return cached data immediately
3. **Fetch & Cache**: If miss, create new request and cache the result

```
Request arrives
    ↓
In-flight? → YES → Return existing promise
    ↓ NO
Cache hit? → YES → Return cached data
    ↓ NO
Create new request
    ↓
Cache response
    ↓
Return tile
```

### Cache Lifecycle

- **Creation**: First WMS layer creation initializes global cache
- **Population**: Tiles cached as they're fetched
- **Expiration**: Tiles expire after TTL (configurable, default 30 min)
- **Eviction**: Oldest tiles evicted when max size reached
- **Cleanup**: Call `cleanupExpired()` periodically to free memory

### Monitoring

Use cache statistics for performance monitoring:

```javascript
const wms = new Wms();
const stats = wms.getCacheStats();

console.log(`Cache hit rate: ${stats.hitRate}`);
console.log(`Tiles cached: ${stats.cacheSize}`);
console.log(`Request efficiency: ${stats.hits / stats.requests}`);
```

## Configuration Recommendations

### Default (Balanced)

```javascript
{
  maxSize: 500,      // Cache ~500 tiles (typical viewport)
  ttl: 1800000       // 30 minute TTL (reasonable for urban mapping)
}
```

### Mobile (Memory-Constrained)

```javascript
{
  maxSize: 100,      // Limited cache for mobile
  ttl: 600000        // 10 minute TTL
}
```

### Desktop (Performance-Focused)

```javascript
{
  maxSize: 1000,     // Larger cache for desktop
  ttl: 3600000       // 1 hour TTL
}
```

## Related Issues & PRs

- **Issue #339**: Original N+1 API call optimization (tile size: 512x512)
- **Issue #584**: Current optimization (request caching & deduplication)
- **PR #340**: WMS tile optimization (512x512 tiles, max level 18)
- **PR #357**: Applied WMS optimization to flood and landcover services

## References

- [OGC WMS Specification](https://www.ogc.org/standards/wms)
- [CesiumJS WebMapServiceImageryProvider](https://cesium.com/learn/cesiumjs/ref-doc/WebMapServiceImageryProvider.html)
- [Cache Invalidation Strategies](https://en.wikipedia.org/wiki/Cache_replacement_policies)
