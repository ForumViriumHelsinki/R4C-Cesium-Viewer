# ADR-011: Pinned Render Profile for Lighthouse CI

## Status

Accepted (2026-10-09)

## Date

2026-10-09

## Context

Lighthouse CI (`.github/workflows/lighthouse.yml`) runs on GitHub-hosted ubuntu runners, which have no GPU. Chrome renders WebGL there with SwiftShader on the CPU. On 2026-10-09 the following was measured:

- **The Chrome flags in `lighthouserc.cjs` never applied.** lhci 0.15 builds the flag string as `chromeFlags + ' --headless=new'` (`src/collect/node-runner.js`, lines 46–49). The config passed an array, which JavaScript joins with commas, so Chrome received one bogus switch. `--disable-gpu`, `--disable-dev-shm-usage` and the rest were all ignored, and the renderer was whatever Chrome picked by default. Locally that was the Mac's GPU (ANGLE Metal), so local and CI runs measured different things.
- **On the CI runner, SwiftShader frames cost about 500 ms of main-thread time.** The CI report names the renderer `SwiftShader Device (Subzero)`; on an M4 Pro it is `SwiftShader Device (LLVM 10.0.0)`, at about 140 ms per frame. A trace shows the main thread blocked in `CommandBufferProxyImpl::WaitForGetOffset` while the GPU process runs SwiftShader. Lighthouse reports this as "Other" main-thread time attributed to `cesiumSymbols.*.js`.
- **Uncapped, the cost feeds on itself.** Cesium renders back to back while tiles stream in, and the saturated main thread slows the loading that would let rendering stop. PR #1084's CI run had 175 tasks over 50 ms across 90 s, Total Blocking Time (TBT) 35.3 s and 84 s of "Other", and hit Lighthouse's load timeout.
- **The performance score saturates.** It was 0.52 on `main`, on #1084 (which removed 74 MB of downloads), and in all four variants below. On the desktop preset TBT scores 0 above roughly 0.6 s, so no change of interest moves the score.
- **Chrome is removing the automatic SwiftShader fallback** for WebGL ([Chromium docs](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)). Without `--enable-unsafe-swiftshader`, context creation will fail. Cesium would then not start, and Lighthouse would score a page without a map, which looks like an improvement. Locally, `--disable-gpu` alone already gives no WebGL on Chrome 155, and the score rose to 0.9.
- **Cesium has no guidance for app performance testing in GPU-less CI.** Its own CI runs unit specs with `--webgl-stub` (`.github/workflows/dev.yml` in CesiumGS/cesium), and its Playwright end-to-end config forces the GPU (`--use-angle=gl`).

One Lighthouse run per variant on the CI runner (workflow run 37900100292, branch `exp/software-renderer-scale`):

| Variant                          | TBT    | TTI    | Speed Index | "Other" | Last request     |
| -------------------------------- | ------ | ------ | ----------- | ------- | ---------------- |
| Uncapped                         | 32.9 s | 50.9 s | 17.1 s      | 81.8 s  | 90 s (timed out) |
| 2 fps cap                        | 32.5 s | 48.0 s | 14.9 s      | 78.7 s  | 90 s (timed out) |
| 0.5 fps cap                      | 1.9 s  | 10.0 s | 4.8 s       | 5.3 s   | 27 s             |
| 2 fps cap, `resolutionScale` 0.5 | 8.1 s  | 19.3 s | 7.8 s       | 19.3 s  | 32 s             |

A 2 fps cap does nothing on CI because frames already take about 500 ms each.

Users are not expected to run on software-only WebGL, so the problem is the measurement, not the product. A GPU runner is not affordable for this project.

## Decision

Lighthouse CI measures the app under a **pinned render profile**, and the run fails when the profile was not in effect.

