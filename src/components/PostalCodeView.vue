<template>
	<v-card
		v-if="showPostalCodeView"
		class="postal-code-panel"
		elevation="2"
	>
		<!-- Header Section -->
		<v-card-title class="panel-header">
			<div class="header-content">
				<v-icon
					class="mr-2"
					color="primary"
				>
					mdi-map-marker-multiple
				</v-icon>
				<span class="header-title">Urban Heat Risk</span>
			</div>
			<div class="header-actions">
				<v-btn
					v-if="showReturn"
					icon
					size="small"
					color="error"
					variant="text"
					@click="returnToPostalCode"
				>
					<v-icon>mdi-arrow-left</v-icon>
				</v-btn>
				<v-btn
					icon
					size="small"
					color="error"
					variant="text"
					@click="reset"
				>
					<v-icon>mdi-refresh</v-icon>
				</v-btn>
			</div>
		</v-card-title>

		<v-divider />

		<v-card-text class="panel-content">
			<!-- View Mode Section -->
			<div class="control-section">
				<h4 class="section-title">
					<v-icon
						class="mr-2"
						size="18"
					>
						mdi-eye
					</v-icon>
					View Mode
				</h4>

				<v-switch
					id="showPlotToggle"
					v-model="showPlot"
					label="Display plot"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="gridViewToggle"
					v-model="gridView"
					label="Grid view"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="capitalRegionViewToggle"
					v-model="helsinkiView"
					label="Helsinki view"
					color="primary"
					density="compact"
					hide-details
				/>
			</div>

			<v-divider class="my-4" />

			<!-- Data Layers Section -->
			<div class="control-section">
				<h4 class="section-title">
					<v-icon
						class="mr-2"
						size="18"
					>
						mdi-layers
					</v-icon>
					Data Layers
				</h4>

				<v-switch
					id="showVegetationToggle"
					v-model="showVegetation"
					label="Show vegetation"
					color="green"
					density="compact"
					hide-details
				/>

				<v-switch
					id="showOtherNatureToggle"
					v-model="showOtherNature"
					label="Other nature"
					color="green"
					density="compact"
					hide-details
					style="display: none"
				/>

				<v-switch
					id="hideNewBuildingsToggle"
					v-model="filterBuildings"
					label="Built before summer 2018"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="hideNonSoteToggle"
					v-model="hideNonSote"
					label="Only sote buildings"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="hideLowToggle"
					v-model="hideLow"
					label="Only tall buildings"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="showTreesToggle"
					v-model="showTrees"
					label="Trees"
					color="green"
					density="compact"
					hide-details
				/>

				<v-switch
					id="landCoverToggle"
					v-model="landCover"
					label="HSY land cover"
					color="green"
					density="compact"
					hide-details
				/>

				<v-switch
					id="switchViewToggle"
					v-model="switchView"
					label="2D view"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="hideColdAreasToggle"
					v-model="hideColdAreas"
					label="Hide cold areas"
					color="primary"
					density="compact"
					hide-details
				/>

				<v-switch
					id="capitalRegionColdToggle"
					v-model="capitalRegionCold"
					label="Capital Region Cold"
					color="blue"
					density="compact"
					hide-details
				/>
			</div>

			<v-divider class="my-4" />

			<!-- External Resources Section -->
			<div class="control-section">
				<h4 class="section-title">
					<v-icon
						class="mr-2"
						size="18"
					>
						mdi-link
					</v-icon>
					External Resources
				</h4>

				<div class="link-grid">
					<v-btn
						href="https://bri3.fvh.io/opendata/r4c/r4c_all.html"
						target="_blank"
						variant="outlined"
						size="small"
						prepend-icon="mdi-thermometer"
						class="mb-2"
					>
						Sensor Map
					</v-btn>

					<v-btn
						href="https://iot.fvh.fi/grafana/d/aduw70oqqdon4c/r4c-laajasalo-and-koivukyla?orgId=6&refresh=30m"
						target="_blank"
						variant="outlined"
						size="small"
						prepend-icon="mdi-chart-line"
						class="mb-2"
					>
						Sensor Dashboard
					</v-btn>

					<v-btn
						href="https://geo.fvh.fi/r4c/6fkgOUqn3/"
						target="_blank"
						variant="outlined"
						size="small"
						prepend-icon="mdi-water"
						style="display: none"
					>
						Flood Simulations
					</v-btn>
				</div>
			</div>
		</v-card-text>
	</v-card>
