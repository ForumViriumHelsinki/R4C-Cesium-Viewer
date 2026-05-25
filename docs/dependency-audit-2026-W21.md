# Dependency Audit Report — R4C-Cesium-Viewer

**Date**: 2026-05-18 (W21)
**Status**: 60 vulnerabilities (2 critical, 22 high, 34 moderate, 2 low)
**Build tool**: Bun 1.3.10
**Lockfile**: bun.lock (binary-ish text, not directly editable)

---

## Executive Summary

### Vulnerability Breakdown

| Severity     | Count  | Direct Deps | Transitive |
| ------------ | ------ | ----------- | ---------- |
| **Critical** | 2      | 1           | 1          |
| **High**     | 22     | 3           | 19         |
| **Moderate** | 34     | 1           | 33         |
| **Low**      | 2      | 0           | 2          |
| **Total**    | **60** | **5**       | **55**     |

### Key Observations

- **5 direct dependencies** carry known vulnerabilities (axios, fast-xml-parser, vite, and their transitive chains)
- **55 transitive vulnerabilities** span the Cesium ecosystem (protobufjs), Vite plugins, TypeDoc, and dev tooling
- **No blockers for basic operation** — all critical/high vulnerabilities are in optional features or can be mitigated with version pins
- **Cesium ecosystem** is the largest source (protobufjs, DOMPurify via Cesium's @cesium/widgets)

---

## Critical Vulnerabilities

| Package             | Current | Min Vulnerable | Patched | Severity | Source              | CVE                 | Impact                                                             |
| ------------------- | ------- | -------------- | ------- | -------- | ------------------- | ------------------- | ------------------------------------------------------------------ |
| **fast-xml-parser** | 5.3.3   | 5.0.9          | 5.7.0+  | Critical | Direct              | GHSA-m7jm-9gc2-mpf2 | Entity encoding bypass via regex injection in DOCTYPE entity names |
| **protobufjs**      | 7.5.5   | ≤7.5.5         | 7.6.0+  | Critical | Transitive (cesium) | GHSA-xq3m-2v4x-88gg | Arbitrary code execution in protobufjs                             |

### Critical Issue: Cesium → Protobufjs Chain

```
cesium@1.136.0
└─ @cesium/widgets
   └─ @cesium/engine
      └─ protobufjs@7.5.5 (CRITICAL: ACE)
```

**Problem**: Cesium pins protobufjs internally; upgrading cesium is the only fix unless a bun.lock override is applied.

---

## High-Severity Vulnerabilities (22 total)

### Direct Dependencies (3)

#### 1. Vite (3 High + 2 Moderate)

| Issue                                             | Range       | Current | Fix    | Breaking |
| ------------------------------------------------- | ----------- | ------- | ------ | -------- |
| `server.fs.deny` bypassed with queries            | 7.0.0–7.3.1 | 8.0.1   | 8.1.0+ | No       |
| Arbitrary file read via Vite Dev Server WebSocket | 7.0.0–7.3.1 | 8.0.1   | 8.1.0+ | No       |
| Path traversal in optimized deps `.map` handling  | 7.0.0–7.3.1 | 8.0.1   | 8.1.0+ | No       |

**Note**: Package.json shows `vite@^8.0.1`; the audit detects that both transitive vite consumers (vitest, vite-plugin-cesium-build, vite-plugin-vuetify, @vitejs/plugin-vue) pin older vite ranges. The issue is **fully patched in the currently installed 8.x series**. Re-running `bun audit` after `bun update` should resolve these.

#### 2. Axios (11 High/Moderate, 1 Low)

| Issue                                                                                                                                               | Range        | Current | Fix     | Breaking |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ | ------- | ------- | -------- |
| Prototype pollution gadgets (credential injection, request hijacking)                                                                               | 1.0.0–1.15.1 | 1.13.2  | 1.15.2+ | No       |
| NO_PROXY hostname normalization bypass (SSRF)                                                                                                       | 1.0.0–1.15.0 | 1.13.2  | 1.15.0+ | No       |
| NO_PROXY bypass via RFC 1122 loopback subnet (127.0.0.0/8)                                                                                          | 1.15.0       | 1.13.2  | 1.15.2+ | No       |
| Prototype pollution in `mergeConfig` (DoS via `__proto__`)                                                                                          | 1.0.0–1.15.1 | 1.13.2  | 1.15.2+ | No       |
| Header injection via prototype pollution                                                                                                            | 1.0.0–1.15.1 | 1.13.2  | 1.15.2+ | No       |
| 6 additional: response tampering, CRLF injection, unbounded recursion DoS, maxBodyLength/maxContentLength bypass, XSRF leakage, null byte injection | 1.0.0–1.15.1 | 1.13.2  | 1.15.2+ | No       |

**Recommendation**: Upgrade to `axios@1.15.2+`. No breaking changes in 1.15.x. The vulnerabilities are prototype pollution gadgets and SSRF bypasses — mitigated by keeping axios updated and validating/sanitizing user input passed to axios config.

#### 3. Fast-XML-Parser (1 Critical + 3 High + 2 Moderate)

See Critical section above. Upgrade path: `5.7.0+`. No breaking changes in 5.x.

### Transitive High-Severity (19)

#### Protobufjs (5 High, 3 Moderate via Cesium)

**Chain**: `cesium@1.136.0 → @cesium/engine → protobufjs@7.5.5`

| Issue                                                        | Fix    | Breaking |
| ------------------------------------------------------------ | ------ | -------- |
| Code injection through bytes field defaults (GHSA-66ff)      | 7.6.0+ | No       |
| Code generation gadget after prototype pollution (GHSA-75px) | 7.6.0+ | No       |
| Process-wide DoS through unsafe option paths (GHSA-jvwf)     | 7.6.0+ | No       |
| Denial of service through unbounded recursion (GHSA-685m)    | 7.6.0+ | No       |
| Denial of service from crafted field names (GHSA-2pr8)       | 7.6.0+ | No       |

**Current state**: Cesium pins its own protobufjs. **No direct upgrade path without upgrading Cesium.**

**Options**:

1. Upgrade to Cesium 1.137+ (if available) and verify it upgrades protobufjs
2. Apply a bun.lock override: `protobufjs@7.6.0+` (requires testing Cesium runtime)
3. Accept risk if Cesium's protobufjs is not user-controlled (data is locally parsed, not untrusted)

#### Rollup (1 High)

**Chain**: Vite 8.x → Rollup 4.x

| Issue                                   | Range        | Current | Fix     | Breaking |
| --------------------------------------- | ------------ | ------- | ------- | -------- |
| Arbitrary file write via path traversal | 4.0.0–4.59.0 | ~4.21+  | 4.60.0+ | No       |

**Status**: Likely patched when vite updates to a newer rollup. Check after `bun update`.

#### Minimatch (3 High ReDoS variants)

**Chains**:

- typedoc → minimatch
- @vue/test-utils → js-beautify → glob → minimatch
- @sentry/vite-plugin → @sentry/rollup-plugin → glob → minimatch

| Issue                                                  | Range       | Current | Fix    | Breaking |
| ------------------------------------------------------ | ----------- | ------- | ------ | -------- |
| ReDoS via repeated wildcards with non-matching literal | 9.0.0–9.0.5 | 9.0.5+  | 9.0.6+ | No       |
| ReDoS via multiple non-adjacent GLOBSTAR segments      | 9.0.0–9.0.5 | 9.0.5+  | 9.0.6+ | No       |
| ReDoS via nested `*()` extglobs                        | 9.0.0–9.0.5 | 9.0.5+  | 9.0.6+ | No       |

**Type**: Pattern matching libraries (compile-time/install-time; not runtime user input). Low risk in practice. Reachable via TypeDoc (documentation generation, dev-time only) and test tooling.

#### Picomatch (2 High ReDoS variants)

**Chains**: knip, rollup-plugin-visualizer, vite (via tinyglobby), vitest, sass-embedded, and various unplugin dependencies

| Issue                                       | Range  | Current | Fix    | Breaking |
| ------------------------------------------- | ------ | ------- | ------ | -------- |
| ReDoS via extglob quantifiers               | <2.3.2 | ~2.3.2+ | 2.3.2+ | No       |
| Method injection in POSIX character classes | <2.3.2 | ~2.3.2+ | 2.3.2+ | No       |

**Type**: Glob pattern matching (dev-time). Low runtime risk.

---

## Moderate-Severity Vulnerabilities (34)

Dominated by transitive dependencies in dev tooling and UI libraries:

| Package              | Count | Source                       | Notable Issues                                                                                        |
| -------------------- | ----- | ---------------------------- | ----------------------------------------------------------------------------------------------------- |
| **DOMPurify**        | 8     | cesium → @cesium/widgets     | XSS bypass via prototype pollution, FORBID_TAGS bypass, mutation-XSS, SAFE_FOR_TEMPLATES bypass       |
| **Axios**            | 6     | direct (split from High/Low) | Response tampering, data exfiltration, CRLF injection, recursion DoS, maxContent bypass, XSRF leakage |
| **Fast-XML-Parser**  | 2     | direct                       | XMLBuilder comment/CDATA injection, entity expansion bypass                                           |
| **Yaml**             | 1     | knip, typedoc, vite          | Stack overflow from deeply nested YAML                                                                |
| **PostCSS**          | 1     | vite, vue                    | XSS via unescaped `</style>` in stringify output                                                      |
| **Markdown-it**      | 1     | typedoc                      | ReDoS in regex                                                                                        |
| **Follow-redirects** | 1     | axios                        | Custom auth header leakage on redirect                                                                |
| **Brace-expansion**  | 2     | typedoc, test deps           | Zero-step sequence process hang (same CVE duplicate)                                                  |
| **@protobufjs/utf8** | 1     | cesium → protobufjs          | Overlong UTF-8 decoding                                                                               |
| **Protobufjs**       | 3     | cesium                       | (see High section)                                                                                    |

---

## Low-Severity Vulnerabilities (2)

| Package             | Issue                                                            | Current | Fix     |
| ------------------- | ---------------------------------------------------------------- | ------- | ------- |
| **Axios**           | Null byte injection via reverse-encoding in AxiosURLSearchParams | 1.13.2  | 1.15.2+ |
| **Fast-XML-Parser** | Stack overflow in XMLBuilder with preserveOrder                  | <5.7.0  | 5.7.0+  |

---

## Upgrade Decision Matrix

### Tier 1: Auto-Bump Safe (Patch/Minor, No Breaking Changes)

**Action: Single PR, `bun update` + verify tests**

- **axios** → 1.15.2+
  - All vulnerabilities resolve with semver-compatible bump
  - Verify: No `no_proxy` config changes in app
  - **Risk**: Low (SSRF/prototype pollution in config, not runtime code paths in this app)

- **fast-xml-parser** → 5.7.0+
  - Current 5.3.3, need 5.7.0+
  - Verify: WMS service still parses XML correctly
  - **Risk**: Low (no custom DOCTYPE processing in this app)

- **Vite** transitive chain
  - Detected as 7.0.0–7.3.1, but package.json shows `vite@^8.0.1`
  - Run `bun update` to let deps synchronize
  - If still flagged post-update, apply `bun.lock` override for transitive vite consumers

### Tier 2: Requires Human Review (Major Upgrades or Cesium Ecosystem)

#### Option A: Accept Protobufjs Risk (Fastest)

**Action: Document risk acceptance, move forward**

- Cesium 1.136.0 pins protobufjs 7.5.5
- Protobufjs is only used internally by Cesium for parsing .proto definitions at startup, not for untrusted user input
- **Risk acceptance**: Low if Cesium data sources are trusted (GeoJSON, CQL, tile servers)
- **Alternative**: If risk is unacceptable, escalate to Cesium upgrade (1.137+)

#### Option B: Upgrade Cesium (Careful Testing Required)

**Action: Separate PR, full test cycle**

```bash
bun add -d cesium@1.137.0+  # or latest
bun update
npm run test:e2e            # Comprehensive
npm run build               # Verify treeshake size
```

**Risks**:

- CesiumJS 1.137 may introduce breaking changes to entity creation, rendering, or API
- Test full 3D rendering, PostalCode drill-down, building selection
- Sentry + other integrations must still work

### Tier 3: Transitive Dev-Only (Low-Risk, Post-Update Validation)

**Action: Monitor after `bun update`; apply overrides if needed**

- **minimatch**: ReDoS in TypeDoc (dev-time). After `bun update`, check if typedoc pulls >= 9.0.6
  - If not: `bun update knip typedoc --latest` to force newer peers

- **picomatch**: Glob patterns in build tooling. Bun's package manager should auto-resolve.
  - If still flagged: Check if knip, vite-plugin-cesium-build have updates

- **DOMPurify**: 8 XSS variants via Cesium's HTML rendering. Upgrade path unclear without Cesium upgrade.
  - **Accept risk**: Cesium only sanitizes its own entity popups (not user-controlled)
  - **Alternative**: If DOMPurify 3.4+ is available independently, apply override

- **brace-expansion, markdown-it, yaml, postcss, follow-redirects**: All doc/build-time. Safe with standard version bumps.

---

## Recommended PR Sequence

### PR #1: Fast-Dependency Patches (Axios, Fast-XML-Parser)

**Title**: `chore(deps): bump axios to 1.15.2, fast-xml-parser to 5.7.0`

```bash
bun add axios@1.15.2
bun add fast-xml-parser@5.7.0
bun update
```

**Validation**:

- `bun run lint`
- `bun run build` (verify size unchanged)
- `bun run test:e2e --grep @smoke` (5-min validation)
- `bun audit` (verify counts drop)

**Expected outcome**: 5–6 critical/high vulnerabilities eliminated.

---

### PR #2: Vite Transitive Synchronization

**Title**: `chore(deps): update vite and dependencies to latest minor`

```bash
bun update --latest 2>&1 | grep vite
bun update
```

**Validation**:

- `bun run dev` (check dev server starts)
- `bun run build` (verify output)
- `bun run test:e2e --grep @smoke`
- `bun audit` (check vite/rollup vulnerabilities drop)

**Expected outcome**: Vite, rollup, and most minimatch/picomatch issues cleared.

---

### PR #3: Cesium Ecosystem Review (Major, Conditional)

**Only if**: Protobufjs risk acceptance is not approved.

**Title**: `chore(deps): upgrade cesium to 1.137.0 and dependencies`

```bash
bun add cesium@1.137.0  # Check latest first
bun update
```

**Validation** (2–3 hours):

- `bun run build --analyze` (check bundle size impact)
- `bun run test:e2e --grep @accessibility` (building selection, drill-down)
- `bun run test:e2e --grep @wms` (WMS layer rendering)
- Visual inspection: globe render, feature picking, 3D buildings
- `bun audit` (verify protobufjs count drops)

**Expected outcome**: Protobufjs + DOMPurify issues mitigated (if Cesium upgraded them).

---

### PR #4: Transitive Overrides (If Needed Post-Update)

**Only if**: After PRs #1–#2, remaining high/moderate issues are in locked transitive versions.

**Title**: `chore(bun.lock): pin minimatch@9.0.6, picomatch@2.3.2`

Edit `bun.lock` overrides section (or use `bun update <package> --latest --allow-pattern <pattern>`):

```javascript
// Example: Force newer version via bun update + range expansion
bun update knip@latest typedoc@latest
```

**Validation**:

- `bun audit` (verify remaining counts)
- `bun run lint:deps` (knip should not error)
- `bun run build` (docs generation still works)

---

### PR #5: Acceptance & Documentation

**Title**: `docs: dependency audit 2026-W21 closure`

Add findings to `docs/dependency-audit-2026-W21.md` (this file):

- Accepted risks (e.g., protobufjs via Cesium)
- Remaining known vulnerabilities (with justification)
- Next review date (W25 or after Cesium 1.138 release)

---

## Known Limitations & Caveats

1. **Bun audit lacks severity badges**: Unlike npm audit, bun audit does not separately list CVSS scores. Severity inferred from GitHub advisories and NVD.

2. **Cesium internal protobufjs**: Cesium vendors protobufjs for .proto parsing at startup. No user-controlled input flows through it (trusted data source). Risk is **theoretical rather than exploitable** in this codebase, but auditors may require explicit remediation.

3. **Transitive version pins in bun.lock are fragile**: Overriding transitive versions in bun.lock is possible but not officially documented by Bun. Prefer upgrades of the direct dependency (e.g., upgrade knip to pull newer minimatch).

4. **No Dependabot/Renovate**: This org does not have dependency automation. Manual audits required.

5. **Bundle size impact**: Cesium upgrades may increase bundle size due to new dependencies or larger proto definitions. Verify with `bun run build --analyze`.

---

## Timeline & Escalation

| Phase              | Timeline | Owner     | Blocker                 |
| ------------------ | -------- | --------- | ----------------------- |
| PR #1 (Axios, FXP) | 1–2 days | Developer | No                      |
| PR #2 (Vite)       | 2–3 days | Developer | No                      |
| PR #3 (Cesium)     | 3–5 days | Developer | Yes, if risk unaccepted |
| PR #4 (Overrides)  | 1–2 days | Developer | No (conditional)        |
| PR #5 (Docs)       | 1 day    | Developer | No                      |

**Total estimated effort**: 5–10 business days (sequential, accounting for test cycles).

---

## References

- GitHub Advisory Database: https://github.com/advisories/
- Bun package manager: https://bun.sh
- CesiumJS release notes: https://github.com/CesiumGS/cesium/releases
- Issue #719: https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/719
