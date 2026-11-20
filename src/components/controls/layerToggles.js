/**
 * @module components/controls/layerToggles
 * What switching a map layer on or off does, for the layers that can be switched
 * from more than one place (#1155). LayerSwitch.vue calls these from the Layers tab
 * and from the Analysis panels alike, so both entry points change the same store
 * state, keep the land cover / NDVI exclusion, and report a failure through the
 * one layer-failure channel with a Retry (#1152).
 */

import { setLandcoverEnabled } from '../../services/landcover'
import { changeTIFF, removeTIFF } from '../../services/tiffImagery.js'
import { useLoadingStore } from '../../stores/loadingStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import logger from '../../utils/logger.js'

/**
 * Turns land cover on or off through the shared service entry point, which also
 * switches NDVI off and keeps toggleStore.landCover and the imagery in step (#967).
 * @param {boolean} enabled
 * @returns {void}
 */
export const setLandCoverLayer = (enabled) => {
	setLandcoverEnabled(enabled).catch((error) => {
		logger.error('[layerToggles] Failed to update land cover layer:', error)
		useLoadingStore().reportLayerFailure('landcover', error, {
			// A Retry clicked after the user flipped the switch must not flip it back.
			retry: () => {
				if (useToggleStore().landCover === enabled) setLandCoverLayer(enabled)
			},
		})
	})
}

/**
 * Adds the NDVI imagery for the date in backgroundMapStore.ndviDate.
 * @returns {void}
 */
export const addNdviImagery = () => {
	changeTIFF().catch((error) => {
		logger.error('[layerToggles] Failed to add NDVI imagery:', error)
		useLoadingStore().reportLayerFailure('ndvi', error, {
			// A Retry clicked after the user switched NDVI off must not add the imagery.
			retry: () => {
				if (useToggleStore().ndvi) addNdviImagery()
			},
		})
	})
}

/**
 * Turns NDVI on or off. Turning it on switches land cover off first; the two
 * layers are exclusive.
 * @param {boolean} enabled
 * @returns {void}
 */
export const setNdviLayer = (enabled) => {
	const toggleStore = useToggleStore()
	if (enabled && toggleStore.landCover) setLandCoverLayer(false)

	toggleStore.setNDVI(enabled)

	if (enabled) {
		addNdviImagery()
	} else {
		removeTIFF().catch((error) => {
			logger.error('[layerToggles] Failed to remove NDVI imagery:', error)
		})
	}
}

/** toggleStore field → the function that switches that layer. */
export const LAYER_TOGGLES = Object.freeze({
	landCover: setLandCoverLayer,
	ndvi: setNdviLayer,
})
