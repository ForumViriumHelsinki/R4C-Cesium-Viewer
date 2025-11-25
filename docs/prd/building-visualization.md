# Product Requirements Document: Building Visualization System

**Version:** 1.0
**Created:** 2025-11-25
**Status:** Draft
**Product:** R4C Cesium Viewer - Building Heat Exposure Visualization

---

## Executive Summary

### Problem Statement

The Building Visualization System currently loads all building data for postal codes regardless of camera viewport, causing severe performance degradation. Buildings take "awfully long" to load, the application becomes unresponsive during data loading, and the toggle system produces unexpected wireframe rendering instead of hiding buildings completely.

Key pain points:

- **Performance**: Loading all buildings for a postal code regardless of visibility causes long load times and UI freezes
- **Toggle Behavior**: Building toggles show wireframe outlines instead of completely hiding buildings
- **Memory Usage**: No viewport-based culling leads to excessive memory consumption
- **User Experience**: Delayed visual feedback and sluggish camera movement degrade usability

### Proposed Solution

Implement a viewport-aware building loading system with proper visibility management:

1. **Viewport-Based Loading**: Load buildings only for visible postal code areas within camera frustum
2. **Dynamic Culling**: Unload/hide buildings outside viewport as camera moves
3. **Proper Toggle Behavior**: Toggle OFF completely hides buildings (no wireframes), toggle ON restores previous state
4. **Temperature Coloring**: Consistent heat-based color schemes across all areas with special winter visualization
5. **Interactive Tooltips**: Mouse hover displays building information only when data is loaded
6. **Performance Optimization**: Batched processing and progressive loading for large datasets

### Business Impact

**User Benefits:**

- Reduced load times from "awfully long" to target <3 seconds for typical postal code
- Smooth camera movement without performance degradation
- Predictable toggle behavior matching user mental model
- Improved data exploration through responsive interactions

**Technical Benefits:**

- Reduced memory footprint through viewport culling (estimated 60-80% reduction)
- Better scalability to larger geographic areas
- Foundation for future optimizations (LOD, streaming, etc.)
- Cleaner separation of concerns between visibility and styling

---

## Stakeholders & Personas

### Primary Stakeholders

| Role             | Name/Team           | Responsibility                                | RACI        |
| ---------------- | ------------------- | --------------------------------------------- | ----------- |
| Product Owner    | -                   | Feature prioritization and acceptance         | Accountable |
| Engineering Lead | -                   | Technical implementation and architecture     | Responsible |
| UX Designer      | -                   | User interaction patterns and visual feedback | Consulted   |
| End Users        | Climate researchers | Feature validation and usability testing      | Informed    |

### User Personas

**Persona 1: Climate Researcher (Primary)**

- **Name**: Dr. Emma Virtanen
- **Role**: Urban climate research scientist
- **Goals**: Analyze building heat exposure patterns across Helsinki Capital Region
- **Pain Points**:
  - Long wait times prevent rapid exploration of different areas
  - Unclear toggle states make filtering unreliable
  - Cannot efficiently compare heat patterns across neighborhoods
- **Needs**:
  - Fast, responsive visualization for iterative analysis
  - Predictable filtering to isolate building types
  - Clear visual feedback for temperature variations

**Persona 2: Policy Analyst (Secondary)**

- **Name**: Mika Laaksonen
- **Role**: Municipal planning analyst
- **Goals**: Identify high-risk heat exposure areas for intervention planning
- **Pain Points**:
  - Difficulty navigating between different postal codes quickly
  - Confusion about which buildings are visible vs. hidden
  - Unclear what temperature values mean for specific buildings
- **Needs**:
  - Quick overview of multiple areas
  - Ability to filter by building categories (public, tall, etc.)
  - Tooltip information for ground-truth validation

### User Stories

#### Epic 1: Viewport-Based Loading

**US-1.1: As a climate researcher, I want buildings to load only for areas I'm viewing, so that the application remains responsive during exploration.**

**Acceptance Criteria:**

- Buildings load only for postal codes visible in camera viewport
- Moving camera automatically loads newly visible areas
- Buildings outside viewport are unloaded or hidden
- Load indicator shows progress for each postal code area
- Maximum 3-second load time for typical postal code (50-200 buildings)

**US-1.2: As a researcher, I want clear feedback when buildings are loading, so I know when data is ready for analysis.**

**Acceptance Criteria:**

- Visual loading indicator appears for each postal code area
- Progress percentage shows load completion
- Indicator disappears when buildings are fully loaded and styled
- Error messages appear if loading fails with retry option

#### Epic 2: Building Toggle System

**US-2.1: As a policy analyst, I want the building toggle to completely hide buildings when OFF, so I can focus on other data layers.**

