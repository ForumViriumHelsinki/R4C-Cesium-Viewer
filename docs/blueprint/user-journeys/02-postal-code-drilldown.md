---
id: JOURNEY-02-POSTAL-CODE-DRILLDOWN
title: Region → postal code drill-down with analysis
stories: [US-03, US-04, US-05, US-06, US-07, US-09, US-19]
persona: Emma (Climate Researcher)
audit: ../audits/2026-W19-user-stories.md
---

# Journey 2 — Drill into postal code 00100 and run analysis

Emma wants to validate heat exposure for a single postal code (00100, Helsinki Keskusta — Etu-Töölö). She:

1. Searches for `00100` (deterministic equivalent to clicking the polygon).
2. Reads the breadcrumb to confirm the area.
3. Inspects DETAILS tab for demographic context.
4. Opens ANALYSIS tab and runs Heat Histogram, NDVI Analysis, and Building Scatter Plot.

This journey concentrates the bulk of audit failures (US-03, US-04, US-05, US-06, US-07). Until those are fixed, the spec is expected to fail on those exact assertions — that is the point.

## Persona satisfaction journey

```mermaid
journey
    title Postal-code drill-down (Emma)
    section Locate
      Type 00100 in search: 5: Emma
      Submit search: 5: Emma
    section Land at zone
      Camera flies to area: 5: Emma, Cesium
      Buildings render: 5: Emma, Cesium
      Breadcrumb says zone name: 1: Emma
    section Read DETAILS
      Open DETAILS tab: 4: Emma
      See population & building count: 1: Emma
    section Run ANALYSIS
      Open ANALYSIS tab: 4: Emma
      Click Heat Histogram: 1: Emma
      Click NDVI Analysis: 1: Emma
      Click Building Scatter Plot: 1: Emma
```

## Flow & assertions

```mermaid
flowchart TD
    A[Open app, dismiss disclaimer] --> B[Search '00100' via Search & Navigate]
    B --> C{globalStore.level == 'postalCode'?}
    C -- no --> X0[FAIL navigation orchestration]
    C -- yes --> D{Banner contains 'Helsinki Keskusta' or 'Etu-Töölö' or '00100'?}
    D -- no --> X1[FAIL US-03 race-condition guard]
    D -- yes --> E{Banner free of literal 'undefined'?}
    E -- no --> X2[FAIL US-03 #711]
    E -- yes --> F{Sidebar header free of 'undefined'?}
    F -- no --> X3[FAIL US-03 #711 sidebar]
    F -- yes --> G[Open DETAILS tab]
    G --> H{Properties count > 0?}
    H -- no --> X4[FAIL US-07 #713]
    H -- yes --> I[Open ANALYSIS tab]
    I --> J{Heat Histogram button visible?}
    J -- no --> X5[FAIL US-04 #712]
    J -- yes --> K{NDVI Analysis button visible?}
    K -- no --> X6[FAIL US-05 #712]
    K -- yes --> L{Building Scatter Plot button visible?}
    L -- no --> X7[FAIL US-06 #712]
    L -- yes --> M{TimelineCompact attached?}
    M -- no --> X8[FAIL temporal control]
    M -- yes --> N[Ready for building-level drill-down]

    classDef fail fill:#fdd,stroke:#a00;
    class X0,X1,X2,X3,X4,X5,X6,X7,X8 fail;
```

## Performance budget (US-19)

```mermaid
flowchart LR
    submit(User submits search) --> wait(Camera fly + data load)
    wait --> ready(Banner and buildings ready)
    submit -. p95 5s budget .-> ready
```

The spec records `Date.now()` between the search submit and the moment `globalStore.level === 'postalCode'`. Recorded in the test report for monitoring but **not asserted** (issue #687 is open and the 5s target will fail today).

## Coverage

| Step                            | Story      | Assertion                                                          | Test                                             |
| ------------------------------- | ---------- | ------------------------------------------------------------------ | ------------------------------------------------ | -------- | ---------------------------------------------------------- |
| Search reaches postalCode level | navigation | `window.globalStore.level === 'postalCode'` within 10s             | `journey-2-drilldown` (new)                      |
| Breadcrumb has zone name        | US-03      | banner contains `/Helsinki Keskusta                                | Etu-Töölö                                        | 00100/i` | `audit-2026-W19/postal-code-breadcrumb.spec.ts` (existing) |
| Breadcrumb has no 'undefined'   | US-03      | banner does NOT contain `/\bundefined\b/i`                         | existing                                         |
| DETAILS populated               | US-07      | DETAILS region text does NOT contain "0 properties"                | `journey-2-drilldown` — expected fail until #713 |
| Heat Histogram button           | US-04      | `getByRole('button', { name: /heat histogram/i })` is visible      | `journey-2-drilldown` — expected fail until #712 |
| NDVI Analysis button            | US-05      | `getByRole('button', { name: /ndvi analysis/i })` is visible       | `journey-2-drilldown` — expected fail until #712 |
| Building Scatter Plot button    | US-06      | `getByRole('button', { name: /scatter/i })` is visible             | `journey-2-drilldown` — expected fail until #712 |
| TimelineCompact attached        | structural | `.timeline-compact` is attached (not toBeVisible — responsive CSS) | `journey-2-drilldown`                            |
| 95p drilldown latency           | US-19      | record only — issue #687                                           | `journey-2-drilldown`                            |
