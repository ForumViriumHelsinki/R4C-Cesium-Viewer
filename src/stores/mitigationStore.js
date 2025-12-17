/**
 * @module stores/mitigationStore
 * Calculates heat reduction impacts from cooling centers and green infrastructure (parks).
 * Implements spatial decay models, neighbor influence algorithms, and cumulative impact tracking
 * for climate adaptation planning in the Helsinki Capital Region.
 *
 * Mitigation strategies:
 * - **Cooling Centers**: Point-based interventions (e.g., air-conditioned public spaces)
 *   - Linear distance decay: Max 20% reduction at source → 4% at 1km radius
 *   - Additive effects from multiple centers
 *   - Based on R4C empirical cooling center data
 *
 * - **Parks/Green Space**: Area-based interventions (landcover conversion to vegetation)
 *   - Park cooling constant: 0.177 (derived from 2022 Helsinki park analysis)
 *   - Spatial influence: Affects source cell + up to 8 neighboring cells
 *   - Effect scales with park area (larger parks = wider influence)
 *   - Distance-weighted neighbor reduction (50% for adjacent, 25% for diagonal)
 *
 * Spatial model:
 * - Grid system: 250m × 250m cells (62,500 m² per cell)
 * - Coordinate system: EUREF-FIN (Finnish National Coordinate System)
 * - Neighbor search: 8-direction queen's case adjacency
 * - Cooling radius: Dynamically calculated from park area and influence factor
 *
 * Impact calculation:
 * - Heat index values: Normalized 0-1 scale
 * - Reduction formula: new_index = max(0, original_index - cooling_effect)
 * - Cumulative tracking: Total cooling area and heat reduction
 * - Modified indices stored per grid_id for visualization
 *
 * @see {@link https://pinia.vuejs.org/|Pinia Documentation}
 */

import { defineStore } from 'pinia'
import logger from '../utils/logger.js'

/**
 * Mitigation Pinia Store
 * Models heat mitigation impacts with spatial decay and cumulative tracking.
 * Many methods already have inline JSDoc comments.
 */
