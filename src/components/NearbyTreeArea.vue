<template>

  <div id="nearbyTreeAreaContainer">
  </div>

<label id="bearingLabel" style="position: fixed; bottom: 41px; left: 15px; visibility: hidden;">Direction of trees</label>

  <div id="bearingAllSwitchContainer">
    <!-- bearingAll -->
    <label class="switch" id="bearingAllSwitch">
      <input type="checkbox" id="bearingAllToggle" value="a">
      <span class="slider round"></span>
    </label>
    <label for="bearingAllToggle" class="label" id="bearingAllLabel">All</label>
  </div>

  <div id="bearingSouthSwitchContainer">
    <!-- bearingSouth -->
    <label class="switch" id="bearingSouthSwitch">
      <input type="checkbox" id="bearingSouthToggle" value="s">
      <span class="slider round"></span>
    </label>
    <label for="bearingSouthToggle" class="label" id="bearingSouthLabel">South</label>
  </div>

  <div id="bearingWestSwitchContainer">
    <!-- bearingWest -->
    <label class="switch" id="bearingWestSwitch">
      <input type="checkbox" id="bearingWestToggle" value="w">
      <span class="slider round"></span>
    </label>
    <label for="bearingWestToggle" class="label" id="bearingWestLabel">West</label>
  </div>

  <div id="bearingEastSwitchContainer">
    <!-- bearingEast -->
    <label class="switch" id="bearingEastwitch">
      <input type="checkbox" id="bearingEastToggle" value="e">
      <span class="slider round"></span>
    </label>
    <label for="bearingEastToggle" class="label" id="bearingEastLabel">East</label>
  </div>

  <div id="bearingNorthSwitchContainer">
    <!-- bearingWest -->
    <label class="switch" id="bearingNorthSwitch">
      <input type="checkbox" id="bearingNorthToggle" value="n">
      <span class="slider round"></span>
    </label>
    <label for="bearingNorthToggle" class="label" id="bearingNorthLabel">North</label>
  </div>

</template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import * as Cesium from 'cesium';
import Plot from '../services/plot.js'; 
  
