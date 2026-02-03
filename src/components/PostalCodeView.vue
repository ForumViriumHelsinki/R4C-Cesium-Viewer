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

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Building from '../services/building.js'
import Camera from '../services/camera.js'
import Datasource from '../services/datasource.js'
import ElementsDisplay from '../services/elementsDisplay.js'
import { eventBus } from '../services/eventEmitter.js'
import Featurepicker from '../services/featurepicker.js'
import { createHSYImageryLayer, removeLandcover } from '../services/landcover'
import loadingCoordinator from '../services/loadingCoordinator.js'
import Othernature from '../services/othernature.js'
import Plot from '../services/plot.js'
import Tree from '../services/tree.js'
import Vegetation from '../services/vegetation.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'

// Stores
const store = useGlobalStore()
const toggleStore = useToggleStore()

// Services (initialized lazily)
let dataSourceService = null
let treeService = null
let buildingService = null
let plotService = null
let elementsDisplayService = null

// Reactive state
const showPostalCodeView = ref(true)
const showReturn = ref(false)
const showPlot = ref(true)
const gridView = ref(false)
const helsinkiView = ref(false)
const showVegetation = ref(false)
const showOtherNature = ref(false)
const filterBuildings = ref(false)
const hideNonSote = ref(false)
const hideLow = ref(false)
const showTrees = ref(false)
const landCover = ref(false)
const switchView = ref(false)
const hideColdAreas = ref(false)
const capitalRegionCold = ref(false)

// Computed
const shouldShowReturn = computed(() => store.level === 'building')

// Event unsubscribe function
let unsubscribe = null

// Methods
const reset = () => {
	// Cancel any in-flight building loads before resetting
	const building = new Building()
	building.cancelCurrentLoad()

	// Restore grid visibility if it was hidden when entering postal code
	toggleStore.onExitPostalCode()

	// Smart reset instead of page reload
	store.setLevel('start')
	store.setPostalCode(null)
	store.setNameOfZone(null)
	store.setView('capitalRegion')

	// Reset camera to initial position
	const camera = new Camera()
	camera.init()

	// Hide all D3.js tooltips via D3 selection (maintains D3.js consistency)
	// D3 creates tooltips dynamically, so we use D3 selection to hide them
	import('d3')
		.then(({ selectAll }) => {
			selectAll('.tooltip').style('opacity', 0).style('display', 'none')
		})
		.catch((error) => {
			logger.error('Failed to load D3 for tooltip cleanup:', error)
		})
}

const returnToPostalCode = () => {
	const featurepicker = new Featurepicker()
	featurepicker.loadPostalCode().catch((error) => {
		logger.error('Failed to load postal code:', error)
	})
	if (toggleStore.showTrees) {
		treeService.loadTrees().catch((error) => {
			logger.error('Failed to load trees:', error)
		})
	}
	eventBus.emit('hideBuilding')
}

const initPostalCodeView = () => {
	dataSourceService = new Datasource()
	treeService = new Tree()
	buildingService = new Building()
	plotService = new Plot()
	addEventListeners()
}

const addEventListeners = () => {
	// Most event listeners now handled by Vue watchers
	// Keep any legacy handlers that are still needed
}

const toggleCold = () => {
	if (!capitalRegionCold.value) {
		reset()
	}
}

const capitalRegionViewEvent = async () => {
	if (helsinkiView.value) {
		store.setView('helsinki')
		dataSourceService.removeDataSourcesByNamePrefix('PostCodes')
		await dataSourceService.loadGeoJsonDataSource(
			0.2,
			'./assets/data/hki_po_clipped.json',
			'PostCodes'
		)
	} else {
		store.setView('capitalRegion')
		reset()
	}
}

const getLandCoverEvent = () => {
	if (landCover.value) {
		store.cesiumViewer.imageryLayers.remove('avoindata:Karttasarja_PKS', true)
		createHSYImageryLayer().catch((error) => {
			logger.error('Failed to create HSY imagery layer:', error)
		})
	} else {
		removeLandcover()
	}
}

