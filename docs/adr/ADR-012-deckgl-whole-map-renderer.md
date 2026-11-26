# ADR-012: deck.gl Renderer Switches the Whole Map

## Status

Accepted

## Date

2026-11-26

## Context

The `r4c-deckgl-renderer` flag swaps the 250 m statistical grid from Cesium to
deck.gl (`DeckGlGridView`, spike PR #879). The deck.gl grid styled in 17–29 ms
against Cesium's 127 ms, used about half the memory, and its lazy chunk is
~454 KB gz against Cesium's 1.25 MB. The request is to have the same flag switch
all rendering that can sensibly move.

`DeckGlGridView` is not an overlay on Cesium: it is a standalone deck.gl
`MapView` with its own camera, drawn over a hidden Cesium canvas. deck.gl has no
Cesium integration (it integrates with MapLibre/Mapbox, Google Maps and ArcGIS).

Inventory of what Cesium renders today:

| Layer | Cesium mechanism | deck.gl equivalent |
| --- | --- | --- |
| Background maps, landcover, flood WMS | `WebMapServiceImageryProvider` | `TileLayer` + `BitmapLayer` (`utils/deckglWms.js`) |
| Postal codes, trees, vegetation, other nature, cold areas, parks, cooling centers, sensors, travel time, population grid | GeoJSON entities | `GeoJsonLayer` / `ScatterplotLayer` / `TextLayer` |
| Buildings | Extruded entities via `viewportBuildingLoader` | `TileLayer` with extruded `GeoJsonLayer` sub-layers |
| NDVI COG | `tiff-imagery-provider` | geotiff.js tiles into `BitmapLayer` |
| VTT flood | Custom `Primitive` | `SolidPolygonLayer` with per-frame `updateTriggers` |
| Picking, camera, URL state | `scene.pick`, `viewer.camera` | deck `pickObject`, `viewState` |

Terrain is `EllipsoidTerrainProvider` (flat) and shadows are off, so a Web
Mercator map loses no terrain or lighting the app uses.

## Decision

With the flag on, one deck.gl `MapView` renders the whole map at every
navigation level. With the flag off, Cesium renders it exactly as today; Cesium
is the fallback. Renderers are never mixed per layer.

- A single deck.gl map host owns one `Deck` instance. Each layer type registers
  a factory in `utils/deckglLayerRegistry.js` with an `isActive` predicate over
  store state; the host rebuilds the stack when state changes.
- The camera converts through `utils/deckglCamera.js`, so the URL camera params
  stay the shared contract between the two renderers.
- Layers are ported in this order, each behind the flag with tests first:
  WMS imagery, GeoJSON layers, buildings with picking and drill-down, NDVI and
  VTT flood. A layer not yet ported is absent in deck.gl mode.
- Style decisions are pulled out of Cesium services into pure functions both
  renderers call, as `utils/gridColorMapping.js` already is. Palettes are never
  forked.

## Consequences

### Positive

- Viewport-driven tile loading and unloading comes from deck.gl's `TileLayer`,
  which targets the "buildings missing after panning" problem.
- Smaller lazy chunk and lower styling cost, per the spike numbers.
- Cesium code paths stay untouched while porting, so the fallback is the
  current production behaviour.

### Negative

- Picking and camera are coupled to Cesium in about 22 files; they need a
  renderer-agnostic interface. This is the largest cost.
- The HDR, ambient occlusion and FXAA graphics flags have no deck.gl effect.
- No globe view and pitch is capped at 60° (deck `MapController` default).

### Neutral

- Until all layers are ported, deck.gl mode shows fewer layers than Cesium mode.

## Alternatives Considered

### Per-layer renderer flags with deck.gl overlaid on Cesium

Each layer picks its renderer; deck.gl draws on a transparent canvas synced to
the Cesium camera. Rejected: no supported integration, Cesium's globe camera and
deck's Web Mercator viewport diverge in pitched views, and the two depth buffers
are separate, so deck buildings would not occlude Cesium content or vice versa.

### Keep deck.gl for the grid only

Rejected by the product owner on 2026-11-26.
