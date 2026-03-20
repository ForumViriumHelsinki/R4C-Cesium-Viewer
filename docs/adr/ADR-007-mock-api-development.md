# ADR-007: Mock API for Database-Free Development

## Status

Accepted

## Date

2025-08-01

## Context

Local development required running PostgreSQL with PostGIS in Kubernetes, importing a multi-gigabyte production database dump, and configuring Skaffold profiles. This created a high barrier to entry for:

- Frontend developers who only need to iterate on UI components
- New team members setting up the project for the first time
- CI environments where a full database is impractical
- Quick prototyping sessions where data accuracy is secondary

The `just dev` workflow worked well for full-stack development, but a lighter option was needed for pure frontend work.

**Git evidence:**

- `38d7991` feat: add mock PyGeoAPI server for database-free development (#496)
- `86c36d4` feat(mock-api): add complete building properties and documentation (#501)
- `bb6e2b2` feat: add comprehensive health and status endpoints (#508)

## Decision

Create a mock PyGeoAPI server (`mock-api/`) that provides synthetic but structurally accurate responses for all API endpoints:

1. **Standalone Express server** in `mock-api/` directory, runnable with `bun run mock-api`
2. **Synthetic data generation**: Realistic building properties, postal code boundaries, heat data, and tree coverage with correct schema shapes
3. **Three-tier development modes**: `just dev-mock` (fastest, no K8s), `just dev` (K8s + local frontend), `just dev-full` (all containers)
4. **Vite proxy configuration**: Mock API runs on port 5050, Vite proxies `/pygeoapi` to it in mock mode

## Consequences

### Positive

- Frontend development possible in seconds (`bun run dev` + `bun run mock-api`)
- No Kubernetes, Docker, or database knowledge required for UI work
- Consistent synthetic data enables deterministic UI testing
- New developer onboarding reduced from hours to minutes

### Negative

- Mock data may drift from production API schema — requires manual sync
- Some edge cases (empty postal codes, missing building data) harder to reproduce
- Developers may miss backend bugs that only surface with real data

### Neutral

- Mock server adds a small maintenance burden but is isolated in its own directory
- E2E tests can run against mock or real backend depending on profile

## Alternatives Considered

### Recorded API responses (fixtures)

Record production API responses and replay them. Rejected because fixture files would be large (GBs of GeoJSON) and hard to maintain as APIs evolve.

### In-memory SQLite with PostGIS stubs

Use SQLite with spatial extensions for local development. Rejected due to incompatibility with PostGIS-specific functions used in queries.

## Implementation Notes

- `mock-api/server.js` — Express server with routes mirroring PyGeoAPI endpoints
- `mock-api/data/` — Synthetic data generators for buildings, postal codes, heat data
- Vite config detects `VITE_MOCK_API=true` to switch proxy targets
- `just dev-mock` sets environment and starts both mock server and Vite dev server

## References

- `mock-api/README.md` for API endpoint documentation
- Related: [Development Modes](../../CLAUDE.md#development-commands)
