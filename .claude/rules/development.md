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

## Dev and Preview Servers Bind to Loopback

`bun run dev`, `bun run dev:test` and `bun run preview` listen on `localhost`
only (#969). Both servers carry the `devProxy` table from `vite.config.js`, and
its `/digitransit` entry adds `digitransit-subscription-key` to every request
it forwards. Bound to all interfaces, that makes the machine a forward proxy
that spends the key for anyone on the same network.

- **Device testing** (a phone or tablet on the LAN): opt in for that one run
  with `bun run dev -- --host`. Stop it when done.
- **Do not add `--host` back** to a script, `lighthouserc.cjs`, or `server.host`
  / `preview.host` in `vite.config.js`. `tests/unit/config/devServerLoopback.test.js`
  fails if you do.
- Every harness reaches the server at `http://localhost:<port>`: Playwright's
  `webServer`, the CI health check, `just test-performance`,
  `scripts/test-e2e-ci.mjs` and Lighthouse CI. On macOS Vite binds `[::1]`
  only, so `http://127.0.0.1:<port>` is refused. Use `localhost`.

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

## A PR Description Becomes the Commit Body — release-please Must Parse It

This repo is set to `squash_merge_commit_message = PR_BODY`, so the squash
commit is the PR title plus ` (#<number>)`, a blank line, and the PR
description. GitHub hard-wraps each description line longer than 72 characters
when it builds that commit. It re-joins the line's words with single spaces,
which drops the indentation and collapses runs of spaces and tabs, and it
counts an emoji as one character. Code under a fence that starts in column 0 is
left alone; a fence indented under a list item is wrapped like prose. The 199
squash commits from #744 to #1043 all match the model in
`scripts/check-commit-message.mjs`, apart from the `Co-authored-by` trailers
GitHub appends.

release-please (17.3.0, through the org reusable workflow) parses each commit
with `@conventional-commits/parser` 0.4.1. The parser reads every body line as a
possible `token(scope): value` footer, so it throws on a line whose first word
runs straight into a `(` that does not close on that line, or that opens a
second `(` before closing: `` `name( ``, `<call>(`, `a.push(b(c))`. release-please
logs the throw at debug level and skips the commit, so a `feat:`/`fix:` PR
merges green and cuts **no release**; the version and CHANGELOG never move. The
org workflow's missed-release check reports it only as a run **warning**.

Because of the wrap, the offending line usually does not start that way in the
description as written: a call mid-sentence becomes the first word of a wrapped
line. Run 35996129826 (2026-09-24) dropped four commits whose descriptions
parse unwrapped:

| Commit    | PR    | Parser error                                       | Wrapped line starts with                            |
| --------- | ----- | -------------------------------------------------- | --------------------------------------------------- |
| `e7f70c9` | #1012 | `unexpected token '\n' at 83:70, valid tokens [)]` | `` `loadGeoJsonDataSource( ``                       |
| `4f671b5` | #1005 | `unexpected token '\n' at 56:33, valid tokens [)]` | `` `ndviTiffUrl( ``                                 |
| `689630d` | #1037 | `unexpected token '(' at 29:45, valid tokens [)]`  | `` `backgroundMapStore.floodLayers.push(markRaw( `` |
| `629a8d1` | #1010 | `unexpected token '\n' at 83:73, valid tokens [)]` | `<call>(`                                           |

Fenced code blocks are the other usual source: under a column-0 fence nothing is
wrapped, and code lines start with calls. Under an indented fence a long code
line is wrapped and loses its indentation, so it can start with a call too. On
2026-09-15 a `js` fence holding a `localStorage.setItem(...)` line (`e156d1f`,
#973, `'(' at 35:52`) killed the 1.57.0 release.

- **The `Squash commit parses` check** (`enforce-conventional-commits.yml`, on
  opened, edited, synchronize and reopened) runs
  `scripts/check-commit-message.mjs` on the PR title, number and description. It
  builds the squash message as above, honours a `BEGIN_COMMIT_OVERRIDE` section,
  and parses with the version pinned in `package.json`. When it fails it names
  the line: reword that sentence, or add an override section. Line 1 is the
  title. The `Fix PR title` job rewrites titles with the `GITHUB_TOKEN`, which
  starts no new workflow run, so after such a rewrite edit the PR to re-run the
  check. To check a PR locally:
  `PR_NUMBER=12 PR_TITLE="$(gh pr view 12 --json title -q .title)" PR_BODY="$(gh pr view 12 --json body -q .body)" node scripts/check-commit-message.mjs`.
- **Prefer inline code to fenced blocks** in PR descriptions for this repo.
- **Check after merging any `feat:`/`fix:`/`perf:`/`revert:` PR** that the
  release PR picked it up:
  `gh pr list -R ForumViriumHelsinki/R4C-Cesium-Viewer --state open --head release-please--branches--main--components--r4c-cesium-viewer`,
  or the `autorelease: pending` label. `gh pr list --search 'chore(main): release'`
  returns nothing even while the release PR is open (checked 2026-09-24, with
  #1041 open). A dropped commit shows in the release-please log as
  `commit could not be parsed`.
- **Recovery**: add a `BEGIN_COMMIT_OVERRIDE` / `END_COMMIT_OVERRIDE` section
  holding the conventional commit message to the merged PR's description, then
  re-run release-please with `workflow_dispatch`. release-please reads the
  section from the PR when it runs and parses it instead of the commit. On
  2026-09-24 this recovered #1005, #1010, #1012 and #1037: run 36005789211
  logged no parse errors and considered 52 commits, against 48 in run
  35996129826 earlier that day. A re-run without the section re-parses the
  same commit and fails the same way.
- **Do not name the override marker in a description you do not mean as an
  override.** release-please finds `BEGIN_COMMIT_OVERRIDE` as plain text
  anywhere in the description and parses whatever follows it instead of the
  commit, so a sentence that mentions it replaces the commit message. The check
  parses the same text, so it fails such a description unless the text after
  the marker happens to be a conventional commit, and its output names the
  override section as the cause.

## CI/CD

Container build/release use the org reusable workflows (`ForumViriumHelsinki/.github`) with a build-once/promote pattern.

- `container-build.yml` — calls `reusable-container-build.yml` on release-please PRs; produces a `:next-{version}` pre-release image
- `container-release.yml` — calls `reusable-container-release.yml` on `release: published`; promotes the pre-release image to semver tags via manifest retag (seconds, not minutes), with a full rebuild as fallback
- `release-please.yml` — manages releases and CHANGELOG via conventional commits
- `lighthouse.yml` — performance monitoring on PRs

Sentry build args (`SENTRY_AUTH_TOKEN`, `VITE_SENTRY_DSN`) reach the build via the reusable workflows' `secret-build-args` passthrough — secrets cannot flow through plain `inputs.build-args` on reusable-workflow callers. The non-secret `VITE_SENTRY_ENVIRONMENT=production` goes through plain `build-args`, and the Dockerfile forwards it to Vite. It is the only way a build reports as `production`: `src/utils/sentryEnvironment.js` tags any other production-mode build `local` (#995). CI builds (`test.yml`, `lighthouse.yml`) carry no DSN and send nothing to Sentry. `tests/unit/utils/sentryEnvironment.test.js` fails if a workflow other than the two container workflows sets `VITE_SENTRY_DSN`.

### Workflows That Push to PR Branches

`auto-fix.yml` runs on `workflow_run` whenever Test Suite or Lighthouse CI fails on any branch other than `main`, and it pushes `fix(auto):` commits to that branch. While `main`'s own Test Suite is red, every PR's Test Suite fails too, so every PR gets an AI auto-fix run. During a run that opens, rebases or merges several PRs, those commits race the run's own pushes. Disable the workflow for the duration and re-enable it afterwards, with a tracker so the re-enable is not forgotten:

    gh workflow disable auto-fix.yml
    gh workflow enable auto-fix.yml

That was done three times on 2026-09-23 and 2026-09-24 for the 24-PR issue round. `claude-review.yml` has been `disabled_manually` since 2026-03-19, so PRs get no Claude review. The file declares a trigger, but only the API state shows whether the workflow runs: `gh api repos/ForumViriumHelsinki/R4C-Cesium-Viewer/actions/workflows --paginate --jq '.workflows[] | "\(.state) \(.path)"'`.

### Verifying a Release Reached `deploy/values.yaml`

ArgoCD Image Updater writes two keys in `deploy/values.yaml`: `image.tag`, for the app, and `migrations.image.tag`. It does not always write both in one PR. 1.58.0 arrived in a single update (#990). 1.59.0 arrived as #1047, which bumped only `migrations.image.tag`, followed two minutes later by #1048, which bumped `image.tag`. Check the app key itself, `git show origin/main:deploy/values.yaml | awk '/^image:/{f=1} f && /^  tag:/{print; exit}'`. A match for the version anywhere in the file can come from the migrations key while the app still runs the old image.

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
