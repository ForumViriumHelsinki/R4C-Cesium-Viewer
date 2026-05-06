---
id: AUDIT-2026-W19
title: Golden-Path QA Pass — User Stories vs Live Beta (v1.48.0)
status: draft
date: 2026-05-06
target: https://r4c-beta.dataportal.fi/
target_version: v1.48.0
methodology: chrome-devtools MCP walkthrough + Sentry + GitHub issues + flagMetadata.ts cross-ref
---

# Golden-Path QA Pass — 2026-W19

Audit of advertised features in the R4C Cesium Viewer beta, comparing PRD claims and `flagMetadata.ts` defaults to real user-observable behavior. One row per advertised capability.

## Methodology

1. Walked through https://r4c-beta.dataportal.fi/ via chrome-devtools MCP at viewport 1512×811.
2. Captured `console.error/warn` and 4xx/5xx network requests at every UI transition.
3. Cross-referenced 48 unresolved Sentry issues for `r4c-cesium-viewer` (forum-virium-helsinki org).
4. Cross-referenced open `bug` and `performance` GitHub issues (#679, #680, #681, #687).
5. Inventoried features from `src/constants/flagMetadata.ts` (35 flags) and the four PRDs in `docs/prd/`.

Status legend: ✅ working — ⚠️ partial — ❌ broken — 🟡 unverified (could not exercise in this pass).

## Critical Findings (before user stories)

These are the live-evidence anomalies surfaced during the walkthrough. Each maps to one or more user stories below.

| #   | Symptom                                                                                                                      | Where seen                                                                    | Evidence                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| C1  | `GET /feature-flags/health → 502` on every page load                                                                         | Initial network capture                                                       | reqid=63, every session                                                                      |
| C2  | Header renders `"undefined Helsinki Keskusta - Etu-Töölö"` at postal-code level                                              | Banner + sidebar after navigation                                             | a11y snapshot uids 7_0, 7_2                                                                  |
| C3  | ANALYSIS tab at postal-code level shows only 3 buttons (SOCIOECONOMICS, LAND COVER, BUILDING ANALYSIS)                       | Postal-code 00100                                                             | `flagMetadata.ts` claims `heatHistogram`, `ndviAnalysis`, `buildingScatterPlot` default-true |
| C4  | DETAILS tab at postal-code level shows "0 properties for selected postal code" / "Click on areas to view properties" — empty | Postal-code 00100                                                             | a11y region 9_1 — never populates AreaProperties                                             |
| C5  | URL keeps `level=postalcode&postalcode=00100` after Go-back returns to Start level                                           | Address bar after back nav                                                    | Back button fires but `urlStore` isn't reset                                                 |
| C6  | Console flooded with `[loadingStore] Clearing stale loading state for viewport_buildings_hsy_*` warnings on initial load     | All page loads, ≥30 events per session                                        | Confirms #680 (stuck loading indicators) is still firing                                     |
| C7  | `TypeError: Failed to construct 'URL': Invalid URL` recurring across 33 distinct Sentry groups since 2026-02-10              | Sentry R4C-CESIUM-VIEWER-1W et al.                                            | ~150 events total — silent failure mode                                                      |
| C8  | `TypeError: Cannot read properties of null (reading 'creditDisplay')` — Cesium destroy race                                  | Sentry R4C-CESIUM-VIEWER-1X, -19, -1B, -1D, -1F, -1K, -1M, -1R, -1S, -1V, -1Y | ~75 events; matches CesiumViewer.vue cleanup ordering bug                                    |
| C9  | N+1 API call pattern + Large HTTP payload                                                                                    | Sentry R4C-CESIUM-VIEWER-1, -2, -4, -5; tracks issue #687                     | 7172 events combined — dominant performance signal                                           |
| C10 | Disclaimer dialog visible on every cold load (no "remember dismissal")                                                       | First page load every session                                                 | a11y dialog 1_63                                                                             |

---

## User Stories

### US-01: Disclaimer dismissal

**Source**: Implicit (no PRD; visible in `comprehensive-walkthrough.spec.ts`).

As a returning user, I want the disclaimer not to interrupt me on every load, so that I can get to work without re-dismissing.

**Acceptance criteria**:

- AC1: First-time user sees the disclaimer modal.
- AC2: After acknowledgement, subsequent visits within a reasonable window do not re-show it.

**Observed**: Modal appears on every cold load. No localStorage flag is set on dismissal (verified via `evaluate_script`). Three additional inactive `<dialog role="dialog">` elements (Loading Performance, Reset Feature Flags, Import Configuration) are rendered into the DOM on cold load — this is benign but inflates the dialog query surface.

**Status**: ⚠️ partial — works but is needlessly repeated.
**Suggested fix**: Persist a `r4c_disclaimer_acknowledged_at` key in localStorage; skip the modal when present and < 30 days old.
**Suggested test**: `tests/e2e/onboarding/disclaimer-persistence.spec.ts` — `@e2e @onboarding`.

---

### US-02: GOFF-backed feature flags

**Source**: `src/constants/flagMetadata.ts`, `feature-flags.md` rule.
**Flag**: All 35 flags route through `featureFlagProvider.ts` → GOFF.

As a release manager, I want the GOFF relay proxy to serve flag values at runtime, so that I can roll back features without redeploys.

**AC**:

- AC1: `GET /feature-flags/health` returns 2xx.
- AC2: Provider state in `featureFlagStore` is `READY` when GOFF is reachable.

**Observed (2026-05-06)**: `GET /feature-flags/health → 502` on every load. Provider falls back to `InMemoryProvider` defaults, masking misconfigured flags as "working." This is invisible to users but means **production flag values are not served — only the compile-time `fallbackDefault` values run**.

**Status**: ❌ broken — the entire flag plumbing is bypassed in beta.
**Suggested fix**: Investigate the GOFF relay-proxy deployment in the beta cluster (likely the proxy is unhealthy or routing is wrong). Surface this in the UI (the feature-flag panel should warn when provider is degraded).
**Suggested test**: `tests/e2e/feature-flags/goff-health.spec.ts` — assert no `5xx` on `/feature-flags/health`. Tag `@e2e @feature-flags @smoke`.

---

### US-03: Postal-code navigation breadcrumb

**Source**: `docs/prd/feature-picker-navigation.md`.

As an analyst, I want the breadcrumb to show "Helsinki — Helsinki Keskusta - Etu-Töölö" or similar, so that I know which area I'm viewing.

**AC**:

- AC1: Breadcrumb at postal-code level concatenates city + neighborhood name with no spurious tokens.

**Observed**: Both header and sidebar render the literal string `"undefined Helsinki Keskusta - Etu-Töölö"`. The leading `undefined` indicates a template like `${city} ${neighborhood}` where `city` is unset.

**Status**: ❌ broken — visible on every postal-code navigation.
**Suggested fix**: Search for the string-interpolation site in `App.vue` toolbar / sidebar header; coalesce missing prefix with `''` or fall back to a default. Likely in `urlStore.js` or `globalStore.js` derived state.
**Suggested test**: `tests/e2e/navigation/breadcrumb.spec.ts` — `@e2e @navigation`.

```typescript
expect(page.locator('header')).not.toContainText(/^undefined /);
expect(page.locator('header')).toContainText(/Helsinki Keskusta/);
```

---

### US-04: Heat Histogram analysis tool

**Source**: `flagMetadata.ts:202-210` — `heatHistogram` (default `true`).

As an analyst at postal-code level, I want a heat-distribution histogram on the ANALYSIS tab.

**AC**:

- AC1: With `heatHistogram` flag enabled, ANALYSIS tab exposes a "Heat Histogram" entry.

**Observed**: Postal-code level shows three buttons: SOCIOECONOMICS, LAND COVER, BUILDING ANALYSIS. **No Heat Histogram button** despite default-true flag.

**Status**: ❌ broken — tool not surfaced.
**Suggested fix**: Audit `ControlPanel.vue` flag gating — confirm the histogram button is wrapped with `v-if="featureFlags.heatHistogram"` and that `heatHistogram` resolves to `true` when GOFF is unhealthy (it should via `fallbackDefault`).
**Suggested test**: `tests/e2e/feature-flags/analysis-tools-visibility.spec.ts` — assert each default-true analysis flag surfaces a button. Tag `@e2e @feature-flags @analysis`.

---

### US-05: NDVI vegetation analysis

**Source**: `flagMetadata.ts:229-237` — `ndviAnalysis` (default `true`).

Same shape as US-04 — tool missing from ANALYSIS tab. **Status: ❌**

---

### US-06: Building scatter plot

**Source**: `flagMetadata.ts:211-218` — `buildingScatterPlot` (default `true`).

Same shape as US-04 — tool missing from ANALYSIS tab. **Status: ❌**

---

### US-07: Postal-code AreaProperties (DETAILS tab)

**Source**: `docs/prd/feature-picker-navigation.md` — "DETAILS tab → AreaProperties shows zone stats".

As an analyst, I want the DETAILS tab at postal-code level to show population, building count, and demographic stats for the selected zone.

**AC**:

- AC1: After navigating to a postal code, DETAILS shows non-zero "N properties" with at least basic demographic numbers.

**Observed**: At 00100, DETAILS shows `region "0 properties for selected postal code"` and the static text "Click on areas to view properties." The PaaVo + pygeoapi requests in network capture (reqid=50, 51, 67) succeeded, but the panel never populates.

**Status**: ❌ broken — data fetched but not bound to the panel at postal-code level.
**Suggested fix**: Trace `propsStore` updates triggered by `globalStore.level === 'postalcode'`. AreaProperties.vue may only react to `level === 'building'` after recent refactors.
**Suggested test**: `tests/e2e/navigation/area-properties-postalcode.spec.ts` — `@e2e @navigation @details`.

---

### US-08: Back-navigation URL state reset

**Source**: `docs/prd/feature-picker-navigation.md` — Latest-Wins navigation pattern.

As a user, I want the URL bar to reflect my current navigation level, so that I can share or bookmark a specific view.

**AC**:

- AC1: Clicking "Go back" from postal-code → start clears `level` and `postalcode` URL params.

**Observed**: After clicking the in-app "Go back" button from postal-code 00100, the sidebar correctly switched to "Capital Region" but the URL retained `?level=postalcode&postalcode=00100`. State is now inconsistent — refresh would re-enter postal-code level.

**Status**: ⚠️ partial — visual state correct, URL state stale.
**Suggested fix**: `urlStore.js` should subscribe to `globalStore.level` changes and remove unrelated params on level transitions.
**Suggested test**: `tests/e2e/navigation/url-state-reset.spec.ts` — `@e2e @navigation @url-state`.

---

### US-09: Stuck loading indicators

**Source**: GitHub #680 ("Investigate and fix root causes of stuck loading indicators").

As a user, I don't want spinners that never resolve.

**AC**:

- AC1: After viewport buildings finish loading, no `loadingStore` "stale loading state" warnings remain in the console.

**Observed**: 30+ `[loadingStore] Clearing stale loading state for viewport_buildings_hsy_*` warnings on every cold load. This is the workaround firing — i.e. the underlying race condition still exists, the cleanup just hides the symptom from the UI.

**Status**: ⚠️ partial — UX is fine, but the bug-shape remains.
**Suggested fix**: Move from "clear stale state on next interaction" to "track per-tile abort signals" so the stale-state code path becomes unreachable. See `viewportBuildingLoader.js` request-cancellation pattern.
**Suggested test**: `tests/e2e/loading/no-stale-warnings.spec.ts` — capture console warns, fail if "stale loading state" appears more than 5 times. Tag `@e2e @loading`.

---

### US-10: Race condition — concurrent postal-code clicks

**Source**: GitHub #681 ("Race condition: building + heat data can merge with wrong postal code"); `architecture.md` Latest-Wins pattern.

As a user, I want my latest click to win when I click two postal codes in quick succession.

**AC**:

- AC1: Clicking postal-code A then postal-code B before A finishes loading results in B's data displayed (not a mix).

**Observed**: Could not exercise from chrome-devtools (no quick way to fire two map clicks at sub-500ms intervals). Behavior verified to use `globalStore.clickProcessingState` and `BuildingLoader.cancelCurrentLoad()` in source — but issue #681 is open so the fix has gaps.

**Status**: 🟡 unverified — needs targeted Playwright test.
**Suggested test**: `tests/e2e/navigation/race-condition.spec.ts` — drive `globalStore` directly via `page.evaluate` to simulate rapid clicks, assert final state. Tag `@e2e @navigation @race`.

---

### US-11: DataCloneError on tree-coverage toggle

**Source**: GitHub #679 (`treeCoverage` flag default-true).

As a user, toggling Trees should not crash the tab.

**AC**: AC1: Repeated toggles do not throw `DataCloneError` in console.

**Observed**: Could not toggle without Cesium hover-pick. Issue body identifies root cause: Cesium entities placed in Pinia store violate structured-clone constraints during devtools snapshot.

**Status**: 🟡 unverified in this pass — issue confirms broken.
**Suggested fix**: As per #679 — move Cesium entity refs out of Pinia.
**Suggested test**: `tests/e2e/layers/tree-coverage-toggle.spec.ts` — toggle 5× rapidly, fail on any `DataCloneError` console message. Tag `@e2e @layers @tree-coverage`.

---

### US-12: Background map switching

**Source**: `flagMetadata.ts:330-338` — `backgroundMapProviders` (default `true`); UI: "Default Map / Satellite / Terrain" group.

**AC**: AC1: Clicking each entry actually swaps the imagery layer.

**Observed**: All three list items render in LAYERS tab. Default Map is active (per visual). Did not switch due to time; tile request volume in network capture (≥120 `helsinki-wms` requests for one viewport) suggests imagery is loading correctly.

**Status**: ✅ working (UI scaffolding) — 🟡 individual switching unverified.
**Suggested test**: `tests/e2e/layers/background-maps.spec.ts` — `@e2e @layers @background-maps`.

---

### US-13: Land Cover & NDVI data layer toggles

**Source**: `flagMetadata.ts:117-125` (landCover, default `true`), `:80-89` (ndvi, default `true`).

**AC**: AC1: Both checkboxes appear under "Data Layers" with their respective flags enabled.

**Observed**: Both checkboxes present at start level under "Data Layers". They appear toggleable; visual effect not exercised this pass.

**Status**: ✅ working at the toggle-presence layer.

---

### US-14: Building filters (Public, Tall)

**Source**: ControlPanel.vue under "Building Filters" group.

**AC**: AC1: "Public Buildings" and "Tall Buildings" checkboxes filter the building entities at postal-code level.

**Observed**: Both checkboxes present at start level; tooltip "Show only public and municipal buildings" confirms binding. Did not exercise filter at postal-code level.

**Status**: ✅ working (presence) — 🟡 filter behavior unverified.

---

### US-15: Statistical Grid view (Climate Adaptation)

**Source**: `flagMetadata.ts:220-228` — `coolingOptimizer` (default `true`).

As an analyst in Statistical Grid view, I want the Climate Adaptation expansion panel with cooling-center optimizer.

**Observed**: Did not switch to Grid view this pass — capability untested. UI button ("Statistical Grid view") present at start level.

**Status**: 🟡 unverified.
**Suggested test**: `tests/e2e/grid-view/cooling-optimizer.spec.ts` — `@e2e @grid-view @climate-adaptation`.

---

### US-16: Map-click loading overlay

**Source**: `flagMetadata.ts:285-293` — `mapClickLoadingOverlay` (default `false`).

**AC**: AC1: With flag overridden to `true`, navigating to a postal code shows a loading overlay with progress.

**Observed**: Default-off; not visible. With GOFF down (US-02), there is no way for an end user to enable this in beta — the flag panel can only mutate localStorage overrides which the provider may or may not honor when `READY` state isn't reached.

**Status**: 🟡 unverified — gated by US-02 fix.

---

### US-17: Sentry error tracking

**Source**: `flagMetadata.ts:296-311` — `sentryErrorTracking` requires `VITE_SENTRY_DSN`.

**AC**: AC1: Errors fire to Sentry envelope endpoint.

**Observed**: `POST https://o1161048.ingest.us.sentry.io/.../envelope/ → 200` on initial load — Sentry DSN is configured and reachable. 48 unresolved issues recorded — Sentry capture is healthy.

**Status**: ✅ working.

---

### US-18: Building-level "Building Heat Data" / "Building Properties"

**Source**: `docs/prd/heat-exposure-analysis.md`; UI selectors documented in CLAUDE.md.

**Observed**: Did not reach building level in this pass — area click was used (search-driven). This story remains tested by `comprehensive-walkthrough.spec.ts` and `building-fill-regression.spec.ts`.

**Status**: 🟡 unverified this pass — covered by existing E2E.

---

### US-19: Performance — N+1 and large payloads

**Source**: GitHub #687.

**Observed**: Sentry surfaces 7172 combined events across 4 unresolved issues. The viewport-streaming load fans out one fetch per 1km×1km tile (`bbox=24.94,60.21,24.95,60.22`, etc.), resulting in dozens of parallel requests within 1s of camera idle. Plus 8 other `GET .../paavo` and `GetHierarchicalMapLayerGroups` requests fire twice (reqid=50/61, 58/60) — duplicated requests, no shared promise.

**Status**: ⚠️ ongoing performance debt (tracked by #687). 95th-percentile postal-code-click target (5s) likely missed — `performance_start_trace` not run this pass.

**Suggested fix**: Coalesce duplicate same-URL fetches via a request map; consider tile-level `Promise.race`-with-cancel pattern. Already partially in `cacheWarmer.js`.

---

### US-20: View-mode switch (Capital Region ↔ Statistical Grid)

**Source**: ControlPanel.vue — Capital Region view button vs Statistical Grid view button.

**Observed**: Both buttons present at start level; not exercised this pass.

**Status**: ✅ working (presence) — 🟡 effect unverified.

---

## Drift Summary

| Status        | Count | User Stories                                                  |
| ------------- | ----- | ------------------------------------------------------------- |
| ✅ working    | 4     | US-13, US-14 (presence), US-17, US-20 (presence)              |
| ⚠️ partial    | 3     | US-01, US-08, US-09                                           |
| ❌ broken     | 5     | US-02, US-03, US-04, US-05, US-06, US-07                      |
| 🟡 unverified | 8     | US-10, US-11, US-12, US-15, US-16, US-18, US-19 (signal-only) |

The headline drift is **US-02 → US-04, -05, -06**: the GOFF service is unreachable in beta, so flag plumbing collapses to compile-time defaults. Three default-true analysis tools are not surfaced even with their fallback defaults set to `true` — that means there's also a flag-binding bug in the ANALYSIS tab itself, independent of GOFF.

US-03 and US-07 are visible to every user on every postal-code navigation and are the most user-facing pain.

## Suggested PR Sequencing

Each row is one PR, sized for one-shot review.

1. **`fix: header breadcrumb falls back when city prefix is unset` (US-03)** — single-file fix, immediate win.
2. **`fix: AreaProperties binds at postal-code level, not just building level` (US-07)** — DETAILS tab regression.
3. **`fix: ANALYSIS tab honors heat/ndvi/scatter feature flag defaults` (US-04/-05/-06)** — verify gating logic in ControlPanel.vue.
4. **`fix: clear postal-code URL params on back-to-start navigation` (US-08)** — `urlStore.js` watcher fix.
5. **`fix: persist disclaimer dismissal in localStorage` (US-01)** — small UX win.
6. **`ops: investigate /feature-flags/health 502 in beta cluster` (US-02)** — probably a deploy/infra issue, separate from app code; track via infrastructure repo.
7. Performance debt (US-19) and the race-condition tests (US-10) get their own dedicated regression suites — see Phase 5.

## Follow-up issues

| Story           | Issue                                                                                  | Title                                                                                          |
| --------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| US-02           | [#715](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/715)            | ops: GOFF /feature-flags/health returns 502 on beta                                            |
| US-03           | [#711](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/711)            | fix: postal-code breadcrumb renders "undefined" prefix                                         |
| US-04, -05, -06 | [#712](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/712)            | fix: ANALYSIS tab missing Heat Histogram / NDVI Analysis / Building Scatter Plot               |
| US-07           | [#713](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/713)            | fix: AreaProperties stays empty at postal-code level                                           |
| US-08           | [#714](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/714)            | fix: URL state retains postal-code params after back-navigation to start                       |
| US-09           | [#680](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/680) (existing) | Investigate and fix root causes of stuck loading indicators — commented with 2026-W19 evidence |

## Tests added in this pass

`tests/e2e/audit-2026-W19/postal-code-breadcrumb.spec.ts` — covers US-03 / #711.

## Next-pass watch list

- After GOFF is restored, re-verify US-04, US-05, US-06 — those may turn out to be data-level (provider returning `false` despite default `true`) instead of UI-level (gate bug).
- Drive an `evaluate_script` postal-code race test once `globalStore` is exposed on `window.__pinia` in beta builds (currently not exposed).
- Run `mcp__chrome-devtools__performance_start_trace` against the postal-code click to actually quantify the 5s 95th-percentile target from `feature-picker-navigation.md`.