const gridViewEvent = () => {
	if (gridView.value) {
		store.setView('grid')
		showPostalCodeView.value = false
		eventBus.emit('createPopulationGrid')
	} else {
		store.setView('capitalRegion')
		reset()
	}
}

const showPlotEvent = () => {
	if (showPlot.value) {
		plotService.showAllPlots()
	} else {
		plotService.hideAllPlots()
	}
}

const loadTreesEvent = () => {
	if (showTrees.value) {
		if (store.postalcode && !dataSourceService.getDataSourceByName('Trees')) {
			treeService.loadTrees(store.postalcode)
		} else {
			dataSourceService.changeDataSourceShowByName('Trees', true)
		}
	} else {
		dataSourceService.changeDataSourceShowByName('Trees', false)
		plotService.showAllPlots()
		buildingService.resetBuildingEntities()
	}
}

const loadOtherNatureEvent = () => {
	if (showOtherNature.value) {
		if (store.postalcode && !dataSourceService.getDataSourceByName('OtherNature')) {
			const otherNatureService = new Othernature()
			otherNatureService.loadOtherNature(store.postalcode).catch((error) => {
				logger.error('Failed to load other nature data:', error)
			})
		} else {
			dataSourceService.changeDataSourceShowByName('OtherNature', true)
		}
	} else {
		dataSourceService.changeDataSourceShowByName('OtherNature', false)
	}
}

const loadVegetationEvent = () => {
	if (showVegetation.value) {
		if (store.postalcode && !dataSourceService.getDataSourceByName('Vegetation')) {
			const vegetationService = new Vegetation()
			vegetationService.loadVegetation(store.postalcode).catch((error) => {
				logger.error('Failed to load vegetation data:', error)
			})
		} else {
			dataSourceService.changeDataSourceShowByName('Vegetation', true)
		}
	} else {
		dataSourceService.changeDataSourceShowByName('Vegetation', false)
	}
}

const filterBuildingsEvent = () => {
	toggleStore.setHideNonSote(hideNonSote.value)
	toggleStore.setHideNewBuildings(filterBuildings.value)
	toggleStore.setHideLow(hideLow.value)

	if (dataSourceService) {
		const buildingsDataSource = dataSourceService.getDataSourceByName(
			`Buildings ${store.postalcode}`
		)

		if (buildingsDataSource) {
			if (hideNonSote.value || filterBuildings.value || hideLow.value) {
				// Fire-and-forget async call - filter uses batch processing to yield to main thread
				buildingService.filterBuildings(buildingsDataSource).catch((error) => {
					console.error('[PostalCodeView] Failed to filter buildings:', error)
				})
			} else {
				buildingService.showAllBuildings(buildingsDataSource)
			}

			if (!toggleStore.helsinkiView) {
				eventBus.emit('updateScatterPlot')
			}
		}
	}
}

const switchViewEvent = () => {
	const viewService = new Camera()
	if (switchView.value) {
		viewService.switchTo2DView()
	} else {
		viewService.switchTo3DView()
	}
}

