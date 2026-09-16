# ADR-009: Analysis Registry, ChartCard Contract, and Map Coupling

## Status

Accepted

## Date

2026-09-16

## Context

The Analysis tab's eight panels were described in four hand-synchronised places:

- the button list in `ControlPanel.vue`, with level, view and feature-flag conditions inline in `v-if`s
- `analysisConfig` in `ControlPanel.vue` (titles, icons)
- `analysisComponents` in `ControlPanel.vue` (inline components, with a per-view branch)
- `componentMap` in `AnalysisPanel.vue` (drawer components, with its own per-view branch)

How a panel was presented was a literal (`'small'` or `'large'`) at each button's call site. The sidebar rewrite in #636 introduced that split without recording why, and no chart was adjusted for its new container. #978 fixed the resulting sizing and scrim problems.

Two further facts shape the design:

- Six of the eight panels interact with the 3D map: scatter points highlight a building, histogram bins and NDVI bars outline buildings or postal codes, and the Land Cover and NDVI controls swap map imagery. Grid Options explains a map layer and Climate Adaptation edits the map. Where a panel may open depends on whether the map stays visible.
- `globalStore.level` and `globalStore.view` had no declared set of values. The JSDoc listed `'postalcode'` while every consumer compares camelCase `'postalCode'`, and omitted `'grid'` and `'helsinki'`. The lowercase/camelCase mismatch caused #711.

## Decision

### Registry

`src/constants/analysisRegistry.js` exports `ANALYSES`, an ordered, frozen list with one entry per analysis:

| Field             | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `id`              | Stable key used by `openAnalysis()` and `AnalysisPanel`                                |
| `label`           | Button text; this is the accessible name the E2E specs use to locate the button        |
| `title`           | Card header, defaulting to `label`                                                     |
| `icon`            | MDI icon                                                                               |
| `tab`             | Sidebar tab it is listed in: `analysis`, or `layers` for map tools                     |
| `levels`, `views` | Where it is offered; `views: null` means any view                                      |
| `flag`            | Gating feature flag, or `null`                                                         |
| `requires`        | Extra precondition over an `AnalysisContext` (loaded data, `statsIndex`), or `null`    |
| `mapCoupling`     | `none`, `reads`, `writes` or `tool` (see below)                                        |
| `placement`       | `inline`, `drawer` or `expansion`                                                      |
| `component`       | `(view) => Component`; per-view implementations branch here instead of in each surface |

`isAnalysisAvailable(entry, ctx)` is a pure function over `{ level, view, isEnabled, statsIndex, socioEconomicsReady }`. `ControlPanel.vue` renders buttons and expansion panels by iterating the available entries; `AnalysisPanel.vue` takes a registry id.

The module also declares the `NavigationLevel` and `ViewMode` unions. `globalStore` types `level` and `view` from them, so a comparison against a value outside the union fails `vue-tsc`.

Components remain `defineAsyncComponent` imports, per ADR-005.

### Map coupling

`mapCoupling` records how an analysis relates to the map and constrains where it may be placed:

| Value    | Meaning                         | May open                                       |
| -------- | ------------------------------- | ---------------------------------------------- |
| `none`   | Reads store data only           | Anywhere, including full-page                  |
| `reads`  | Reads map selection state       | Anywhere, including full-page                  |
| `writes` | Its interactions change the map | Only where the map stays visible and clickable |
| `tool`   | Explains or edits map layers    | Never away from the map                        |

Current values: Socioeconomics `none`; Building Heat Data `reads`; Heat Distribution, Land Cover, Building Analysis and NDVI Vegetation `writes`; Grid Options and Climate Adaptation `tool`.

No full-page placement exists yet, so the constraint is recorded rather than enforced. It becomes a rule when the analysis workspace adds one.

### ChartCard

`src/components/ChartCard.vue` fixes the anatomy of an inline analysis card: a header with icon, title and a named close button; an optional `controls` slot; the chart as the default slot; and an optional `source` slot. It renders an unnamed `<section>`, so it adds no landmark and its `<header>`/`<footer>` do not map to page banner/contentinfo. The drawer keeps its own chrome so its header stays fixed while the body scrolls.

### Placement `expansion`

Climate Adaptation renders as an expansion panel rather than a button. The registry expresses this as `placement: 'expansion'`, which keeps the change free of visual differences.

### Tab

Entries with `mapCoupling: 'tool'` (Grid Options, Climate Adaptation) are listed in the Layers tab, next to the view switcher that reveals them; all others are in the Analysis tab. `AnalysisEntryList.vue` renders either tab's entries. Moving an entry between tabs is a one-field change.

## Consequences

### Positive

- Adding, gating or re-placing an analysis is a one-entry edit, and moving an analysis between surfaces no longer means rewriting templates.
- A unit test checks the registry against the previous template conditions across every level, view, flag, `statsIndex` and data-readiness combination (2,304 states).
- Level and view typos are caught at type-check time.

### Negative

- Availability logic moved from templates into data plus predicates, so reading a button's visibility requires the registry module.
- `requires` is an escape hatch: arbitrary predicates can hide conditions that a field would make explicit.

### Neutral

- `globalStore.view` keeps `'helsinki'` in its union because components still branch on it, although no current UI path sets it.
- `camera.js` still resets `level` to `null` through a cast, outside the declared union, as before.

## Alternatives Considered

### Keep the literals, add a shared config object

This would remove the duplicated titles and icons but leave availability conditions in templates and the per-view component branches in two files.

### Derive the button list from feature-flag metadata

`flagMetadata.ts` already has categories, but Building Heat Data and Grid Options have no flag, and flags describe rollout state, not presentation.

### Merge per-view variants into single components

Folding `Scatterplot`/`BuildingScatterPlotPanel` and the three building heat charts into view-aware components was rejected as a larger, riskier change with no user-visible benefit; the `component(view)` resolver keeps the variants separate.

## Implementation Notes

- The `label` values are an E2E contract: `tests/e2e/audit-2026-W19/user-journeys.spec.ts`, `tests/e2e/accessibility/expansion-panels.spec.ts` and `tests/e2e/helpers/test-helpers.ts` locate controls by these names.
- `tests/unit/constants/analysisRegistry.test.js` restates the pre-registry template conditions as its oracle.

## References

- #636 (sidebar rewrite that introduced the inline/drawer split)
- #978 (chart sizing and drawer scrim fix)
- #711 (level casing bug)
- [ADR-005](./ADR-005-lazy-loading-code-splitting.md) (lazy-loading)
