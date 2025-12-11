import * as Cesium from 'cesium'
import { useGlobalStore } from '../stores/globalStore.js'
import { useURLStore } from '../stores/urlStore.js'
import Datasource from './datasource.js'

/**
 * Sensor Service
 * Manages real-time environmental sensor data visualization from R4C monitoring network.
 * Loads GeoJSON sensor data and displays temperature, humidity, and timing information
 * as Cesium labels at sensor locations.
 *
 * Data source: bri3.fvh.io R4C open data endpoint (latest measurements)
 *
 * Visualizes:
 * - Air temperature (temp_air) in Celsius
 * - Relative humidity (rh_air) in percentage
 * - Measurement timestamp
 *
 * @class Sensor
 */
export default class Vegetation {
	/**
	 * Creates a Sensor service instance
	 */
	constructor() {
		this.store = useGlobalStore()
		this.urlStore = useURLStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
	}

	/**
	 * Fetches latest sensor data
	 *
	 */
	async loadSensorData() {
		try {
			const url = this.urlStore.r4cSensorUrl
			const response = await fetch(url)
			const data = await response.json()

			// Create a Cesium data source
			const dataSource = new Cesium.GeoJsonDataSource()

			// Load the GeoJSON data into the data source
			void dataSource.load(data, {
				markerColor: Cesium.Color.ORANGE, // Customize the marker color if desired
				clampToGround: true, // Set to true to clamp entities to the ground
			})

			await this.addSensorDataSource(data)
		} catch (error) {
			console.error('Error loading sensor data:', error)
			this.store.showError(
				'Unable to load sensor data. Please try again.',
				`Failed to fetch sensor data from R4C API: ${error.message}`
			)
			throw error // Re-throw so callers know it failed
		}
	}

	/**
	 * Adds the data to viewer's datasources
	 *
	 * @param {Array<Object>} data - Sensor data array
	 */
	async addSensorDataSource(data) {
		const entities = await this.datasourceService.addDataSourceWithPolygonFix(data, 'SensorData')

		// Iterate over the entities and add labels for "temp_air" and "rh_air"
		for (let i = 0; i < entities.length; i++) {
			const entity = entities[i]
			const measurement = entity.properties._measurement._value

			if (measurement) {
				const tempAir = measurement.temp_air
				const rhAir = measurement.rh_air

				// Create a Date object from the timestamp
				const date = new Date(measurement.time)

				// Get the month, day, hour, and minute components
				const month = date.getMonth() // Adding 1 since getMonth() returns a zero-based index
				const day = date.getDate()
				const hour = date.getHours()
				const minute = date.getMinutes()

				// Create a new Date object with the extracted components
				const formattedDate = new Date(0, month, day, hour, minute)
				// Format the components into a string
				const formattedString = formattedDate.toLocaleString('en-GB', {
					month: 'numeric',
					day: 'numeric',
					hour: 'numeric',
					minute: 'numeric',
				})

				if (tempAir !== undefined && rhAir !== undefined) {
					entity.label = {
						text:
							'Temp: ' +
							tempAir.toFixed(1) +
							'°C \nRH: ' +
							rhAir.toFixed(1) +
							'% \nTime: ' +
							formattedString,
						showBackground: true,
						font: '14px sans-serif',
						horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
						verticalOrigin: Cesium.VerticalOrigin.CENTER,
						pixelOffset: new Cesium.Cartesian2(8, -8),
						fillColor: Cesium.Color.BLUE,
						backgroundColor: Cesium.Color.YELLOW,
						eyeOffset: new Cesium.Cartesian3(0, 0, -100),
					}
				}
			}

			entity.billboard = undefined // Remove any billboard icon
			entity.point = undefined // Remove any point marker
			entity.polyline = undefined // Remove any polyline
			entity.polygon = undefined // Remove any polygon
		}
	}
}
