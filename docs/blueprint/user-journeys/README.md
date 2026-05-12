---
id: USER-JOURNEYS-2026-W19
title: User journeys derived from AUDIT-2026-W19
status: draft
date: 2026-05-11
source_audit: ../audits/2026-W19-user-stories.md
---

# R4C Cesium Viewer — User Journeys

These journeys turn the 20 user stories captured in [AUDIT-2026-W19](../audits/2026-W19-user-stories.md) into testable flows. Each journey markdown contains:

1. A Mermaid **journey** diagram showing how the persona's satisfaction drops at known broken / partial steps (score 5 ≈ ✅, 3 ≈ ⚠️, 1 ≈ ❌, 2 ≈ 🟡 unverified).
2. A Mermaid **flowchart** mapping each step to the UI assertion that proves the step works.
3. A **coverage table** linking story ID → journey step → existing or proposed test.

The flowcharts are the contract for `tests/e2e/audit-2026-W19/user-journeys.spec.ts` — every diamond/box with an assertion label should map to an `expect(...)` call in that spec.

## Personas

Lifted verbatim from `docs/prd/feature-picker-navigation.md`:

- **Dr. Emma Virtanen — Climate Researcher.** Drills region → postal code → building to validate heat-exposure values across several neighborhoods in one session.
- **Mika Laaksonen — Policy Analyst.** Explores multiple postal codes side-by-side to find intervention targets, then hops back to compare adjacent zones.

The two personas share most surfaces; Emma's journey emphasises detail panels (DETAILS / Building Heat Data), Mika's emphasises rapid context switching (back-nav, race conditions, view switching).

## Journey index

| #   | Journey                                         | Persona | Stories covered                                 | File                                                       |
| --- | ----------------------------------------------- | ------- | ----------------------------------------------- | ---------------------------------------------------------- |
| 1   | Onboarding & first load                         | Both    | US-01, US-02, US-09, US-17                      | [01-onboarding.md](01-onboarding.md)                       |
| 2   | Region → postal code drill-down with analysis   | Emma    | US-03, US-04, US-05, US-06, US-07, US-09, US-19 | [02-postal-code-drilldown.md](02-postal-code-drilldown.md) |
| 3   | Back navigation to region                       | Mika    | US-08                                           | [03-back-navigation.md](03-back-navigation.md)             |
| 4   | View switch (Capital Region ↔ Statistical Grid) | Mika    | US-12, US-13, US-14, US-15, US-20               | [04-view-switch.md](04-view-switch.md)                     |
| 5   | Building deep-dive (heat data + properties)     | Emma    | US-11, US-18                                    | [05-building-deep-dive.md](05-building-deep-dive.md)       |
| 6   | Race condition — rapid postal-code clicks       | Mika    | US-10                                           | [06-race-condition.md](06-race-condition.md)               |

## Test mapping

The spec `tests/e2e/audit-2026-W19/user-journeys.spec.ts` walks each journey in order and asserts every step's expected outcome. Each `cesiumTest` block is named after the journey number and persona (e.g. `journey-2: Emma drills to postal code 00100 and runs analysis tools`) so test failures point straight back to the diagram that defined the contract.

Steps that the audit marks ❌ are still encoded as positive assertions in the spec — the spec is expected to fail until the linked issue (#711 / #712 / #713 / #714) is fixed, which is what makes it a regression contract. Failing journey steps must reference their issue number in the spec comment.
