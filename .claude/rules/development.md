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

## Verifying Changes in the Browser (`just dev-mock`)

- **Page reloads mid-check are Vite, not the app.** The first time a lazily
  loaded panel pulls in a dependency Vite hasn't pre-bundled (a Vuetify
  component, a d3 submodule), the dev server logs
  `optimized dependencies changed. reloading` and reloads the page. A Playwright
  `evaluate` in flight fails with "Execution context was destroyed". Check the
  dev-server log for that line and re-run; a cold dev server may do this several
  times before it settles.
- **Deep links need the camera params.** A URL with only
  `?level=postalcode&postalcode=00100` loaded at the start level in testing
  (2026-09); the same link with `lon`, `lat`, `alt`, `heading` and `pitch`
  restored the postal code. Copy the full URL the app writes after a search
  rather than hand-writing one.

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
default `Merge remote-tracking branch '...'` subject is rejected. A
conflict-free `git merge main` auto-commits the default subject and fails
the hook immediately, so pass the message on the merge itself:

```bash
git merge main -m "chore(merge): merge main into <branch>"
```

When committing a conflict resolution, the same subject goes on the commit:

```bash
git commit -m "chore(merge): merge main into <branch>"
```

(The subject disappears on squash-merge anyway; it only needs to satisfy the
hook.)

## A PR Description Becomes the Commit Body — No Code Fences In It

This repo is set to `squash_merge_commit_message = PR_BODY`, so GitHub copies
the whole PR description into the squash commit's body. release-please then
parses that body as a conventional commit, and a fenced code block in it can
throw the parser:

```text
❯ commit could not be parsed: e156d1f feat(vtt-flood): add synthetic data flag …
❯ error message: Error: unexpected token '(' at 35:52, valid tokens [)]
```

An unparsable commit is dropped, so a `feat:`/`fix:` PR merges green and cuts
**no release** — the version and CHANGELOG simply never move. The org workflow's
missed-release check catches it, but only as a run **warning**, and the PR
itself shows nothing.

> Observed 2026-09-15 (#973): a `js` fence holding a `localStorage.setItem(...)`
> line killed the 1.57.0 release. Recovered by landing #974, a fence-free `feat:`
> commit; the version had to wait for that second merge.

- **Write PR descriptions for this repo without fenced code blocks.** Inline
  backticks are fine; it is the fenced block that carries the offending line.
- **Check after merging any `feat:`/`fix:`/`perf:`/`revert:` PR** that a release
  PR appeared: `gh pr list --search 'chore(main): release'`. The release-please
  run's warning annotation names the missed commit.
- **Recovery is a new fence-free commit**, not a re-run — `workflow_dispatch`
  re-parses the same commit and fails identically.

## CI/CD

Container build/release use the org reusable workflows (`ForumViriumHelsinki/.github`) with a build-once/promote pattern.

- `container-build.yml` — calls `reusable-container-build.yml` on release-please PRs; produces a `:next-{version}` pre-release image
- `container-release.yml` — calls `reusable-container-release.yml` on `release: published`; promotes the pre-release image to semver tags via manifest retag (seconds, not minutes), with a full rebuild as fallback
- `release-please.yml` — manages releases and CHANGELOG via conventional commits
- `lighthouse.yml` — performance monitoring on PRs

Sentry build args (`SENTRY_AUTH_TOKEN`, `VITE_SENTRY_DSN`) reach the build via the reusable workflows' `secret-build-args` passthrough — secrets cannot flow through plain `inputs.build-args` on reusable-workflow callers.

### Security Scan (`bun audit` gate)

The Security Scan job runs `bun scripts/security/audit-gate.mjs` (locally: `just audit`). It is blocking and fails when:

- `bun audit` reports an advisory that is not on `.github/audit-allowlist.json`;
- an allowlist entry is malformed or past its `expires` date;
- a `package.json` override floor (`^x.y.z`) is itself inside a vulnerable range, checked against the npm bulk advisory endpoint that `bun audit` also uses.

Fix an advisory by raising a direct dependency or an override floor, then refresh the lockfile. `bun audit fix` (bun ≥1.4) moves transitive packages to the lowest safe version within their dependents' ranges. CI pins bun 1.3.14, so confirm the result with `mise exec bun@1.3.14 -- bun install --frozen-lockfile`. Allowlist an advisory only when no fixed version is reachable. Each entry needs the GHSA `id`, the `package`, a `reason` and an `expires` date (#947).

### Lighthouse CI

`lighthouse.yml` runs `lhci collect` against `bun run preview`. Two hazards specific to this heavy CesiumJS app:

- **Source maps cause `PROTOCOL_TIMEOUT`.** Lighthouse fetches response bodies over the DevTools protocol (hardcoded 30s). The multi-MB Cesium source maps — and the `valid-source-maps` / byte-weight audits that read them — reliably trip it and crash `lhci collect` entirely ("did not produce results"). The build step runs `LIGHTHOUSE=true bun run build`, and `vite.config.js` reads `process.env.LIGHTHOUSE` to **skip source maps for the Lighthouse build only** (the deploy/container build is unaffected and keeps maps for Sentry). Do **not** re-enable `valid-source-maps` in `lighthouserc.cjs` — no maps exist in that build by design. This is the timeout's real cause; it is **not** limited to terrain/3D binaries.
- **The blocked-tile run is a "shell" benchmark.** `blockedUrlPatterns` blocks heavy terrain/3D binaries (raster WMS tiles are unblocked). The honest median is ~0.35 — the perf gate is a non-blocking `warn` at 0.3.
- **Reproduce locally with `just lighthouse-local`** before pushing `lighthouserc.cjs` / build changes — CI runs are ~11 min, and `main` is unprotected so a broken config can merge before CI catches it.