export default {
	mounted() {
		this.unsubscribe = eventBus.$on( 'newNearbyTreeDiagram', this.newNearbyTreeDiagram );
		this.store = useGlobalStore();
		this.plotService = new Plot();

	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		newNearbyTreeDiagram( data, entities, buildings ) {

			if ( this.store.level == 'postalCode' ) {
				this.plotService.hideScatterPlot();
				// Call function that combines datasets for plotting
				const sumPAlaM2Map = this.combineDistanceAndTreeData( data, entities );
				const heatExpTreeArea = this.createTreeBuildingPlotMap( sumPAlaM2Map, buildings );
				const heatExpAverageTreeArea = this.extractKeysAndAverageTreeArea( heatExpTreeArea );
				this.createTreesNearbyBuildingsPlot( heatExpAverageTreeArea[ 0 ], heatExpAverageTreeArea[ 1 ], heatExpAverageTreeArea[ 2 ] );

			}
		},
		clearNearbyTreeDiagram() {
			d3.select( '#nearbyTreeAreaContainer' ).select( 'svg' ).remove();
		},
		/**
 * Extracts heat expsoure and calculates average tree_area from the heatTreeAverageMap.
 *
 * @param { Map } heatTreeAverageMap - The map containing heat exposure values as keys and tree_area/count as values.
 * 
 * @return { Array } An array containing three sub-arrays. The first sub-array contains all the keys from the map, and the second sub-array contains the calculated average tree_area for each key. Third one contains the count of buildings for the heat exposure value.
 */
		extractKeysAndAverageTreeArea( heatTreeAverageMap ) {
			const heatExpArray = [];
			const averageTreeAreaArray = [];
			const buildingCounts = [];

			heatTreeAverageMap.forEach( ( value, key ) => {
				heatExpArray.push( key );

				if ( value.tree_area == 0 ) {
	
					// setting the value to 1 if there is no tree area nearby
					averageTreeAreaArray.push( 1 );

				} else {

					averageTreeAreaArray.push( value.tree_area / value.count );

				}

				buildingCounts.push( value.count );

			} );
  
			return [ heatExpArray, averageTreeAreaArray, buildingCounts ];

		},

		/**
 * Adds Urban Heat Exposure to tree area data.
 *
 * @param { Map } sumPAlaM2Map - The dataset containing tree information, mapped to building IDs.
 * @param { Map } buildingsDataSource - The datasource containing buildings data of the postal code area.
 * 
 * @return { Map } A map for plotting that contains the aggregated tree_area and count of buildings for each heat exposure value.
 */
		createTreeBuildingPlotMap( sumPAlaM2Map, buildingsDataSource ) {

			const heatTreeAverageMap = new Map();
			let totalCounter = 0;
			let totalTreeArea = 0;


			let maxTreeArea = 0;
			let maxTreeAreaBuilding = null;
	
			// Iterate over all entities in data source
			for ( let i = 0; i < buildingsDataSource._entityCollection._entities._array.length; i++ ) {
	
				let entity = buildingsDataSource._entityCollection._entities._array[ i ];	
				// If entity has a heat exposure value, add it to the urbanHeatData array and add data for the scatter plot

				if ( this.store.view == 'helsinki' ) {
					
					if ( entity._properties.avgheatexposuretobuilding && entity._properties._id && entity._properties._area_m2 && Number( entity._properties._area_m2._value ) > 225 ) {

						const building_id = entity._properties._id._value;
						const heatExposure = entity._properties.avgheatexposuretobuilding._value.toFixed( 2 );
						let tree_area = sumPAlaM2Map.get( building_id );

						// Set tree area to 0
						if ( !tree_area ) {

							tree_area = 0;

						}
			
						if ( heatTreeAverageMap.has( heatExposure ) ) {

							let storedValues = heatTreeAverageMap.get( heatExposure );
							storedValues.tree_area = storedValues.tree_area + tree_area;
							storedValues.count = storedValues.count + 1;


							heatTreeAverageMap.set( heatExposure, storedValues );
			
						} else {
				
							heatTreeAverageMap.set( heatExposure, { tree_area: tree_area, count: 1 } );

						}

						// Set tree_area as a property of the entity
						entity._properties.treeArea = tree_area;
			
						if ( tree_area > 225 ) {

							// Highlight the building entity edges by changing its outlineColor and outlineWidth
							if ( entity.polygon ) {

								entity.polygon.outline = true; // Enable outline
								entity.polygon.outlineColor = Cesium.Color.CHARTREUSE; // Set outline color to green
								entity.polygon.outlineWidth = 20; // Set outline width to 3 (adjust as needed)

							}

							if ( maxTreeArea < tree_area ) {

								maxTreeArea = tree_area;
								maxTreeAreaBuilding = building_id;

							}

						} 

						// for calculating postal code average
						totalTreeArea += tree_area;
						totalCounter++;

					}

				} else {

					if ( entity._properties._avgheatexposuretobuilding && entity._properties._hki_id && entity._properties._area_m2 && Number( entity._properties._area_m2._value ) > 225 ) {

						const building_id = entity._properties._hki_id._value;
						const heatExposure = entity._properties.avgheatexposuretobuilding._value.toFixed( 2 );
						let tree_area = sumPAlaM2Map.get( building_id );

						// Set tree area to 0
						if ( !tree_area ) {

							tree_area = 0;

						}
			
						if ( heatTreeAverageMap.has( heatExposure ) ) {

							let storedValues = heatTreeAverageMap.get( heatExposure );
							storedValues.tree_area = storedValues.tree_area + tree_area;
							storedValues.count = storedValues.count + 1;


							heatTreeAverageMap.set( heatExposure, storedValues );
			
						} else {
				
							heatTreeAverageMap.set( heatExposure, { tree_area: tree_area, count: 1 } );

						}

						// Set tree_area as a property of the entity
						entity._properties.treeArea = tree_area;
			
						if ( tree_area > 225 ) {

							// Highlight the building entity edges by changing its outlineColor and outlineWidth
							if ( entity.polygon ) {

								entity.polygon.outline = true; // Enable outline
								entity.polygon.outlineColor = Cesium.Color.CHARTREUSE; // Set outline color to green
								entity.polygon.outlineWidth = 20; // Set outline width to 3 (adjust as needed)

							}

							if ( maxTreeArea < tree_area ) {

								maxTreeArea = tree_area;
								maxTreeAreaBuilding = building_id;

							}

						} 

						// for calculating postal code average
						totalTreeArea += tree_area;
						totalCounter++;

					}

				}

			}

			this.setEntityColorToGreen( maxTreeAreaBuilding, buildingsDataSource );

			this.store.averageTreeArea = totalTreeArea / totalCounter;

			return heatTreeAverageMap;

		},

		/**
 * Set up entity outline
 *
 * @param { object } entityId - Id of Cesium entity
 * @param { object } datasource - The datasource the entity is located in
 * 
 */
		setEntityColorToGreen( entityId, datasource ) {
	
			// Iterate over all entities in data source
			for ( let i = 0; i < datasource._entityCollection._entities._array.length; i++ ) {
	
				const entity = datasource._entityCollection._entities._array[ i ];

				if ( entity._properties._id && entity._properties._id._value == entityId ) {

					entity.polygon.material = Cesium.Color.FORESTGREEN;
					entity.polygon.outlineColor = Cesium.Color.RED; // Set outline color to red
			
				}
			}

		},

		/**
 * Combines the distance and tree datasets for plotting
 *
 * @param { object } distanceData - The dataset containing distance information
 * @param { object } entities - The dataset containing tree information
 * 
 * @return { object } mapped data for plotting
 */
		combineDistanceAndTreeData( distanceData, entities ) {

			const selectedBearingValue = this.findSelectedBearingValue();

			// Create a map to store the sum of 'p_ala_m2' for each 'kohde_id' in 'treeData'
			const sumPAlaM2Map = new Map();


			for ( let i = 0, len = distanceData.features.length; i < len; i++ ) {

				const bearing = distanceData.features[ i ].properties.bearing;

				if ( this.checkBearing( bearing, selectedBearingValue ) ) {

					const building_id = distanceData.features[ i ].properties.building_id;
					const tree_id = distanceData.features[ i ].properties.tree_id;

					for ( let i = 0; i < entities.length; i++ ) {
        
						let entity = entities[ i ];
				
						// Check if the entity posno property matches the postalcode.
						if ( entity._properties._kohde_id._value === tree_id ) {

							entity.polygon.outline = true; // Enable outline
							entity.polygon.outlineColor = Cesium.Color.CHARTREUSE; // Set outline color to green
							entity.polygon.outlineWidth = 20; // Set outline width to 3 (adjust as needed)

							const p_ala_m2 = entity._properties._p_ala_m2._value ;
	
							if ( sumPAlaM2Map.has( building_id ) ) {
	
								sumPAlaM2Map.set( building_id, sumPAlaM2Map.get( building_id ) + p_ala_m2 );
					
							} else {
						
								sumPAlaM2Map.set( building_id, p_ala_m2 );
	
							}

						}
					}	
				}
			}

			return sumPAlaM2Map;

		},

		/**
 * Check if the bearing value is according to user select value
 *
 * @param { Number } bearing - The bearing of tree to building
 * @param { String } selectedBearingValue - The selected bearing value by user
 * 
* @return { Boolean } 
 */
		checkBearing( bearing, selectedBearingValue ) {

			switch ( selectedBearingValue ){
			case 'a':
				return true;
			case 's':
				if ( bearing > 134 && bearing < 225 ) {
					return true;
				}

			case 'w':
				if ( bearing > 224 && bearing < 315 ) {

					return true;
				}
			case 'n':
				if ( bearing > 314 && bearing < 45 ) {

					return true;
				}
			case 'e':
				if ( bearing > 44 && bearing < 135 ) {

					return true;
				}

			default:
				return false;
			}	


		},

		createBarsForTreeChart( svg, data, xScale, yScale, width, height, tooltip, containerId, heatExps, color = 'green' ) {
			svg.selectAll( '.bar' )
				.data( data )
				.enter().append( 'rect' )
				.attr( 'class', 'bar' )
				.attr( 'x', ( d, i ) => xScale( heatExps[i] ) )
				.attr( 'y', d => yScale( d ) )
				.attr( 'width', width / data.length )
				.attr( 'height', d => height - yScale( d ) )
				.attr( 'fill', color )
				.on( 'mouseover', ( event, d, i ) => this.handleMouseover( tooltip, containerId, event, d, 
					() => `Heat Exposure: ${heatExps[i]}<br>Tree Area: ${d}` ) )
				.on( 'mouseout', () => this.handleMouseout( tooltip ) );
		},
		/**
 * This function iterates through each direction using the switches array. 
 * For each direction, function gets the corresponding switch container and the associated toggle input element. 
 * If the toggle is checked (meaning the switch is turned on), the function return its value
 *
 */
		findSelectedBearingValue() {
			const switches = [ 'All', 'South', 'West', 'East', 'North' ];
  
			for ( const direction of switches ) {

				const switchContainer = document.getElementById( `bearing${ direction }SwitchContainer` );
				const toggle = switchContainer.querySelector( `#bearing${ direction }Toggle` );

				if ( toggle.checked ) {
					
					return toggle.value;

				}
			}

			return null; // Return null if no switch is selected
		},


		/**
 * Creates trees nearby buildings bar plot
 *
 * @param { Array<Number> } heatexps array cointainig buildings heat exposure
 * @param { Array<Number> } tree_areas array cointainig buildings nearby tree area
* @param { Array<Number> } counts array cointainig count of buildings for that heat exposure
 */
		createTreesNearbyBuildingsPlot( heatexps, tree_areas ) {
			this.plotService.initializePlotContainer( 'nearbyTreeAreaContainer' );

			if ( tree_areas.length > 0 ) {
				this.plotService.toggleBearingSwitchesVisibility( 'visible' );

				const margin = { top: 30, right: 30, bottom: 60, left: 30 };
				const width = 600 - margin.left - margin.right;
				const height = 300 - margin.top - margin.bottom;

				const svg = this.plotService.createSVGElement( margin, width, height, '#nearbyTreeAreaContainer' );

				const x = this.plotService.createScaleLinear( d3.min( heatexps ), d3.max( heatexps ), [ 0, width ] );
				const y = this.plotService.createScaleLinear( 0, d3.max( tree_areas ), [ height, 0 ] );

				this.plotService.setupAxes( svg, x, y, height );

				const tooltip = this.plotService.createTooltip( '#nearbyTreeAreaContainer' );

				this.createBarsForTreeChart( svg, tree_areas, x, y, width, height, tooltip, 'nearbyTreeAreaContainer', heatexps, 'green' );
				this.plotService.addTitle( svg, 'Nearby Tree Area of Buildings with Heat Exposure', width, margin );

			}

		},
	},
};
</script>

<style>

#nearbyTreeAreaContainer{
    position: fixed;
    bottom: 35px;
    left: -19px;
    width: 640px; /* Adjusted width to accommodate margin */
    height: 300px; /* Adjusted height to accommodate margin */
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black;
    background-color: white;
    margin: 20px; /* Add margins to the container */
}
#bearingAllSwitchContainer 
{
    position: fixed;
    bottom: 65px;
    left: 120px;
	visibility: hidden;
}

#bearingSouthSwitchContainer 
{
    position: fixed;
    bottom: 65px;
    left: 210px;
	visibility: hidden;
}

#bearingWestSwitchContainer 
{
    position: fixed;
    bottom: 65px;
    left: 300px;
	visibility: hidden;
}

#bearingEastSwitchContainer 
{
    position: fixed;
    bottom: 65px;
    left: 390px;
	visibility: hidden;
}

#bearingNorthSwitchContainer 
{
    position: fixed;
    bottom: 65px;
    left: 480px;
	visibility: hidden;
}
</style>