/**
 * Building Loader Module
 *
 * Handles data fetching and loading of building entities.
 * Manages caching, API requests, and integration with the unified loader.
 * Uses parallel fetching for building and heat data to reduce latency.
 *
 * @module services/building/buildingLoader
 */

import { useGlobalStore } from '../../stores/globalStore.js'
import { useToggleStore } from '../../stores/toggleStore.js'
import { useURLStore } from '../../stores/urlStore.js'
import logger from '../../utils/logger.js'
import Datasource from '../datasource.js'
import Tree from '../tree.js'
import unifiedLoader from '../unifiedLoader.js'
import Urbanheat from '../urbanheat.js'
import { BuildingStyler } from './buildingStyler.js'

/**
 * Building Loader Class
 *
 * Manages loading of Helsinki buildings with caching support.
 * Uses unifiedLoader for IndexedDB caching with configurable TTL.
 * Fetches building and heat data in parallel for improved performance.
 */
export class BuildingLoader {
	constructor() {
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.urlStore = useURLStore()
		this.treeService = new Tree()
		this.urbanheatService = new Urbanheat()
		this.datasourceService = new Datasource()
		this.styler = new BuildingStyler()
		this.unifiedLoader = unifiedLoader
	}

	/**
	 * Loads Helsinki buildings for a postal code with caching support.
	 * Uses unifiedLoader for IndexedDB caching with 1-hour TTL.
	 * Fetches building and heat data in parallel for reduced latency.
	 *
	 * @param {string} [postalCode] - Optional postal code to load buildings for.
	 *                                If not provided, uses current postal code from store.
	 * @returns {Promise<Array>} Building entities
	 */
	async loadBuildings(postalCode) {
		const targetPostalCode = postalCode || this.store.postalcode
		const url = this.urlStore.helsinkiBuildingsUrl(targetPostalCode)

		logger.debug('[HelsinkiBuilding] Loading Helsinki buildings for postal code:', targetPostalCode)
		logger.debug('[HelsinkiBuilding] API URL:', url)

		try {
			// Configure building data fetch
			const buildingConfig = {
				layerId: `helsinki_buildings_${targetPostalCode}`,
				url: url,
				type: 'geojson',
				options: {
					cache: true,
					cacheTTL: 60 * 60 * 1000, // 1 hour (buildings data is relatively static)
					retries: 2,
					progressive: false,
					priority: 'high',
				},
			}

			// Parallel fetch: building data and heat data
			// Heat data is optional - buildings render even if heat API fails
			logger.debug('[HelsinkiBuilding] Initiating parallel fetch for buildings and heat data')
			const [buildingResult, heatResult] = await Promise.allSettled([
				this.unifiedLoader.loadLayer(buildingConfig),
				this.urbanheatService.getHeatData(targetPostalCode),
			])

			// Handle building data (required)
			if (buildingResult.status === 'rejected') {
				logger.error('[HelsinkiBuilding] Failed to load building data:', buildingResult.reason)
				throw buildingResult.reason
			}

			const buildingData = buildingResult.value

			// Handle heat data (optional)
			const heatData = heatResult.status === 'fulfilled' ? heatResult.value : null
			if (heatResult.status === 'rejected') {
				logger.warn(
					'[HelsinkiBuilding] Heat data fetch failed:',
					heatResult.reason?.message || heatResult.reason
				)
			} else if (!heatData) {
				logger.warn('[HelsinkiBuilding] Heat data unavailable for postal code:', targetPostalCode)
			} else {
				logger.debug(
					'[HelsinkiBuilding] Heat data loaded:',
					heatData?.features?.length || 0,
					'features'
				)
			}

			// Merge heat data with buildings (if available)
			await this.urbanheatService.mergeHeatWithBuildings(buildingData, heatData, targetPostalCode)

			logger.debug(
				'[HelsinkiBuilding] Received',
				buildingData.features?.length || 0,
				'building features'
			)

			// Create Cesium datasource with entities
			const entities = await this.datasourceService.addDataSourceWithPolygonFix(
				buildingData,
				`Buildings ${targetPostalCode}`
			)

			// Apply styling
			await this.styler.setHeatExposureToBuildings(entities)
			await this.styler.setHelsinkiBuildingsHeight(entities)
			this.urbanheatService.setPropertiesAndCreateCharts(entities, buildingData.features)

			logger.debug('[HelsinkiBuilding] Buildings processed and added to Cesium viewer')

			if (this.toggleStore.showTrees) {
				this.treeService.loadTrees(targetPostalCode).catch((error) => {
					logger.warn('[HelsinkiBuilding] Tree loading failed:', error.message)
				})
			}

			return entities
		} catch (error) {
			logger.error('[HelsinkiBuilding] Error loading buildings:', error)
			throw error
		}
	}
}

export default BuildingLoader