**Acceptance Criteria:**

- Toggle OFF sets `entity.show = false` (no wireframes)
- Toggle OFF hides building polygons completely
- Toggle state persists during camera movement
- Toggle change applies immediately without delay

**US-2.2: As a researcher, I want building filters (trees, public, tall, etc.) to work independently, so I can create custom building subsets.**

**Acceptance Criteria:**

- Each filter (Trees, Public buildings, Tall buildings, Non-SOTE, New buildings, Low energy) operates independently
- Combining multiple filters shows buildings meeting ALL criteria (AND logic)
- Filters apply only to visible buildings
- Filter changes update histogram and scatter plot data
- Clearing all filters shows all buildings in viewport

**US-2.3: As a researcher, I want toggle ON to restore buildings to their previous colored state, so I can resume my analysis.**

**Acceptance Criteria:**

- Toggle ON sets `entity.show = true` and restores heat-based colors
- Toggling ON/OFF multiple times preserves color state
- Buildings maintain their previous filter state
- Heat colors reflect current selected date

#### Epic 3: Temperature-Based Coloring

**US-3.1: As a climate researcher, I want buildings colored by heat exposure, so I can visually identify hot spots.**

**Acceptance Criteria:**

- Summer dates: Yellow (low) → Orange → Red (high heat exposure)
- Winter dates (2021-02-18): Cyan (low) → Blue (high cold exposure)
- Color scale is consistent across all postal code areas
- Buildings without heat data for selected date are hidden
- Color updates immediately when date changes

**US-3.2: As a researcher, I want consistent color mapping across the Capital Region, so I can compare areas fairly.**

**Acceptance Criteria:**

- Heat exposure scale uses same normalization across all areas
- Color calculation uses `heat_timeseries[date].avgheatexposure` value
- Missing data does not cause color inconsistencies
- Alpha channel reflects heat exposure intensity

#### Epic 4: Building Hover Information

**US-4.1: As a policy analyst, I want to see building details on hover, so I can identify specific buildings of interest.**

**Acceptance Criteria:**

- Hovering over building shows tooltip with:
  - Building address
  - Average temperature for selected date
  - Building material (`rakennusaine_s`)
- Tooltip appears only when `buildingFeatures` data is loaded
- Tooltip follows mouse cursor with 15px offset
- Tooltip disappears when mouse moves off building

**US-4.2: As a researcher, I want hover tooltips to appear instantly, so I can quickly scan multiple buildings.**

**Acceptance Criteria:**

- Tooltip response time <100ms
- Throttled mouse movement events to prevent performance issues
- No tooltip flicker when moving between adjacent buildings
- Tooltip accessible via keyboard navigation (future enhancement)

#### Epic 5: Building Selection

**US-5.1: As a policy analyst, I want to click a building to see detailed information, so I can analyze specific structures.**

**Acceptance Criteria:**

- Clicking building highlights with yellow outline (width: 20px)
- Detailed building panel opens with full attribute data
- Only one building selected at a time
- Previously selected building outline resets to black (width: 8px)
- Brief pink flash on click provides immediate visual feedback (5 seconds - may reduce to 2 seconds based on user testing)

---

## Current State vs. Desired State

### Current Implementation

**Building Loading (`building.js`, `hsybuilding.js`):**

- `loadBuildings(postalCode)` - Loads ALL buildings for entire postal code
- No viewport awareness or frustum culling
- All buildings loaded on postal code selection regardless of camera position
- Uses `unifiedLoader` with IndexedDB caching (1-hour TTL)

**Toggle System (`toggleStore.js`, `building.js`):**

- Toggle states stored in Pinia store: `hideNonSote`, `hideLow`, `hideNewBuildings`
- `filterBuildings()` sets `entity.show = false` for filtered buildings
- **ISSUE**: Toggle OFF may leave wireframes visible due to `polygon.fill = true` not being set to `false`
- **ISSUE**: Toggle states not tracked per building, causing state confusion

**Heat Coloring (`building.js`):**

- `setBuildingEntityPolygon()` applies heat colors from `heat_timeseries` data
- Summer: `Color(1, 1 - exposure, 0, exposure)` - Yellow to Red
- Winter (2021-02-18): `Color(0, 1 - (1 - exposure), 1, 1 - exposure)` - Cyan to Blue
- Buildings without matching date are hidden (`entity.show = false`)

**Hover Tooltips (`BuildingInformation.vue`):**

- Mouse move handler with `requestAnimationFrame` throttling
- Only activates when `buildingStore.buildingFeatures` exists
- Fetches data by matching `entity._id` to `features[].id`
- Shows address, temperature, building material

**Selection:**

