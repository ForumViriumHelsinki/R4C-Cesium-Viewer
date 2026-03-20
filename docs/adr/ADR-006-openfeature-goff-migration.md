# ADR-006: OpenFeature SDK with GO Feature Flag Migration

## Status

Accepted

## Date

2025-10-01

## Context

The application used a custom feature flag system with hardcoded defaults and localStorage overrides. This approach had several limitations:

- No centralized flag management — flags scattered across Pinia store definitions
- No way to change flags without code deployment
- No gradual rollout or targeting capabilities
- Flag state not visible to operations team
- Testing feature combinations required manual localStorage manipulation

The project needed a standards-based feature flag system that could support remote flag management while maintaining the ability to work offline/locally with sensible defaults.

**Git evidence:**

- `8d195de` refactor(feature-flags): migrate to OpenFeature SDK with GOFF relay
- `00cd57e` refactor(feature-flags): migrate to OpenFeature SDK with GOFF relay (#583)
- `d9e95a2` feat(feature-flags): audit and cleanup feature flag system (#556)

## Decision

Migrate to **OpenFeature SDK** with **GO Feature Flag (GOFF)** as the backend provider:

1. **OpenFeature SDK**: Vendor-neutral API for feature flag evaluation, providing a standard interface regardless of backend
2. **GOFF Relay Proxy**: Lightweight self-hosted relay proxy deployed alongside the application in Kubernetes, reading flag configuration from YAML
3. **Fallback defaults**: Each flag defines a `fallbackDefault` in `flagMetadata` within the Pinia store, used when the relay is unavailable
4. **Feature Flags Panel**: Development UI panel for viewing and overriding flag states locally

## Consequences

### Positive

- Standards-based API (OpenFeature) — can swap providers without code changes
- Self-hosted GOFF relay — no vendor lock-in or SaaS dependency
- Flag configuration as YAML in git — auditable, reviewable changes
- Graceful degradation with fallback defaults when relay is unavailable
- Developer panel for local testing and flag exploration

### Negative

- Additional infrastructure component (GOFF relay proxy) to maintain
- Slight latency on flag evaluation when relay is used (mitigated by caching)
- Migration required touching many components that checked flags

### Neutral

- Flag definitions still live in application code (store metadata) alongside relay configuration
- GOFF relay adds ~20MB memory footprint to the Kubernetes namespace

## Alternatives Considered

### LaunchDarkly / Split.io

Commercial SaaS feature flag platforms. Rejected due to cost for a research project and vendor lock-in concerns.

### Custom Redis-backed flag service

Build a custom flag service with Redis storage. Rejected as over-engineering — GOFF provides the same capabilities with minimal operational overhead.

## Implementation Notes

- `src/stores/featureFlagStore.ts` holds flag metadata and evaluation logic
- OpenFeature provider configured in application initialization
- Flags accessed via `useFeatureFlag()` composable in Vue components
- GOFF relay configuration in `k8s/` manifests for local development

## References

- [OpenFeature Specification](https://openfeature.dev/)
- [GO Feature Flag Documentation](https://gofeatureflag.org/)
- Related: [PRD: Feature Flag Implementations](../prd/feature-flag-implementations.md)
