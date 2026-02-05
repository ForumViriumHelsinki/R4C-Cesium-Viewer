import { useFeatureFlagStore } from '../stores/featureFlagStore'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import DataSource from './datasource.js'
import ElementsDisplay from './elementsDisplay.js'
import HSYBuilding from './hsybuilding.js'

/**
 * Capital Region Service
 * Orchestrates loading of Capital Region (non-Helsinki) data layers and visualizations.
 * Manages HSY building data loading for the broader Helsinki Metropolitan Area
 * including Espoo, Vantaa, and Kauniainen municipalities.
 *
 * Capital Region scope:
 * - Municipalities: Espoo, Vantaa, Kauniainen (postal codes < 1000)
 * - Building data: HSY WFS service
 * - Tree data: Available for specific postal codes
 * - Heat data: Integrated via pygeoapi
 *
 * Differences from Helsinki service:
 * - Uses HSY WFS instead of Helsinki WFS
 * - Limited nature layer support
 * - Different UI element visibility rules
 *
 * @class CapitalRegion
 */
export default class CapitalRegion {
	/**
	 * Creates a CapitalRegion service instance
	 * Initializes Capital Region-specific service dependencies.
	 */
	constructor() {
		this.toggleStore = useToggleStore()
		this.store = useGlobalStore()
		this.propsStore = usePropsStore()
		this.viewer = this.store.cesiumViewer
		this.hSYBuildingService = new HSYBuilding()
		this.datasourceService = new DataSource()
		this.elementsDisplayService = new ElementsDisplay()
	}

	/**
	 * Loads Capital Region map elements for the current postal code
	 * Loads HSY building data and conditionally shows tree layer controls
	 * for postal codes with available tree data (postal codes < 1000).
	 *
	 * When viewport streaming is enabled, building loading is skipped because
	 * the ViewportBuildingLoader handles building loading based on visible tiles.
	 *
	 * @returns {Promise<void>}
	 */
	async loadCapitalRegionElements() {
		// Show tree controls only for postal codes with tree data availability
		if (Number(this.store.postalcode) < 1000) {
			this.elementsDisplayService.setTreeElementsDisplay('inline-block')
		}

		// Skip postal code-based building loading when viewport streaming is enabled
		// Viewport streaming loads buildings based on visible tiles instead
		const featureFlagStore = useFeatureFlagStore()
		if (featureFlagStore.isEnabled('viewportStreaming')) {
			logger.debug('[CapitalRegion] Viewport streaming enabled, skipping postal code building load')
			return
		}

		await this.hSYBuildingService.loadHSYBuildings()
	}

	/**
	 * Stores postal code boundary data source in Pinia store
	 * Retrieves PostCodes data source and saves reference for later use.
	 *
	 * @returns {Promise<void>}
	 */
	async addPostalCodeDataToPinia() {
		const dataSource = this.datasourceService.getDataSourceByName('PostCodes')
		this.propsStore.setPostalCodeData(dataSource)
	}
}
