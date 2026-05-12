---
id: JOURNEY-04-VIEW-SWITCH
title: View switch — Capital Region ↔ Statistical Grid
stories: [US-12, US-13, US-14, US-15, US-20]
persona: Mika (Policy Analyst)
audit: ../audits/2026-W19-user-stories.md
---

# Journey 4 — Switch between Capital Region and Statistical Grid

Mika scans Helsinki at the regional level using two complementary views: the Capital Region (postal-code polygons) and the Statistical Grid (250 m raster). He toggles data layers and filters in each, and expects the Climate Adaptation panel to appear when he's in Grid view.

This journey is mostly ✅ at the presence layer but every individual toggle's downstream effect remains 🟡 unverified in the audit. The flow encodes the structural expectations so a future regression won't silently break the panel scaffolding.

## Persona satisfaction journey

```mermaid
journey
    title View switching (Mika)
    section Capital Region view
      Land in Capital Region: 5: Mika
      See Land Cover toggle: 5: Mika
      See NDVI toggle: 5: Mika
      See building filters: 5: Mika
    section Background maps
      Open Background Maps panel: 5: Mika
      Switch to Satellite: 4: Mika
    section Statistical Grid view
      Click Statistical Grid view: 5: Mika
      See Climate Adaptation panel: 5: Mika
      See Grid Options: 5: Mika
      Cooling optimizer reachable: 2: Mika
```

## Flow & assertions

```mermaid
flowchart TD
    A[App loaded, level=start, view=capitalRegion] --> B{NDVI toggle visible?}
    B -- no --> X1[FAIL US-13 NDVI presence]
    B -- yes --> C{Land Cover toggle visible?}
    C -- no --> X2[FAIL US-13 Land Cover presence]
    C -- yes --> D{Public Buildings filter visible?}
    D -- no --> X3[FAIL US-14 public filter]
    D -- yes --> E{Tall Buildings filter visible?}
    E -- no --> X4[FAIL US-14 tall filter]
    E -- yes --> F{Background Maps group visible with 3 options?}
    F -- no --> X5[FAIL US-12 background scaffolding]
    F -- yes --> G[Click Statistical Grid view]
    G --> H{globalStore.view == 'grid' OR currentView updated?}
    H -- no --> X6[FAIL US-20 view switch]
    H -- yes --> I{Climate Adaptation panel visible?}
    I -- no --> X7[FAIL US-15 coolingOptimizer]
    I -- yes --> J{Grid Options visible?}
    J -- no --> X8[FAIL US-15 grid options]
    J -- yes --> K[Switch back to Capital Region]
    K --> L{Climate Adaptation hidden again?}
    L -- no --> X9[FAIL view-scoped panel bleed]
    L -- yes --> M[Done]

    classDef fail fill:#fdd,stroke:#a00;
    class X1,X2,X3,X4,X5,X6,X7,X8,X9 fail;
```

## Coverage

| Step                                   | Story | Assertion                                                                 | Test                                                      |
| -------------------------------------- | ----- | ------------------------------------------------------------------------- | --------------------------------------------------------- |
| NDVI toggle present                    | US-13 | `getByText('NDVI', { exact: true })` visible                              | `journey-4-view-switch` (new)                             |
| Land Cover toggle present              | US-13 | `getByText('Land Cover')` visible                                         | `journey-4-view-switch`                                   |
| Building filters present               | US-14 | `getByText('Public Buildings')` and `getByText('Tall Buildings')` visible | `journey-4-view-switch`                                   |
| Background Maps options                | US-12 | "Default Map", "Satellite", "Terrain" entries visible                     | `journey-4-view-switch`                                   |
| View switch                            | US-20 | After click, `globalStore.view` (or equivalent) reads `grid`              | `journey-4-view-switch`                                   |
| Climate Adaptation appears in grid     | US-15 | `getByText('Climate Adaptation')` visible only when view === 'grid'       | overlaps `verifyPanelVisibility({ currentView: 'grid' })` |
| Climate Adaptation hidden outside grid | US-15 | not-visible when view === 'capitalRegion'                                 | `journey-4-view-switch`                                   |
