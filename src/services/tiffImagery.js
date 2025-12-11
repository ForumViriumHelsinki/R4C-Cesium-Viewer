/**
 * @module services/tiffImagery
 * Provides utilities for loading and displaying Cloud Optimized GeoTIFF (COG) vegetation
 * index data with custom color gradients. NDVI values range from -1 to 1, where higher
 * values indicate healthier, denser vegetation.
 *
 * NDVI Color Scale:
 * - -1.0 to -0.5: Non-vegetated (dark gray) - water, urban
 * - -0.5 to 0.0: Barren (light gray to tan) - bare soil, rock
 * - 0.0 to 0.3: Low vegetation (yellow-green) - sparse grass, stressed plants
 * - 0.3 to 0.6: Moderate vegetation (darker green) - healthy grasslands, crops
 * - 0.6 to 1.0: Dense vegetation (very dark green) - forests, dense canopy
 *
 * Features:
 * - Cloud Optimized GeoTIFF (COG) support for efficient streaming
 * - Multi-date NDVI time series
 * - Maximum 2 layer cache for smooth transitions
 * - Custom color gradient visualization
 *
 * @see {@link https://github.com/hongfaqiu/TIFFImageryProvider|TIFFImageryProvider}
 */

import TIFFImageryProvider from 'tiff-imagery-provider'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useURLStore } from '../stores/urlStore.js'

/**
 * Cache for TIFF imagery providers by date
 * Key: date string (YYYY-MM-DD)
 * Value: Cesium ImageryLayer instance
 * @type {Map<string, Object>}
 */
const tiffProviderCache = new Map()

/**
 * Maximum number of NDVI dates to keep in cache
 * Prevents unbounded memory growth while allowing smooth date switching
 * @constant {number}
 */
const MAX_CACHED_DATES = 3

/**
 * Loads and displays NDVI TIFF imagery layer with custom color gradient.
 * Implements intelligent caching to avoid re-downloading COG metadata and tiles:
 * - Reuses existing provider when toggling visibility
 * - Caches up to 3 most recent dates for quick date switching
 * - Hides non-active dates instead of removing them
 *
 * Uses Cloud Optimized GeoTIFF format for efficient tile-based streaming.
 *
 * @returns {Promise<void>}
 * @throws {Error} If TIFF loading or provider initialization fails
 *
 * @example
 * // Load NDVI layer for currently selected date (or show if cached)
 * await changeTIFF();
 *
 * @example
 * // When user changes date, automatically loads new date or shows cached
 * backgroundMapStore.setNdviDate('2024-06-27');
 * await changeTIFF();
 */
export const changeTIFF = async () => {
	const store = useGlobalStore()
	const urlStore = useURLStore()
	const backgroundMapStore = useBackgroundMapStore()
	const ndviDate = backgroundMapStore.ndviDate
	const viewer = store.cesiumViewer

	if (!viewer) return

	try {
		// Check if we already have this date in cache
		let layer = tiffProviderCache.get(ndviDate)

		if (layer) {
			// Provider exists - just show it and add to viewer if not already there
			if (!viewer.imageryLayers.contains(layer)) {
				viewer.imageryLayers.add(layer)
			}
			layer.show = true

			// Hide other dates to prevent overlap
			tiffProviderCache.forEach((otherLayer, otherDate) => {
				if (otherDate !== ndviDate) {
					otherLayer.show = false
				}
			})

			return
		}

		// Not in cache - create new provider
		const provider = await TIFFImageryProvider.fromUrl(urlStore.ndviTiffUrl(ndviDate), {
			tileSize: 512,
			minimumLevel: 0,
			maximumLevel: 12,
			renderOptions: {
				single: {
					band: 1,
					type: 'discrete',
					useRealValue: true,
					displayRange: [-1, 1],
					colors: [
						[-1.0, 'rgb(12, 12, 12)'],
						[-0.5, 'rgb(234, 234, 234)'],
						[0.0, 'rgb(204, 198, 130)'],
						[0.1, 'rgb(145, 191, 81)'],
						[0.2, 'rgb(112, 163, 63)'],
						[0.3, 'rgb(79, 137, 45)'],
						[0.4, 'rgb(48, 109, 28)'],
						[0.5, 'rgb(15, 84, 10)'],
						[0.6, 'rgb(0, 68, 0)'],
					],
				},
			},
		})

		await provider.readyPromise

		layer = viewer.imageryLayers.addImageryProvider(provider)
		layer.brightness = 1

		// Store in cache
		tiffProviderCache.set(ndviDate, layer)

		// Hide other dates to prevent overlap
		tiffProviderCache.forEach((otherLayer, otherDate) => {
			if (otherDate !== ndviDate) {
				otherLayer.show = false
			}
		})

		// Evict oldest date if over cache limit
		if (tiffProviderCache.size > MAX_CACHED_DATES) {
			const oldestDate = tiffProviderCache.keys().next().value
			const oldestLayer = tiffProviderCache.get(oldestDate)
			if (viewer.imageryLayers.contains(oldestLayer)) {
				viewer.imageryLayers.remove(oldestLayer)
			}
			tiffProviderCache.delete(oldestDate)
		}
	} catch (error) {
		console.error('Error loading TIFF:', error)
	}
}

/**
 * Hides all NDVI TIFF imagery layers without removing them from cache.
 * Layers remain in memory and viewer for instant re-display on toggle.
 * This prevents re-downloading COG metadata and tiles when user toggles NDVI on/off.
 *
 * @returns {Promise<void>}
 *
 * @example
 * // Hide NDVI when user toggles off
 * await removeTIFF();
 *
 * // Later toggle on will instantly show cached layer
 * await changeTIFF();
 */
export const removeTIFF = async () => {
	try {
		// Hide all cached layers instead of removing
		tiffProviderCache.forEach((layer) => {
			layer.show = false
		})
	} catch (error) {
		console.error('Error hiding TIFF:', error)
	}
}
