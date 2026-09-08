/**
 * Explicit re-export of the Cesium symbols this app actually uses.
 *
 * `cesiumProvider.initialize()` dynamically imports this module instead of
 * `cesium` directly, so the bundler sees a finite list of named imports rather
 * than a namespace import (which forces every engine export to be retained).
 * The resulting module namespace has the same member shape the ~87
 * `const Cesium = getCesium()` call sites already rely on, so they are
 * unchanged.
 *
 * Keep this list in sync with actual usage:
 *   rg -o --no-filename 'Cesium\.([A-Za-z_][A-Za-z0-9_]*)' -r '$1' src/ | sort -u
 *
 * `FeatureDetection` and `ShadowMode` are not referenced from `src/` — they are
 * reached through the `window.__cesium` handle the E2E fixtures use
 * (`src/composables/useViewerInitialization.js`), so they must stay exported.
 *
 * A symbol dropped from this list is caught by `vue-tsc` (TS2339 at each
 * `getCesium()` call site), which CI runs — except for symbols reached only
 * through the `window.__cesium` handle, which are untyped and would fail at
 * runtime.
 *
 * @module cesiumSymbols
 */

export {
	ArcType,
	BoundingSphere,
	Cartesian2,
	Cartesian3,
	Cartographic,
	Color,
	ColorMaterialProperty,
	ConstantProperty,
	Credit,
	CustomDataSource,
	DataSource,
	defined,
	EllipsoidTerrainProvider,
	Entity,
	FeatureDetection,
	GeographicTilingScheme,
	GeoJsonDataSource,
	HorizontalOrigin,
	ImageryLayer,
	ImageryLayerCollection,
	Ion,
	JulianDate,
	LabelGraphics,
	Math,
	NearFarScalar,
	OpenStreetMapImageryProvider,
	PointGraphics,
	PostProcessStageLibrary,
	PropertyBag,
	Rectangle,
	ScreenSpaceEventType,
	ShadowMode,
	StripeMaterialProperty,
	TileProviderError,
	UrlTemplateImageryProvider,
	VerticalOrigin,
	Viewer,
	WebMapServiceImageryProvider,
} from 'cesium'