- Yellow outline: `outlineColor = Color.YELLOW, outlineWidth = 20`
- Default outline: `outlineColor = Color.BLACK, outlineWidth = 8`
- Brief highlight with pink flash (5-second duration)

### Desired State

**Viewport-Based Loading:**

- Calculate visible postal codes from camera frustum
- Load buildings only for visible postal codes
- Unload/hide buildings for postal codes outside viewport
- Progressive loading with visual feedback per postal code
- Maintain loaded data in memory for recently viewed areas (LRU cache)

**Toggle Behavior:**

- Master "Show Buildings" toggle: ON shows all (filtered), OFF completely hides
- Filter toggles work on visible buildings only
- Toggle OFF: `entity.show = false` AND `polygon.fill = false` (no wireframes)
- Toggle ON: `entity.show = true` AND `polygon.fill = true` with previous colors
- Independent toggle state tracking per building

**Heat Coloring:**

- Consistent color scale normalization across all areas
- Clear visual distinction between summer (warm) and winter (cold) palettes
- Graceful handling of missing data (hide building, log warning)
- Color recalculation on date change for visible buildings only

**Performance:**

- Target load time: <3 seconds for typical postal code (50-200 buildings)
- Smooth camera movement: 60 FPS maintained during panning
- Memory usage: Reduce by 60-80% through viewport culling
- UI responsiveness: No blocking during data processing (batched operations)

---

## Functional Requirements

### FR-1: Viewport-Based Building Loading

**FR-1.1: Viewport Calculation**

- System SHALL calculate camera frustum and determine visible postal codes
- System SHALL update visible postal codes on camera movement (debounced, 500ms)
- System SHALL maintain list of currently loaded postal codes

**FR-1.2: Progressive Loading**

- System SHALL load buildings for newly visible postal codes
- System SHALL display loading indicator per postal code with progress percentage
- System SHALL process buildings in batches of 25 entities with yielding
- System SHALL complete loading within 3 seconds for typical postal code (95th percentile)

**FR-1.3: Viewport Culling**

- System SHALL hide buildings for postal codes outside viewport
- System SHALL unload building data for postal codes not viewed in last 5 minutes (LRU cache)
- System SHALL preserve building state (colors, filters) when re-entering viewport

**FR-1.4: Error Handling**

- System SHALL display error message if building load fails
- System SHALL provide retry button for failed loads
- System SHALL log failed requests for debugging
- System SHALL gracefully degrade if viewport calculation fails (load current postal code only)

### FR-2: Building Toggle System

**FR-2.1: Master Building Toggle**

- System SHALL provide "Show Buildings" master toggle
- Master toggle OFF SHALL set `entity.show = false` AND `polygon.fill = false` for all buildings
- Master toggle ON SHALL restore buildings to previous visibility state
- Master toggle state SHALL persist in URL parameters

**FR-2.2: Filter Toggles**

- System SHALL provide independent toggles for:
  - Show Trees (`showTrees`)
  - Show Public Buildings (`hideNonSote` - inverted)
  - Show Tall Buildings (`hideLow` - inverted)
  - Show New Buildings (`hideNewBuildings` - inverted)
  - Show Low Energy Buildings (new)
- Each filter SHALL apply boolean logic (AND across all active filters)
- Filters SHALL apply only to currently visible buildings in viewport

**FR-2.3: Toggle Behavior**

- Toggle OFF SHALL completely hide buildings (no wireframes)
- Toggle ON SHALL restore heat-based colors based on current selected date
- Toggle changes SHALL trigger histogram and scatter plot updates
- Toggle state SHALL be preserved during camera movement

**FR-2.4: Building Visibility Logic**

- Building visible IF: `showBuildings == true` AND passes all active filters AND has heat data for selected date
- Building hidden IF: `showBuildings == false` OR fails any filter OR missing heat data
- Hidden buildings SHALL have `entity.show = false` AND `polygon.fill = false`

### FR-3: Temperature-Based Coloring

**FR-3.1: Color Scheme**

- Summer dates (NOT 2021-02-18): `Color(1, 1 - heatExposure, 0, heatExposure)`
  - Low heat (0.0): Yellow `Color(1, 1, 0, 0)` - nearly transparent
  - Medium heat (0.5): Orange `Color(1, 0.5, 0, 0.5)`
  - High heat (1.0): Red `Color(1, 0, 0, 1)` - fully opaque
- Winter date (2021-02-18): `Color(0, 1 - (1 - heatExposure), 1, 1 - heatExposure)`
  - Low cold (0.0): Light cyan - nearly transparent
  - High cold (1.0): Dark blue - fully opaque

**FR-3.2: Heat Data Lookup**

- System SHALL find heat data from `entity.properties.heat_timeseries` matching `store.heatDataDate`
- System SHALL use `foundEntry.avgheatexposure` for color calculation
- Buildings without matching date SHALL be hidden (`entity.show = false`)

