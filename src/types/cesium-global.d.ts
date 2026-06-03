// Ambient global `Cesium` namespace for JSDoc type references in plain .js files.
//
// The `cesium` package ships its types as a flat ES module (no global namespace),
// so JSDoc annotations like `/** @type {Cesium.Entity} */` cannot resolve `Cesium`
// without this shim. Here we import the module's types and re-export them under a
// global `namespace Cesium`, making `Cesium.*` resolvable everywhere in the project
// without a per-file `import * as Cesium from 'cesium'`.
//
// This is types-only; it emits no runtime code.

import * as CesiumModule from 'cesium'

declare global {
	export import Cesium = CesiumModule
}
