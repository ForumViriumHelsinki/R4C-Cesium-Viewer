# Changelog

## [1.44.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.43.0...r4c-cesium-viewer-v1.44.0) (2026-02-19)


### Features

* **feature-flags:** audit and cleanup feature flag system ([#556](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/556)) ([7194353](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7194353c94fd226484bc04b782de6b94ffc75f9c))
* sidebar UX improvements ([#626](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/626)) ([4f2a25a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/4f2a25a6106032bd49b702c635549dc1cf71bcdf))


### Bug Fixes

* Add null check for entity.polygon to prevent TypeError ([#592](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/592)) ([17c37b4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/17c37b4e28cc0fb3e94cfd279ee4ab9bf90bc924)), closes [#585](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/585)
* Add null checks for Cesium entity property access (Fixes [#590](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/590)) ([#597](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/597)) ([abd607b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/abd607b7799e761f843f45b7180e567df815d72b))
* Add retry logic for dynamic module imports (Fixes [#591](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/591)) ([#596](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/596)) ([ef23d9b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/ef23d9bc731c1c575843726ae3fbb1b7d23240d1))
* **ci:** correct Bash tool patterns in Claude workflow permissions ([#627](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/627)) ([f3f9474](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f3f9474e31a4c1c9a01675c7b7d8f4e0086be7e2))
* **ci:** improve Claude workflow reliability and permissions ([38afb0b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/38afb0b1a9b71b55cb424133470f92a35d8f0776))
* **ci:** prevent release-please recursion on release branches ([#572](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/572)) ([ed41fda](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/ed41fdaac89d47dcd830cf8bb60387a4a1954e5c))
* **docs:** apply code review feedback from Gemini Code Assist ([92ba16c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/92ba16c1458ff99df256772f83737f384800c0d3))
* **grid:** improve 250m statistical grid performance and preserve buildings ([#536](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/536)) ([fc174dd](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/fc174dd176b243d84c86de5c88534a660cfe4ba2)), closes [#530](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/530) [#531](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/531) [#532](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/532) [#533](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/533) [#534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/534)
* Remove blur effect from inactive loading overlay ([#594](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/594)) ([bef54de](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bef54def4f62b89da2cef8e37a350cd7f3f705c0))
* **test:** enhance WMS mock coverage with fallback handler ([#628](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/628)) ([a356397](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a356397488aa6a909a1f6a6b883f185c5359c9cd))
* **test:** update camera.test.js to match new initial camera height ([#554](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/554)) ([b9c6078](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/b9c6078549e3098d9234d05060ef36e0cc9a00d4)), closes [#538](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/538)
* **test:** update e2e accessibility tests for current UI selectors ([#617](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/617)) ([78ea2b7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/78ea2b75aa5024b2a60a5949b34a6e61b7f212c5))
* **test:** update unit tests for postalCodeIndex and navigation changes ([2db9960](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2db99606bff486ff651533289cadccf236393c6e))
* TypeError in PrintBox when pickedEntity is null ([#595](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/595)) ([f5121eb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f5121ebbecd4196aab8537dfb65fe7449ba4c55d))
* **vuetify:** add eager prop to navigation drawers and overlays ([#562](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/562)) ([648aeb8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/648aeb8ef207a1857002c56b21d82ab625841bcc))


### Performance Improvements

* Add navigation coordination and WMS retry resilience improvements ([#606](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/606)) ([c6349e9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c6349e9cb12cc8b35ce9c3c40ed3df49bafb83d4))
* Implement Phase 2 optimizations - single-pass algorithms and indexing ([#603](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/603)) ([4662357](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/46623572cd4a35fb10aea81fd9051688d8869733))
* lazy-load Cesium, services, and heavy components ([#625](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/625)) ([bd3cf80](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bd3cf80811fd2c62d4546cd73385484810001a18))
* Move statistical grid loading off main thread ([#600](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/600)) ([4888a35](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/4888a35894b226c9623449f5bb357d036d9c2f1c))
* Reduce Total Blocking Time from 62s to &lt;5s ([#602](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/602)) ([bfdaa18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfdaa18c61ffb374053fb968e10c2fbb480ef7d4))

## [1.43.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.42.3...r4c-cesium-viewer-v1.43.0) (2026-01-14)

### Features

- **ux:** add altitude-based fog overlay for zoom indication ([#528](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/528)) ([987f865](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/987f8650bfb9033cd5917209c5e9615d2887f96b))

### Bug Fixes

- **ci:** prevent Lighthouse PROTOCOL_TIMEOUT for CesiumJS apps ([#526](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/526)) ([5fba9bd](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5fba9bd849ace17f793ac5484d5adb955d531f50))

## [1.42.3](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.42.2...r4c-cesium-viewer-v1.42.3) (2026-01-13)

### Bug Fixes

- **ci:** add outputDir to Lighthouse CI config to ensure manifest.json creation ([#522](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/522)) ([50f167a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/50f167a92e4671615ee1400d49d9f3ab3bfb9f7f)), closes [#521](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/521)

### Performance Improvements

- building pipeline optimizations with parallel fetching and adaptive batching ([#524](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/524)) ([8ff7e12](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8ff7e12c41c110837af50be4d6668fe6820dee4f))

## [1.42.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.42.1...r4c-cesium-viewer-v1.42.2) (2026-01-13)

### Bug Fixes

- **tooltips:** prevent building tooltip data eviction while visible ([#518](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/518)) ([c590bf5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c590bf5c988d40652ef4a32517f038a290786dcd))

### Performance Improvements

- **ci:** optimize container build for faster CI ([#516](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/516)) ([2095889](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/209588939d27bd20094e6f9d229c0248e77bdc9a))

## [1.42.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.42.0...r4c-cesium-viewer-v1.42.1) (2026-01-13)

### Bug Fixes

- **nginx:** replace bash parameter expansion with nginx variable logic ([#513](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/513)) ([f2779fd](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f2779fd77c1c3e3bfcaf580934f109938b6a2712))
- normalize feature IDs and apply heat colors for HSY buildings ([#511](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/511)) ([88ce962](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/88ce96262a48e70db80a14691043072c4b4c40c1))

## [1.42.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.41.0...r4c-cesium-viewer-v1.42.0) (2026-01-13)

### Features

- add comprehensive health and status endpoints ([#508](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/508)) ([7876631](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/787663185d6415293165290c9605a29141de808b))

## [1.41.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.40.0...r4c-cesium-viewer-v1.41.0) (2026-01-12)

### Features

- restore map state on page refresh via URL parameters ([#505](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/505)) ([518e818](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/518e8185dbd646c7774608ee145e824b594b8e46))

### Bug Fixes

- **ci:** fix Lighthouse CI failing silently without results ([#506](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/506)) ([df5b37a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/df5b37a212e9ecc631b75890dda3940892462652))

## [1.40.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.39.0...r4c-cesium-viewer-v1.40.0) (2025-12-22)

### Features

- **mock-api:** add complete building properties and documentation ([#501](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/501)) ([86c36d4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/86c36d48922bc9c2fcd0f90702e893a22c5089bd))

## [1.39.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.9...r4c-cesium-viewer-v1.39.0) (2025-12-19)

### Features

- add mock PyGeoAPI server for database-free development ([#496](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/496)) ([38d7991](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/38d799164a7c00f908048d5d3edf613d30bb9127))

### Bug Fixes

- **buildings:** ensure polygons render filled instead of wireframe ([#498](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/498)) ([8280b53](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8280b53320d24fd9018aa9e9e0a584df656dac91))

## [1.38.9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.8...r4c-cesium-viewer-v1.38.9) (2025-12-18)

### Bug Fixes

- **viewport:** defensive validation and dev experience improvements ([#493](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/493)) ([9b78300](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b78300f1b741c66a01c6b72568af23c7555262c))

## [1.38.8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.7...r4c-cesium-viewer-v1.38.8) (2025-12-18)

### Bug Fixes

- **viewport:** pass viewer.value instead of ref to ViewportBuildingLoader ([#489](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/489)) ([8cb7aac](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cb7aac8e4b9285f37da81840e640ab155274296))

## [1.38.7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.6...r4c-cesium-viewer-v1.38.7) (2025-12-18)

### Bug Fixes

- **nginx:** add emptyDir volume for conf.d to enable template processing ([#487](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/487)) ([149fc28](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/149fc28346e74354c57ed4b615cdbd861a2a071c))

## [1.38.6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.5...r4c-cesium-viewer-v1.38.6) (2025-12-18)

### Bug Fixes

- **ci:** improve Lighthouse CI error handling and PR comment clarity ([#480](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/480)) ([de66750](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/de667501c96065710a9d8b96a35047c261ff7ab6))
- **ci:** use bunx instead of global install for Lighthouse CI ([#478](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/478)) ([b353ceb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/b353ceb5d2d9f037cb3a34880e92cc74c366aec0))

## [1.38.5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.4...r4c-cesium-viewer-v1.38.5) (2025-12-16)

### Bug Fixes

- Remove event listeners on component unmount to prevent memory leaks ([#467](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/467)) ([f4a3e6e](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f4a3e6e7e13357889879c511f1d70ae42f0581da))

## [1.38.4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.3...r4c-cesium-viewer-v1.38.4) (2025-12-15)

### Bug Fixes

- prevent loading indicator from getting stuck during slow data loading ([#457](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/457)) ([ca5eadf](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/ca5eadf45f5d8e3ce6a8140fdd1f7c2993578442))
- rename lighthouserc.js to .cjs for CommonJS compatibility ([#455](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/455)) ([b0fb1a5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/b0fb1a5beb795397f75d2806c910f3a226a07742))

## [1.38.3](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.2...r4c-cesium-viewer-v1.38.3) (2025-12-12)

### Bug Fixes

- ensure polygon closure when adding cooling center manually ([#451](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/451)) ([acb3d7b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/acb3d7b4329f7bbfba444758e5d783556db33904))
- handle missing .env file in CI for vite preview ([#447](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/447)) ([6e664f8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6e664f89077c3d1d7a74e1d50468b7edf55e1706))
- improve Playwright test resilience for Tall Buildings filter ([#448](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/448)) ([22893be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/22893be644f452dd75c6e81576d08769a85648c7))
- update Dockerfile to use bun.lock instead of bun.lockb ([#444](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/444)) ([3b38092](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3b38092f61188531774cabe2b6e3ade7ce0810ce))
- update Lighthouse CI workflow to use bun instead of npm ([#446](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/446)) ([3f3f565](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3f3f56540b21ea31e0dcab4f3dcc0b64d523c4fb))
- use 'bun audit' instead of 'bun pm audit' in security scan ([#445](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/445)) ([da04212](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/da04212aaff280d37a8d2849921c445cdb485eef))

## [1.38.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.1...r4c-cesium-viewer-v1.38.2) (2025-12-11)

### Bug Fixes

- **proxy:** improve HSY action endpoint configuration and error handling ([5e2fae3](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5e2fae33378dc5ef4f062006639c39ca803dffde))

## [1.38.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.38.0...r4c-cesium-viewer-v1.38.1) (2025-12-11)

### Bug Fixes

- **deploy:** add securityContext for Kyverno policy compliance ([6ad25d6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6ad25d6f5d41a6e06582684bf4f04cb07e5861b6))

## [1.38.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.37.0...r4c-cesium-viewer-v1.38.0) (2025-12-09)

### Features

- **config:** move viewport streaming to feature flags ([34a72de](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/34a72deef253c4b760cb248506a26c73805986c3))

## [1.37.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.36.1...r4c-cesium-viewer-v1.37.0) (2025-12-03)

### Features

- **viewport:** add fade-in animation and fix cache status warnings ([#422](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/422)) ([3d50a93](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3d50a93357752e8e9a8d6f26e21e9b3c1369be56))

### Performance Improvements

- **viewport:** add altitude threshold to prevent mass building load at startup ([#424](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/424)) ([faab5d0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/faab5d0101ca5b8f7d70ce576677f1e7c367e71e))

## [1.36.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.36.0...r4c-cesium-viewer-v1.36.1) (2025-12-03)

### Bug Fixes

- **dev:** resolve port conflicts for local Skaffold development ([#419](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/419)) ([f11d794](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f11d794e1614b5d1149a793a87ce5d0f196da884))

## [1.36.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.35.0...r4c-cesium-viewer-v1.36.0) (2025-12-02)

### Features

- **dev:** add persistent services workflow with make commands ([#415](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/415)) ([b614d92](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/b614d92cd24ef31e2bcdfae0de4001ecddd525be))

## [1.35.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.34.1...r4c-cesium-viewer-v1.35.0) (2025-12-02)

### Features

- **infra:** add deployment config and auto-merge workflow ([#413](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/413)) ([19205e5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/19205e59d53393dca4668f372c05039871793ff4))
- **infra:** add PostgreSQL k8s manifests and auto-merge workflow ([#414](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/414)) ([39b0f1d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/39b0f1d0a5e1fc2d794eaf17ab6841cd3d00a3d0))

### Bug Fixes

- **viewportBuildingLoader:** fix race condition and add floating-promises lint rule ([#411](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/411)) ([9a61deb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9a61deb956d8af9b1a6284905247012b33c81108))

## [1.34.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.34.0...r4c-cesium-viewer-v1.34.1) (2025-12-01)

### Bug Fixes

- **nginx:** make DNS resolver script executable ([#409](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/409)) ([d8f137e](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/d8f137e08d9eb134ce7c4b8f9904d4d5d98793b0))

## [1.34.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.33.0...r4c-cesium-viewer-v1.34.0) (2025-12-01)

### Features

- **postalCodeLoader:** add unit tests and improve code quality ([#408](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/408)) ([7668ad9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7668ad9bc356c4445248c89e8f3eac00e1329132))
- unified dev workflow, mobile improvements, and code cleanup ([#406](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/406)) ([1b8cd83](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1b8cd834b967e2512812fc9015cb84155430422a))

## [1.33.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.32.0...r4c-cesium-viewer-v1.33.0) (2025-11-28)

### Features

- add AreaProperties component with categorization and search ([#400](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/400)) ([ac1b456](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/ac1b45634ad6e2a748436b4a84f0f374d60a4cad))
- add AreaProperties component with categorization and search ([#400](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/400)) ([#402](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/402)) ([3c47197](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3c47197fec0fd9157602d8952396efffb130c5f7))

### Bug Fixes

- resolve ESLint errors and warnings across codebase ([#403](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/403)) ([bd9a786](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bd9a7865b6a917bea820237fc2463d709762ce38))

## [1.32.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.31.0...r4c-cesium-viewer-v1.32.0) (2025-11-27)

### Features

- add user-facing error notifications for async service failures ([#395](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/395)) ([77ca677](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/77ca6778395323d8c0650ec9d716e35dcf66149b))
- add viewport-based building streaming with comprehensive test coverage ([#399](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/399)) ([283c51b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/283c51bb4ec3092cefa6d02383a2349525aebadb))
- restore UI improvements and refactor to Vuetify components ([#398](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/398)) ([a818d1e](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a818d1ef9f5b17bfcb459864f9794a2b44db06df))

### Bug Fixes

- address code quality issues from comprehensive codebase analysis ([#393](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/393)) ([af1d988](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/af1d9884edd141b5ec2c0eb233da7d424409d3e4))

## [1.31.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.30.0...r4c-cesium-viewer-v1.31.0) (2025-11-25)

### Features

- UI improvements with enhanced accessibility and loading states ([#380](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/380)) ([d2625af](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/d2625af06c83475765db484c7c2cd0a91d4358ca))

## [1.30.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.29.1...r4c-cesium-viewer-v1.30.0) (2025-11-12)

### Features

- add e2e tests for cache header verification ([#362](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/362)) ([0a55a19](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0a55a19cbb7f23b7d78ad90487b6037d31933aed))
- add error handling for dynamic Cesium import ([#370](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/370)) ([a082666](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a082666b5443d97d267dd11b3cab90d8630cfc74))
- add performance regression monitoring for tests ([#354](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/354)) ([c42302d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c42302d7c71118e5eabc72153407bb456d1fd1f0))
- Add test tags and extract URL patterns to constants ([#360](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/360)) ([1becdb6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1becdb645a189ae59a59cf1c6ed75a687f8128d4))
- Configure comprehensive cache busting strategy ([#345](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/345)) ([08f13d8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/08f13d877f5502eb2c87fa66732f571e92bee4c9))

### Bug Fixes

- enhance accessibility test stability with viewport-aware interactions ([#350](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/350)) ([754d157](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/754d157e398b1f0baaccf9f2e503b08c291287ba))
- Improve URL construction in floodwms.js ([fef6a21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/fef6a2158cebd47f5aac0eaeeae59e91d29d80a4))

### Performance Improvements

- Apply WMS tile optimization to flood and landcover services ([#357](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/357)) ([fef6a21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/fef6a2158cebd47f5aac0eaeeae59e91d29d80a4))

## [1.29.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.29.0...r4c-cesium-viewer-v1.29.1) (2025-11-11)

### Performance Improvements

- Optimize WMS tile requests to reduce N+1 API calls by 75% ([#340](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/340)) ([c88c1bf](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c88c1bfeff569800b535207be920ce023a08a602))

## [1.29.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.28.4...r4c-cesium-viewer-v1.29.0) (2025-11-11)

### Features

- add bundle size and Web Vitals performance tests ([#315](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/315)) ([5ea658f](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5ea658f28c8d6e450747e36611b772df024fbeb5))

## [1.28.4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.28.3...r4c-cesium-viewer-v1.28.4) (2025-11-11)

### Bug Fixes

- prevent DataCloneError by marking Cesium entities as non-reactive ([#336](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/336)) ([46e48f6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/46e48f67fdce47bf3c54727dfb1d278955aa55f1))

## [1.28.3](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.28.2...r4c-cesium-viewer-v1.28.3) (2025-11-10)

### Bug Fixes

- correct nginx proxy_pass path handling for pygeoapi ([#333](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/333)) ([fc61f2b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/fc61f2bc7413600fb55691549c61daabcfa0c30c))

## [1.28.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.28.1...r4c-cesium-viewer-v1.28.2) (2025-11-10)

### Bug Fixes

- update Node.js version to 24 in Dockerfile ([#331](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/331)) ([1ff765d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1ff765d7dc28bcf884c186853d18d66b9bd0990a)), closes [#330](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/330)

## [1.28.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.28.0...r4c-cesium-viewer-v1.28.1) (2025-11-10)

### Bug Fixes

- use HTTP for internal Kubernetes pygeoapi service ([#327](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/327)) ([073f35a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/073f35ad55644f12b87fb554d45b78b652f0aa07))

## [1.28.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.12...r4c-cesium-viewer-v1.28.0) (2025-11-05)

### Features

- add Helsinki city WMS proxy endpoint ([#313](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/313)) ([d53bb0a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/d53bb0aff71323bd2f280076165de50e600d9307))

## [1.27.12](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.11...r4c-cesium-viewer-v1.27.12) (2025-11-05)

### Bug Fixes

- resolve WebGL texture errors and Cesium proxy configuration issues ([#309](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/309)) ([dfc30c7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/dfc30c7825c7f56cdf56e4f498088ba4e7bc82bc))

## [1.27.11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.10...r4c-cesium-viewer-v1.27.11) (2025-11-05)

### Bug Fixes

- adjust Sentry sample rate to 0.1 to reduce quota usage ([#307](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/307)) ([98c70b2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/98c70b2c8f2dcfb58338c2d9c37576a45fc34702)), closes [#306](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/306)
- **ci:** add container configurations for self-hosted runners and fix localStorage mock ([#302](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/302)) ([72b4bd7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/72b4bd7e1a4eb7839f40ea3bfc1cfa85367aaf73))

## [1.27.10](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.9...r4c-cesium-viewer-v1.27.10) (2025-11-03)

### Bug Fixes

- add validation checks to prevent drawingBufferWidth error ([#289](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/289)) ([09a5b0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09a5b0c4acf5d192d6f8d5c34c422f436fdd5b61)), closes [#288](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/288)
- replace Cesium.defaultValue with nullish coalescing operator ([#292](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/292)) ([0d9d8c2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0d9d8c231e8d1bc8168a962a75b64b18b2e662f0)), closes [#291](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/291)

## [1.27.9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.8...r4c-cesium-viewer-v1.27.9) (2025-10-30)

### Bug Fixes

- eliminate render blocking by making Cesium CSS and services load dynamically ([#286](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/286)) ([e095a02](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/e095a02e74bd501021a1caa033de591c86cadf04)), closes [#275](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/275)

## [1.27.8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.7...r4c-cesium-viewer-v1.27.8) (2025-10-29)

### Bug Fixes

- **nginx:** add DNS resolver for dynamic proxy_pass resolution ([#284](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/284)) ([c32de76](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c32de76404c6fdd17292573a9a0d1f4fd976d039))

## [1.27.7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.6...r4c-cesium-viewer-v1.27.7) (2025-10-29)

### Bug Fixes

- add optional chaining to prevent TypeError in featurepicker ([#276](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/276)) ([d238c36](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/d238c367aa033150a03d555e17c7727b24778336)), closes [#274](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/274)
- optimize Cesium.js loading to prevent render blocking ([#279](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/279)) ([fbd84b9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/fbd84b9308b04ec0de29a748e6e4857de6bdffe9))

## [1.27.6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.5...r4c-cesium-viewer-v1.27.6) (2025-10-28)

### Bug Fixes

- remove geometry columns from B-tree indexes to prevent row size error ([#267](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/267)) ([63462cc](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/63462cc74e27e3f8462259bbb3dcc3ba58e26887))
- resolve ESLint configuration errors ([#269](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/269)) ([40061d8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/40061d807a9c83741fc9734556319e2e645e4b4d))

## [1.27.5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.4...r4c-cesium-viewer-v1.27.5) (2025-10-27)

### Bug Fixes

- resolve Docker build failure from esbuild version conflict ([#265](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/265)) ([983e78e](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/983e78e5f92e2672b75348ebb0c203f3296129a5))

## [1.27.4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.3...r4c-cesium-viewer-v1.27.4) (2025-10-27)

### Bug Fixes

- add missing checkout step to container-build workflow ([#264](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/264)) ([cfa4bb9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/cfa4bb9b7b19f54dfaea7324de6239175226b8ff))
- correct COPY destination path in Dockerfile ([#262](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/262)) ([aaa734a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/aaa734a77dedd182eb9a700e509cad724d71d900)), closes [#261](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/261)

## [1.27.3](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.2...r4c-cesium-viewer-v1.27.3) (2025-10-24)

### Bug Fixes

- disable ESLint plugin during production builds to resolve container build failure ([#256](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/256)) ([231f916](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/231f916b9c9e1c2b8d2d761660dad725981338fb))

## [1.27.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.1...r4c-cesium-viewer-v1.27.2) (2025-10-24)

### Bug Fixes

- bypass dotenvx in Docker build to resolve build failure ([#253](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/253)) ([2d9164a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2d9164abacefd742bce0a5877f4dd560776e3b11)), closes [#252](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/252)

## [1.27.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.27.0...r4c-cesium-viewer-v1.27.1) (2025-10-24)

### Bug Fixes

- remove invalid vite optimize command from Dockerfile ([#250](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/250)) ([7a684ba](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7a684ba03f038dcc872d17da44d3aba806c80e5d)), closes [#249](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/249)

## [1.27.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.26.2...r4c-cesium-viewer-v1.27.0) (2025-10-22)

### Features

- add import validation warnings for unknown feature flags ([#246](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/246)) ([7660a26](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7660a26218cd17acf6085b7b3baca92982514143))

### Bug Fixes

- split concurrent index migrations for dbmate compatibility ([#248](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/248)) ([0f17e85](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0f17e85c96cc086f149d61dd0dc4fad25ed5e959))

## [1.26.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.26.1...r4c-cesium-viewer-v1.26.2) (2025-10-15)

### Bug Fixes

- disable transactions for concurrent index migrations ([#244](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/244)) ([a3a198a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a3a198a0acab40defe19e8e9579f07f5407ed918))

## [1.26.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.26.0...r4c-cesium-viewer-v1.26.1) (2025-10-13)

### Bug Fixes

- make initial schema migration fully idempotent ([#242](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/242)) ([aff058d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/aff058d4d0c1719908dd1c56be170d0889b64b58))

## [1.26.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.25.0...r4c-cesium-viewer-v1.26.0) (2025-10-13)

### Features

- migrate feature flag system to TypeScript ([#235](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/235)) ([66feb77](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/66feb7796108c0ffe4ba97e1472c1b1ab03f12d3)), closes [#224](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/224)

## [1.25.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.24.1...r4c-cesium-viewer-v1.25.0) (2025-10-10)

### Features

- add isolatedModules to tsconfig.json ([#231](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/231)) ([5b34656](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5b34656a51d609f626db712ec8756a86528e2dc7)), closes [#219](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/219)

## [1.24.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.24.0...r4c-cesium-viewer-v1.24.1) (2025-10-10)

### Bug Fixes

- correct Vitest deps configuration and improve test infrastructure ([#229](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/229)) ([20d3736](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/20d373629cb5c55dfdfc1b102019fa07cae2f67e))

## [1.24.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.23.1...r4c-cesium-viewer-v1.24.0) (2025-10-08)

### Features

- Implement runtime configuration feature flags (Strategy 2) ([#221](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/221)) ([0f95c49](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0f95c49c6ac892c3291d3f3d2b17d664536cb011))

## [1.23.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.23.0...r4c-cesium-viewer-v1.23.1) (2025-10-01)

### Bug Fixes

- enable TypeScript strict mode for better JSDoc inference ([#217](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/217)) ([f1e070e](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f1e070ee283264ab392fb2e6d707644b25a3369e)), closes [#214](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/214)
- Prevent HSY background map clicks from triggering postal code selection ([#212](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/212)) ([2e88816](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2e8881601ffaeb5b4bfdbfcc071a220edb803a92)), closes [#102](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/102)
- replace deprecated deps.inline with deps.optimizer.web.include ([#216](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/216)) ([9f33149](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9f33149a01fc64591732aba322df1d84e36ae9bc)), closes [#215](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/215)

## [1.23.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.22.0...r4c-cesium-viewer-v1.23.0) (2025-09-30)

### Features

- add comprehensive test suite with CI/CD pipeline ([d20a105](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/d20a1056640cee2476f336b730a15cb2ef89709f))
- Database infrastructure, performance optimizations ([#209](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/209)) ([7eb3bde](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7eb3bdea69c725bc0b56f206f9de770af2ba7ad5))
- make PygeoAPI URL configurable via environment variables ([#199](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/199)) ([6b92f47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6b92f47893eac7921627e594fec375cf0279bfbd))

### Bug Fixes

- climate adaption components [#205](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/205) ([#211](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/211)) ([56e076b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/56e076b09dd66226326c9f6a1beea482940145b8))
- hide postal code functionalities when switching to grid view [#203](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/203) ([#210](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/210)) ([283afb0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/283afb055e4b6a6ccd46c5f7f3f6d59acff1aca7))
- resolve nginx configuration syntax error in pygeoapi proxy ([#201](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/201)) ([8655cca](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8655cca25e0a4ad4f9fdce66e037f539cb47a9d8))

## [1.22.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.21.0...r4c-cesium-viewer-v1.22.0) (2025-08-29)

### Features

- parks documentation [#189](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/189) ([#190](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/190)) ([831e65e](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/831e65e2a4e28b537e20fe9d8a1ac33bf82c79c3))

## [1.21.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.20.1...r4c-cesium-viewer-v1.21.0) (2025-08-28)

### Features

- 2025 satellite data [#185](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/185) ([#186](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/186)) ([3ac960a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3ac960ad02e151021695b147f52356012bdf0547))

### Bug Fixes

- parks coloring [#184](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/184) ([#188](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/188)) ([5cbf784](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5cbf78419b539a34ad6497e87890c36ff2b083a1))

## [1.20.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.20.0...r4c-cesium-viewer-v1.20.1) (2025-08-28)

### Bug Fixes

- cooling centers [#181](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/181) ([#182](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/182)) ([0269f37](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0269f371f46036496808e406ab0e3ba28a3f4d46))

## [1.20.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.19.2...r4c-cesium-viewer-v1.20.0) (2025-08-22)

### Features

- distance to landcover parks [#171](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/171) ([#179](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/179)) ([fccaa4c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/fccaa4c7892e8b9b6970d712d8ba5bd8a9690893))

## [1.19.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.19.1...r4c-cesium-viewer-v1.19.2) (2025-08-15)

### Bug Fixes

- **nginx:** set explicit Host header for pygeoapi proxy ([#177](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/177)) ([5a10558](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5a105585fb526187880b106050e50700f868bbd5))

## [1.19.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.19.0...r4c-cesium-viewer-v1.19.1) (2025-08-14)

### Bug Fixes

- **vite:** handle malformed URLs in proxy configuration ([#174](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/174)) ([4f19889](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/4f19889789949bd79faa2658a74af86b55b9f1a7))

## [1.19.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.18.0...r4c-cesium-viewer-v1.19.0) (2025-08-07)

### Features

- parks adaption module [#164](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/164) ([#169](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/169)) ([85a5d3c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/85a5d3c2d3fd175fc0b1c7315ba8ad5a3d2b1ddf))

## [1.18.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.17.3...r4c-cesium-viewer-v1.18.0) (2025-08-01)

### Features

- compass and zoom [#166](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/166) ([#167](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/167)) ([c66048b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c66048b87e5d12c7d04108ad830ae1886e6dfedf))

## [1.17.3](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.17.2...r4c-cesium-viewer-v1.17.3) (2025-06-23)

### Bug Fixes

- pygeoapi proxy host ([#162](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/162)) ([3662a21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3662a21c2e3beeb56d5d7023889912a3dc5b722e))

## [1.17.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.17.1...r4c-cesium-viewer-v1.17.2) (2025-06-23)

### Bug Fixes

- **nginx:** pygeoapi proxy url ([#160](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/160)) ([61c8999](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/61c8999fc588ae966ee8ffc8d6b3b895c5fcdb48))

## [1.17.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.17.0...r4c-cesium-viewer-v1.17.1) (2025-04-28)

### Bug Fixes

- **sentry:** release name ([#157](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/157)) ([6a88d90](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6a88d905e7cff1c6115a66e29693b041e41c4f4e))

## [1.17.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.16.1...r4c-cesium-viewer-v1.17.0) (2025-04-28)

### Features

- add versioning to assets for cache busting ([#155](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/155)) ([217747c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/217747ca88addbf38c57ff7521e763e27dbbb44e))

## [1.16.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.16.0...r4c-cesium-viewer-v1.16.1) (2025-04-25)

### Bug Fixes

- **dockerfile:** Sentry integration ([#153](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/153)) ([c25d152](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c25d1527d781c13954976bdd31acbd7ef97408ff))

## [1.16.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.15.0...r4c-cesium-viewer-v1.16.0) (2025-04-07)

### Features

- Cooling centers update ([#149](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/149)) ([9fcee2b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9fcee2bd083dc7cfb0febd5d6aea1c258ef990bc))
- removed console logs [#144](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/144) ([#151](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/151)) ([6642369](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6642369aad46d1731b36c287f4fb161487e23243))

## [1.15.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.14.0...r4c-cesium-viewer-v1.15.0) (2025-04-02)

### Features

- Cooling centers update ([#147](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/147)) ([26f009b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/26f009b5a6a880798d2862b3e3ae5ab645298c28))

## [1.14.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.13.0...r4c-cesium-viewer-v1.14.0) (2025-03-31)

### Features

- Cooling centers mvp [#144](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/144) ([#145](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/145)) ([021793a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/021793aae099265f877d0fa2964a167e7b9a399c))

## [1.13.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.12.0...r4c-cesium-viewer-v1.13.0) (2025-03-13)

### Features

- pass sentry dsn via env var ([#139](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/139)) ([b938631](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/b938631cd2f20bb641f76896c6e8061742283f92))

## [1.12.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.11.0...r4c-cesium-viewer-v1.12.0) (2025-03-12)

### Features

- added tree height [#135](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/135) ([#138](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/138)) ([e7c01e8](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/e7c01e8eef58eba355397545c4b564ec863b91b1))
- Cloud functions update [#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74) ([#133](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/133)) ([66b2af9](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/66b2af9263b4215725af7c2d7ca8e74a79826f52))

### Bug Fixes

- added vtj_prt [#136](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/136) ([#137](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/137)) ([12cd7eb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/12cd7ebe7ca7fb77f5df958d14bdb9f7bedc10cf))

## [1.11.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.10.2...r4c-cesium-viewer-v1.11.0) (2025-02-27)

### Features

- [#130](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/130) ([#132](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/132)) ([da49f4d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/da49f4dc3f15c347c22688eba999f966f6fa6d5d))
- Cloud functions docs [#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74) ([#129](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/129)) ([2951287](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/29512873cd39b4ba45cb1351bfc10db7885a3a9b))
- paavo updated 2025, only shown if data, can compare region ( default) [#121](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/121) ([#125](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/125)) ([b2320ce](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/b2320ce3152e0c56738a3ba2e22b17f4c2e2ac02))
- removed hardcoding [#121](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/121) ([#127](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/127)) ([e716394](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/e71639431f56801ce8f26c887e2538d342c29bec))

### Bug Fixes

- updated docs and calculation result [#97](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/97) ([#128](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/128)) ([e66713a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/e66713a1215936b2caa5503c0772fbf39a20e639))

## [1.10.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.10.1...r4c-cesium-viewer-v1.10.2) (2025-02-25)

### Bug Fixes

- removed console logs [#85](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/85) ([#119](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/119)) ([be1d0b5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/be1d0b5fa193485569fdeab11ccad88eacd882c3))

## [1.10.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.10.0...r4c-cesium-viewer-v1.10.1) (2025-02-21)

### Bug Fixes

- fixed ndvi calcualtion [#113](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/113) ([#114](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/114)) ([400d566](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/400d566f14040f5f6d68324de2055e4853606c4f))

## [1.10.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.9.1...r4c-cesium-viewer-v1.10.0) (2025-02-14)

### Features

- added new heat dates and made changes to reflect database changes ([#103](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/103)) ([c645ff6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c645ff66d060edace992482c000a7fac8ad51210))
- implementation for ([#100](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/100)) ([c6dbec1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/c6dbec14d4498eba405ad25d0516d8394531dc19))
- implementation for ([#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74)) ([7758016](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7758016bd68c0ac916436cd2fdc465caf55810ce))
- legend colors, ref to syke ([#100](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/100)) ([7056544](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/70565441f262d868f2ba6194896a948d054d923f))
- stormwater implementation for, also fixed bugs and legends, disclaimer added ([#100](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/100)) ([77af9bf](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/77af9bfd7c096c074d8a7dfb994ff4dba91b1e09))

### Bug Fixes

- building level fixed ([#103](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/103)) ([2f59671](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2f596712ced7ac4de2155c7657db80c8b213f365))
- failed fix ([#102](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/102)) ([a756dac](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a756dac976db65b6474e018ec2a765720d7e05f8))
- fixed legend and added attribution to syke ([#104](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/104)) ([04509d7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/04509d75f9f16bdc189a267da0ba5e07c77118d9))

## [1.9.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.9.0...r4c-cesium-viewer-v1.9.1) (2025-02-07)

### Bug Fixes

- pygeoapi url ([01404b0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/01404b0a0b053ad4d3f26692f57f3d8d1f28e5ba))

## [1.9.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.8.2...r4c-cesium-viewer-v1.9.0) (2025-01-31)

### Features

- fix and instructions for ([#97](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/97)) ([9a69102](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9a691026c13ec3b005061a0feccc8e6b12395c05))
- Implement NDVI calculation with GCS input/output ([#97](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/97)) ([a172be4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a172be45d16a8021b9e0117a1c6ab99d1c6e56c0))
- implementation for ([#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74)) ([e36b248](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/e36b2486809afbc7094225ceab12f6eb8848b2bc))

### Bug Fixes

- 94 bug with layers when user changes modes ([7a91099](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7a9109964d7e0ebfa7cd01364f0a36fdd5e4c4e0))

## [1.8.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.8.1...r4c-cesium-viewer-v1.8.2) (2025-01-15)

### Bug Fixes

- 78: changed ref to store CesiumViewer ([82ebfae](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/82ebfae461f8741c086c5f2485b16d1c40190bda))
- 79: added delays to featurepicker and buildinginformation ([148265a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/148265a9785d965a7e4ec39828aaabf7f63cc4e7))
- 79: reduced the bug by adding delay to clicker ([4e65438](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/4e65438eb75b0cd3b1e72cc67e4a784660d80df5))
- 79: rendering bug when entering grid view if timeline has changed ([0d00b83](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0d00b8337f26b51d40c5b75e0d6cb9c278c81278))
- 86 added functionality for updating temperature to buildingInfo ([db04c68](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/db04c6897c67f18f7e620f4b5b6dd7f1435fec9e))
- 87 timeline is shown at building level ([490c6ef](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/490c6ef0e9d2e9a7c2f777dd3cfecae086eb4e7a))
- 87 timeline is shown at building level ([039a8da](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/039a8da95b4dc13ec45e97ebca17ad752b01f9ca))
- 88 250m dialog/legend title is now “Statistical grid options” ([7ef670b](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7ef670bb22345f1409cefccced2b969ba393f6f1))
- 89 stats grid legend and related functionalities moved to sidebar ([0b19ca7](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0b19ca7ab2e3794595122dde2c97688537fb60e3))
- 90 fixed multiple issues with print ([9681278](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/968127803ce1c51a68260446e4829283cb756cc9))
- 91 toggle button moves with sidebar ([3d62ea1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/3d62ea18ed9502603823666a0e4ca2d0501676ae))

## [1.8.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.8.0...r4c-cesium-viewer-v1.8.1) (2025-01-13)

### Bug Fixes

- build workflow trigger tag ([#82](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/82)) ([9ca3a8f](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9ca3a8fef33d786ea0e42aae4a44e5138f84a80b))

## [1.8.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.7.0...r4c-cesium-viewer-v1.8.0) (2025-01-10)

### Features

- add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
- **cesium-viewer:** Resize the Cesium viewer to 100% height ([#48](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/48)) ([09da57a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09da57ae211051c472ece885f0f917a0e14c29a5))
- Fix image name in skaffold.yaml ([299a1fb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/299a1fbc7ca7e77be11aaa2b74fcfac16aafb53f))
- integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
- parse release-please manifest driven release tag format ([#80](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/80)) ([4f0dd54](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/4f0dd54a35cdbb354327b5f9d02b8ef695ddf267))
- **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))
- Remove password protection for 250m grid ([#44](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/44)) ([6fd947d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6fd947d7939d8698df60d112ff1bc8dae3ad7c76))
- update disclaimer ([#59](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/59)) ([96e09c4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/96e09c4eda13c35ecd07a43a65f2b2e2e5fc2d5d))

### Bug Fixes

- build errors ([#58](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/58)) ([7765961](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7765961e4ca723f5fdc068d2a208f652e59e9c57))
- **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
- Cesium Ion token reminder ([#47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/47)) ([a0eb4f5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0eb4f5ec51d5c6f9fd19c3e019611d759769d21)), closes [#40](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/40)
- Configure scripts to run in Cloud Functions ([#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74)) ([1f91d16](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1f91d16cb22194dcbc98c9fe300d687206cbe77b))
- Configure scripts to run in Cloud Functions ([#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74)) ([585e0ee](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/585e0ee4196d127abf19090c193b3481a030b690))
- container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
- docker build ([#65](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/65)) ([0f7f4e2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0f7f4e247adc2c57662b2b5f2361dfd94be901db))
- **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
- eslint error ([#61](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/61)) ([9d80486](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9d804868a32a69201df4a5b88fb8b2d4858d277f))
- eslint warnings ([#69](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/69)) ([f17b9e1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f17b9e1a4b601b4da6c459ebbc5871c82263a49d))
- geocoding apiKey missing ([#57](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/57)) ([249f143](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/249f14368cc3f046c15c07384ab9a3f2c1984d0b))
- geocoding when running in nginx ([#66](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/66)) ([383583f](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/383583f5981d7c10a77f4fa2a8f079e73b7ebc23))
- heat vulnerability legend ([#72](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/72)) ([064233f](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/064233f98ff63244ff1068aad497154628415f05))
- mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
- missing import ([#62](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/62)) ([25eeaa0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/25eeaa0796aaed983476a44bb0db9e2b16d4a230))
- playwright tests ([#55](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/55)) ([9b5bde6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b5bde637a694bdb190dd8df89f2f2e5c5511c97))
- README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
- **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
- skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
- **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))
- tree loading ([#67](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/67)) ([f415ca4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f415ca4306861e04303f089bd5b85bc0baf325be)), closes [#51](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/51)
- tree loading ([#68](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/68)) ([1196b93](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1196b9364ede4fd0ca3636e5047b61c50f581082))
- unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.7.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.6.1...v1.7.0) (2024-11-22)

### Features

- add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
- **cesium-viewer:** Resize the Cesium viewer to 100% height ([#48](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/48)) ([09da57a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09da57ae211051c472ece885f0f917a0e14c29a5))
- Fix image name in skaffold.yaml ([299a1fb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/299a1fbc7ca7e77be11aaa2b74fcfac16aafb53f))
- integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
- **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))
- Remove password protection for 250m grid ([#44](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/44)) ([6fd947d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6fd947d7939d8698df60d112ff1bc8dae3ad7c76))
- update disclaimer ([#59](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/59)) ([96e09c4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/96e09c4eda13c35ecd07a43a65f2b2e2e5fc2d5d))

### Bug Fixes

- build errors ([#58](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/58)) ([7765961](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7765961e4ca723f5fdc068d2a208f652e59e9c57))
- **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
- Cesium Ion token reminder ([#47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/47)) ([a0eb4f5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0eb4f5ec51d5c6f9fd19c3e019611d759769d21)), closes [#40](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/40)
- container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
- **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
- eslint error ([#61](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/61)) ([9d80486](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9d804868a32a69201df4a5b88fb8b2d4858d277f))
- geocoding apiKey missing ([#57](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/57)) ([249f143](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/249f14368cc3f046c15c07384ab9a3f2c1984d0b))
- mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
- missing import ([#62](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/62)) ([25eeaa0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/25eeaa0796aaed983476a44bb0db9e2b16d4a230))
- playwright tests ([#55](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/55)) ([9b5bde6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b5bde637a694bdb190dd8df89f2f2e5c5511c97))
- README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
- **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
- skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
- **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))
- unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.6.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.6.0...v1.6.1) (2024-11-20)

### Bug Fixes

- geocoding apiKey missing ([#57](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/57)) ([249f143](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/249f14368cc3f046c15c07384ab9a3f2c1984d0b))
- playwright tests ([#55](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/55)) ([9b5bde6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b5bde637a694bdb190dd8df89f2f2e5c5511c97))

## [1.6.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.5.0...v1.6.0) (2024-11-15)

### Features

- **cesium-viewer:** Resize the Cesium viewer to 100% height ([#48](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/48)) ([09da57a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09da57ae211051c472ece885f0f917a0e14c29a5))
- Remove password protection for 250m grid ([#44](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/44)) ([6fd947d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6fd947d7939d8698df60d112ff1bc8dae3ad7c76))

### Bug Fixes

- Cesium Ion token reminder ([#47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/47)) ([a0eb4f5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0eb4f5ec51d5c6f9fd19c3e019611d759769d21)), closes [#40](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/40)

## [1.5.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.4.2...v1.5.0) (2024-11-12)

### Features

- add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
- Fix image name in skaffold.yaml ([299a1fb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/299a1fbc7ca7e77be11aaa2b74fcfac16aafb53f))
- integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
- **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))

### Bug Fixes

- **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
- container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
- **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
- mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
- README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
- **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
- skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
- **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))
- unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.4.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.4.1...v1.4.2) (2024-11-12)

### Bug Fixes

- **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
- **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))

## [1.4.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.4.0...v1.4.1) (2024-11-12)

### Bug Fixes

- unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.4.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.3.0...v1.4.0) (2024-11-09)

### Features

- add appVersion to Helm chart ([#15](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/15)) ([7b36ce1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7b36ce1aaca1cd7f50d2efc99a42f40768c57fbe))
- add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
- integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
- **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))

### Bug Fixes

- **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
- container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
- mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
- README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
- **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
- skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
- update values file ([#17](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/17)) ([a0484be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0484be53e53391041164a44fcd2c625646a919a))

## [1.3.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.2.2...r4c-cesium-viewer-v1.3.0) (2024-11-08)

### Features

- add appVersion to Helm chart ([#15](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/15)) ([7b36ce1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7b36ce1aaca1cd7f50d2efc99a42f40768c57fbe))
- add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
- integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
- **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))

### Bug Fixes

- **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
- container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
- mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
- README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
- skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
- update values file ([#17](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/17)) ([a0484be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0484be53e53391041164a44fcd2c625646a919a))

## [1.2.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.2.1...r4c-cesium-viewer-v1.2.2) (2024-11-08)

### Bug Fixes

- **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))

## [1.2.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.2.0...r4c-cesium-viewer-v1.2.1) (2024-11-08)

### Bug Fixes

- container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))

## [1.2.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.1.0...r4c-cesium-viewer-v1.2.0) (2024-11-08)

### Features

- add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))

### Bug Fixes

- mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
- skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))

## [1.1.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.0.0...r4c-cesium-viewer-v1.1.0) (2024-11-08)

### Features

- add appVersion to Helm chart ([#15](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/15)) ([7b36ce1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7b36ce1aaca1cd7f50d2efc99a42f40768c57fbe))

### Bug Fixes

- update values file ([#17](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/17)) ([a0484be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0484be53e53391041164a44fcd2c625646a919a))

## 1.0.0 (2024-11-08)

### Features

- integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
- **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))

### Bug Fixes

- README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
