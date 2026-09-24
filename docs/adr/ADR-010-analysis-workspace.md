# ADR-010: Analysis Workspace as an In-Page Overlay

## Status

Accepted (2026-09-24)

## Date

2026-09-23

## Context

#987 asks for one analysis surface to replace the inline sidebar card and the right-hand drawer. Charts in it should tile for comparison or go full-screen, and chart-to-map cross-filtering should become a card-level capability. The staged Analysis tab PRs (#978, #984, #985, #986) landed on 2026-09-16. [ADR-009](./ADR-009-analysis-registry.md) records each analysis's `placement` and `mapCoupling` in `src/constants/analysisRegistry.js`. It left one rule unenforced: `writes` analyses may open only where the map stays visible, and no full-page placement existed to test it against.

The following facts were checked at `a3c3269`:

- **There is no router.** `package.json` has no `vue-router`, and `src/` contains no `createRouter` or `RouterView`. `App.vue` mounts `CesiumViewer` unconditionally inside `v-main`, with `ControlPanel` beside it. Level, postal code and camera live in query parameters through `useUrlState`. Triage of #817 dropped its first item (route-gating the Cesium load), because the map is the only view.
- **Map coupling of the current entries.** Heat Distribution, Land Cover, Building Analysis and NDVI Vegetation are `writes`. Building Heat Data is `reads`, and Socioeconomics is `none`. Grid Options and Climate Adaptation are `tool`.
- **Charts could not be shown twice.** Eight live charts selected their container by a document-global id, so a second instance drew into the first instance's container. #999 moves them to component refs.
- **On phones the drawer already covers the map.** `AnalysisPanel.vue` is full width on `smAndDown` and `LAYOUT.ANALYSIS_PANEL_WIDTH` (480 px) otherwise. Building Analysis and NDVI Vegetation are `writes` entries in the drawer, so on a phone they hide the map they act on.
- **Floating map controls paint over the drawer.** This was measured in the browser on 2026-09-23, against the mock API with a 1200 px viewport. Vuetify's layout writes an inline `z-index: 1004` on the temporary right drawer, which overrides the scoped `.analysis-panel { z-index: 1200 }`. `.map-overlay-controls` (`position: fixed`, `right: 16px`, `z-index: 1100`) and `.timeline-bottom-bar` (`z-index: 1100`) are therefore the topmost elements at points inside the drawer. The static stylesheet values alone do not show this.
- **Removed charts.** The unmounted vulnerability, Espoo survey and building/nearby-tree charts are being removed (#979, #980, #981), so they are not workspace entries.

## Decision

Items 1 to 3 were decided with the maintainer during #987 triage on 2026-09-23. Items 4 to 7 follow from them, or were proposed here for review; the maintainer accepted all seven with this ADR on 2026-09-24.

### 1. The workspace is an in-page overlay

The workspace is a layer inside `v-main`, above `CesiumViewer`. It is not a route and adds no `vue-router`. The Cesium viewer stays mounted for the life of the page, with its camera, entities and imagery intact. Opening, closing and the list of open cards are application state. Mirroring them in query parameters through `useUrlState` is optional, and can be added the same way as level and postal code.

### 2. `writes` analyses open in a split pane with the live map

When the workspace shows a `writes` analysis, it takes one side of the viewport and the map keeps the other side, visible and clickable. Chart-to-map interactions (a histogram bin outlining buildings, a scatter point highlighting one) stay in view.

### 3. Chart containers are component refs first

Before any tiling or layout work, every chart draws into its own template ref instead of a document-global id (#999). The workspace depends on this, because it shows several charts at once.

### 4. Layout follows `mapCoupling`

This extends the "May open" column of ADR-009:

| `mapCoupling` | In the workspace                                        |
| ------------- | ------------------------------------------------------- |
| `none`        | May use the full workspace width; the map stays mounted |
| `reads`       | May use the full workspace width; the map stays mounted |
| `writes`      | Split pane only                                         |
| `tool`        | Not in the workspace; stays in the Layers tab (ADR-009) |

If the open cards mix couplings, one `writes` card is enough to put the workspace in split mode. The workspace becomes a new `placement` value in the registry. Its layout mode is derived from `mapCoupling` rather than chosen per entry.

`tests/unit/constants/analysisRegistry.test.js` records, for each `placement`, whether the map stays visible beside it. The test fails when an entry uses a placement that is not classified, and when a `writes` or `tool` entry uses a placement that hides the map. The workspace placement has to be classified there before any entry can use it.

### 5. Multiple cards tile in the workspace pane

Open cards tile in the workspace pane, each with the ChartCard anatomy from ADR-009, and a card can take the whole pane. Each chart draws into its own ref (item 3), so two cards of the same chart do not interfere.

### 6. Mobile is a single column

On `smAndDown` the workspace is one column. A `writes` card stacks under a map strip instead of covering the map, which also fixes the phone-drawer gap described under Context. `none` and `reads` cards may take the full screen.

### 7. Floating map controls belong to the map pane

The compass, zoom, rotate and timeline controls are positioned against the map pane rather than the viewport. They move with the split and cannot overlap the workspace. Layering between the workspace and the map controls comes from layout (siblings in separate panes), not from competing `z-index` values against the inline values that Vuetify writes.

## Consequences

### Positive

- The Cesium viewer is never torn down and rebuilt, so opening analysis costs no re-initialisation and loses no map state.
- `writes` interactions stay visible, which #978 made meaningful by removing the drawer scrim.
- ADR-009's placement rule is now a unit test rather than a sentence.
- No router dependency is added for an app that has one view.

### Negative

- In split mode the map has half the width on desktop, and the Cesium canvas has to follow its pane's size.
- Without the optional query parameters from item 1, a workspace layout cannot be shared as a link.
- The sidebar placements (`inline`, `drawer`) and the workspace coexist until each entry is moved over.

### Neutral

- A `none` or `reads` card at full width covers the map without unmounting it. With request render mode on, a covered map re-renders only when something changes.
- The drawer's scoped `z-index: 1200` has no effect today. It goes away with the drawer, or has to be set through Vuetify's layout if the drawer stays.

## Alternatives Considered

### A `/analysis` route with vue-router

This would add a dependency and require the Cesium viewer to survive navigation: kept alive, or hoisted above `RouterView`. The app has one view, and #817's route-gating item was dropped for the same reason. A route would buy a URL, and query parameters provide that without it.

### A locator inset map for `writes` analyses

A small inset keeps a map on screen without splitting the viewport. Building-level outlines, which is what Heat Distribution and Building Analysis highlight, are likely unreadable at inset size.

### `writes` analyses stay in the sidebar or drawer; only `none` and `reads` go full-page

This is the cheapest option and remains the interim state until the workspace ships. It rules out comparing `writes` charts side by side, and on phones it keeps the drawer covering the map.

## Implementation Notes

- Order: #999 (component-ref containers), then the workspace shell (overlay, split pane, map-pane controls), then moving entries one at a time by changing their registry `placement`.
- Add the workspace placement to the `MAP_VISIBLE` classification in `tests/unit/constants/analysisRegistry.test.js` in the same change that adds it to the registry.
- That classification can only be `true`, because `writes` entries must be able to use the workspace (item 2). The registry test then trusts the workspace to switch to split mode rather than checking it. The workspace shell needs its own component test: with a `writes` card open, the map pane stays in the layout.
- When the map pane resizes, check that the viewer re-renders under request render mode (see `.claude/rules/architecture.md`, Cesium Render Mode). Call `viewer.scene.requestRender()` after the resize if it does not.
- The controls to re-home are `MapOverlayControls.vue` (`position: fixed`, `z-index: 1100`), `CameraControls.vue` (`position: absolute`, `z-index: 400`) and the `.timeline-bottom-bar` in `App.vue` (`z-index: 1100`). Check stacking in a browser: the drawer case above shows that the stylesheet does not predict it.
- Keep the ADR-005 lazy-loading: workspace cards resolve their components through the registry's `defineAsyncComponent` entries.

## References

- #987 (analysis workspace planning)
- #999 (chart containers scoped to component refs)
- #978 (chart sizing and drawer scrim fix)
- #817 (route-gated Cesium load; item 1 dropped)
- #979, #980, #981 (unmounted analysis charts being removed)
- [ADR-009](./ADR-009-analysis-registry.md) (registry, `mapCoupling`, ChartCard)
- [ADR-005](./ADR-005-lazy-loading-code-splitting.md) (lazy-loading)
- `src/constants/analysisRegistry.js`, `src/components/AnalysisPanel.vue`, `src/App.vue`