**FR-3.3: Color Consistency**

- System SHALL use same color scale across all postal codes
- System SHALL normalize heat exposure values to [0, 1] range
- System SHALL update colors immediately when date changes

**FR-3.4: Missing Data Handling**

- Buildings without `heat_timeseries` SHALL be hidden
- System SHALL log warning for buildings with missing data
- System SHALL NOT show buildings with null or undefined heat values

### FR-4: Building Hover Information

**FR-4.1: Tooltip Content**

- Tooltip SHALL display:
  - Building address (from `findAddressForBuilding()`)
  - Average temperature for selected date (from `heat_timeseries[date].avg_temp_c`)
  - Building material (from `rakennusaine_s`)
- Temperature SHALL format to 2 decimal places with "°C" unit
- Selected date SHALL display in parentheses after temperature

**FR-4.2: Tooltip Behavior**

- Tooltip SHALL appear on mouse hover over building entity
- Tooltip SHALL follow mouse cursor with 15px x and y offset
- Tooltip SHALL appear only when `buildingStore.buildingFeatures` is loaded
- Tooltip SHALL disappear when mouse moves off building
- Tooltip SHALL NOT interfere with click events

**FR-4.3: Tooltip Performance**

- Mouse move events SHALL be throttled using `requestAnimationFrame`
- Entity picking SHALL use `viewer.scene.pick()` with cartesian coordinates
- Tooltip SHALL appear within 100ms of hover
- Tooltip SHALL NOT cause UI jank or frame drops

**FR-4.4: Tooltip Accessibility**

- Tooltip SHALL have `role="tooltip"` attribute
- Tooltip SHALL have `aria-live="polite"` for screen reader announcements
- Tooltip SHALL have descriptive `aria-label`
- Tooltip SHALL support high contrast mode
- Tooltip SHALL respect reduced motion preferences

### FR-5: Building Selection

**FR-5.1: Selection Behavior**

- Clicking building SHALL highlight with yellow outline (`Color.YELLOW`, width 20px)
- Clicking building SHALL open detailed information panel
- Only one building SHALL be selected at a time
- Previously selected building SHALL reset to default outline (black, width 8px)

**FR-5.2: Visual Feedback**

- Brief pink flash SHALL appear on click for immediate feedback
- Flash duration SHALL be configurable (default 5 seconds, consider reducing to 2 seconds)
- Flash SHALL NOT interfere with final yellow outline

**FR-5.3: Selection State**

- Selected building SHALL store in `globalStore.pickedEntity`
- Selection SHALL persist during camera movement (if building remains in viewport)
- Selection SHALL clear when clicking empty space
- Selection SHALL emit `entityPrintEvent` for panel updates

---

## Non-Functional Requirements

### NFR-1: Performance

**Load Time:**

- Building load SHALL complete within 3 seconds for typical postal code (50-200 buildings) - 95th percentile
- Building load SHALL complete within 10 seconds for large postal code (500+ buildings) - 95th percentile
- Initial viewport load SHALL complete within 5 seconds for Capital Region view

**Responsiveness:**

- Camera movement SHALL maintain 60 FPS during building rendering
- UI interactions SHALL remain responsive during background loading
- Entity picking SHALL respond within 100ms
- Filter toggle changes SHALL apply within 500ms

**Memory Usage:**

- Viewport culling SHALL reduce memory usage by 60-80% compared to loading all postal codes
- LRU cache SHALL limit loaded postal codes to 10 most recent
- Memory SHALL not exceed 500MB for typical usage session

**Scalability:**

- System SHALL support up to 50,000 buildings across entire Capital Region
- System SHALL efficiently handle camera zooming from region level to building level
- System SHALL load buildings progressively as user zooms in

### NFR-2: Reliability

**Data Integrity:**

- Building visibility state SHALL always match toggle state
- Heat colors SHALL always reflect current selected date
- Filter state SHALL persist correctly during navigation

**Error Recovery:**

- Failed loads SHALL provide retry mechanism
- Partial load failures SHALL NOT prevent other postal codes from loading
- Network errors SHALL display user-friendly messages

**State Management:**

- Toggle state SHALL persist in URL for bookmarking
- Building state SHALL survive browser refresh (via URL state)
- Camera position SHALL restore correctly after page reload

### NFR-3: Usability

**Visual Feedback:**

- All user actions SHALL provide immediate visual feedback (<100ms)
- Loading states SHALL clearly indicate progress
- Toggle states SHALL be visually obvious (clear ON/OFF indicators)

**Error Messages:**

- Error messages SHALL be user-friendly (avoid technical jargon)
- Error messages SHALL suggest corrective actions
- Critical errors SHALL be prominently displayed

