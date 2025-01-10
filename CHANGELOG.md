# Changelog

## [1.8.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.7.0...r4c-cesium-viewer-v1.8.0) (2025-01-10)


### Features

* add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
* **cesium-viewer:** Resize the Cesium viewer to 100% height ([#48](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/48)) ([09da57a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09da57ae211051c472ece885f0f917a0e14c29a5))
* Fix image name in skaffold.yaml ([299a1fb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/299a1fbc7ca7e77be11aaa2b74fcfac16aafb53f))
* integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
* parse release-please manifest driven release tag format ([#80](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/80)) ([4f0dd54](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/4f0dd54a35cdbb354327b5f9d02b8ef695ddf267))
* **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))
* Remove password protection for 250m grid ([#44](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/44)) ([6fd947d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6fd947d7939d8698df60d112ff1bc8dae3ad7c76))
* update disclaimer ([#59](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/59)) ([96e09c4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/96e09c4eda13c35ecd07a43a65f2b2e2e5fc2d5d))


### Bug Fixes

* build errors ([#58](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/58)) ([7765961](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7765961e4ca723f5fdc068d2a208f652e59e9c57))
* **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
* Cesium Ion token reminder ([#47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/47)) ([a0eb4f5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0eb4f5ec51d5c6f9fd19c3e019611d759769d21)), closes [#40](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/40)
* Configure scripts to run in Cloud Functions ([#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74)) ([1f91d16](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1f91d16cb22194dcbc98c9fe300d687206cbe77b))
* Configure scripts to run in Cloud Functions ([#74](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/74)) ([585e0ee](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/585e0ee4196d127abf19090c193b3481a030b690))
* container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
* docker build ([#65](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/65)) ([0f7f4e2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0f7f4e247adc2c57662b2b5f2361dfd94be901db))
* **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
* eslint error ([#61](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/61)) ([9d80486](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9d804868a32a69201df4a5b88fb8b2d4858d277f))
* eslint warnings ([#69](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/69)) ([f17b9e1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f17b9e1a4b601b4da6c459ebbc5871c82263a49d))
* geocoding apiKey missing ([#57](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/57)) ([249f143](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/249f14368cc3f046c15c07384ab9a3f2c1984d0b))
* geocoding when running in nginx ([#66](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/66)) ([383583f](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/383583f5981d7c10a77f4fa2a8f079e73b7ebc23))
* heat vulnerability legend ([#72](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/72)) ([064233f](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/064233f98ff63244ff1068aad497154628415f05))
* mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
* missing import ([#62](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/62)) ([25eeaa0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/25eeaa0796aaed983476a44bb0db9e2b16d4a230))
* playwright tests ([#55](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/55)) ([9b5bde6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b5bde637a694bdb190dd8df89f2f2e5c5511c97))
* README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
* **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
* skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
* **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))
* tree loading ([#67](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/67)) ([f415ca4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/f415ca4306861e04303f089bd5b85bc0baf325be)), closes [#51](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/51)
* tree loading ([#68](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/68)) ([1196b93](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/1196b9364ede4fd0ca3636e5047b61c50f581082))
* unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.7.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.6.1...v1.7.0) (2024-11-22)


### Features

* add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
* **cesium-viewer:** Resize the Cesium viewer to 100% height ([#48](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/48)) ([09da57a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09da57ae211051c472ece885f0f917a0e14c29a5))
* Fix image name in skaffold.yaml ([299a1fb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/299a1fbc7ca7e77be11aaa2b74fcfac16aafb53f))
* integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
* **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))
* Remove password protection for 250m grid ([#44](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/44)) ([6fd947d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6fd947d7939d8698df60d112ff1bc8dae3ad7c76))
* update disclaimer ([#59](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/59)) ([96e09c4](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/96e09c4eda13c35ecd07a43a65f2b2e2e5fc2d5d))


### Bug Fixes

* build errors ([#58](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/58)) ([7765961](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7765961e4ca723f5fdc068d2a208f652e59e9c57))
* **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
* Cesium Ion token reminder ([#47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/47)) ([a0eb4f5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0eb4f5ec51d5c6f9fd19c3e019611d759769d21)), closes [#40](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/40)
* container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
* **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
* eslint error ([#61](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/61)) ([9d80486](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9d804868a32a69201df4a5b88fb8b2d4858d277f))
* geocoding apiKey missing ([#57](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/57)) ([249f143](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/249f14368cc3f046c15c07384ab9a3f2c1984d0b))
* mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
* missing import ([#62](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/62)) ([25eeaa0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/25eeaa0796aaed983476a44bb0db9e2b16d4a230))
* playwright tests ([#55](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/55)) ([9b5bde6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b5bde637a694bdb190dd8df89f2f2e5c5511c97))
* README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
* **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
* skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
* **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))
* unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.6.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.6.0...v1.6.1) (2024-11-20)


### Bug Fixes

* geocoding apiKey missing ([#57](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/57)) ([249f143](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/249f14368cc3f046c15c07384ab9a3f2c1984d0b))
* playwright tests ([#55](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/55)) ([9b5bde6](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9b5bde637a694bdb190dd8df89f2f2e5c5511c97))

## [1.6.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.5.0...v1.6.0) (2024-11-15)


### Features

* **cesium-viewer:** Resize the Cesium viewer to 100% height ([#48](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/48)) ([09da57a](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/09da57ae211051c472ece885f0f917a0e14c29a5))
* Remove password protection for 250m grid ([#44](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/44)) ([6fd947d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/6fd947d7939d8698df60d112ff1bc8dae3ad7c76))


### Bug Fixes

* Cesium Ion token reminder ([#47](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/47)) ([a0eb4f5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0eb4f5ec51d5c6f9fd19c3e019611d759769d21)), closes [#40](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/40)

## [1.5.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.4.2...v1.5.0) (2024-11-12)


### Features

* add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
* Fix image name in skaffold.yaml ([299a1fb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/299a1fbc7ca7e77be11aaa2b74fcfac16aafb53f))
* integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
* **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))


### Bug Fixes

* **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
* container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
* **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
* mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
* README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
* **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
* skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
* **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))
* unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.4.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.4.1...v1.4.2) (2024-11-12)


### Bug Fixes

* **docs:** fix skaffold command in README.md ([9cf3698](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/9cf3698ae90656609a176cecd080765ad14f5f12))
* **tests:** Use dev instead of preview for tests ([842eabb](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/842eabbde3be0926808f6e0441312f5e4c632edc))

## [1.4.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.4.0...v1.4.1) (2024-11-12)


### Bug Fixes

* unable to read polygon ([bfd729c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/bfd729c8ff28246e0f7f8ff806be839009c17a82))

## [1.4.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/v1.3.0...v1.4.0) (2024-11-09)


### Features

* add appVersion to Helm chart ([#15](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/15)) ([7b36ce1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7b36ce1aaca1cd7f50d2efc99a42f40768c57fbe))
* add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
* integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
* **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))


### Bug Fixes

* **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
* container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
* mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
* README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
* **release:** semver tags ([7e99e0c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7e99e0c00ca4c799e51039037da897f061a2f80d))
* skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
* update values file ([#17](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/17)) ([a0484be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0484be53e53391041164a44fcd2c625646a919a))

## [1.3.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.2.2...r4c-cesium-viewer-v1.3.0) (2024-11-08)


### Features

* add appVersion to Helm chart ([#15](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/15)) ([7b36ce1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7b36ce1aaca1cd7f50d2efc99a42f40768c57fbe))
* add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))
* integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
* **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))


### Bug Fixes

* **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))
* container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))
* mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
* README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
* skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))
* update values file ([#17](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/17)) ([a0484be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0484be53e53391041164a44fcd2c625646a919a))

## [1.2.2](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.2.1...r4c-cesium-viewer-v1.2.2) (2024-11-08)


### Bug Fixes

* **build:** add sentry env variables ([2a41534](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/2a415341b0379194d108e88db636111db38402ce))

## [1.2.1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.2.0...r4c-cesium-viewer-v1.2.1) (2024-11-08)


### Bug Fixes

* container build tags ([#22](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/22)) ([114016c](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/114016c4879c2cb4faf1e223d41f9adb4d3635bd))

## [1.2.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.1.0...r4c-cesium-viewer-v1.2.0) (2024-11-08)


### Features

* add dotenv package for env variables ([#21](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/21)) ([a9ff6b1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a9ff6b1baf89593a8a9af48ea6a2e4f25b64ea66))


### Bug Fixes

* mangled merge ([eab3899](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/eab3899f166392f6043eaa46dc86f47b15772d18))
* skaffold config ([#18](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/18)) ([0186560](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/0186560b755d42ac5359cfb1ed6d69340e6f229a))

## [1.1.0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/compare/r4c-cesium-viewer-v1.0.0...r4c-cesium-viewer-v1.1.0) (2024-11-08)


### Features

* add appVersion to Helm chart ([#15](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/15)) ([7b36ce1](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/7b36ce1aaca1cd7f50d2efc99a42f40768c57fbe))


### Bug Fixes

* update values file ([#17](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/17)) ([a0484be](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/a0484be53e53391041164a44fcd2c625646a919a))

## 1.0.0 (2024-11-08)


### Features

* integrate playwright ([#5](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/5)) ([8cfc3e0](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/8cfc3e09ff229f8e2d1cff99f1ba9c19d19bf958))
* **release:** add release-please configuration ([#11](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/11)) ([5310693](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/5310693704c75b69b3dd33adabe00184b0f7c3ff))


### Bug Fixes

* README.md ([#13](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/issues/13)) ([567b90d](https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/commit/567b90d1cf47e86c0e6d8e13157f5158db612780))