</template>

<script>
import Datasource from '../services/datasource.js';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js';
import Building from '../services/building.js';
import Vegetation from '../services/vegetation.js';
import Othernature from '../services/othernature.js';
import Plot from '../services/plot.js';
import Camera from '../services/camera.js';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from '../services/eventEmitter.js';
import ElementsDisplay from '../services/elementsDisplay.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Featurepicker from '../services/featurepicker.js';
import loadingCoordinator from '../services/loadingCoordinator.js';

export default {
	data() {
		return {
			viewer: null,
			dataSourceService: null,
			treeService: null,
			showPostalCodeView: true,
			showReturn: false,
			// Vue reactive data for switches
			showPlot: true,
			gridView: false,
			helsinkiView: false,
			showVegetation: false,
			showOtherNature: false,
			filterBuildings: false,
			hideNonSote: false,
			hideLow: false,
			showTrees: false,
			landCover: false,
			switchView: false,
			hideColdAreas: false,
			capitalRegionCold: false,
		};
	},
	computed: {
		shouldShowReturn() {
			const store = useGlobalStore(); // Get access to the global store
			return store.level === 'building';
		},
	},
	watch: {
		// Sync Vue reactive data with toggle store
		showPlot(newValue) {
			this.toggleStore.setShowPlot(newValue);
			newValue ? this.plotService.showAllPlots() : this.plotService.hideAllPlots();
		},
		gridView(newValue) {
			this.toggleStore.setGridView(newValue);
			newValue
				? (this.store.setView('grid'),
					(this.showPostalCodeView = false),
					eventBus.emit('createPopulationGrid'))
				: (this.store.setView('capitalRegion'), this.reset());
		},
		helsinkiView(newValue) {
			this.toggleStore.setHelsinkiView(newValue);
			this.capitalRegionViewEvent();
		},
		showVegetation(newValue) {
			this.toggleStore.setShowVegetation(newValue);
			this.loadVegetationEvent();
		},
		showOtherNature(newValue) {
			this.toggleStore.setShowOtherNature(newValue);
			this.loadOtherNatureEvent();
		},
		filterBuildings(newValue) {
			this.filterBuildingsEvent();
		},
		hideNonSote(newValue) {
			this.toggleStore.setHideNonSote(newValue);
			this.filterBuildingsEvent();
		},
		hideLow(newValue) {
			this.toggleStore.setHideLow(newValue);
			this.filterBuildingsEvent();
		},
		showTrees(newValue) {
			this.toggleStore.setShowTrees(newValue);
			this.loadTreesEvent();
		},
		landCover(newValue) {
			this.toggleStore.setLandCover(newValue);
			this.getLandCoverEvent();
		},
		switchView(newValue) {
			this.toggleStore.setSwitchView(newValue);
			this.switchViewEvent();
		},
		hideColdAreas(newValue) {
			// Add to toggle store if needed
			// this.toggleStore.setHideColdAreas(newValue);
		},
		capitalRegionCold(newValue) {
			this.toggleStore.setCapitalRegionCold(newValue);
			this.toggleCold();
		},
		shouldShowReturn(newValue) {
			this.showReturn = newValue;
		},
	},
	mounted() {
		this.unsubscribe = eventBus.on('initPostalCodeView', this.initPostalCodeView);
		this.store = useGlobalStore();
		this.toggleStore = useToggleStore();
		this.viewer = this.store.cesiumViewer;
		this.elementsDisplayService = new ElementsDisplay();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		reset() {
			// Smart reset instead of page reload
			this.store.setLevel('start');
			this.store.setPostalCode(null);
			this.store.setNameOfZone(null);
			this.store.setView('capitalRegion');

			// Reset camera to initial position
			const camera = new Camera();
			camera.init();

			// Hide tooltip
			const tooltip = document.querySelector('.tooltip');
			if (tooltip) {
				tooltip.style.display = 'none';
			}
		},
		returnToPostalCode() {
			const featurepicker = new Featurepicker();
			featurepicker.loadPostalCode();
			this.toggleStore.showTrees && this.treeService.loadTrees();
			eventBus.emit('hideBuilding');
		},
		initPostalCodeView() {
			this.dataSourceService = new Datasource();
			this.treeService = new Tree();
			this.buildingService = new Building();
			this.plotService = new Plot();
			this.addEventListeners();
		},
		/**
		 * Add EventListeners - now mostly handled by Vue watchers
		 */
		addEventListeners() {
			// Most event listeners now handled by Vue watchers
			// Keep any legacy handlers that are still needed
		},

		toggleCold() {
			// Get the value of the "Show Plot" toggle button
			const checked = document.getElementById('capitalRegionColdToggle').checked;
			this.toggleStore.setCapitalRegionCold(checked);

			!checked && this.reset();
		},

		/**
		 * This function handles the toggle event for switching to capital region view
		 */
		async capitalRegionViewEvent() {
			const metropolitanView = document.getElementById('capitalRegionViewToggle').checked;
			this.toggleStore.setHelsinkiView(metropolitanView);

			if (metropolitanView) {
				this.store.setView('helsinki');
				this.dataSourceService.removeDataSourcesByNamePrefix('PostCodes');
				await this.dataSourceService.loadGeoJsonDataSource(
					0.2,
					'./assets/data/hki_po_clipped.json',
					'PostCodes'
				);
			} else {
				this.store.setView('capitalRegion');
				this.reset();
			}
		},

		/**
		 * This function handles the toggle event for switching to capital region view
		 */
		getLandCoverEvent() {
			const landcover = document.getElementById('landCoverToggle').checked;
			this.toggleStore.setLandCover(landcover);

			landcover
				? (this.viewer.imageryLayers.remove('avoindata:Karttasarja_PKS', true),
					createHSYImageryLayer())
				: removeLandcover();
		},

		/**
		 * This function handles the toggle event for switching to grid view
		 */
		gridViewEvent() {
			const gridView = document.getElementById('gridViewToggle').checked;
			this.toggleStore.setGridView(gridView);

			gridView
				? (this.store.setView('grid'),
					(this.showPostalCodeView = false),
					eventBus.emit('createPopulationGrid'))
				: (this.store.setView('capitalRegion'), this.reset());
		},

		/**
		 * This function is called when the "Display Plot" toggle button is clicked
		 *
		 */
		showPlotEvent() {
			const showPlots = document.getElementById('showPlotToggle').checked;
			this.toggleStore.setShowPlot(showPlots);

			showPlots ? this.plotService.showAllPlots() : this.plotService.hideAllPlots();
		},

		/**
		 * This function to show or hide tree entities on the map based on the toggle button state
		 *
		 */
		loadTreesEvent() {
			// Get the state of the showTrees toggle button
			const showTrees = document.getElementById('showTreesToggle').checked;
			this.toggleStore.setShowTrees(showTrees);

			showTrees
				? this.store.postalcode && !this.dataSourceService.getDataSourceByName('Trees')
					? this.treeService.loadTrees(this.store.postalcode)
					: this.dataSourceService.changeDataSourceShowByName('Trees', true)
				: (this.dataSourceService.changeDataSourceShowByName('Trees', false),
					this.plotService.showAllPlots(),
					this.buildingService.resetBuildingEntities());
		},

		/**
		 * This function handles the toggle event for showing or hiding the nature areas layer on the map.
		 *
		 */
		loadOtherNatureEvent() {
			// Get the current state of the toggle button for showing nature areas.
			const showloadOtherNature = document.getElementById('showOtherNatureToggle').checked;
			this.toggleStore.setShowOtherNature(showloadOtherNature);

			if (showloadOtherNature) {
				// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
				//document.getElementById("showloadOtherNature").disabled = false;

				// If there is a postal code available, load the nature areas for that area.
				if (this.store.postalcode && !this.dataSourceService.getDataSourceByName('OtherNature')) {
					const otherNatureService = new Othernature();
					otherNatureService.loadOtherNature(this.store.postalcode);
				} else {
					this.dataSourceService.changeDataSourceShowByName('OtherNature', true);
				}
			} else {
				this.dataSourceService.changeDataSourceShowByName('OtherNature', false);
			}
		},

		/**
		 * This function handles the toggle event for showing or hiding the vegetation layer on the map.
		 *
		 */
		loadVegetationEvent() {
			// Get the current state of the toggle button for showing nature areas.
			const showVegetation = document.getElementById('showVegetationToggle').checked;
			this.toggleStore.setShowVegetation(showVegetation);

			if (showVegetation) {
				// If the toggle button is checked, enable the toggle button for showing the nature area heat map.
				//document.getElementById("showVegetationHeatToggle").disabled = false;

				// If there is a postal code available, load the nature areas for that area.
				if (this.store.postalcode && !this.dataSourceService.getDataSourceByName('Vegetation')) {
					const vegetationService = new Vegetation();
					vegetationService.loadVegetation(this.store.postalcode);
				} else {
					this.dataSourceService.changeDataSourceShowByName('Vegetation', true);
				}
			} else {
				this.dataSourceService.changeDataSourceShowByName('Vegetation', false);
			}
		},

		filterBuildingsEvent() {
			const hideNonSote = document.getElementById('hideNonSoteToggle').checked;
			const hideNewBuildings = document.getElementById('hideNewBuildingsToggle').checked;
			const hideLow = document.getElementById('hideLowToggle').checked;
			this.toggleStore.setHideNonSote(hideNonSote);
			this.toggleStore.setHideNewBuildings(hideNewBuildings);
			this.toggleStore.setHideLow(hideLow);

			if (this.dataSourceService) {
				const buildingsDataSource = this.dataSourceService.getDataSourceByName(
					`Buildings ${this.store.postalcode}`
				);

				if (buildingsDataSource) {
					hideNonSote || hideNewBuildings || hideLow
						? this.buildingService.filterBuildings(buildingsDataSource)
						: this.buildingService.showAllBuildings(buildingsDataSource);

					!this.toggleStore.helsinkiView && eventBus.emit('updateScatterPlot');
				}
			}
		},

		/**
		 * This function is called when the user clicks on the "switch view" toggle button.
		 *
		 */
		switchViewEvent() {
			// Get the status of the "switch view" toggle button.
			const switchView = document.getElementById('switchViewToggle').checked;
			this.toggleStore.setSwitchView(switchView);
			const viewService = new Camera();
			// If the "switch view" toggle button is checked.
			if (switchView) {
				viewService.switchTo2DView();

				// If the "switch view"" toggle button is not checked.
			} else {
				viewService.switchTo3DView();
			}
		},

		/**
		 * Demonstration of harmonized loading - loads multiple layers smoothly
		 * This shows how the new loading system can be used for coordinated layer loading
		 */
		async loadAllEnvironmentalLayers() {
			if (!this.store.postalcode) {
				console.warn('No postal code selected for environmental layer loading');
				return;
			}

			try {
				const sessionId = `environmental_${this.store.postalcode}`;

				// Define layer configurations for coordinated loading
				const layerConfigs = [
					{
						layerId: 'vegetation',
						url: this.urlStore.vegetation(this.store.postalcode),
						type: 'geojson',
						processor: (data, metadata) => {
							const vegetationService = new Vegetation();
							return vegetationService.addVegetationDataSource(data, metadata);
						},
						options: {
							cache: true,
							cacheTTL: 15 * 60 * 1000,
							priority: 'normal',
							retries: 2,
							progressive: true,
						},
					},
					{
						layerId: 'othernature',
						url: this.urlStore.otherNature(this.store.postalcode),
						type: 'geojson',
						processor: (data, metadata) => {
							const otherNatureService = new Othernature();
							return otherNatureService.addOtherNatureDataSource(data, metadata);
						},
						options: {
							cache: true,
							cacheTTL: 20 * 60 * 1000,
							priority: 'normal',
							retries: 2,
							progressive: true,
						},
					},
					{
						layerId: 'trees',
						// Trees would be handled by the Tree service's coordinated loading
						processor: async () => {
							const treeService = new Tree();
							return treeService.loadTrees();
						},
						options: {
							priority: 'high',
							cache: true,
							cacheTTL: 25 * 60 * 1000,
						},
					},
				];

				console.log(
					`🌿 Starting coordinated environmental layer loading for ${this.store.postalcode}`
				);

				const results = await loadingCoordinator.startLoadingSession(sessionId, layerConfigs, {
					priorityStrategy: 'balanced',
					showGlobalProgress: false, // Don't show global progress for subset loading
					allowInterruption: true,
				});

				// Report results
				const successful = results.filter((r) => r.status === 'fulfilled').length;
				const failed = results.length - successful;

				if (failed === 0) {
					console.log(`✅ All ${successful} environmental layers loaded successfully`);
				} else {
					console.warn(
						`⚠️ ${successful}/${results.length} environmental layers loaded, ${failed} failed`
					);
				}

				return results;
			} catch (error) {
				console.error('Failed to load environmental layers:', error);
				throw error;
			}
		},
	},
};
</script>