**Accessibility:**

- All interactive elements SHALL be keyboard accessible
- Tooltips SHALL be screen reader compatible
- Color schemes SHALL meet WCAG AA contrast requirements
- UI SHALL support reduced motion preferences

### NFR-4: Maintainability

**Code Organization:**

- Viewport logic SHALL be encapsulated in separate service
- Toggle logic SHALL use state machine pattern for clarity
- Heat coloring SHALL be configurable via constants

**Logging:**

- All building loads SHALL log to console with timing metrics
- Toggle state changes SHALL log for debugging
- Viewport calculations SHALL log visible postal codes

**Testing:**

- Viewport calculation SHALL have unit tests
- Toggle behavior SHALL have integration tests
- Performance benchmarks SHALL be automated

---

## Technical Considerations

### Architecture

**Viewport Service (New):**

```javascript
class ViewportService {
  constructor(viewer, store)
  calculateVisiblePostalCodes() // Returns Set of postal codes in frustum
  onCameraMove() // Debounced handler for camera movement
  shouldLoadPostalCode(postalCode) // Decision logic
  shouldUnloadPostalCode(postalCode) // Culling logic
}
```

**Building Visibility Manager (New):**

```javascript
class BuildingVisibilityManager {
  applyMasterToggle(show) // Master building toggle
  applyFilters(filters) // Apply all active filters
  updateBuildingVisibility(entity, filters) // Per-building logic
  getBuildingVisibilityState(entity) // Current state calculation
}
```

**Modified Services:**

- `building.js`: Integrate viewport awareness
- `hsybuilding.js`: Support viewport-based loading
- `unifiedLoader.js`: Add viewport priority queuing
- `datasource.js`: Track postal code to data source mapping

**Modified Stores:**

- `toggleStore.js`: Add master building toggle
- `buildingStore.js`: Track loaded postal codes
- `globalStore.js`: Track visible postal codes

### Data Flow

**Viewport Change:**

1. User moves camera
2. `ViewportService.onCameraMove()` debounced trigger
3. Calculate visible postal codes from frustum
4. Compare with currently loaded postal codes
5. Load new postal codes, unload distant postal codes
6. Emit loading events for UI indicators

**Toggle Change:**

1. User toggles filter
2. `toggleStore` updates state
3. `BuildingVisibilityManager.applyFilters()` called
4. Iterate visible building entities
5. Update `entity.show` and `polygon.fill` based on filter logic
6. Request scene render
7. Update histogram/scatter plot data

**Date Change:**

1. User selects new date
2. `globalStore.heatDataDate` updates
3. `setBuildingEntityPolygon()` called for visible buildings
4. Look up heat data for new date
5. Update polygon colors or hide if missing data
6. Request scene render

### Dependencies

**Existing:**

- CesiumJS - Entity management, camera, scene rendering
- Pinia - State management for toggles, building data
- unifiedLoader - Data loading with caching
- Turf.js - Spatial calculations (may need for frustum calculations)

**New:**

- None - implement using existing dependencies

### Integration Points

**CesiumJS:**

- `viewer.camera.changed` - Camera movement detection
- `viewer.camera.computeViewRectangle()` - Viewport bounds calculation
- `viewer.scene.pick()` - Entity picking for tooltips
- `viewer.scene.requestRender()` - Render optimization

**Pinia Stores:**

- `toggleStore` - Master toggle and filters
- `buildingStore` - Building features and state
- `globalStore` - Camera, postal code, date

**Event Bus:**

- `newHeatHistogram` - Update histogram after filter changes
- `showCapitalRegion` - Trigger after building load
- `entityPrintEvent` - Update info panel on selection

### Caching Strategy

**IndexedDB Cache (existing):**

- Building GeoJSON data cached per postal code (1-hour TTL)
- Heat timeseries data cached per postal code (1-hour TTL)

**In-Memory Cache (new):**

- LRU cache for loaded postal codes (10 most recent)
- Cache key: postal code
- Cache value: { entities, dataSource, timestamp }
- Eviction: Remove least recently viewed postal code when limit reached

**Cache Invalidation:**

- Time-based: 1-hour TTL for remote data
- User-triggered: Clear cache on date change (heat data may differ)
- Memory-based: LRU eviction when memory limit approached

### Performance Optimizations

**Batched Processing:**

- Process building entities in batches of 25 with `requestIdleCallback()` yielding
- Prevents UI blocking during large dataset processing
- Already implemented in `setHeatExposureToBuildings()`

**Debouncing:**

- Camera movement debounced 500ms before viewport recalculation
- Prevents excessive calculation during continuous camera movement

**Render Optimization:**

