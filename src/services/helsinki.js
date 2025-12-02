import { useToggleStore } from '../stores/toggleStore.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from '../services/eventEmitter.js';
import DataSource from './datasource.js';
import ElementsDisplay from './elementsDisplay.js';
import Building from './building.js';
import Vegetation from './vegetation.js';
import OtherNature from './othernature.js';
import Tree from './tree.js';

/**
 * Helsinki Service
 * Orchestrates loading of Helsinki-specific data layers and visualizations.
 * Coordinates building data, postal code boundaries, vegetation, trees, and other nature layers.
 * Manages Helsinki view mode UI elements and layer visibility based on toggle states.
 *
 * Helsinki-specific features:
 * - Building heat exposure data from Helsinki WFS
 * - High-resolution nature layers (vegetation, trees, other nature)
 * - Postal code boundaries from local GeoJSON
 * - Coordinated multi-layer loading
 * - Toggle-driven layer management
 *
 * @class Helsinki
 */
export default class Helsinki {
	/**
	 * Creates a Helsinki service instance
	 * Initializes all Helsinki-specific service dependencies.
	 */
	constructor() {
		this.toggleStore = useToggleStore();
		this.store = useGlobalStore();
		this.viewer = this.store.cesiumViewer;
		this.buildingService = new Building();
		this.elementsDisplayService = new ElementsDisplay();
		this.datasourceService = new DataSource();
		this.vegetationService = new Vegetation();
		this.otherNatureService = new OtherNature();
		this.treeService = new Tree();
	}

	/**
	 * Loads all Helsinki-specific map elements for the current postal code
	 * Orchestrates loading of buildings, postal code boundaries, and nature layers.
	 * Shows Helsinki-specific UI controls and emits visibility event.
	 *
	 * @returns {Promise<void>}
	 * @fires eventBus#showHelsinki - Emitted when Helsinki view elements are loaded
	 */
	async loadHelsinkiElements() {
		this.elementsDisplayService.setHelsinkiElementsDisplay('inline-block');
		await this.buildingService.loadBuildings();
		await this.datasourceService.loadGeoJsonDataSource(
			0.0,
			'./assets/data/hki_po_clipped.json',
			'PostCodes'
		);
		void this.loadHelsinkiGreenElements();
		eventBus.emit('showHelsinki');
	}

	/**
	 * Conditionally loads Helsinki green/nature layers based on toggle states
	 * Checks toggleStore settings for vegetation, trees, and other nature layers.
	 * Each layer loads only if its corresponding toggle is enabled.
	 *
	 * @returns {Promise<void>}
	 */
	async loadHelsinkiGreenElements() {
		if (this.toggleStore.showVegetation) {
			await this.vegetationService.loadVegetation();
		}

		if (this.toggleStore.showTrees) {
			await this.treeService.loadTrees();
		}

		if (this.toggleStore.OtherNature) {
			await this.otherNatureService.loadOtherNature();
		}
	}
}
