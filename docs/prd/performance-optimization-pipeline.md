# Performance Optimization Pipeline PRD

## Executive Summary

### Problem Statement

The R4C-Cesium-Viewer experienced severe performance degradation as the dataset and feature set grew:

- **Total Blocking Time (TBT)** measured at 62+ seconds, causing the UI to freeze during data processing
- **WMS tile requests** exhibited N+1 patterns, making hundreds of redundant API calls (75% unnecessary)
- **Statistical grid transitions** blocked the main thread during population data processing
- **Building pipeline** processed entities sequentially, creating bottlenecks on postal codes with hundreds of buildings

These issues degraded user experience across all navigation levels and made the application impractical on lower-powered devices.

### Solution Overview

A multi-phase performance optimization effort targeting the four main bottleneck areas:

1. **Main thread offloading** — Move statistical grid computation to Web Workers
2. **WMS request optimization** — Deduplicate and cache tile requests
3. **Algorithm optimization** — Replace O(n^2) patterns with single-pass algorithms
4. **Building pipeline parallelization** — Parallel fetching with adaptive batch processing

### Business Impact

- Application usable on standard laptops (previously required high-end hardware)
- Page interactions remain responsive during data loading
- Reduced API load on HSY WMS servers by ~75%
- Enables scaling to larger datasets without proportional performance degradation

## Features

### FR-PERF-001: Main Thread Offloading

**Priority:** Critical
**Status:** Implemented

Move statistical grid loading (population data processing) to a Web Worker to prevent main thread blocking.

**Implementation evidence:**

- `4888a35` perf: Move statistical grid loading off main thread (#600)
- `376f61e` perf: Optimize population grid transitions with batched processing

**Acceptance criteria:**

- [ ] Grid data processing runs in Web Worker
- [ ] Main thread remains responsive during grid transitions
- [ ] Population data renders correctly after worker processing

### FR-PERF-002: WMS Request Optimization

**Priority:** Critical
**Status:** Implemented

Implement request deduplication and caching for WMS tile requests to eliminate redundant API calls.

**Implementation evidence:**

- `fef6a21` perf: Apply WMS tile optimization to flood and landcover services (#357)
- `004d3bd` perf: Optimize WMS tile requests to reduce N+1 API calls by 75% (#340)
- `69a2c4f` perf: Add WMS request caching and deduplication (#584)

**Acceptance criteria:**

- [ ] Duplicate tile requests are coalesced into single API calls
- [ ] Previously fetched tiles served from cache
- [ ] WMS API call volume reduced by >=75%
- [ ] Flood and landcover services use optimized tile loading

### FR-PERF-003: Algorithm Optimization (Phase 2)

**Priority:** High
**Status:** Implemented

Replace O(n^2) patterns with single-pass algorithms and add indexing for common lookups.

**Implementation evidence:**

- `46623572` perf: Implement Phase 2 optimizations - single-pass algorithms and indexing (#603)
- `bfdaa18` perf: Reduce Total Blocking Time from 62s to <5s (#602)

**Acceptance criteria:**

- [ ] TBT reduced to <5 seconds (from 62s baseline)
- [ ] Building entity processing uses single-pass algorithms
- [ ] Index structures used for repeated lookups (postal code → buildings)

### FR-PERF-004: Building Pipeline Parallelization

**Priority:** High
**Status:** Implemented

Implement parallel data fetching and adaptive batch processing for the building data pipeline.

**Implementation evidence:**

- `67a3c2e` perf: building pipeline optimizations with parallel fetching and adaptive batching (#524)
- `004d3bd` refactor: extract batch processing and height calculation utilities

**Acceptance criteria:**

- [ ] Building properties fetched in parallel batches
- [ ] Batch size adapts based on response times
- [ ] Batch processor utility extracted for reuse across services

### FR-PERF-005: Lazy Loading and Code Splitting

**Priority:** High
**Status:** Implemented

Lazy-load CesiumJS and heavy service modules to reduce initial bundle size and time-to-interactive.

**Implementation evidence:**

- `bd3cf80` perf: lazy-load Cesium, services, and heavy components (#625)
- `c6d0bc1` refactor: Implement centralized Cesium module provider for lazy loading (#593)

**Acceptance criteria:**

- [ ] CesiumJS loaded on demand via centralized provider
- [ ] Heavy services loaded when their navigation level is reached
- [ ] Dynamic import failures handled with retry logic

## Performance Metrics

| Metric                         | Before        | After        | Target               |
| ------------------------------ | ------------- | ------------ | -------------------- |
| Total Blocking Time            | 62s           | <5s          | <5s                  |
| WMS API calls per navigation   | ~400          | ~100         | 75% reduction        |
| Initial bundle size            | Large (eager) | Split chunks | Lazy-loaded          |
| Grid transition responsiveness | Frozen UI     | Responsive   | No main-thread block |

## Related Documents

- [ADR-001: Progressive Rendering](../adr/ADR-001-progressive-rendering.md)
- [ADR-003: Web Workers](../adr/ADR-003-web-workers.md)
- [ADR-005: Lazy-Loading and Code-Splitting](../adr/ADR-005-lazy-loading-code-splitting.md)
- [PRP-001: Parallel Data Fetching](../prp/PRP-001-parallel-data-fetching.md)
- [PRP-003: Adaptive Batch Processing](../prp/PRP-003-adaptive-batch-processing.md)
- [PRD: Viewport Building Streaming](viewport-building-streaming.md)
