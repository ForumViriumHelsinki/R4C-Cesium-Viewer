/**
 * @module services/landcover
 * Provides functions for adding and removing HSY (Helsinki Region Environmental Services)
 * landcover imagery layers from the CesiumJS viewer. Supports multi-year landcover data
 * with 13 different land classification types.
 *
 * Landcover classification types:
 * - Open rock surfaces (avokalliot)
 * - Sea area (merialue)
 * - Other open low vegetation (muu_avoin_matala_kasvillisuus)
 * - Other impermeable surface (muu_vetta_lapaisematon_pinta)
 * - Unpaved roads (paallystamaton_tie)
 * - Paved roads (paallystetty_tie)
 * - Bare soil (paljas_maa)
 * - Fields (pellot)
 * - Trees 2-10m, 10-15m, 15-20m, >20m (puusto height categories)
 * - Water (vesi)
 */

import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useURLStore } from '../stores/urlStore.js'
import logger from '../utils/logger.js'
import { getGlobalWMSRetryHandler } from '../utils/wmsRetryHandler.js'
import { getCesium } from './cesiumProvider.js'
import { isHostDegraded, recordFailure } from './hostCircuitBreaker.js'

/**
 * Imagery layer augmented with a stored error-listener remover so
 * {@link removeLandcover} can detach the provider's error listener (preventing
 * a listener leak across toggles).
 * @typedef {Object} TrackedImageryLayer
 * @property {() => void} [_removeErrorHandler]
 */

/**
 * Creates and adds HSY landcover WMS imagery layer to the Cesium viewer
 * Loads multi-layer landcover data from HSY WMS with year-specific layer names.
 * Supports custom layer lists or auto-generates all 13 landcover types.
 *
 * Performance optimizations:
 * - Uses 512x512px tiles (default: 256x256) to reduce request count by ~75%
 * - Limits maximum zoom level to 18 to prevent excessive tile requests
 * - Uses GeographicTilingScheme for EPSG:4326 coordinate system
 *
 * These optimizations prevent N+1 API call issues similar to those resolved in PR #340.
 * Larger tiles (512px) balance request reduction with download size, while zoom level
 * limit (18) provides sufficient detail for landcover visualization without excessive tiles.
 *
 * @param {string} [newLayers] - Optional comma-separated WMS layer names. If not provided, loads all landcover layers for selected year.
 * @returns {Promise<void>}
 * @throws {Error} If WMS provider initialization fails
 *
 * @example
 * // Load default landcover layers for the year in backgroundMapStore
 * await createHSYImageryLayer();
 *
 * @example
 * // Load specific layers
 * await createHSYImageryLayer('asuminen_ja_maankaytto:maanpeite_vesi_2023');
 *
 * @see {@link https://github.com/ForumViriumHelsinki/R4C-Cesium-Viewer/pull/340|PR #340 - WMS Tile Optimization}
 */
export const createHSYImageryLayer = async (newLayers) => {
	const Cesium = getCesium()
	const store = useGlobalStore()
	const urlStore = useURLStore()

	const backgroundMapStore = useBackgroundMapStore()
	const layersList = newLayers ? newLayers : createLayersForHsyLandcover(backgroundMapStore)

	const provider = new Cesium.WebMapServiceImageryProvider({
		url: urlStore.wmsProxy,
		layers: layersList,
		// Performance optimization: Use larger tiles to reduce request count
		// 512x512 tiles reduce requests by ~75% compared to default 256x256
		tileWidth: 512,
		tileHeight: 512,
		// Limit zoom levels to prevent excessive tile loading
		minimumLevel: 0,
		maximumLevel: 18,
		// Use geographic tiling scheme for EPSG:4326 (WGS84)
		tilingScheme: new Cesium.GeographicTilingScheme(),
	})

	// HSY-outage resilience: bound and quiet the imagery layer's tile errors.
	// When HSY's WMS gateway returns 504 (or is down), Cesium would otherwise
	// error-storm with retries against a hung upstream — the layer renders
	// nothing and the hung requests starve the connection pool. We:
	//   1. feed each tile error to the shared WMS retry handler (bounded
	//      exponential backoff, capped retry count), and
	//   2. once the per-host circuit breaker has opened for the HSY proxy,
	//      stop retrying entirely (error.retry stays false) so failed tiles
	//      degrade quietly — the base map and the rest of the app keep working.
	// Each tile error is also recorded into the breaker so it opens (and the
	// user-facing "layers unavailable" notice fires) under a sustained outage.
	const retryHandler = getGlobalWMSRetryHandler()
	const proxyUrl = urlStore.wmsProxy
	const errorHandler = (error) => {
		recordFailure(proxyUrl)
		if (isHostDegraded(proxyUrl)) {
			// Breaker open — degrade quietly instead of retrying into the hang.
			error.retry = false
			return
		}
		retryHandler.handleTileError(error, 'HSY-landcover')
	}
	const removeErrorListener = provider.errorEvent.addEventListener(errorHandler)

	// Cesium 1.104+ removed ImageryProvider.readyPromise/ready — WebMapServiceImageryProvider
	// is usable immediately after construction, so no await is needed here.
	// Add the new layer and update store
	const addedLayer = /** @type {TrackedImageryLayer} */ (
		store.cesiumViewer.imageryLayers.addImageryProvider(provider)
	)
	addedLayer._removeErrorHandler = removeErrorListener
	backgroundMapStore.landcoverLayers.push(addedLayer)
}

