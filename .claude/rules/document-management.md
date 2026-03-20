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

## Document Organization

| Type | Location    | Naming                                                               |
| ---- | ----------- | -------------------------------------------------------------------- |
| PRD  | `docs/prd/` | `kebab-case.md` (e.g., `feature-picker-navigation.md`)               |
| ADR  | `docs/adr/` | `ADR-NNN-description.md` (e.g., `ADR-001-progressive-rendering.md`)  |
| PRP  | `docs/prp/` | `PRP-NNN-description.md` (e.g., `PRP-001-parallel-data-fetching.md`) |

## Cross-References

When creating documents, link related artifacts:

- PRDs should reference relevant ADRs for architectural context
- PRPs should reference the PRD they implement
- ADRs should reference the PRD that motivated the decision
