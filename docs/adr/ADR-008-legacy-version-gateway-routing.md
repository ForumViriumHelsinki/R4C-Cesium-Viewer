# ADR-008: Serve Legacy v1.22.x and Current Frontend Behind One Hostname via Envoy Gateway Routing

## Status

Proposed

## Date

2026-06-10

## Context

Production (`r4c.dataportal.fi`) is intentionally pinned to image `v1.22.6`
because UX regressions introduced after 1.22.x are not yet all resolved.
Newer releases are served on a separate hostname (`r4c-beta.dataportal.fi`)
tracked by ArgoCD Image Updater via `deploy/values-beta.yaml`.

This split has produced a disjointed development loop:

- Fixes landed on `main` — including infrastructure-level fixes with no UX
  impact (nginx security headers, HSY stale-on-error caching, pygeoapi proxy
  fixes) — never reach production.
- The `release-1.22.x` maintenance branch requires backports and has
  accumulated release-please branch rot.
- Comparing old and new behavior requires switching hostnames, which also
  switches deployment pipelines and Sentry release streams.
- Sentry keeps reporting already-fixed errors from prod 1.22.6
  (REGIONS4CLIMATE-1W / #779), polluting triage.

The end goal is cutover: production serves the current frontend. The blocker
is risk management for the remaining 1.22-era regressions during the
transition.

### Constraints discovered during design

- A **source-level feature flag is infeasible**: main is ~30 minor versions
  past 1.22.x with cross-cutting divergence (stores, navigation coordination,
  viewport streaming, Vuetify 4, the feature-flag system itself). The v1.22
  experience is a whole-app snapshot, not a gateable feature.
- The infrastructure edge is **Envoy Gateway** (Gateway API), with native
  **SecurityPolicy for Google OAuth** (no oauth2-proxy, so no
  `X-Auth-Request-*` identity headers exist for routing).
- The legacy artifact must stay **frozen**: any approach requiring changes to
  the v1.22.6 bundle (e.g. injecting a bootstrap script or a "try the new
  version" link) reopens the maintenance loop this design exists to close.

## Decision

Run **two Deployments behind one hostname**, with Envoy Gateway HTTPRoute
rules selecting the backend per request via a cookie, and a **"switch to
classic version" link in the new frontend** as the only app-side change.

### Architecture

| Piece                             | Owner                                              | Content                                                                                       |
| --------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `r4c-legacy` Deployment + Service | infrastructure repo                                | Frozen image `v1.22.6` — byte-identical to current prod, including its own nginx proxy config |
| `r4c-next` Deployment + Service   | infrastructure repo (manifest) / this repo (image) | Tracks `main` releases via ArgoCD Image Updater, exactly as beta does today                   |
| HTTPRoute on `r4c.dataportal.fi`  | infrastructure repo                                | Routing rules below                                                                           |
| "Switch to classic version" link  | this repo                                          | Small UI element in the current frontend linking to `/?ui=legacy`                             |

### HTTPRoute rules

1. `?ui=legacy` query match → legacy backend, plus `ResponseHeaderModifier`
   adding
   `Set-Cookie: r4c_ui=legacy; Path=/; Max-Age=<TTL>; Secure; HttpOnly; SameSite=Lax`
   — the cookie is set and read only by the gateway, so `HttpOnly` denies it
   to client-side JS; `SameSite=Lax` still rides along on top-level
   navigations like the switch links.
2. `?ui=new` query match → next backend, plus a cookie-clearing
   `Set-Cookie: r4c_ui=legacy; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`
   with attributes matching rule 1 so deletion works across browsers (the
   frozen legacy UI has no switch link; the return path is this URL)
3. `Cookie` header regex match → legacy backend (keeps hashed-asset requests
   sticky to the bundle that referenced them). Envoy's regex matcher is a
   **full-string** match (RE2, "matched against the full string, not as a
   partial match"), and the `Cookie` header carries all cookies, so the
   pattern must wildcard both sides while anchoring the cookie-name
   boundary: `(.*;\s*)?r4c_ui=legacy(\s*;.*)?`. A bare substring or
   partial-match pattern either never matches (full-match semantics) or
   false-positives on look-alike names (`other_r4c_ui=legacy`).
4. Default → per rollout phase (see below)

### Two-phase rollout

The same configuration supports both phases; only the default backend
changes:

- **Phase 1 — default legacy.** Staff and stakeholders use the `?ui=new`
  link (cookie-sticky) to live on the current frontend against production
  data. Production users see no change. The `r4c-beta` hostname and
  `deploy/values-beta.yaml` can already be retired.
- **Phase 2 — default new (the cutover).** Flip the HTTPRoute default. The
  in-app "switch to classic version" link becomes the public safety valve.
  Rollback is flipping the default back — no image or values change.

The phase-2 flip is a deliberate go/no-go decision against a cutover
checklist of remaining 1.22-era regressions (tracked in the implementation
issue), not an automatic consequence of this ADR.

### Cookie TTL

The `r4c_ui=legacy` cookie carries a bounded `Max-Age` (proposed: 30 days)
so users who escape to classic are periodically re-landed on the new UI.
This prevents a permanent shadow population on the frozen bundle.

### Readiness metric

The rate of `?ui=legacy` switches in Envoy access logs is a direct cutover
health metric: when users stop fleeing, the legacy deployment has earned its
sunset.

### Sunset criterion

The legacy Deployment, HTTPRoute rules, and switch link are removed when the
phase-2 default has held for an agreed soak period (proposed: 30 days) with
the switch rate at ~zero and no open cutover-blocker issues.

## Consequences

### Positive

- Cutover and rollback become single-field GitOps PRs — no image rebuild, no
  values gymnastics.
- `release-1.22.x` freezes permanently: no more backports; production
  receives main's infrastructure fixes (proxy, caching, security headers)
  immediately while UX stays selectable.
- Same-origin comparison: two browser profiles with different cookies diff
  old vs. new behavior on identical production data.
- Bug triage gains a free dimension ("does it reproduce on legacy?" is one
  cookie away).
- Sentry separation for free: the legacy bundle reports under its old
  release tag.
- The beta hostname and dual values files are retired, ending the disjointed
  loop in phase 1 already.

### Negative

- Double the running pods for the duration (mitigable with KEDA office-hours
  scaling already supported by helm-webapp).
- Cross-repo coordination: the HTTPRoute logic exceeds what `helm-webapp`'s
  `gateway.enabled` generates, so routing config and the legacy Deployment
  live in the infrastructure repo while this repo ships the link.
- Same-origin storage is shared between versions: localStorage keys
  (disclaimer acknowledgment, persisted store state) and any caches are
  visible to both bundles and need a one-time compatibility audit.
- Temporary scaffolding risk: without the sunset criterion the legacy
  deployment fossilizes.

### Neutral

- Anonymous users can only be targeted at device level (cookie); named-user
  targeting would require the JWT-claims machinery rejected below.
- The legacy SPA receives an unfamiliar `ui` query parameter on switch; its
  URL handling ignores unknown parameters.

## Alternatives Considered

### Source-level feature flag (GOFF) gating old vs. new UX

Rejected: the divergence between 1.22.x and main is cross-cutting
(whole-app), not feature-shaped. Maintaining both code paths in one tree is
not viable. GOFF remains the tool for feature toggles _within_ the current
frontend.

### Dual-bundle single image (both `dist/` trees in one container, nginx cookie routing)

Workable (`COPY --from=ghcr.io/...:v1.22.6`), but inferior once Envoy
Gateway owns routing: it requires Dockerfile surgery, a route-superset audit
of main's nginx against the legacy bundle's expectations, and patching the
frozen bundle's `index.html` for any targeting beyond defaults. The
two-deployment design keeps each bundle paired with its own nginx config and
keeps the legacy artifact untouched.

### Identity-based routing via Google OAuth (JWT claims → headers)

Envoy Gateway's OIDC SecurityPolicy stores tokens in cookies but injects no
identity headers. Routing by `@forumvirium.fi` would require an optional JWT
provider extracting the `IdToken` cookie with `claimToHeaders`
(`hd` → header) plus an OIDC-protected login path to bootstrap sessions on a
public site. Feasible but version-sensitive and three pieces of config for a
population (staff) that an opt-in link covers. Deferred — the cookie
substrate this ADR establishes is what it would build on.

### Weighted canary (HTTPRoute `backendRefs` weights + `sessionPersistence`)

Deferred: weighted routing without stickiness breaks SPAs (an `index.html`
from one backend requests hashed assets the other doesn't have), and
Gateway API `sessionPersistence` is experimental-channel. The opt-in link +
in-app escape hatch covers the actual rollout need; percentage rollout can
be added later on the same cookie substrate if wanted.

### Keep the status quo (beta hostname) and burn down blockers

Fixing the remaining regressions is necessary regardless, but the status quo
leaves production without main's infrastructure fixes until full cutover and
keeps the backport loop alive in the meantime. This design decouples "prod
gets fixes" from "prod gets new UX".

## Implementation Notes

Verification items before the infrastructure PR (tracked in the
implementation issue):

1. Deployed Envoy Gateway version supports HTTPRoute `queryParams` match,
   regex `Cookie` header match, and `ResponseHeaderModifier` on route rules.
   Verify the full-string regex semantics empirically with a multi-cookie
   request (the pattern in the HTTPRoute rules section assumes RE2
   full-match).
2. Scope of the existing Google OAuth SecurityPolicy — confirm nothing on
   `r4c.dataportal.fi` routes through it in a way the new HTTPRoute rules
   would bypass or break.
3. Same-origin storage audit: enumerate localStorage keys and caches used by
   both bundles (disclaimer key, persisted stores, any service worker).
4. helm-webapp expressiveness: confirm the multi-backend HTTPRoute is
   authored directly in the infrastructure repo rather than forced through
   chart values.
5. Clean up `release-1.22.x` branch rot (nested
   `release-please--branches--…` branches) when freezing the branch.

App-side change is intentionally minimal: one "switch to classic version"
link (footer or app menu) navigating to `/?ui=legacy`.

## References

- Implementation issues: app side
  [#886](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/886),
  infrastructure side
  [infrastructure#2001](https://github.com/ForumViriumHelsinki/infrastructure/issues/2001)
- Taskwarrior task 130 (production deployment drift) — the intentional-hold
  annotation this ADR resolves
- Sentry REGIONS4CLIMATE-1W / issue #779 (false regression from prod 1.22.6)
- `.claude/rules/feature-flags.md` — GOFF remains for in-app toggles
- Gateway API HTTPRoute matching:
  <https://gateway-api.sigs.k8s.io/api-types/httproute/>
- Envoy Gateway OIDC SecurityPolicy:
  <https://gateway.envoyproxy.io/docs/tasks/security/oidc/>
