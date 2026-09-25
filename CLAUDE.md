# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Justfile (Recommended)

Use `just` for the unified development experience:

```bash
just help        # Show all commands with current status
just dev-mock    # Mock API (fastest - no database/K8s required)
just dev         # Backend in K8s + local frontend (fast iteration)
just dev-full    # Everything in containers (closer to production)
just stop        # Stop all services
```

**Database commands:**

- `just db-status` - Show connection info and table count
- `just db-migrate` - Run pending migrations
- `just db-seed` - Seed with test data (recommended for local dev)
- `just db-import` - Import production dump from tmp/ (when needed)
- `just db-shell` - Open psql shell
- `just db-reset` - Drop and recreate database (requires confirmation)

**Testing:**

- `just test` - All tests
- `just test-quick` - Unit tests only
- `just test-e2e` - End-to-end tests

**Note:** E2E tests require `VITE_E2E_TEST=true` to expose the Cesium viewer to the test harness. Use `bun run dev:test` to start the dev server with this flag, or run tests via `just test-e2e` which handles this automatically.

Database data persists across `just stop` and even `skaffold delete`. Only `just db-reset` explicitly wipes the data.

### Build and Development (Bun)

- `bun run dev` - Start development server (accessible at http://localhost:5173; loopback only, `bun run dev -- --host` opts in to LAN access for device testing, #969)
- `bun run build` - Build for production
- `bun run preview` - Preview production build (http://localhost:4173)
- `bun run lint` - Run Biome to check code quality

### Testing

See `docs/core/TESTING.md` for comprehensive testing documentation.
See `docs/core/PERFORMANCE_MONITORING.md` for performance regression monitoring.

**Quick commands:**

- `bun run test:layer-controls` - Run single accessibility test file (fast iteration)
- `bun run test:accessibility` - Run all accessibility tests
- `npx playwright test --ui` - Run tests in interactive UI mode
- `bun run test:accessibility:report` - View HTML test report

**Performance monitoring:**

- `bun run test:performance:monitor` - Run tests with performance tracking
- `bun run test:performance:check` - Check for performance regressions
- `bun run test:performance:baseline` - Generate new performance baselines

**Development workflow:** Use focused testing for 5-8x faster iteration during test fixes. See `.claude/commands/test-focused.md` for details.

**Testing by category (using tags):**

Tests are categorized with tags for selective execution:

- `npx playwright test --grep @accessibility` - Run accessibility tests
- `npx playwright test --grep @performance` - Run performance tests
- `npx playwright test --grep @e2e` - Run end-to-end tests
- `npx playwright test --grep @smoke` - Run smoke tests
- `npx playwright test --grep @wms` - Run WMS integration tests
- `npx playwright test --grep @unit` - Run unit tests (Vitest)
- `npx playwright test --grep @integration` - Run integration tests (Vitest)

Tags can be combined: `npx playwright test --grep "@accessibility.*@smoke"`

See `.claude/skills/test-categorization.md` for best practices on test organization and tagging.

### Docker/Kubernetes

See `docs/GETTING_STARTED.md` for comprehensive local development documentation.
See `docs/DATABASE_IMPORT.md` for importing production database dumps.

**Recommended: Use Justfile commands (services persist on Ctrl+C):**

```bash
just dev       # Local frontend + K8s services (fast iteration)
just dev-full  # All in containers (closer to production)
just stop      # Stop all services
```

**Direct Skaffold (cleans up on exit):**

- `skaffold run -p services-only --port-forward` - Backend services only
- `skaffold dev -p frontend-only --port-forward` - Frontend only (assumes services running)
- `skaffold dev --port-forward` - Full stack
- `skaffold dev -p e2e-with-prod-data --port-forward` - E2E testing with cloned production data
- `skaffold test -p migration-test` - Test database migrations

**Other:**

- `docker compose up` - Run with Docker (http://localhost:4173)

**Note**: Local development uses plain Kubernetes manifests in `k8s/` directory for simplicity.

See `docs/DATABASE_CLONING.md` for production database cloning for E2E testing.

## Architecture and Conventions

Vue 3 climate-data viewer on CesiumJS (Pinia, Vuetify, D3, Playwright), drilling from
Capital Region to postal code to building. The detail lives in `.claude/rules/`; most
rules are path-scoped and load when you read or edit a matching file:

| Rule                                       | Covers                                                                            | Loads for                                                 |
| ------------------------------------------ | --------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `architecture.md`                          | Stores, services, navigation coordination, Cesium patterns, data sources          | `src/**`, `tests/**`, `vite.config.js`, `flags.goff.yaml` |
| `testing.md`                               | Fixtures, Playwright projects/sharding, component selectors, Cesium test pitfalls | `tests/**`, test configs, `test.yml`, `scripts/**`        |
| `code-quality.md`                          | Theming, listener cleanup, async errors, logging, store bindings                  | `src/**`, `tests/unit/**`                                 |
| `security.md`                              | Postal-code validation, URL encoding, JSON parsing                                | `src/**`                                                  |
| `nginx.md`                                 | nginx config, Dockerfile                                                          | `nginx/**`, `Dockerfile`, compose files                   |
| `development.md`, `document-management.md` | Dev modes, commit/PR rules, CI; ADR/PRD/PRP placement                             | always                                                    |

Database migrations are dbmate files in `db/migrations/`.

## Project-Specific Claude Resources

Slash commands (`.claude/commands/`): `/test-focused [file]`, `/test-debug [file]`,
`/stack-review`, `/dev-autofix`.

`.claude/skills/*.md` are reference notes, not registered skills (Claude Code only
loads `skills/<name>/SKILL.md`), so read them directly when relevant:
`test-pattern-library.md` (fixing Playwright failures),
`playwright-accessibility-testing.md`, `cesium-performance-testing.md`,
`test-categorization.md` (tags), `bun-lock-management.md`.
