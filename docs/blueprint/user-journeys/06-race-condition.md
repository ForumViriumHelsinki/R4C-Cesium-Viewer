---
id: JOURNEY-06-RACE-CONDITION
title: Race condition — rapid postal-code clicks
stories: [US-10]
persona: Mika (Policy Analyst)
audit: ../audits/2026-W19-user-stories.md
related_issue: https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/681
---

# Journey 6 — Latest-wins under rapid clicks

Mika clicks postal code A then postal code B before A finishes loading. The architecture promises **latest-wins** via three coordinated mechanisms (see `.claude/rules/architecture.md`):

1. `BuildingLoader.cancelCurrentLoad()` aborts the in-flight request.
2. `globalStore.pendingNavigation` queues the most-recent click.
3. `toggleStore.onEnterPostalCode()` keeps grid visibility consistent across the transition.

The audit could not exercise this from chrome-devtools because there's no deterministic way to fire two map clicks at sub-500 ms intervals from the MCP. The journey defines the Playwright recipe that proves the contract via direct store manipulation.

## Persona satisfaction journey

```mermaid
journey
    title Rapid clicks — latest wins (Mika)
    section Click A
      Click postal code A: 5: Mika
      Loader begins fetching A: 4: Mika, Loader
    section Click B before A finishes
      Click postal code B at <300ms: 5: Mika
      A request cancelled: 5: Loader
      pendingNavigation queued: 5: Store
    section Settle
      Camera flies to B (not A): 5: Mika
      DETAILS reflects B: 5: Mika
      No console errors: 4: Mika
```

## Flow & sequence

The flow is best shown as a sequence diagram because it has to encode _time_ between the two clicks.

```mermaid
sequenceDiagram
    autonumber
    actor Mika
    participant UI as CesiumViewer
    participant Loader as BuildingLoader
    participant Store as globalStore
    Mika->>UI: Click polygon A (00100)
    UI->>Store: setLevel('postalCode'), setPostalCode('00100')
    UI->>Loader: load('00100')
    Note over Loader: isProcessing=true, AbortController created
    Mika->>UI: Click polygon B (00120) at t<300ms
    UI->>Store: isProcessing? yes → setPendingNavigation(B)
    UI->>Loader: cancelCurrentLoad()
    Loader-->>UI: abort('00100')
    Note over Loader: isProcessing=false
    UI->>Store: consumePendingNavigation() → {postalCode:'00120'}
    UI->>Loader: load('00120')
    Loader-->>Store: success — postalCode='00120'
    UI-->>Mika: Banner shows '00120'
```

## Flow & assertions

```mermaid
flowchart TD
    A[At level=start] --> B[Fire setLevel postalCode 00100 via store]
    B --> C{clickProcessingState.isProcessing == true?}
    C -- no --> X1[FAIL processing flag not set]
    C -- yes --> D[Within 300ms fire setLevel postalCode 00120]
    D --> E{globalStore.pendingNavigation populated OR direct switch to 00120?}
    E -- no --> X2[FAIL US-10 #681 pending-nav drop]
    E -- yes --> F[Wait for navigation settle]
    F --> G{globalStore.postalCode == '00120'?}
    G -- no --> X3[FAIL US-10 #681 wrong winner]
    G -- yes --> H{Banner contains 00120 zone name?}
    H -- no --> X4[FAIL US-10 banner mismatch]
    H -- yes --> I{No console errors during transition?}
    I -- no --> X5[FAIL US-10 console errors]
    I -- yes --> J[Done — latest wins]

    classDef fail fill:#fdd,stroke:#a00;
    class X1,X2,X3,X4,X5 fail;
```

## Test recipe (direct store manipulation)

The audit notes Cesium picking is unreliable for sub-500 ms double clicks, so the spec uses the **store method** (`drillToLevel('postalCode', '00100', { method: 'store' })`). To simulate the race, fire two `setNavigationLevel` calls back-to-back inside the same `page.evaluate` block so they both land before any reactive watcher can settle.

```typescript
await cesiumPage.evaluate(() => {
	const store = (window as any).globalStore;
	store.setLevel('postalCode');
	store.setPostalCode('00100');
	// Race: same tick, second update should win
	store.setLevel('postalCode');
	store.setPostalCode('00120');
});
```

## Coverage

| Step                                         | Story | Assertion                                                                     | Test                                           |
| -------------------------------------------- | ----- | ----------------------------------------------------------------------------- | ---------------------------------------------- | ---------------- |
| First navigation creates processing flag     | US-10 | `clickProcessingState.isProcessing === true` after first call                 | `journey-6-race` (new)                         |
| Second click queues pending or wins directly | US-10 | After both calls, `pendingNavigation` is non-null or `postalCode === '00120'` | `journey-6-race` — expected to fail until #681 |
| Latest wins                                  | US-10 | After settle, `postalCode === '00120'`                                        | `journey-6-race`                               |
| No errors during transition                  | US-10 | `pageerror` listener captures nothing matching `/cannot read                  | undefined/i`                                   | `journey-6-race` |