/**
 * Removes all HSY landcover layers from the Cesium viewer
 * Safely removes all tracked landcover imagery layers and clears the layer store.
 * Handles cleanup gracefully even if layers are already removed.
 *
 * @returns {void}
 *
 * @example
 * removeLandcover(); // Removes all HSY landcover layers
 */
export const removeLandcover = () => {
	const store = useGlobalStore()
	const backgroundMapStore = useBackgroundMapStore()

	try {
		if (
			Array.isArray(backgroundMapStore.landcoverLayers) &&
			backgroundMapStore.landcoverLayers.length > 0
		) {
			// Remove each layer from the viewer
			backgroundMapStore.landcoverLayers.forEach((layer) => {
				// Detach the WMS error listener first to avoid a listener leak
				// across landcover toggles (see createHSYImageryLayer).
				if (typeof layer?._removeErrorHandler === 'function') {
					layer._removeErrorHandler()
					layer._removeErrorHandler = undefined
				}
				if (store.cesiumViewer?.imageryLayers?.contains(layer)) {
					store.cesiumViewer.imageryLayers.remove(layer)
				}
			})

			// Clear the tracking array
			backgroundMapStore.clearLandcoverLayers()
		}
	} catch (error) {
		logger.error('Error removing landcover:', error)
	}
}

/**
 * Generates comma-separated WMS layer names for all HSY landcover types
 * Creates year-suffixed layer names for all 13 landcover classification types.
 * Uses year from backgroundMapStore to select appropriate historical data.
 *
 * @private
 * @param {Object} backgroundMapStore - Background map store containing hsyYear
 * @returns {string} Comma-separated WMS layer names with year suffixes
 *
 * @example
 * // Returns: "asuminen_ja_maankaytto:maanpeite_avokalliot_2023,..."
 * const layers = createLayersForHsyLandcover(backgroundMapStore);
 */
const createLayersForHsyLandcover = (backgroundMapStore) => {
	const year = backgroundMapStore.hsyYear
	const layerNames = [
		'asuminen_ja_maankaytto:maanpeite_avokalliot',
		'asuminen_ja_maankaytto:maanpeite_merialue',
		'asuminen_ja_maankaytto:maanpeite_muu_avoin_matala_kasvillisuus',
		'asuminen_ja_maankaytto:maanpeite_muu_vetta_lapaisematon_pinta',
		'asuminen_ja_maankaytto:maanpeite_paallystamaton_tie',
		'asuminen_ja_maankaytto:maanpeite_paallystetty_tie',
		'asuminen_ja_maankaytto:maanpeite_paljas_maa',
		'asuminen_ja_maankaytto:maanpeite_pellot',
		'asuminen_ja_maankaytto:maanpeite_puusto_10_15m',
		'asuminen_ja_maankaytto:maanpeite_puusto_15_20m',
		'asuminen_ja_maankaytto:maanpeite_puusto_2_10m',
		'asuminen_ja_maankaytto:maanpeite_puusto_yli20m',
		'asuminen_ja_maankaytto:maanpeite_vesi',
	]

	return layerNames.map((name) => `${name}_${year}`).join(',')
}