export const useMitigationStore = defineStore('mitigation', {
	state: () => ({
		coolingCenters: [],
		reachability: 1000,
		maxReduction: 0.2,
		minReduction: 0.04,
		affected: [],
		impact: 0,
		optimalEffect: 4.64,
		gridImpacts: {}, // Store impact for each grid_id
		gridCells: [], // Add gridCells here
		optimised: false,
		parks2022CoolingConstant: 0.177,
		gridArea: 62500,
		effecting1GridCellsCoolingAreaMax: Math.PI * 125 ** 2, // Area = πr² 49087.38521 cooling area, 6135.92315125 park area, 4107 count
		effecting5GridCellsCoolingAreaMax: Math.PI * (125 ** 2 + 125 ** 2), // Area = πr²  98175.77042 cooling area, 12271.8463025 park area, 2337 count
		effecting9GridCellsCoolingAreaMax: Math.PI * 375 ** 2, // Area = πr²  441786.46691 cooling area, 55223.3083638 park area, 0 count, 54983.17882646234 highest
		heatReducedByParks: 0,
		totalAreaEffected: 0,
		percentageMax: 0,
		modifiedHeatIndices: {},
		cumulativeCoolingArea: 0,
		cumulativeHeatReduction: 0,
	}),
	actions: {
		/**
		 * Sets grid cells with Cesium entity references
		 * @param {Object} datasource - Cesium data source containing grid entities
		 * @note Uses markRaw on entity objects to prevent them from becoming reactive,
		 *       which would cause DataCloneError when Cesium workers process geometry
		 */
		async setGridCells(datasource) {
			// Extract only serializable data - do NOT store entities
			const gridCellsData = datasource.entities.values
				.filter((entity) => entity.properties?.final_avg_conditional?.getValue() != null)
				.map((entity) => {
					const gridId = entity.properties.grid_id.getValue()
					const heatIndex = entity.properties.final_avg_conditional.getValue()

					this.modifiedHeatIndices[gridId] = heatIndex

					return {
						id: gridId,
						x: entity.properties.euref_x.getValue(),
						y: entity.properties.euref_y.getValue(),
						// DO NOT include entity reference
					}
				})

			this.gridCells = gridCellsData
		},
		/**
		 * Calculates the new heat index for a single entity,
		 * factoring in the effect of all active cooling centers.
		 */
		calculateCoolingCenterEffect(entity) {
			const heatIndexValue = entity.properties.heat_index?.getValue()
			if (heatIndexValue == null) return null

			const euref_x = entity.properties.euref_x?.getValue()
			const euref_y = entity.properties.euref_y?.getValue()

			let totalReduction = 0

			for (const center of this.coolingCenters) {
				const distance = Math.sqrt(
					(center.euref_x - euref_x) ** 2 + (center.euref_y - euref_y) ** 2
				)
				const currentReduction = this.getReductionValue(distance)
				if (currentReduction > 0) {
					totalReduction += currentReduction
				}
			}
			return Math.max(0, heatIndexValue - totalReduction)
		},
		calculateTotalReductionForCell(entity) {
			const euref_x = entity.properties.euref_x?.getValue()
			const euref_y = entity.properties.euref_y?.getValue()

			let totalReduction = 0
			if (euref_x == null || euref_y == null) return 0

			for (const center of this.coolingCenters) {
				const distance = Math.sqrt(
					(center.euref_x - euref_x) ** 2 + (center.euref_y - euref_y) ** 2
				)
				totalReduction += this.getReductionValue(distance)
			}
			return totalReduction
		},
		// ** NEW HELPER ACTION to find neighbors **
		findNearestNeighbors(sourceCellId, maxDistance) {
			const sourceCell = this.gridCells.find((c) => c.id === sourceCellId)
			if (!sourceCell) return []

			return (
				this.gridCells
					.filter((c) => c.id !== sourceCellId)
					.map((neighbor) => ({
						...neighbor,
						distance: Math.sqrt(
							(sourceCell.x - neighbor.x) ** 2 + (sourceCell.y - neighbor.y) ** 2
						),
					}))
					// ** NEW: Filter out neighbors that are too far away **
					.filter((neighbor) => neighbor.distance <= maxDistance)
					.sort((a, b) => a.distance - b.distance) // Sort by distance
					.slice(0, 8)
			) // Still cap at 8, just in case
		},
		getParksEffect(area) {
			if (area > 48000) {
				return 11
			} else if (area > 40000) {
				return 10
			} else if (area > 32000) {
				return 9
			} else if (area > 24000) {
				return 8
			} else if (area > 16000) {
				return 7
			} else if (area > 8000) {
				return 6
			} else {
				return 5
			}
		},
		calculateParksEffect(sourceEntity, totalAreaConverted) {
			const heatReductions = []
			const sourceGridId = sourceEntity.properties.grid_id.getValue()
			const originalIndex = this.modifiedHeatIndices[sourceGridId]
			const sourceReduction = (totalAreaConverted / this.gridArea) * this.parks2022CoolingConstant
			const newIndex = Math.max(0, originalIndex - sourceReduction)

			this.modifiedHeatIndices[sourceGridId] = newIndex
			heatReductions.push({
				grid_id: sourceGridId,
				heatReduction: sourceReduction,
			})

			const areaOfInfluence = totalAreaConverted * this.getParksEffect(totalAreaConverted)
			const coolingRadius = Math.sqrt(areaOfInfluence / Math.PI)
			const neighbors = this.findNearestNeighbors(sourceGridId, coolingRadius)

			neighbors.forEach((neighbor, index) => {
				let neighborReduction = 0
				if (index < 4) {
					if (areaOfInfluence >= this.effecting5GridCellsCoolingAreaMax)
						neighborReduction = this.parks2022CoolingConstant * 0.5
					else if (areaOfInfluence > this.effecting1GridCellsCoolingAreaMax) {
						const range =
							this.effecting5GridCellsCoolingAreaMax - this.effecting1GridCellsCoolingAreaMax
						const progress = areaOfInfluence - this.effecting1GridCellsCoolingAreaMax
						neighborReduction = this.parks2022CoolingConstant * ((progress / range) * 0.5)
					}
				} else {
					if (areaOfInfluence >= this.effecting9GridCellsCoolingAreaMax)
						neighborReduction = this.parks2022CoolingConstant * 0.25
					else if (areaOfInfluence > this.effecting5GridCellsCoolingAreaMax) {
						const range =
							this.effecting9GridCellsCoolingAreaMax - this.effecting5GridCellsCoolingAreaMax
						const progress = areaOfInfluence - this.effecting5GridCellsCoolingAreaMax
						neighborReduction = this.parks2022CoolingConstant * ((progress / range) * 0.25)
					}
				}
				if (neighborReduction > 0) {
					const neighborOriginalIndex = this.modifiedHeatIndices[neighbor.id]
					const neighborNewIndex = Math.max(0, neighborOriginalIndex - neighborReduction)
					this.modifiedHeatIndices[neighbor.id] = neighborNewIndex
					heatReductions.push({
						grid_id: neighbor.id,
						heatReduction: neighborReduction,
					})
				}
			})

			this.cumulativeCoolingArea += areaOfInfluence
			this.cumulativeHeatReduction += heatReductions.reduce(
				(sum, item) => sum + item.heatReduction,
				0
			)

			return {
				heatReductions,
				sourceNewIndex: newIndex,
				totalCoolingArea: areaOfInfluence,
				neighborsAffected: neighbors.length,
			}
		},
		preCalculateGridImpacts() {
			if (!this.gridCells || this.gridCells.length === 0) {
				logger.warn('Grid cells are not set. Cannot pre-calculate impacts.')
				return
			}
			this.gridCells.forEach((cell) => {
				let totalReduction = 0
				this.gridCells.forEach((otherCell) => {
					// Check if otherCell is within 1000 units in both x and y
					if (Math.abs(cell.x - otherCell.x) <= 1000 && Math.abs(cell.y - otherCell.y) <= 1000) {
						const distance = Math.sqrt((cell.x - otherCell.x) ** 2 + (cell.y - otherCell.y) ** 2)
						totalReduction += this.getReductionValue(distance)
					}
				})
				this.gridImpacts[cell.id] = totalReduction
			})
		},
		addCoolingCenter(coolingCenter) {
			this.coolingCenters.push(coolingCenter)
		},
		addCell(id) {
			if (!this.affected.includes(id)) {
				this.affected.push(id)
			}
		},
		addImpact(impact) {
			this.impact += impact
		},
		resetStore() {
			this.coolingCenters = []
			this.affected = []
			this.impact = 0
			this.optimised = false
			this.cumulativeCoolingArea = 0
			this.cumulativeHeatReduction = 0
		},
		/**
		 * Sets the total heat reduction impact value
		 * @param {number} value - Impact value to set
		 */
		setImpact(value) {
			this.impact = value
		},
		/**
		 * Sets the array of affected grid cell IDs
		 * @param {Array<number|string>} array - Array of grid cell IDs affected by mitigation
		 */
		setAffected(array) {
			this.affected = array
		},
		/**
		 * Sets the optimization state flag
		 * @param {boolean} value - True if cooling centers have been optimized
		 */
		setOptimised(value) {
			this.optimised = value
		},
		/**
		 * Resets mitigation state to default values
		 * Clears impact, affected cells, and optimization flag
		 */
		resetMitigationState() {
			this.impact = 0
			this.affected = []
			this.optimised = false
		},
		getCoolingCenterCount(gridId) {
			return this.coolingCenters.filter((center) => center.grid_id === gridId).length
		},
		getCoolingCapacity(gridId) {
			return this.coolingCenters
				.filter((center) => center.grid_id === gridId)
				.reduce((total, center) => total + center.capacity, 0)
		},
		getReductionValue(distance) {
			return distance > this.reachability
				? 0
				: this.maxReduction -
						(distance / this.reachability) * (this.maxReduction - this.minReduction)
		},
		getGridImpact(gridId) {
			return this.gridImpacts[gridId] || 0
		},
	},
})