- Use `viewer.scene.requestRender()` for explicit rendering
- Batch visibility changes before requesting render
- Avoid per-entity render requests

**Progressive Loading:**

- Load postal codes in priority order (closest to camera center first)
- Show loading indicator per postal code
- Allow interaction during background loading

---

## Success Metrics

### Performance Metrics

| Metric                                  | Baseline                        | Target      | Measurement Method              |
| --------------------------------------- | ------------------------------- | ----------- | ------------------------------- |
| Initial load time (typical postal code) | "Awfully long" (>10s estimated) | <3 seconds  | Performance.now() timestamps    |
| Initial load time (large postal code)   | >30s estimated                  | <10 seconds | Performance.now() timestamps    |
| Camera movement FPS                     | 30-45 FPS (estimated)           | 60 FPS      | `viewer.scene.frameRateMonitor` |
| Memory usage (full session)             | ~800MB (estimated)              | <500MB      | Chrome DevTools Memory Profiler |
| Entity picking response                 | <100ms                          | <100ms      | Performance marks               |
| Toggle change response                  | >1s (estimated)                 | <500ms      | Performance marks               |

### Quality Metrics

| Metric                                | Target | Measurement Method                                      |
| ------------------------------------- | ------ | ------------------------------------------------------- |
| Building visibility accuracy          | 100%   | Automated tests comparing toggle state to `entity.show` |
| Color consistency across postal codes | 100%   | Visual regression tests                                 |
| Tooltip accuracy                      | >95%   | Manual testing against known building data              |
| Error rate on building loads          | <5%    | Error logging and monitoring                            |
| Cache hit rate                        | >70%   | Cache service metrics                                   |

### User Experience Metrics

| Metric                           | Target                 | Measurement Method                |
| -------------------------------- | ---------------------- | --------------------------------- |
| Toggle behavior clarity          | >90% user satisfaction | User survey (post-implementation) |
| Loading feedback clarity         | >85% user satisfaction | User survey                       |
| Tooltip usefulness               | >80% user satisfaction | User survey                       |
| Overall performance satisfaction | >90% user satisfaction | User survey                       |

### Adoption Metrics

| Metric                              | Target           | Measurement Method |
| ----------------------------------- | ---------------- | ------------------ |
| Feature usage (building toggles)    | >70% of sessions | Analytics tracking |
| Feature usage (building hover)      | >50% of sessions | Analytics tracking |
| Feature usage (viewport navigation) | >80% of sessions | Analytics tracking |

### Technical Metrics

| Metric                     | Target            | Measurement Method                |
| -------------------------- | ----------------- | --------------------------------- |
| Code test coverage         | >80%              | Vitest coverage report            |
| No performance regressions | 0 regressions     | Automated performance tests in CI |
| Console error rate         | <1% of page loads | Error monitoring service          |
| Bundle size impact         | <50KB increase    | Build analysis tools              |

---

## Out of Scope

### Explicitly Excluded Features

**Level of Detail (LOD) System:**

- Simplified building rendering at distance
- Different detail levels based on zoom
- **Rationale**: Complex implementation, viewport culling provides sufficient performance gains
- **Future Consideration**: Revisit if viewport culling insufficient for performance targets

**Building Clustering:**

- Aggregate buildings into clusters at region zoom level
- Show individual buildings only when zoomed in
- **Rationale**: Requires significant UX changes and cluster visualization design
- **Future Consideration**: May be valuable for very large geographic areas

**3D Building Models:**

- High-fidelity 3D building meshes
- Photorealistic textures
- **Rationale**: Outside scope of heat visualization focus
- **Future Consideration**: Could enhance visual appeal but not core functionality

**Real-Time Heat Data:**

- Live updating heat exposure data
- WebSocket connections for streaming updates
- **Rationale**: Heat data is historical analysis, not real-time monitoring
- **Future Consideration**: Not applicable to current use case

**Building Animation:**

- Animated transitions when toggling visibility
- Smooth color transitions on date change
- **Rationale**: May impact performance, not essential for analysis workflow
- **Future Consideration**: Could improve visual polish if performance allows

**Offline Mode:**

- Full offline capability with service worker
- Offline data synchronization
- **Rationale**: Climate research typically performed with network access
- **Future Consideration**: May be valuable for field work scenarios

### Bug Fixes vs. Feature Work

**Included (Bug Fixes):**

- Toggle showing wireframes instead of hiding - FIX
- Long load times - PERFORMANCE BUG FIX
- Color inconsistencies across areas - BUG FIX

**Excluded (New Features):**

- Export building data to CSV
- Custom color scheme editor
- Building comparison mode (side-by-side)
- Keyboard shortcuts for toggles

---

## Timeline & Resources

### Development Phases

**Phase 1: Viewport-Based Loading (Week 1-2)**

