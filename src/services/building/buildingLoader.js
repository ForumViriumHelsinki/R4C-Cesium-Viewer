/**
 * Building Loader Module
 *
 * Handles data fetching and loading of building entities.
 * Manages caching, API requests, and integration with the unified loader.
 *
 * @module services/building/buildingLoader
 */

import { useGlobalStore } from '../../stores/globalStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import { useURLStore } from '../../stores/urlStore.js'
import logger from '../../utils/logger.js'
import Tree from '../tree.js'
import unifiedLoader from '../unifiedLoader.js'
import Urbanheat from '../urbanheat.js'
import { BuildingStyler } from './buildingStyler.js'

/**
 * Building Loader Class
 *
 * Manages loading of Helsinki buildings with caching support.
 * Uses unifiedLoader for IndexedDB caching with configurable TTL.
 */
export class BuildingLoader {
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.urlStore = useURLStore()
		this.treeService = new Tree()
		this.urbanheatService = new Urbanheat()
		this.styler = new BuildingStyler()
		this.unifiedLoader = unifiedLoader
	}

	/**
	 * Loads Helsinki buildings for a postal code with caching support.
	 * Uses unifiedLoader for IndexedDB caching with 1-hour TTL.
	 * Fetches building data from Helsinki WFS service and processes heat exposure data.
	 *
	 * @param {string} [postalCode] - Optional postal code to load buildings for.
	 *                                If not provided, uses current postal code from store.
	 * @returns {Promise<void>}
	 */
	async loadBuildings(postalCode) {
		const targetPostalCode = postalCode || this.store.postalcode
		const url = this.urlStore.helsinkiBuildingsUrl(targetPostalCode)

		logger.debug('[HelsinkiBuilding] Loading Helsinki buildings for postal code:', targetPostalCode)
		logger.debug('[HelsinkiBuilding] API URL:', url)

		try {
			const loadingConfig = {
				layerId: `helsinki_buildings_${targetPostalCode}`,
				url: url,
				type: 'geojson',
				processor: async (data, metadata) => {
					const fromCache = metadata?.fromCache
					logger.debug(
						fromCache ? '[HelsinkiBuilding] Using cached data' : '[HelsinkiBuilding] Received',
						data.features?.length || 0,
						'building features'
					)

					const entities = await this.urbanheatService.findUrbanHeatData(data, targetPostalCode)
					await this.styler.setHeatExposureToBuildings(entities)
					await this.styler.setHelsinkiBuildingsHeight(entities)

					logger.debug('[HelsinkiBuilding] Buildings processed and added to Cesium viewer')
					return entities
				},
				options: {
					cache: true,
					cacheTTL: 60 * 60 * 1000, // 1 hour (buildings data is relatively static)
					retries: 2,
					progressive: false,
					priority: 'high',
				},
			}

			await this.unifiedLoader.loadLayer(loadingConfig)
		} catch (error) {
			logger.error('[HelsinkiBuilding] Error loading buildings:', error)
		}

		if (this.toggleStore.showTrees) {
			void this.treeService.loadTrees(targetPostalCode)
		}
	}
}

export default BuildingLoader