const loadAllEnvironmentalLayers = async () => {
	if (!store.postalcode) {
		logger.warn('No postal code selected for environmental layer loading')
		return
	}

	try {
		const sessionId = `environmental_${store.postalcode}`

		// Define layer configurations for coordinated loading
		const layerConfigs = [
			{
				layerId: 'vegetation',
				url: store.urlStore?.vegetation(store.postalcode),
				type: 'geojson',
				processor: (data, metadata) => {
					const vegetationService = new Vegetation()
					return vegetationService.addVegetationDataSource(data, metadata)
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
				url: store.urlStore?.otherNature(store.postalcode),
				type: 'geojson',
				processor: (data, metadata) => {
					const otherNatureService = new Othernature()
					return otherNatureService.addOtherNatureDataSource(data, metadata)
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
					const localTreeService = new Tree()
					return localTreeService.loadTrees()
				},
				options: {
					priority: 'high',
					cache: true,
					cacheTTL: 25 * 60 * 1000,
				},
			},
		]

		logger.debug(`🌿 Starting coordinated environmental layer loading for ${store.postalcode}`)

		const results = await loadingCoordinator.startLoadingSession(sessionId, layerConfigs, {
			priorityStrategy: 'balanced',
			showGlobalProgress: false,
			allowInterruption: true,
		})

		// Report results
		const successful = results.filter((r) => r.status === 'fulfilled').length
		const failed = results.length - successful

		if (failed === 0) {
			logger.debug(`✅ All ${successful} environmental layers loaded successfully`)
		} else {
			logger.warn(`⚠️ ${successful}/${results.length} environmental layers loaded, ${failed} failed`)
		}

		return results
	} catch (error) {
		logger.error('Failed to load environmental layers:', error)
		throw error
	}
}

// Watchers with cleanup handlers
const stopWatchShowPlot = watch(showPlot, (newValue) => {
	toggleStore.setShowPlot(newValue)
	if (newValue) {
		plotService?.showAllPlots()
	} else {
		plotService?.hideAllPlots()
	}
})

const stopWatchGridView = watch(gridView, (newValue) => {
	toggleStore.setGridView(newValue)
	if (newValue) {
		store.setView('grid')
		showPostalCodeView.value = false
		eventBus.emit('createPopulationGrid')
	} else {
		store.setView('capitalRegion')
		reset()
	}
})

const stopWatchHelsinkiView = watch(helsinkiView, (newValue) => {
	toggleStore.setHelsinkiView(newValue)
	capitalRegionViewEvent().catch((error) => {
		logger.error('Failed to handle capital region view event:', error)
	})
})

const stopWatchShowVegetation = watch(showVegetation, (newValue) => {
	toggleStore.setShowVegetation(newValue)
	loadVegetationEvent()
})

const stopWatchShowOtherNature = watch(showOtherNature, (newValue) => {
	toggleStore.setShowOtherNature(newValue)
	loadOtherNatureEvent()
})

const stopWatchFilterBuildings = watch(filterBuildings, () => {
	filterBuildingsEvent()
})

const stopWatchHideNonSote = watch(hideNonSote, (newValue) => {
	toggleStore.setHideNonSote(newValue)
	filterBuildingsEvent()
})

const stopWatchHideLow = watch(hideLow, (newValue) => {
	toggleStore.setHideLow(newValue)
	filterBuildingsEvent()
})

const stopWatchShowTrees = watch(showTrees, (newValue) => {
	toggleStore.setShowTrees(newValue)
	loadTreesEvent()
})

const stopWatchLandCover = watch(landCover, (newValue) => {
	toggleStore.setLandCover(newValue)
	getLandCoverEvent()
})

const stopWatchSwitchView = watch(switchView, (newValue) => {
	toggleStore.setSwitchView(newValue)
	switchViewEvent()
})

const stopWatchHideColdAreas = watch(hideColdAreas, (_newValue) => {
	// Add to toggle store if needed
	// toggleStore.setHideColdAreas(newValue)
})

const stopWatchCapitalRegionCold = watch(capitalRegionCold, (newValue) => {
	toggleStore.setCapitalRegionCold(newValue)
	toggleCold()
})

const stopWatchShouldShowReturn = watch(shouldShowReturn, (newValue) => {
	showReturn.value = newValue
})

// Lifecycle hooks
onMounted(() => {
	unsubscribe = eventBus.on('initPostalCodeView', initPostalCodeView)
	elementsDisplayService = new ElementsDisplay()
})

onBeforeUnmount(() => {
	// Unsubscribe from event bus
	if (unsubscribe) {
		unsubscribe()
	}

	// Stop all watchers to prevent stale callbacks
	stopWatchShowPlot()
	stopWatchGridView()
	stopWatchHelsinkiView()
	stopWatchShowVegetation()
	stopWatchShowOtherNature()
	stopWatchFilterBuildings()
	stopWatchHideNonSote()
	stopWatchHideLow()
	stopWatchShowTrees()
	stopWatchLandCover()
	stopWatchSwitchView()
	stopWatchHideColdAreas()
	stopWatchCapitalRegionCold()
	stopWatchShouldShowReturn()
})
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