<style>
.uiButton {
	background-color: white;
	border: 0px solid black;

	font-family: sans-serif;
	font-size: small;
	text-align: middle;
	padding: 5px;
	margin: 5px;

	float: left;

	text-decoration: underline;
	height: 18px !important; /* Set a smaller height */
	width: 18px !important; /* Set a smaller width */
	min-width: 0 !important; /* Override Vuetify's min-width */
}

.uiButton .v-btn__content {
	padding: 0 !important; /* Remove default padding */
}

.uiButton:hover {
	color: rgb(150, 150, 150);
}

.label {
	background-color: white;
	border: 0px solid black;

	font-family: sans-serif;
	text-align: middle;

	text-decoration: none;
	font-size: small;
}

#postalCodeViewContainer {
	top: 10px;
	left: 0px;

	position: fixed;
	border: 1px solid black;
	box-shadow: 3px 5px 5px black;
	visibility: visible;

	background: white;
	padding: 5px;

	min-height: 25px;

	width: 100%;
}

/* The switch - the box around the slider */
.switch {
	position: relative;
	display: inline-block;
	width: 47px;
	height: 20px;
}

/* Hide default HTML checkbox */
.switch input {
	opacity: 0;
	width: 0;
	height: 0;
}

/* The slider */
.slider {
	position: absolute;
	cursor: pointer;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: #ccc;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

.slider:before {
	position: absolute;
	content: '';
	height: 16px;
	width: 16px;
	left: 2px;
	bottom: 2px;
	background-color: white;
	-webkit-transition: 0.4s;
	transition: 0.4s;
}

input:checked + .slider {
	background-color: #2196f3;
}

input:focus + .slider {
	box-shadow: 0 0 1px #2196f3;
}

input:checked + .slider:before {
	-webkit-transform: translateX(26px);
	-ms-transform: translateX(26px);
	transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
	border-radius: 34px;
}

.slider.round:before {
	border-radius: 50%;
}

/* Modern Vuetify Card Styling */
.postal-code-panel {
	position: fixed;
	top: 24px;
	left: 24px;
	width: 350px;
	max-height: calc(100vh - 120px);
	overflow-y: auto;
	background: rgba(255, 255, 255, 0.95);
	backdrop-filter: blur(8px);
	border-radius: 12px;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.2);
	z-index: 1000;
}

.panel-header {
	background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
	color: white;
	padding: 16px 20px;
	border-radius: 12px 12px 0 0;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.header-content {
	display: flex;
	align-items: center;
	flex: 1;
}

.header-title {
	font-size: 1.1rem;
	font-weight: 600;
	margin: 0;
}

.header-actions {
	display: flex;
	gap: 4px;
}

.panel-content {
	padding: 20px;
	background: transparent;
}

.control-section {
	margin-bottom: 16px;
}

.section-title {
	font-size: 0.95rem;
	font-weight: 600;
	color: rgba(0, 0, 0, 0.8);
	margin: 0 0 12px 0;
	display: flex;
	align-items: center;
	padding-bottom: 4px;
	border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.link-grid {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.link-grid .v-btn {
	justify-content: flex-start;
	text-transform: none;
}

/* Responsive adjustments */
@media (max-width: 768px) {
	.postal-code-panel {
		width: calc(100vw - 48px);
		left: 24px;
		right: 24px;
	}
}
</style>
