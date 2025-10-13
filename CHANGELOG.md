# Changelog

## [1.26.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.26.0...r4c-cesium-viewer-v1.26.1) (2025-10-13)


### Bug Fixes

* make initial schema migration fully idempotent ([#242](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/242)) ([aff058d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/aff058d4d0c1719908dd1c56be170d0889b64b58))

## [1.26.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.25.0...r4c-cesium-viewer-v1.26.0) (2025-10-13)


### Features

* migrate feature flag system to TypeScript ([#235](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/235)) ([66feb77](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/66feb7796108c0ffe4ba97e1472c1b1ab03f12d3)), closes [#224](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/224)

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
