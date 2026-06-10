# Development

## Development Modes

| Mode            | Command                       | Backend                | Use Case            |
| --------------- | ----------------------------- | ---------------------- | ------------------- |
| Mock API        | `just dev-mock`               | Synthetic data (:5050) | Frontend UI work    |
| Full Stack      | `just dev` + `just db-seed`   | PostgreSQL (:5000)     | Feature development |
| Production Data | `just dev` + `just db-import` | 18GB dump              | Bug reproduction    |

**Choose Mock API when:**

- Developing UI components or styling
- No database queries need testing
- Want fastest possible iteration (no K8s/Docker)

**Choose Full Stack when:**

- Testing data fetching logic
- Verifying database queries
- Need realistic data relationships

**Choose Production Data when:**

- Reproducing a specific production bug
- Testing with real-world data distributions

## Skaffold/Kubernetes Development

**One-Command Start:**

```bash
just dev-mock  # Mock API (fastest - no database/K8s required)
just dev       # Local frontend + K8s services (fast iteration)
just dev-full  # All in containers (closer to production)
just stop      # Stop all services
```

**Profiles:**

- Default: Full stack with PostgreSQL + PostGIS
- `services-only`: Backend services only (use with `bun run dev`)
- `frontend-only`: Frontend only (assumes services running)
- `e2e-with-prod-data`: E2E testing with cloned production data

## Code Search Tools

### ast-grep (Structural Search)

Pattern-based code search using AST:

```bash
# Vue patterns
ast-grep -p 'defineProps<$TYPE>()'                    # Find typed props
ast-grep -p 'const $STORE = use$NAME()'               # Find Pinia store usage
ast-grep -p 'watch($DEPS, ($$$) => { $$$ })'          # Find watchers

# JavaScript patterns
ast-grep -p 'async function $NAME($$$) { $$$ }'       # Find async functions
ast-grep -p 'console.log($$$)'                        # Find console.log
ast-grep -p 'await $PROMISE.catch($$$)'               # Find error handling
```

**When to use ast-grep:**

- Finding specific code patterns across files
- Identifying anti-patterns for refactoring
- Searching for framework-specific constructs

## Building

```bash
bun run build    # Production build (runs scripts/precompress.mjs after vite build)
bun run dev      # Development server with hot reload
bun run lint     # Biome check
bun run lint:fix # Biome auto-fix
```

`bun run build` ends with a precompression step (`scripts/precompress.mjs`,
gzip-9 over `dist/` — ~−77% on compressible assets); nginx serves the `.gz`
siblings via `gzip_static`. If a build artifact seems stale or doubled, check
for orphaned `.gz` files. Brotli precompression is blocked on a
brotli-capable nginx image — tracked in issue #876.

## Merge Commits Must Be Conventional

The `conventional-pre-commit` hook validates **merge commits too** — git's
default `Merge remote-tracking branch '...'` subject is rejected. When
committing a conflict resolution, supply a conventional subject:

```bash
git commit -m "chore(merge): merge main into <branch>"
```

(The subject disappears on squash-merge anyway; it only needs to satisfy the
hook.)

## CI/CD

Container build/release use the org reusable workflows (`ForumViriumHelsinki/.github`) with a build-once/promote pattern.

- `container-build.yml` — calls `reusable-container-build.yml` on release-please PRs; produces a `:next-{version}` pre-release image
- `container-release.yml` — calls `reusable-container-release.yml` on `release: published`; promotes the pre-release image to semver tags via manifest retag (seconds, not minutes), with a full rebuild as fallback
- `release-please.yml` — manages releases and CHANGELOG via conventional commits
- `lighthouse.yml` — performance monitoring on PRs

Sentry build args (`SENTRY_AUTH_TOKEN`, `VITE_SENTRY_DSN`) reach the build via the reusable workflows' `secret-build-args` passthrough — secrets cannot flow through plain `inputs.build-args` on reusable-workflow callers.

### Lighthouse CI

`lighthouse.yml` runs `lhci collect` against `bun run preview`. Two hazards specific to this heavy CesiumJS app:

- **Source maps cause `PROTOCOL_TIMEOUT`.** Lighthouse fetches response bodies over the DevTools protocol (hardcoded 30s). The multi-MB Cesium source maps — and the `valid-source-maps` / byte-weight audits that read them — reliably trip it and crash `lhci collect` entirely ("did not produce results"). The build step runs `LIGHTHOUSE=true bun run build`, and `vite.config.js` reads `process.env.LIGHTHOUSE` to **skip source maps for the Lighthouse build only** (the deploy/container build is unaffected and keeps maps for Sentry). Do **not** re-enable `valid-source-maps` in `lighthouserc.cjs` — no maps exist in that build by design. This is the timeout's real cause; it is **not** limited to terrain/3D binaries.
- **The blocked-tile run is a "shell" benchmark.** `blockedUrlPatterns` blocks heavy terrain/3D binaries (raster WMS tiles are unblocked). The honest median is ~0.35 — the perf gate is a non-blocking `warn` at 0.3.
- **Reproduce locally with `just lighthouse-local`** before pushing `lighthouserc.cjs` / build changes — CI runs are ~11 min, and `main` is unprotected so a broken config can merge before CI catches it.
