---
id: JOURNEY-01-ONBOARDING
title: Onboarding & first load
stories: [US-01, US-02, US-09, US-17]
persona: both
audit: ../audits/2026-W19-user-stories.md
---

# Journey 1 — Onboarding & first load

The persona arrives at `https://r4c-beta.dataportal.fi/`. Before any analysis they must:

1. Dismiss the disclaimer (only once per "reasonable window").
2. See an interactive map (Cesium ready, default imagery loaded).
3. Trust that feature flags are live (GOFF `READY`, not silently falling back to compile-time defaults).
4. Trust that the loading indicator settles — no stuck spinners.
5. Have error monitoring active (Sentry envelope POST succeeds).

## Persona satisfaction journey

```mermaid
journey
    title First-load journey (R4C beta v1.48.0)
    section Arrival
      Open r4c-beta.dataportal.fi: 5: User
      See disclaimer modal: 3: User
      Dismiss disclaimer: 3: User
    section App ready
      Cesium canvas paints: 5: User
      Default imagery loads: 5: User
      Loading indicator settles: 3: User, App
    section Trust signals
      Feature-flag provider READY: 1: User, GOFF
      Sentry capture healthy: 5: App
```

## Flow & assertions

```mermaid
flowchart TD
    A[Navigate to /] --> B{Disclaimer modal visible?}
    B -- yes --> C[Click 'Acknowledge']
    B -- no --> D[Skip]
    C --> E{r4c_disclaimer_acknowledged_at in localStorage?}
    D --> F[Cesium canvas paints]
    E -- yes --> F
    E -- no --> X1[FAIL US-01 #unfiled]
    F --> G{window.__viewer set?}
    G -- no --> X2[FAIL Cesium init]
    G -- yes --> H{/feature-flags/health 2xx?}
    H -- no --> X3[FAIL US-02 #715]
    H -- yes --> I{Console: no stuck loading warnings?}
    I -- no --> X4[FAIL US-09 #680]
    I -- yes --> J{Sentry envelope POST 200?}
    J -- no --> X5[FAIL US-17]
    J -- yes --> K[Ready for analysis]

    classDef fail fill:#fdd,stroke:#a00;
    class X1,X2,X3,X4,X5 fail;
```

## Coverage

| Step                            | Story      | Assertion                                                                                         | Test                                                    |
| ------------------------------- | ---------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Disclaimer present on cold load | US-01      | `[role="dialog"]` with "Demo only" text is attached                                               | `onboarding-first-load` (new)                           |
| Dismissal persists              | US-01      | After click + reload, modal NOT attached and `localStorage.r4c_disclaimer_acknowledged_at` is set | `onboarding-first-load` (new) — expected fail until fix |
| GOFF reachable                  | US-02      | Network: no `5xx` on `**/feature-flags/health`                                                    | `onboarding-first-load` — expected fail until #715      |
| Cesium ready                    | structural | `window.__viewer` truthy and canvas has non-zero dims                                             | covered by `cesium-fixture`                             |
| No stuck loading                | US-09      | Console warns matching `/stale loading state/i` ≤ 5 within 10s of idle                            | `onboarding-first-load`                                 |
| Sentry healthy                  | US-17      | At least one `POST **/ingest.us.sentry.io/**/envelope/` returns 2xx                               | `onboarding-first-load`                                 |
