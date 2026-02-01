<template>
	<div id="gridviewContainer">
		<p class="header">R4C Urban Heat risk demonstrator</p>
		<v-btn
			icon
			class="uiButton"
			style="color: red; float: right; cursor: pointer"
			@click="reset"
		>
			<v-icon>mdi-refresh</v-icon>
		</v-btn>
		<label class="switch">
			<input
				v-model="postalCodeView"
				type="checkbox"
				value="postalCode"
			/>
			<span class="slider round" />
		</label>
		<label
			for="postalCodeToggle"
			class="label"
			>Postalcode view</label
		>

		<!--  natureGrid-->
		<label
			v-show="showNatureGrid"
			class="switch"
		>
			<input
				v-model="natureGrid"
				type="checkbox"
				value="natureGrid"
			/>
			<span class="slider round" />
		</label>
		<label
			v-show="showNatureGrid"
			for="natureGrid"
			class="label"
			>Nature grid</label
		>

		<!--  travelTime-->
		<label class="switch">
			<input
				v-model="travelTime"
				type="checkbox"
				value="travelTime"
			/>
			<span class="slider round" />
		</label>
		<label
			for="travelTime"
			class="label"
			>Travel time grid</label
		>

		<!--  resetGrid-->
		<label class="switch">
			<input
				v-model="resetGrid"
				type="checkbox"
				value="resetGrid"
			/>
			<span class="slider round" />
		</label>
		<label
			for="resetGrid"
			class="label"
			>Reset grid</label
		>

		<!--  surveyPlaces-->
		<label class="switch">
			<input
				v-model="surveyPlaces"
				type="checkbox"
				value="surveyPlaces"
			/>
			<span class="slider round" />
		</label>
		<label
			for="surveyPlaces"
			class="label"
			>Espoo resident survey places</label
		>

		<!--  250mGrid-->
		<label class="switch">
			<input
				v-model="grid250m"
				type="checkbox"
				value="250mGrid"
			/>
			<span class="slider round" />
		</label>
		<label
			for="250mGrid"
			class="label"
			>250m grid</label
		>
	</div>
	<BuildingGridChart ref="buildingGridChart" />
	<SosEco250mGrid ref="sosEco250mGrid" />
	<SurveyScatterPlot ref="surveyScatterPlot" />
</template>

<script>
import Camera from '../services/camera.js'
import Datasource from '../services/datasource.js'
import EspooSurvey from '../services/espooSurvey.js'
import { eventBus } from '../services/eventEmitter.js'
import Populationgrid from '../services/populationgrid.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'
import BuildingGridChart from './BuildingGridChart.vue'
import SosEco250mGrid from './SosEco250mGrid.vue' // Import the 250mGrid component
import SurveyScatterPlot from './SurveyScatterPlot.vue'

