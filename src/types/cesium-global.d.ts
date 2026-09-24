// Ambient global `Cesium` namespace for JSDoc type references in plain .js files.
//
// The `cesium` package ships its types as a flat ES module (no global namespace),
// so JSDoc annotations like `/** @type {Cesium.Entity} */` cannot resolve `Cesium`
// without this shim. Here we import the module's types and re-export them under a
// global `namespace Cesium`, making `Cesium.*` resolvable everywhere in the project
// without a per-file `import * as Cesium from 'cesium'`.
//
// The import is `import type`, so the global is a type namespace only: JSDoc
// `{Cesium.Entity}` resolves, but a value use such as `new Cesium.Color()` is a
// type error (TS1361). No runtime `Cesium` global exists; bind the module with
// `const Cesium = getCesium()` from services/cesiumProvider.js instead.

// biome-ignore lint/correctness/noUnusedImports: used by the `export import` alias below, which Biome does not count as a use of a type-only import
import type * as CesiumModule from 'cesium'

declare global {
	export import Cesium = CesiumModule
}
