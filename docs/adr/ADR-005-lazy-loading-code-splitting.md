# ADR-005: Lazy-Loading and Code-Splitting Strategy

## Status

Accepted

## Date

2025-08-15

## Context

CesiumJS is a large library (~40MB unminified) that dominated the application's initial bundle size and Total Blocking Time. The application also has heavy service modules (building, WMS, population grid) that are not needed until the user navigates to specific views. Loading everything eagerly caused:

- Long initial page load times (62s+ TBT measured)
- Poor Lighthouse scores
- Unnecessary bandwidth usage for users who only view the capital region overview

Dynamic imports introduced fragility — network errors during chunk loading caused unrecoverable application crashes.

**Git evidence:**

- `a082666` feat: add error handling for dynamic Cesium import (#370)
- `c6d0bc1` refactor: Implement centralized Cesium module provider for lazy loading (#593)
- `ef23d9b` fix: Add retry logic for dynamic module imports (#596)
- `bd3cf80` perf: lazy-load Cesium, services, and heavy components (#625)

## Decision

Implement a centralized module provider pattern for lazy-loading CesiumJS and heavy services:

1. **Centralized Cesium Provider** (`src/services/cesiumProvider.js`): Single point of access for the Cesium module, loaded on first use and cached for subsequent access
2. **Service-level lazy loading**: Heavy services (building, WMS, population grid) loaded on demand when their navigation level is reached
3. **Retry logic for dynamic imports**: Automatic retry with exponential backoff for failed chunk loads to handle transient network errors
4. **Vite code-splitting**: Configure `manualChunks` to create optimal split points for Cesium and vendor dependencies

## Consequences

### Positive

- Initial bundle reduced significantly, improving first paint
- TBT reduced from 62s to <5s
- Users who don't navigate deep don't download heavy modules
- Retry logic prevents transient network failures from crashing the app

### Negative

- First navigation to postal code level has a brief loading delay as services are fetched
- Centralized provider adds indirection — all Cesium access must go through the provider
- Dynamic imports make static analysis harder (tree-shaking boundaries less clear)

### Neutral

- Vite's `manualChunks` configuration requires maintenance when adding new heavy dependencies

## Alternatives Considered

### Eager loading with compression

Use gzip/brotli compression to reduce bundle size while keeping eager loading. Rejected because even compressed, CesiumJS is too large and blocks the main thread during parse/eval.

### Web Workers for Cesium

Run CesiumJS in a Web Worker. Rejected because Cesium requires DOM access for WebGL rendering and cannot run in a worker context.

## Implementation Notes

- Cesium provider uses a singleton promise pattern to prevent duplicate loading
- `manualChunks` converted to function format for Vite 8 compatibility (commit `c272e66`)
- Error handling wraps dynamic imports with user-facing notifications for permanent failures

## References

- Related: [ADR-001: Progressive Rendering](ADR-001-progressive-rendering.md)
- Related: [PRD: Performance Optimization Pipeline](../prd/performance-optimization-pipeline.md)