export default {
	components: {
		SurveyScatterPlot,
		SosEco250mGrid,
		BuildingGridChart,
	},
	data() {
		return {
			viewer: null,
			// Vue reactive state for toggles
			postalCodeView: false,
			natureGrid: false,
			travelTime: false,
			resetGrid: false,
			surveyPlaces: false,
			grid250m: false,
			showNatureGrid: false, // Control visibility of nature grid toggle
		}
	},
	watch: {
		postalCodeView(newValue) {
			this.toggleStore.setPostalCode(newValue)
			if (newValue) {
				this.store.setView('capitalRegion')
				this.reset()
			}
		},
		natureGrid(newValue) {
			this.toggleStore.setNatureGrid(newValue)
			this.natureGridEvent()
		},
		travelTime(newValue) {
			this.toggleStore.setTravelTime(newValue)
			this.travelTimeEvent()
		},
		resetGrid(newValue) {
			this.toggleStore.setResetGrid(newValue)
			if (newValue) {
				const populationgridService = new Populationgrid()
				void populationgridService.createPopulationGrid()
			}
		},
		surveyPlaces(newValue) {
			this.toggleStore.setSurveyPlaces(newValue)
			this.surveyPlacesEvent()
		},
		grid250m(_newValue) {
			this.activate250mGridEvent()
		},
	},
	mounted() {
		this.unsubscribe = eventBus.on('createPopulationGrid', this.createPopulationGrid)
		this.store = useGlobalStore()
		this.toggleStore = useToggleStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
	},
	beforeUnmount() {
		this.unsubscribe()
	},
	methods: {
		reset() {
			// Smart reset instead of page reload
			this.store.setLevel('start')
			this.store.setPostalCode(null)
			this.store.setNameOfZone(null)
			this.store.setView('capitalRegion')

			// Reset camera to initial position
			const camera = new Camera()
			camera.init()
		},
		async createPopulationGrid() {
			const populationgridService = new Populationgrid()
			await populationgridService.createPopulationGrid()
		},

		/**
		 * This function handles the toggle event for activating 250m sos eco grid
		 */
		activate250mGridEvent() {
			if (this.grid250m) {
				this.datasourceService.changeDataSourceShowByName('PopulationGrid', false)
				eventBus.emit('create250mGrid') // Trigger the simulation to start
			} else {
				this.datasourceService.removeDataSourcesByNamePrefix('250m_grid')
				// Hide building grid chart via event bus (maintains component encapsulation)
				eventBus.emit('hideBuildingGridChart')
				this.datasourceService.changeDataSourceShowByName('PopulationGrid', true)
			}
		},

		/**
		 * This function handles the toggle event for survey places
		 */
		surveyPlacesEvent() {
			if (this.surveyPlaces) {
				const espooSurveyService = new EspooSurvey()
				void espooSurveyService.loadSurveyFeatures('places_in_everyday_life')
			} else {
				this.datasourceService.removeDataSourcesByNamePrefix('Survey ')
				// Hide survey scatter plot via event bus (maintains component encapsulation)
				eventBus.emit('hideSurveyScatterPlot')
			}
		},

		/**
		 * This function to switch between population grid and travel time grid view
		 */
		async travelTimeEvent() {
			// Check if viewer is initialized
			if (!this.viewer) {
				logger.error('Viewer is not initialized.')
				return // Exit the function if viewer is not initialized
			}

			try {
				this.datasourceService.removeDataSourcesByNamePrefix('TravelLabel')
				this.datasourceService.removeDataSourcesByNamePrefix('PopulationGrid')

				if (this.travelTime) {
					await this.datasourceService.loadGeoJsonDataSource(
						0.1,
						'assets/data/travel_time_grid.json',
						'TravelTimeGrid'
					)
				} else {
					await this.datasourceService.removeDataSourcesByNamePrefix('TravelTimeGrid')
					await this.datasourceService.removeDataSourcesByNamePrefix('TravelLabel')
					await this.createPopulationGrid()
				}
			} catch (error) {
				logger.error('Error in travelTimeEvent:', error)
			}
		},

		/**
		 * This function to switch between population grid and nature grid view.
		 * Uses batched processing for UI responsiveness with 18K+ entities.
		 */
		async natureGridEvent() {
			this.datasourceService.removeDataSourcesByNamePrefix('TravelTimeGrid')

			if (this.natureGrid) {
				const populationgridService = new Populationgrid()
				const entities = populationgridService.getGridEntities()

				if (entities.length === 0) {
					logger.error('Data source with name PopulationGrid not found.')
					return
				}

				// Use batched processing for 18K+ entities
				await populationgridService.setGridEntitiesToGreen(entities)

				// Uncheck travel time toggle when nature grid is enabled
				this.travelTime = false
			} else {
				this.datasourceService.removeDataSourcesByNamePrefix('PopulationGrid')
				await this.createPopulationGrid()
			}
		},
	},
}
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

#gridviewContainer {
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
</style>