- Implement `ViewportService` for frustum calculation
- Modify building loading to use viewport filtering
- Add loading indicators per postal code
- Implement LRU cache for loaded postal codes
- **Deliverable**: Buildings load only for visible postal codes

**Phase 2: Toggle System Improvements (Week 2-3)**

- Implement `BuildingVisibilityManager`
- Fix toggle behavior (remove wireframes)
- Add master building toggle
- Ensure filter independence
- **Deliverable**: Predictable toggle behavior without wireframes

**Phase 3: Heat Coloring Refinements (Week 3)**

- Ensure color consistency across postal codes
- Optimize color calculation performance
- Improve missing data handling
- **Deliverable**: Consistent, performant heat visualization

**Phase 4: Performance Optimization (Week 4)**

- Implement batched processing optimizations
- Add debouncing to camera movement
- Optimize render cycles
- Conduct performance profiling
- **Deliverable**: Meets all performance targets

**Phase 5: Testing & Validation (Week 5)**

- Write unit tests for viewport service
- Write integration tests for toggle behavior
- Conduct user acceptance testing
- Performance regression testing
- **Deliverable**: Fully tested, production-ready feature

### Resource Requirements

**Engineering:**

- 1 Senior Frontend Developer (Full-time, 5 weeks)
- 1 QA Engineer (Part-time, 2 weeks for testing phase)

**Design:**

- 1 UX Designer (Part-time, 1 week for loading indicators and toggle UI)

**Infrastructure:**

- No additional infrastructure required
- Use existing Playwright test infrastructure
- Use existing performance monitoring setup

### Risk Assessment

| Risk                                     | Likelihood | Impact | Mitigation Strategy                                                   |
| ---------------------------------------- | ---------- | ------ | --------------------------------------------------------------------- |
| Viewport calculation complexity          | Medium     | High   | Start with simple bounding box approach, iterate to frustum if needed |
| Performance targets not met              | Medium     | High   | Implement progressive loading with fallback to current behavior       |
| Toggle state management complexity       | Low        | Medium | Use state machine pattern, extensive testing                          |
| Cache invalidation bugs                  | Medium     | Medium | Conservative TTL, clear cache on date changes                         |
| Browser compatibility issues             | Low        | Medium | Test on Safari, Firefox, Chrome; use polyfills as needed              |
| User confusion with new loading behavior | Low        | Medium | Clear loading indicators, user documentation, tooltips                |

---

## Integration Considerations

### CI/CD Pipeline

**Automated Testing:**

- Unit tests for viewport calculations run on every commit
- Integration tests for toggle behavior in PR checks
- Performance regression tests in nightly builds
- Visual regression tests for color consistency

**Build Process:**

- No changes to existing Vite build process
- Bundle size monitoring to detect unexpected increases
- Source map generation for production debugging

**Deployment Strategy:**

- Feature flag for viewport-based loading (gradual rollout)
- Canary deployment to 10% of users first
- Monitor performance metrics during rollout
- Rollback plan if performance degrades

### Monitoring & Alerting

**Performance Monitoring:**

- Track building load times via custom performance marks
- Monitor camera FPS via scene.frameRateMonitor
- Log memory usage periodically
- Alert if load times exceed 5-second threshold

**Error Monitoring:**

- Track building load failures
- Monitor viewport calculation errors
- Log cache failures (non-critical)
- Alert if error rate exceeds 10%

**User Analytics:**

- Track toggle usage frequency
- Monitor viewport navigation patterns
- Measure hover tooltip engagement
- Track building selection rates

### Documentation Requirements

**Developer Documentation:**

- Architecture decision record for viewport service
- API documentation for BuildingVisibilityManager
- Code comments for complex viewport calculations
- Performance optimization guide

**User Documentation:**

- User guide for building toggles
- Tooltip for viewport-based loading behavior
- FAQ for common questions (why buildings disappear when panning)
- Video tutorial for building exploration workflow

**Operational Documentation:**

- Deployment runbook for feature flag rollout
- Rollback procedure if issues arise
- Performance monitoring dashboard setup
- Troubleshooting guide for common issues

---

## Appendix

### A. Glossary

| Term          | Definition                                                             |
| ------------- | ---------------------------------------------------------------------- |
| Viewport      | The visible area of the 3D map within the camera frustum               |
| Frustum       | The 3D pyramid-shaped volume visible to the camera                     |
| Entity        | CesiumJS object representing a building with geometry and properties   |
| Heat Exposure | Normalized value [0-1] representing building surface temperature       |
| Postal Code   | Geographic area used for grouping buildings (Finnish: postinumero)     |
| Toggle        | Boolean UI control for showing/hiding or filtering data                |
| Wireframe     | Outline-only rendering showing building edges without filled polygons  |
| LRU Cache     | Least Recently Used cache eviction strategy                            |
| Culling       | Removing or hiding objects outside visible area to improve performance |

