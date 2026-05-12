---
id: JOURNEY-03-BACK-NAVIGATION
title: Back navigation to region
stories: [US-08]
persona: Mika (Policy Analyst)
audit: ../audits/2026-W19-user-stories.md
---

# Journey 3 — Back from postal code to region

Mika is comparing adjacent postal codes. After looking at 00100 he clicks "Go back" expecting to return to the Capital Region overview **and** to have the URL bar reflect that — so he can bookmark or share the region view.

The audit found this fails: the visual state goes back but the URL retains `?level=postalcode&postalcode=00100`, and a page reload would re-enter postal-code level.

## Persona satisfaction journey

```mermaid
journey
    title Back-to-region (Mika)
    section Drill in
      Navigate to 00100: 5: Mika
      Banner shows zone: 5: Mika
    section Go back
      Click Go back: 5: Mika
      Sidebar shows Capital Region: 5: Mika
      Banner clears: 4: Mika
    section Verify URL
      Reload page returns to Region: 1: Mika
      URL params cleared: 1: Mika
```

## Flow & assertions

```mermaid
flowchart TD
    A[Drill to postal code 00100] --> B{URL contains ?level=postalcode?}
    B -- yes --> C[Click 'Go back' / reset]
    B -- no --> X0[FAIL setup]
    C --> D{globalStore.level == 'start'?}
    D -- no --> X1[FAIL back action did not fire]
    D -- yes --> E{Sidebar shows 'Capital Region'?}
    E -- no --> X2[FAIL sidebar restoration]
    E -- yes --> F{URL still contains level=postalcode?}
    F -- yes --> X3[FAIL US-08 #714]
    F -- no --> G{URL still contains postalcode=00100?}
    G -- yes --> X4[FAIL US-08 #714 lingering postal param]
    G -- no --> H[Reload the page]
    H --> I{globalStore.level == 'start' after reload?}
    I -- no --> X5[FAIL deep-link consistency]
    I -- yes --> J[Bookmark/share works correctly]

    classDef fail fill:#fdd,stroke:#a00;
    class X0,X1,X2,X3,X4,X5 fail;
```

## Coverage

| Step                           | Story | Assertion                                                      | Test                                            |
| ------------------------------ | ----- | -------------------------------------------------------------- | ----------------------------------------------- |
| Drill to 00100 then back-nav   | US-08 | After back, `globalStore.level === 'start'`                    | `journey-3-back-nav` (new)                      |
| URL `level` param cleared      | US-08 | `new URL(page.url()).searchParams.has('level') === false`      | `journey-3-back-nav` — expected fail until #714 |
| URL `postalcode` param cleared | US-08 | `new URL(page.url()).searchParams.has('postalcode') === false` | `journey-3-back-nav` — expected fail until #714 |
| Reload preserves intent        | US-08 | After `page.reload()`, `globalStore.level === 'start'`         | `journey-3-back-nav`                            |
