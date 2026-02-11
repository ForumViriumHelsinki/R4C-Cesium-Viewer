import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import logger from '../utils/logger.js'
import { getCesium } from './cesiumProvider.js'
import Datasource from './datasource.js'
import Populationgrid from './populationgrid.js'

/**
 * Travel Time Service
 * Manages public transport accessibility visualization using 250m grid travel times.
 * Displays average travel times from a selected location to all other grid cells
 * using public transport (walking + metro/bus/tram). Part of accessibility analysis
 * for urban planning and equity assessment.
 *
 * Data source: Helsinki Region Transport (HSL) travel time matrix
 * Grid system: 250m × 250m population grid cells
 * Transport modes: Walking + public transport (metro, bus, tram)
 * Metric: Average travel time in minutes (pt_m_walk_avg)
 *
 * Visualization features:
 * - Grid cell labels showing travel time in minutes
 * - Green space overlay on population grid
 * - Current location marker (black point)
 * - Distance-based label scaling
 *
 * @class Traveltime
 */
export default class Traveltime {
	/**
	 * Creates a Traveltime service instance
	 */
	constructor() {
		this.toggleStore = useToggleStore()
		this.store = useGlobalStore()
		this.viewer = this.store.cesiumViewer
		this.datasourceService = new Datasource()
		this.populationGridService = new Populationgrid()
		this.urlStore = useURLStore()
	}

	/**
	 * Loads travel time data from a specific grid cell origin
	 * Fetches HSL travel time matrix data showing average public transport
	 * journey times from the origin cell to all other grid cells.
	 *
	 * @param {number} from_id - Origin grid cell ID (250m population grid)
	 * @returns {Promise<void>}
	 * @throws {Error} If travel time API request fails
	 *
	 * @example
	 * // Load travel times from grid cell 5975375
	 * await travelTimeService.loadTravelTimeData(5975375);
	 */
	async loadTravelTimeData(from_id) {
		try {
			const response = await fetch(this.urlStore.hkiTravelTime(from_id))
			const traveltimedata = await response.json()
			await this.addTravelTimeLabels(traveltimedata.features[0].properties.travel_data)
		} catch (error) {
			logger.error('Error loading travel time data:', error)
			this.store.showError(
				'Unable to load travel time data. Please try again.',
				`Failed to fetch travel times from grid cell ${from_id}: ${error.message}`
			)
			throw error // Re-throw so callers know it failed
		}
	}

	/**
	 * Creates labeled point markers showing travel times at grid cell centers
	 * Matches travel time data to grid entities and creates centered labels.
	 * Calculates polygon centroids using bounding sphere method.
	 *
	 * @param {Array<Object>} traveldata - Travel time records with to_id and pt_m_walk_avg
	 * @returns {void}
	 *
	 * @example
	 * // traveldata format:
	 * [{ to_id: 5975376, pt_m_walk_avg: 12.5 }, ...]
	 */
	async addTravelTimeLabels(traveldata) {
		const Cesium = getCesium()
		const geoJsonData = {
			type: 'FeatureCollection',
			features: [],
		}

		const dataSources = this.viewer.dataSources.getByName('TravelTimeGrid')

		if (dataSources?.length > 0) {
			const entities = dataSources[0].entities.values

			for (const entity of entities) {
				if (entity.polygon) {
					const entityId = entity.properties.id.getValue()

					// Find the corresponding data in your traveldata
					const matchingData = traveldata.find((data) => Number(data.to_id) === Number(entityId))

					if (matchingData) {
						const hierarchy = entity.polygon.hierarchy.getValue().positions

						// Calculate the center of the polygon's vertices
						const boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy)
						const centerCartesian = boundingSphere.center

						// Convert the center to latitude and longitude in degrees
						const centerLL84 = Cesium.Cartographic.fromCartesian(centerCartesian)
						const centerLatitude = Cesium.Math.toDegrees(centerLL84.latitude)
						const centerLongitude = Cesium.Math.toDegrees(centerLL84.longitude)

						geoJsonData.features.push({
							type: 'Feature',
							geometry: {
								type: 'Point',
								coordinates: [centerLongitude, centerLatitude],
							},
							properties: {
								time: Number(matchingData.pt_m_walk_avg).toFixed(0),
								id: Number(matchingData.to_id),
							},
						})
					}
				}
			}
		} else {
			logger.error('TravelTimeGrid data source not found.')
		}

