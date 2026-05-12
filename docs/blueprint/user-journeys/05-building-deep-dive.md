---
id: JOURNEY-05-BUILDING-DEEP-DIVE
title: Building deep-dive — heat data + properties
stories: [US-11, US-18]
persona: Emma (Climate Researcher)
audit: ../audits/2026-W19-user-stories.md
---

# Journey 5 — Drill from postal code to a single building

Emma already landed at postal code 00100 (Journey 2). She now wants to validate one building's heat exposure by clicking it, opening "Building Heat Data" and "Building Properties". This is the deepest level of the navigation hierarchy and the one most likely to surface state-coordination bugs (US-11 `DataCloneError` on tree-coverage toggle is the open example).

The audit could not reach building level in chrome-devtools because picking a Cesium polygon requires the building datasource to be loaded — the journey codifies the prerequisites the test must wait for.

## Persona satisfaction journey

```mermaid
journey
    title Building drill-down (Emma)
    section Prerequisites
      Buildings datasource loaded: 4: Emma, Cesium
      Canvas has valid dims: 5: Emma
    section Select a building
      Click building polygon (or store drill): 4: Emma
      Banner updates to building level: 5: Emma
    section Inspect
      Click Building Heat Data: 5: Emma
      Timeline appears with samples: 4: Emma
      Click Building Properties: 5: Emma
      Properties panel shows fields: 5: Emma
    section Layer stability
      Toggle Trees 5x: 2: Emma
      No DataCloneError: 1: Emma
```

## Flow & assertions

```mermaid
flowchart TD
    A[At postalCode level, 00100] --> B{Buildings datasource has entities?}
    B -- no --> X0[FAIL prerequisite — buildings did not load]
    B -- yes --> C[drillToLevel building via store method]
    C --> D{globalStore.level == 'building'?}
    D -- no --> X1[FAIL building drill]
    D -- yes --> E{Banner / sidebar reflect building name?}
    E -- no --> X2[FAIL building breadcrumb]
    E -- yes --> F{'Building Heat Data' button visible?}
    F -- no --> X3[FAIL US-18 heat button]
    F -- yes --> G[Click Building Heat Data]
    G --> H{Timeline #heatTimeseriesContainer attached?}
    H -- no --> X4[FAIL US-18 timeline render]
    H -- yes --> I{'Building Properties' button visible?}
    I -- no --> X5[FAIL US-18 properties button]
    I -- yes --> J[Toggle Trees layer 5 times]
    J --> K{Any console error matches /DataCloneError/?}
    K -- yes --> X6[FAIL US-11 #679]
    K -- no --> L[Done]

    classDef fail fill:#fdd,stroke:#a00;
    class X0,X1,X2,X3,X4,X5,X6 fail;
```

## Coverage

| Step                       | Story      | Assertion                                                                                    | Test                                            |
| -------------------------- | ---------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Buildings datasource ready | structural | `viewer.dataSources` has a "Buildings " entry with entities                                  | reused from CLAUDE.md guidance                  |
| Drill to building          | US-18      | `globalStore.level === 'building'`                                                           | `journey-5-building` (new)                      |
| Heat Data button           | US-18      | `getByRole('button', { name: 'Building Heat Data' })` visible (exact casing)                 | `journey-5-building`                            |
| Timeline renders           | US-18      | `#heatTimeseriesContainer` is attached                                                       | `journey-5-building`                            |
| Properties button          | US-18      | `getByRole('button', { name: 'Building Properties' })` visible                               | `journey-5-building`                            |
| Tree toggle stability      | US-11      | toggle Trees 5× with `dispatchEvent`, fail if any console message matches `/DataCloneError/` | `journey-5-building` — expected fail until #679 |