### B. Related Documents

- `docs/TESTING.md` - Testing strategy and commands
- `docs/PERFORMANCE_MONITORING.md` - Performance regression monitoring
- `docs/LOCAL_DEVELOPMENT_SKAFFOLD.md` - Local development setup
- `CLAUDE.md` - Project-specific development guidelines

### C. Data Schema

**Building Entity Properties (Capital Region):**

```javascript
{
  kiitun: string,              // Building ID
  rakennusaine_s: string,      // Building material
  kayttarks: string,           // Building purpose
  kerrosten_lkm: number,       // Floor count
  c_valmpvm: date,             // Completion date
  heat_timeseries: [           // Heat exposure time series
    {
      date: string,            // YYYY-MM-DD
      avg_temp_c: number,      // Average temperature
      avgheatexposure: number  // Normalized heat exposure [0-1]
    }
  ]
}
```

**Building Entity Properties (Helsinki):**

```javascript
{
  id: string,                        // Building ID (9 digits + letter)
  rakennusaine_s: string,           // Building material
  c_kayttark: number,               // Building purpose code
  i_kerrlkm: number,                // Floor count
  c_valmpvm: date,                  // Completion date
  measured_height: number,          // Building height (meters)
  avgheatexposuretobuilding: number // Heat exposure [0-1]
}
```

### D. Color Scale Reference

**Summer Color Scale (Heat Exposure):**

```
Heat Value | RGB                  | Color      | Description
-----------|---------------------|------------|------------------
0.0        | (255, 255, 0, 0)    | Yellow     | Minimal heat exposure
0.25       | (255, 191, 0, 64)   | Light Orange | Low heat
0.5        | (255, 128, 0, 128)  | Orange     | Moderate heat
0.75       | (255, 64, 0, 191)   | Red-Orange | High heat
1.0        | (255, 0, 0, 255)    | Red        | Maximum heat exposure
```

**Winter Color Scale (Cold Exposure - Date: 2021-02-18):**

```
Cold Value | RGB                  | Color      | Description
-----------|---------------------|------------|------------------
0.0        | (0, 255, 255, 255)  | Cyan       | Minimal cold exposure
0.25       | (0, 191, 255, 191)  | Light Blue | Low cold
0.5        | (0, 128, 255, 128)  | Medium Blue | Moderate cold
0.75       | (0, 64, 255, 64)    | Dark Blue  | High cold
1.0        | (0, 0, 255, 0)      | Deep Blue  | Maximum cold exposure
```

### E. API Endpoints

**Helsinki Buildings (WFS):**

```
GET https://kartta.hel.fi/ws/geoserver/avoindata/wfs
  ?service=wfs
  &version=2.0.0
  &request=GetFeature
  &typeNames=avoindata:Rakennukset_alue_rekisteritiedot
  &outputFormat=application/json
  &srsName=urn:ogc:def:crs:EPSG::4326
  &CQL_FILTER=postinumero='<postal_code>'
```

**HSY Capital Region Buildings (WFS):**

```
GET /pygeoapi/collections/building_f/items
  ?f=json
  &postinumero=<postal_code>
  &limit=1000
```

### F. Performance Baseline Data

**Current Performance (Estimated from User Reports):**

- Large postal code load: >30 seconds
- Medium postal code load: ~15 seconds
- Small postal code load: ~5 seconds
- Camera FPS with buildings: 30-45 FPS
- Memory usage: ~800MB (estimated)
- Toggle response: 1-2 seconds

**Target Performance:**

- Large postal code load: <10 seconds (67% improvement)
- Medium postal code load: <5 seconds (67% improvement)
- Small postal code load: <3 seconds (40% improvement)
- Camera FPS with buildings: 60 FPS (50% improvement)
- Memory usage: <500MB (38% reduction)
- Toggle response: <500ms (75% improvement)

---

## Approval Signatures

| Role             | Name             | Signature        | Date   |
| ---------------- | ---------------- | ---------------- | ------ |
| Product Owner    | ****\_\_\_\_**** | ****\_\_\_\_**** | **\_** |
| Engineering Lead | ****\_\_\_\_**** | ****\_\_\_\_**** | **\_** |
| UX Designer      | ****\_\_\_\_**** | ****\_\_\_\_**** | **\_** |

---

**Document History:**

| Version | Date       | Author      | Changes                                                               |
| ------- | ---------- | ----------- | --------------------------------------------------------------------- |
| 1.0     | 2025-11-25 | Claude Code | Initial PRD creation based on codebase analysis and user requirements |
