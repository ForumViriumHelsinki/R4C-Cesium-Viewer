# ADR-001: Progressive Rendering Strategy

## Status

Proposed

## Date

2026-01-13

## Context

The current building rendering pipeline follows a sequential approach:

1. Fetch building GeoJSON data
2. Fetch heat exposure data
3. Merge heat data with buildings
4. Apply height extrusion to all entities
5. Apply heat exposure colors to all entities
6. Add data source to viewer
7. Render

This results in users waiting 1-4 seconds before seeing any buildings on screen, even though the geometry data arrives within 500ms-2s. The perceived performance is poor because all processing must complete before any visual feedback appears.

### Current Flow (Sequential)

```
Fetch → Process → Style All → Render (1-4s total wait)
```

### Problem Impact

- **User Experience**: Users see empty map while waiting, uncertain if interaction worked
- **Perceived Performance**: Feels slow even when network is fast
- **Engagement**: Users may click multiple times thinking first click failed

## Decision

Implement a **two-phase progressive rendering strategy** that separates geometry display from styling:

### Phase 1: Immediate Geometry Render

Display building polygons with default styling immediately after GeoJSON parsing completes:

```javascript
// Phase 1: Immediate render with default styling
const dataSource = await Cesium.GeoJsonDataSource.load(data, {
	stroke: Cesium.Color.BLACK,
	fill: Cesium.Color.WHITE.withAlpha(0.7),
	strokeWidth: 1,
	clampToGround: true,
});
viewer.dataSources.add(dataSource);
viewer.scene.requestRender();
```

### Phase 2: Background Enhancement

Apply detailed styling (height extrusion, heat colors) asynchronously without blocking the UI:

```javascript
// Phase 2: Non-blocking enhancement
queueMicrotask(async () => {
	// Height extrusion with batching
	await applyHeightExtrusion(dataSource.entities.values);
	viewer.scene.requestRender();

	// Heat color application with batching
	if (heatData) {
		await applyHeatColors(dataSource.entities.values, heatData);
		viewer.scene.requestRender();
	}
});
```

### New Flow (Progressive)

```
Fetch → Parse → Render Geometry (<500ms) → Style in Background → Re-render
                      ↑
              User sees buildings here
```

## Consequences

### Positive

- **Perceived Performance**: Users see buildings within 500ms instead of 1-4s
- **Visual Feedback**: Immediate confirmation that click/interaction worked
- **Incremental Enhancement**: Buildings "pop up" and colorize progressively
- **Reduced Bounce Rate**: Users less likely to click away thinking app is broken

### Negative

- **Visual Transition**: Buildings initially appear flat/white, then gain height/color
- **Two Render Passes**: Slightly more GPU work (negligible impact)
- **Code Complexity**: Must manage two-phase state and handle edge cases

### Neutral

- **Memory Usage**: Unchanged (same entities, different timing)
- **Network Traffic**: Unchanged
- **Cache Behavior**: Unchanged

## Alternatives Considered

### Alternative 1: Skeleton/Placeholder UI

Display loading skeleton or placeholder shapes while data loads.

**Not chosen because:**

- Requires pre-knowledge of building locations
- Still no actual content visible
- More complex to implement than progressive render

### Alternative 2: Loading Spinner on Map

Show a loading indicator over the map area.

**Not chosen because:**

- Doesn't improve perceived performance
- Blocks visual interaction with map
- Common pattern but doesn't leverage available geometry

### Alternative 3: Server-Side Pre-Rendering

Generate pre-styled tiles on server.

**Not chosen because:**

- Requires significant backend changes
- Increases infrastructure complexity
- Heat data is dynamic/temporal

## Implementation Notes

### Files to Modify

1. **`src/services/datasource.js`**
   - Modify `addDataSourceWithPolygonFix()` to accept `immediateRender` option
   - Add immediate render call before returning

2. **`src/services/building/buildingStyler.js`**
   - Wrap styling in `queueMicrotask()` or `requestIdleCallback()`
   - Add render request after each styling phase

3. **`src/services/hsybuilding.js`**
   - Restructure `loadHSYBuildings()` to call datasource add before styling

### Edge Cases

1. **Rapid Navigation**: If user navigates away before Phase 2 completes, cancel pending styling
2. **Multiple Loads**: Track which data source is being styled, skip if superseded
3. **Error Handling**: If Phase 2 fails, buildings remain visible with default styling

### Testing

- Measure Time to First Building (TTFB) before/after
- Verify no flickering or visual artifacts during transition
- Test with slow network simulation (3G)
- Verify cleanup on rapid navigation

## References

- [Building Pipeline Analysis](../building-pipeline.md)
- [Google Web Vitals - LCP](https://web.dev/lcp/)
- [Progressive Enhancement Pattern](https://developer.mozilla.org/en-US/docs/Glossary/Progressive_Enhancement)