1. **Renderer.** `lighthouserc.cjs` forces SwiftShader for WebGL with `--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader`, and keeps page compositing on the CPU with `--disable-gpu-compositing`, all passed as one space-separated string. `--disable-gpu` is not used. Without `--disable-gpu-compositing`, DOM paints go through the same SwiftShader GPU process as Cesium and queue behind its frames. Locally, with the 0.5 fps cap and 3 runs each, LCP (the disclaimer text) was 9.0–9.4 s with SwiftShader compositing and 2.9 s with CPU compositing, and Speed Index 7.6–8.0 s against 4.3–4.4 s.
2. **Frame cap.** The Lighthouse build (`LIGHTHOUSE=true bun run build`) sets `VITE_LIGHTHOUSE_BUILD`, derived in `vite.config.js` from the same variable that drops source maps. The viewer then sets `targetFrameRate` to `LIGHTHOUSE_TARGET_FRAME_RATE` (0.5) from `src/utils/lighthouseRenderProfile.js`. Production builds never apply it.
3. **Evidence and gate.** The build records `performance.mark('r4c-lighthouse-render-profile fps=<cap> renderer=<WebGL renderer>')`. Lighthouse reports the mark in its `user-timings` audit without affecting any score. `scripts/lighthouse/check-render-profile.mjs` reads every `lhr-*.json` and fails when a run lacks the mark (no WebGL, so no viewer), used a non-SwiftShader renderer, or a different cap. `lighthouse.yml` runs it and fails the job on a mismatch, and the PR comment states the profile. `just lighthouse-local` runs it too.
4. **What the numbers mean.** Accessibility, Best Practices, SEO, CLS and the byte and request budgets are direct measurements. The performance score, TBT, Speed Index and TTI measure the app's own main-thread and loading work under the profile. They are a trend between CI runs; their absolute values are not what users see. Rendering performance on a real GPU is covered by the Playwright performance tests (`tests/performance/`), which already treat software renderers as trend-only (#843), and by manual checks.
5. **The PR comment reports the median run.** The parse step picks the run with the median performance score; it previously read whichever `lhr-*.json` was newest.

## Consequences

### Positive

- CI runs are comparable with each other: same renderer, same frame cap, verified on every run.
- A Chrome change that removes WebGL fails the run instead of inflating the score.
- TBT now reflects app work. Rendering cost no longer swamps it, and loading completes inside Lighthouse's window.
- Local runs (`just lighthouse-local`) use the same profile instead of the Mac's GPU.

### Negative

- Lighthouse cannot detect rendering regressions such as extra draw calls or more expensive shaders. At 0.5 fps those barely register.
- The measured app differs from production by one setting, `targetFrameRate`, in the Lighthouse build only.
- Local and CI numbers are separate series: SwiftShader uses its LLVM backend on macOS arm64 and Subzero on the Linux runner.

### Neutral

- Every flag in `lighthouserc.cjs` now applies for the first time, including `--no-sandbox` and `--disable-dev-shm-usage`. Results before and after this change are not comparable.

## Alternatives Considered

### Status quo (uncapped SwiftShader)

The score is pinned at 0.52 and TBT measures SwiftShader. The renderer is unpinned, and the run breaks silently when the SwiftShader fallback goes.

### GPU runner

GitHub's `linux_4_core_gpu` (Tesla T4) lists at $0.052 per minute and needs the GitHub Team or Enterprise Cloud plan. It is the only option that measures real rendering. Not affordable for this project now; revisit if rendering regressions need catching in CI.

### WebGL stub

Cesium's `contextOptions.getWebGLStub` makes every WebGL call a no-op, as Cesium's own unit tests do. Nothing would be drawn, so Speed Index and the paint metrics would lose meaning. The stub file is also not shipped in the `cesium` npm package.

### Lower resolution (`resolutionScale` 0.5)

It cut TBT to 8.1 s in the CI variant run, less than the 0.5 fps cap (1.9 s), and changes every rendered pixel rather than only the frame rate.

### Cap only when a software renderer is detected, in all builds

It would also slow down any real user without a GPU. Such users are not expected, and there is no reason to change production behaviour to fix a measurement.

## Implementation Notes

- `src/utils/lighthouseRenderProfile.js` holds the cap, the renderer pattern and the mark format. The app and the gate both import it.
- `tests/unit/ci/lighthouseRenderProfile.test.js` pins the `chromeFlags` string format, the SwiftShader flags, the mark round-trip and the gate's failure cases.
- If the cap changes, results before and after the change are not comparable. Note it in the PR that changes it.

## References

- [`.claude/rules/development.md`](../../.claude/rules/development.md), section Lighthouse CI
- #843: Playwright performance tests treat software renderers as trend-only
- #1084: GOFF flag fallbacks, which removed the NDVI preload from CI runs
- [Chromium: SwiftShader](https://chromium.googlesource.com/chromium/src/+/main/docs/gpu/swiftshader.md)
- [CesiumJS Testing Guide](https://github.com/CesiumGS/cesium/blob/main/Documentation/Contributors/TestingGuide/README.md)
- [GitHub larger runners](https://docs.github.com/en/actions/reference/runners/larger-runners)
