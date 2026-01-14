# ADR-004: CSS Overlay for Altitude-Based Visual Indicators

## Status

Accepted

## Date

2026-01-14

## Context

Users need a visual indication when the camera is zoomed out beyond the building loading threshold (3000m altitude). Without this feedback, users see an empty map with no explanation of why buildings aren't visible.

The indicator should:

- Feel natural and non-intrusive (not text-based)
- Appear gradually as users zoom out
- Clear smoothly as users zoom in
- Not interfere with map interactions

## Decision

Use a CSS overlay element instead of CesiumJS's built-in fog system.

The overlay:

- Is a semi-transparent gradient (atmospheric haze appearance)
- Positioned absolutely within `#cesiumContainer`
- Opacity controlled by camera altitude (0% at ≤3000m, 40% at ≥10000m)
- Uses quadratic easing for natural appearance
- Has `pointer-events: none` to allow map interaction through it

Additionally, the default camera height was lowered from 4000m to 2800m so buildings load immediately on app start.

## Consequences

### Positive

- Reliable, predictable visual effect across all browsers
- Full control over appearance (color, gradient, opacity curve)
- Simple implementation with no CesiumJS API complexity
- Smooth CSS transitions built-in
- No performance impact on 3D rendering

### Negative

- Not integrated with CesiumJS scene (doesn't affect 3D depth perception)
- Requires manual z-index management relative to other UI elements

### Neutral

- Overlay element added to DOM (minimal overhead)

## Alternatives Considered

### CesiumJS Built-in Fog (`viewer.scene.fog`)

CesiumJS provides fog with properties like `density`, `visualDensityScalar`, `heightScalar`, and `heightFalloff`.

**Why not chosen:**

- CesiumJS fog is designed for **distance-based atmospheric scattering** (making distant objects fade toward the horizon)
- At typical map viewing altitudes (3000-10000m), the fog effect is imperceptible because it's calculated based on distance to terrain, not camera altitude
- The fog parameters don't provide direct altitude-based control
- Testing confirmed the effect was invisible even with aggressive density settings

### Desaturation Effect

Reduce color saturation when zoomed out, making colors vivid as you zoom in.

**Why not chosen:**

- Would require post-processing shader modifications
- Less intuitive visual metaphor than "haze clearing"
- More complex to implement

### Zoom Icon Indicator

Display a small animated "zoom in" icon when above threshold.

**Why not chosen:**

- Text/icon-based approach (user preference was for something more natural)
- Doesn't provide graduated feedback as altitude changes
- More abrupt visual change

### Ground Atmosphere Glow

Adjust `globe.showGroundAtmosphere` to create a glowing effect.

**Why not chosen:**

- Limited control over the effect
- Designed for global atmosphere visualization, not altitude feedback

## Implementation Notes

Key files:

- `src/composables/useFogEffect.js` - Core overlay logic
- `src/constants/viewport.js` - `FOG_START_HEIGHT` (3000m), `FOG_FULL_HEIGHT` (10000m)
- `src/services/camera.js` - Default camera height (2800m)
- `src/pages/CesiumViewer.vue` - Initialization

The composable:

1. Creates overlay element on init
2. Listens to `camera.changed` events (debounced 50ms)
3. Calculates opacity using quadratic easing based on altitude
4. Cleans up event listeners and DOM element on unmount

## References

- CesiumJS Fog API: https://cesium.com/learn/cesiumjs/ref-doc/Fog.html
- CesiumJS Fog Sandcastle: https://sandcastle.cesium.com/?src=Fog.html