		await this.removeTravelTimeGridAndAddDataGrid()
		await this.addTravelLabelDataSource(geoJsonData)
	}

	/**
	 * Replaces travel time grid with population grid and applies green space styling
	 * Removes temporary travel time grid, recreates population grid, and overlays
	 * green space coverage visualization (water + vegetation + trees).
	 *
	 * @returns {Promise<void>}
	 */
	async removeTravelTimeGridAndAddDataGrid() {
		await this.datasourceService.removeDataSourcesByNamePrefix('TravelTimeGrid')
		await this.populationGridService.createPopulationGrid()

		if (this.toggleStore.travelTime) {
			const dataSource = this.datasourceService.getDataSourceByName('PopulationGrid')

			if (!dataSource) {
				logger.error('Data source with name PopulationGrid not found.')
				return []
			}

			// Get the entities of the data source
			const entities = dataSource.entities.values

			for (let i = 0; i < entities.length; i++) {
				const entity = entities[i]
				this.populationGridService.setGridEntityPolygonToGreen(entity)
			}

			this.toggleStore.setTravelTime(false)
		}
	}

	/**
	 * Adds travel time labels as a GeoJSON data source
	 * Creates text labels at grid cell centers showing average travel times.
	 * Labels scale with camera distance for readability.
	 *
	 * @param {Object} data - GeoJSON FeatureCollection with point features
	 * @returns {void}
	 *
	 * Label styling:
	 * - Font: 24px sans-serif
	 * - Color: Black text
	 * - Scale: 1.0 at 4km, 0.0 at 80km (distance-based fade)
	 * - Eye offset: Elevated above ground for visibility
	 */
	async addTravelLabelDataSource(data) {
		const Cesium = getCesium()

		try {
			const dataSource = await this.viewer.dataSources.add(Cesium.GeoJsonDataSource.load(data, {}))

			dataSource.name = 'TravelLabel'
			const entities = dataSource.entities.values

			for (const entity of entities) {
				const time = entity._properties._time._value

				if (time) {
					entity.label = {
						text: time.toString(),
						showBackground: false,
						font: '24px sans-serif',
						horizontalOrigin: Cesium.HorizontalOrigin.CENTER,
						verticalOrigin: Cesium.VerticalOrigin.CENTER,
						fillColor: Cesium.Color.BLACK,
						backgroundColor: Cesium.Color.WHITE,
						eyeOffset: new Cesium.Cartesian3(0, 20, -20),
						scaleByDistance: new Cesium.NearFarScalar(4000, 1, 80000, 0.0),
					}
				}

				entity.billboard = undefined
				entity.point = undefined
				entity.polyline = undefined
				entity.polygon = undefined
			}
		} catch (error) {
			logger.error('Failed to add travel label data source:', error)
		}
	}

	/**
	 * Marks the origin grid cell with a prominent black point marker
	 * Calculates polygon center and adds a large, distance-scaled marker
	 * to indicate the travel time origin location.
	 *
	 * @param {Object} entity - Grid cell entity to mark as origin
	 * @returns {void}
	 *
	 * Marker styling:
	 * - Color: Black (42px with 14px outline)
	 * - Scale: 1.0 at 4km, 0.0 at 40km
	 * - Eye offset: Elevated for visibility
	 */
	markCurrentLocation(entity) {
		const Cesium = getCesium()
		const hierarchy = entity.polygon.hierarchy.getValue().positions

		// Calculate the center of the polygon's vertices
		const boundingSphere = Cesium.BoundingSphere.fromPoints(hierarchy)
		const centerCartesian = boundingSphere.center

		this.viewer.entities.add({
			position: centerCartesian,
			name: 'currentLocation',
			point: {
				show: true,
				color: Cesium.Color.BLACK,
				pixelSize: 42,
				outlineColor: Cesium.Color.BLACK,
				outlineWidth: 14,
				eyeOffset: new Cesium.Cartesian3(0, 200, -200),
				scaleByDistance: new Cesium.NearFarScalar(4000, 1, 40000, 0.0),
			},
		})
	}
}
