/**
 * Centralized Cesium module provider for lazy loading.
 *
 * This singleton holds the dynamically-imported Cesium module, allowing services
 * to access it after viewer initialization without static imports that would
 * bundle Cesium (~4MB) into the critical path.
 *
 * Usage:
 *   import { getCesium } from './cesiumProvider.js'
 *   const Cesium = getCesium()
 *
 * @module cesiumProvider
 */

import logger from '../utils/logger.js'

class CesiumProvider {
	constructor() {
		this._cesium = null
		this._initPromise = null
		this._initialized = false
	}

	/**
	 * Initialize Cesium module via dynamic import.
	 * Safe to call multiple times - returns cached promise/module.
	 * @returns {Promise<typeof import('cesium')>}
	 */
	async initialize() {
		if (this._initialized) return this._cesium
		if (this._initPromise) return this._initPromise

		this._initPromise = (async () => {
			logger.debug('[CesiumProvider] Loading Cesium module...')
			const [cesiumModule] = await Promise.all([
				import('cesium'),
				import('cesium/Source/Widgets/widgets.css'),
			])
			this._cesium = cesiumModule
			this._initialized = true
			logger.debug('[CesiumProvider] Cesium module loaded')
			return this._cesium
		})()
		return this._initPromise
	}

	/**
	 * Get the Cesium module synchronously.
	 * Throws if called before initialization completes.
	 * @returns {typeof import('cesium')}
	 * @throws {Error} If Cesium not yet initialized
	 */
	get() {
		if (!this._initialized) {
			throw new Error(
				'[CesiumProvider] Cesium accessed before initialization. ' +
					'Ensure cesiumProvider.initialize() completes before using getCesium().'
			)
		}
		return this._cesium
	}

	/**
	 * Check if Cesium has been initialized.
	 * @returns {boolean}
	 */
	isInitialized() {
		return this._initialized
	}
}

export const cesiumProvider = new CesiumProvider()
export const getCesium = () => cesiumProvider.get()
