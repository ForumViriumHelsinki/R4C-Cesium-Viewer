# Document Management

## Automatic Decision Detection

When conversations contain decisions worth preserving, prompt to create the appropriate document:

### Architecture Decisions → ADR

Trigger when discussion involves:

- Technology choices or trade-offs
- Pattern selection (caching strategy, state management approach)
- Performance vs. maintainability decisions
- Breaking changes to existing architecture

Action: Suggest creating an ADR in `docs/adr/` using the template at `docs/adr/TEMPLATE.md`

### Feature Requirements → PRD

Trigger when discussion involves:

- New feature specifications or scope definition
- User-facing behavior changes
- Acceptance criteria being discussed
- Feature priorities or phasing

Action: Suggest creating or updating a PRD in `docs/prd/`

### Implementation Plans → PRP

Trigger when discussion involves:

- Multi-step implementation strategies
- Complex refactoring approaches
- Performance optimization plans
- Migration or upgrade procedures

Action: Suggest creating a PRP in `docs/prp/`

### User Flow Contracts → User Journey

Trigger when discussion involves:

- A multi-step user flow with assertions per step (drill-down, back-nav, view switch, etc.)
- An audit finding that needs to be turned into a regression spec
- A persona-grounded walkthrough that should drive UX test design

Action: Suggest creating a journey under `docs/blueprint/user-journeys/`. Each journey is one markdown file containing a Mermaid `journey` diagram (persona satisfaction per step) and a Mermaid `flowchart` whose decision nodes map 1:1 to `expect(...)` calls in the matching spec. The methodology is **audit → user stories → journeys → spec** — each layer narrows the contract until every diamond in a flowchart is a test assertion.

## Document Organization

| Type         | Location                        | Naming                                                               |
| ------------ | ------------------------------- | -------------------------------------------------------------------- |
| PRD          | `docs/prd/`                     | `kebab-case.md` (e.g., `feature-picker-navigation.md`)               |
| ADR          | `docs/adr/`                     | `ADR-NNN-description.md` (e.g., `ADR-001-progressive-rendering.md`)  |
| PRP          | `docs/prp/`                     | `PRP-NNN-description.md` (e.g., `PRP-001-parallel-data-fetching.md`) |
| User Journey | `docs/blueprint/user-journeys/` | `NN-kebab-case.md` (e.g., `02-postal-code-drilldown.md`)             |

## Cross-References

When creating documents, link related artifacts:

- PRDs should reference relevant ADRs for architectural context
- PRPs should reference the PRD they implement
- ADRs should reference the PRD that motivated the decision
- User Journeys should reference the audit and stories they derive from, and the spec file that enforces them
