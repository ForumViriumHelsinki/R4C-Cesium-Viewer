<template>
    <div id="buildingChartContainer">
    </div>
	<div id="hsyBuildingChartContainer">
    </div>
    <div id="buildingTreeChartContainer" >
    </div>

  </template>
  
<script>
import { eventBus } from '../services/eventEmitter.js';
import * as d3 from 'd3'; // Import D3.js
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import Plot from '../services/plot.js'; 
import ColdArea from '../services/coldarea.js';
import Datasource from '../services/datasource.js';
  
export default {
	computed: {
        shouldShowBuilding() {
			const store = useGlobalStore(); // Get access to the global store
            return store.level === 'building';
        }
    },
    watch: {
        shouldShowBuilding(newValue) {
			if ( !newValue ) {
				document.getElementById( 'buildingChartContainer' ).style.visibility = 'hidden';
				document.getElementById( 'buildingTreeChartContainer' ).style.visibility = 'hidden';
				document.getElementById( 'hsyBuildingChartContainer' ).style.visibility = 'hidden';
			}
        }
    },
	mounted() {
		this.unsubscribe = eventBus.$on( 'newBuildingHeat', this.newBuildingHeat );
		this.unsubscribe = eventBus.$on( 'newBuildingTree', this.newBuildingTree );
		this.unsubscribe = eventBus.$on( 'newBuildingGridChart', this.newBuildingGridChart );
		this.store = useGlobalStore();
		this.toggleStore  = useToggleStore();
		this.propsStore  = usePropsStore();
		this.plotService = new Plot();
		this.coldAreaService = new ColdArea();
	},
	beforeUnmount() {
		this.unsubscribe();
	},
	methods: {
		addEventListeners() {
			document.getElementById( 'hideColdAreasToggle' ).addEventListener( 'change', this.hideColdAreas );
		},		
		newBuildingGridChart( ) {
			if ( this.propsStore.gridBuildingProps && this.store.view == 'grid' ) {
				this.createBuildingGridChart( this.propsStore.gridBuildingProps );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingBarChart();
			}
		},
		newBuildingHeat( ) {
			if ( this.store.level == 'building' ) {

				if ( this.store.view == 'capitalRegion' ) {

				this.createHSYBuildingBarChart();

				if ( this.propsStore.buildingHeatExposure > 27.2632995605 ) {

					this.addEventListeners();
					this.coldAreaService.loadColdAreas();

				}
				} else {

					this.createBuildingBarChart();

				}

			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingBarChart();
			}
		},
		newBuildingTree( ) {
			if ( this.store.level == 'building' ) {
				this.createBuildingTreeBarChart( );
			} else {
				// Hide or clear the visualization when not visible
				// Example: call a method to hide or clear the D3 visualization
				this.clearBuildingTreeBarChart();
			}
		},

		/**
 		* This function handles the toggle event for showing or hiding the cold areas layer on the map.
 		*
 		*/
		hideColdAreas() {

			const hideColdAreas = document.getElementById( 'hideColdAreasToggle' ).checked;
			this.toggleStore.setHideColdAreas( hideColdAreas );
			const dataSourceService = new Datasource();

			if ( hideColdAreas ) {

				dataSourceService.changeDataSourceShowByName( 'ColdAreas', false );

			} else {

				dataSourceService.changeDataSourceShowByName( 'ColdAreas', true );

			}

		},		

		createBuildingGridChart( buildingProps ) {

			this.plotService.initializePlotContainerForGrid( 'buildingChartContainer' );
			const margin = { top: 50, right: 20, bottom: 30, left: 40 };
			const width = 300 - margin.left - margin.right;
			const height = 250 - margin.top - margin.bottom;

			// Prepare the data array from buildingProps
			const data = [
				{ label: '0-9', value: buildingProps._pop_d_0_9._value },
				{ label: '10-19', value: buildingProps._pop_d_10_19._value },
				{ label: '20-29', value: buildingProps._pop_d_20_29._value },
				{ label: '30-39', value: buildingProps._pop_d_30_39._value },
				{ label: '40-49', value: buildingProps._pop_d_40_49._value },
				{ label: '50-59', value: buildingProps._pop_d_50_59._value },
				{ label: '60-69', value: buildingProps._pop_d_60_69._value },
				{ label: '70-79', value: buildingProps._pop_d_70_79._value },
				{ label: '80-', value: buildingProps._pop_d_over80._value }
			];

			// Create SVG element
			const svg = this.plotService.createSVGElement( margin, width, height, '#buildingChartContainer' );

			// Create scales
			const xScale = this.plotService.createScaleBand( data.map( d => d.label ), width );
			const yScale = this.plotService.createScaleLinear( 0, d3.max( data, d => d.value ), [ height, 0 ] );

			// Setup axes
			this.plotService.setupAxes( svg, xScale, yScale, height );
			const tooltip = this.plotService.createTooltip( '#buildingChartContainer' );

			// Create the bars
			this.createBars( svg, data, xScale, yScale, height, tooltip, 0, 'steelblue' );

			// Add labels to the x-axis
			svg.append( 'g' )
				.attr( 'transform', `translate(0, ${height})` )
				.call( d3.axisBottom( xScale ) )
				.selectAll( 'text' )
				.style( 'display', 'none' ); // Hide the text labels

			// Add chart title
			this.plotService.addTitle( svg, 'Population approximation for ' + this.store.buildingAddress, width, margin );
		}, 
		// Updated to include xOffset and barColor parameters
		createBars( svg, data, xScale, yScale, height, tooltip, xOffset, barColor ) {
			const barWidth = xScale.bandwidth();

			const bar = svg.selectAll( `.bar.${barColor}` )
				.data( data )
				.enter()
				.append( 'g' )
				.attr( 'class', `bar ${barColor}` )
				.attr( 'transform', d => `translate(${xScale( d.label ) + xOffset}, 0)` ); // Adjust position based on xOffset

			bar.append( 'rect' )
				.attr( 'x', 0 )
				.attr( 'y', d => yScale( d.value ) )
				.attr( 'width', barWidth ) // Use the narrower width
				.attr( 'height', d => height - yScale( d.value ) )
				.attr( 'fill', barColor )
				.on( 'mouseover', ( event, d ) => 
					this.plotService.handleMouseover( tooltip, 'buildingChartContainer', event, d, 
						( data ) => `Age ${data.label}: ${( data.value * 100 ).toFixed( 2 )} %` ) )
				.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) );
		},     
		/**
 * Create building specific bar chart.
 *
 */
		createBuildingBarChart( ) {

			const buildingHeatExposure = this.propsStore.buildingHeatExposure;
			const address = this.store.buildingAddress;
			const postinumero = this.store.postalcode;
			this.plotService.initializePlotContainer( 'buildingChartContainer' );

			const postalCodeHeat = this.store.averageHeatExposure;

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 300 - margin.left - margin.right;
			const height = 250 - margin.top - margin.bottom;

			const svg = this.plotService.createSVGElement( margin, width, height, '#buildingChartContainer' );

			const xScale = this.plotService.createScaleBand( [ address, postinumero ], width );
			const yScale = this.plotService.createScaleLinear( 0, Math.max( buildingHeatExposure, postalCodeHeat ), [ height, 0 ] );

			// Create bars and labels
			const data = [
				{ name: address, value: buildingHeatExposure.toFixed( 3 ) },
				{ name: postinumero, value: postalCodeHeat.toFixed( 3 ) }
			];
			const colors = { [address]: 'orange', [postinumero]: 'steelblue' };

			this.createBarsWithLabels( svg, data, xScale, yScale, height, colors );

			this.plotService.setupAxes( svg, xScale, yScale, height );

			if ( this.store.view == 'helsinki' ) {

				this.plotService.addTitle( svg, 'Urban Heat Exposure Index Comparison', width, margin );
    
			} else {

				this.plotService.addTitle( svg, 'Temperature in Celsius Comparison', width, margin );

			}
		},

		/**
 * Create building specific bar chart.
 *
 */
		createHSYBuildingBarChart( ) {

			const buildingHeatExposure = this.propsStore.buildingHeatTimeseries;
			const postalcodeHeatTimeseries = this.propsStore.postalcodeHeatTimeseries;
			const address = this.store.buildingAddress;
			const postinumero = this.store.postalcode;

			this.plotService.initializePlotContainer( 'hsyBuildingChartContainer' );

			const postalCodeHeat = createPostalCodeTimeseries( postalcodeHeatTimeseries );

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 500 - margin.left - margin.right;
			const height = 250 - margin.top - margin.bottom;

			const svg = this.plotService.createSVGElement( margin, width, height, '#hsyBuildingChartContainer' );

    // Extract unique dates and create scales
    const allDates = Array.from(new Set(buildingHeatExposure.map(d => d.date).concat(postalCodeHeat.map(d => d.date))));
    const xScale = this.plotService.createScaleBand(allDates.sort(), width);
    const maxTemp = Math.max(
        ...buildingHeatExposure.map(d => d.avg_temp_c),
        ...postalCodeHeat.map(d => d.averageTemp)
    );
    const yScale = this.plotService.createScaleLinear(0, maxTemp, [height, 0]);

    // Combine building and postal code data
    const combinedData = [
        ...buildingHeatExposure.map(d => ({ date: d.date, value: d.avg_temp_c, type: 'building' })),
        ...postalCodeHeat.map(d => ({ date: d.date, value: d.averageTemp, type: 'postalcode' }))
    ];

	const tooltip = this.plotService.createTooltip( '#hsyBuildingChartContainer' );


    // Create bars and labels (only once)
    this.createHSYBarsWithLabels(svg, combinedData, xScale, yScale, height, { building: 'orange', postalcode: 'steelblue' }, tooltip ); 

    this.plotService.setupAxes(svg, xScale, yScale, height);
    this.plotService.addTitle(svg, 'Temperature in Celsius Comparison', width, margin);
				    // Add legend in top-right corner
    const legendData = [
        { name: address, color: 'orange' },
        { name: postinumero, color: 'steelblue' }
    ];
    const legendX = 345 - margin.right;  // Adjust as needed
    const legendY = margin.top - 120;              // Adjust as needed

    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    legend.selectAll(".legend-item")
        .data(legendData)
        .enter()
        .append("rect")
        .attr("class", "legend-item")
        .attr("width", 10)
        .attr("height", 10)
        .attr("x", 0)
        .attr("y", (d, i) => i * 20)
        .attr("fill", d => d.color);

    legend.selectAll(".legend-text")
        .data(legendData)
        .enter()
        .append("text")
        .attr("class", "legend-text")
        .attr("x", 15)
        .attr("y", (d, i) => i * 20 + 9)  // Adjust to vertically center text
        .text(d => d.name);
	    legend.attr("transform", `translate(${legendX}, ${legendY})`);


},

		/**
 * Returns either heat exposure or temperature in Celsius of postal code area.
 *
 */
		getPostalCodeHeat() {

			if ( this.store.view == 'helsinki' ) {

				return this.store.averageHeatExposure;

			} else {

				let tempInKelvin = this.store.averageHeatExposure * ( this.store.maxKelvin - this.store.minKelvin ) + this.store.minKelvin;

				return tempInKelvin - 273.15;

			}

		},

		setTreeArea() {

			return this.propsStore.treeArea || 0; // Return the value or 0 if it's falsy
	
		},
		/**
 * Create building specific bar chart.
 *
 */
		createBuildingTreeBarChart( ) {

			const treeArea = this.setTreeArea();
			const postinumero = this.store.postalcode;
			this.plotService.initializePlotContainer( 'buildingTreeChartContainer' );
			const address = this.store.buildingAddress;

			const margin = { top: 70, right: 30, bottom: 30, left: 60 };
			const width = 300 - margin.left - margin.right;
			const height = 200 - margin.top - margin.bottom;

			const svg = this.plotService.createSVGElement( margin, width, height, '#buildingTreeChartContainer' );

			const xScale = this.plotService.createScaleBand( [ address, postinumero ], width );
			const yScale = this.plotService.createScaleLinear( 0, Math.max( treeArea, this.store.averageTreeArea ), [ height, 0 ] );

			// Create bars and labels
			const data = [
				{ name: address, value: treeArea.toFixed( 3 ) },
				{ name: postinumero, value: this.store.averageTreeArea.toFixed( 3 ) }
			];
			const colors = { [address]: 'green', [postinumero]: 'yellow' };

			this.createBarsWithLabels( svg, data, xScale, yScale, height, colors );

			this.plotService.setupAxes( svg, xScale, yScale, height );

			this.plotService.addTitle( svg, 'Nearby tree area comparison', width, margin );
		},

		createBarsWithLabels( svg, data, xScale, yScale, height, colors ) {
			svg.selectAll( '.bar' )
				.data( data )
				.enter().append( 'rect' )
				.attr( 'class', 'bar' )
				.attr( 'x', d => xScale( d.name ) )
				.attr( 'width', xScale.bandwidth() )
				.attr( 'y', d => yScale( d.value ) )
				.attr( 'height', d => height - yScale( d.value ) )
				.style( 'fill', d => colors[d.name] );

			svg.selectAll( '.label' )
				.data( data )
				.enter().append( 'text' )
				.attr( 'class', 'label' )
				.attr( 'x', d => xScale( d.name ) + xScale.bandwidth() / 2 )
				.attr( 'y', d => yScale( d.value ) - 5 )
				.attr( 'text-anchor', 'middle' )
				.text( d => d.value );
		},
createHSYBarsWithLabels(svg, data, xScale, yScale, height, colors, tooltip) { // Removed dataType parameter
    if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('No data available for chart.');
        return;
    }

    const barWidth = xScale.bandwidth() / 2;

    svg.selectAll(".bar")
        .data(data, d => d.date) // Key function for updates
        .join(
            enter => enter.append("rect")
                .attr("class", d => `bar ${d.type}`) // Class based on data type
                .attr("x", d => xScale(d.date) + (d.type === "building" ? 0 : barWidth))
                .attr("y", d => yScale(d.value)) 
                .attr("width", barWidth)
                .attr("height", d => height - yScale(d.value))
                .attr("fill", d => colors[d.type]), // Color based on data type
            update => update
                .attr("x", d => xScale(d.date) + (d.type === "building" ? 0 : barWidth)) 
                .attr("y", d => yScale(d.value))
                .attr("height", d => height - yScale(d.value)),
            exit => exit.remove()
        )
		.on( 'mouseover', ( event, d ) => 
			this.plotService.handleMouseover( tooltip, 'hsyBuildingChartContainer', event, d, 
				( data ) => `Temperature ${(data.value).toFixed( 2 )} in Celsius` ) )
			.on( 'mouseout', () => this.plotService.handleMouseout( tooltip ) );

    // ... (code for adding labels, handling potential null values)
},


		clearBuildingBarChart() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#buildingChartContainer' ).select( 'svg' ).remove();
		},

		clearBuildingTreeBarChart() {
			// Remove or clear the D3.js visualization
			// Example:
			d3.select( '#buildingTreeChartContainer' ).select( 'svg' ).remove();
		},
	},
};

const createPostalCodeTimeseries = ( postalcodeHeatTimeseries ) => {
  	const dateToTemps = {};

  	// Iterate through the outer array
  	postalcodeHeatTimeseries.forEach(subArray => {
    	// Iterate through each object within the sub-array
    	subArray.forEach(entry => {
      		const date = entry.date;
      		const temp = entry.avg_temp_c;

    		// Initialize storage for the date if it doesn't exist
    	if (!dateToTemps[date]) {
    		dateToTemps[date] = [];
    	}

    	// Add the temperature to the array for the date
    	dateToTemps[date].push(temp);
    
		});
	});

  	// Calculate averages for each date
  	const averageTemps = [];
  	for (const date in dateToTemps) {
    	const totalTemp = dateToTemps[date].reduce((sum, temp) => sum + temp, 0);
    	const averageTemp = totalTemp / dateToTemps[date].length;
    	averageTemps.push( { date: date, averageTemp: averageTemp})
  	}

  	return averageTemps;
		
}
</script>
  
  <style>
  #buildingTreeChartContainer {
    position: fixed;
    top: 90px;
    right: 1px;
    width: 300px;
    height: 200px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  #buildingChartContainer {
    position: fixed;
    top: 80px;
    left: 1px;
    width: 300px;
    height: 250px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  #hsyBuildingChartContainer {
    position: fixed;
    top: 80px;
    left: 1px;
    width: 500px;
    height: 250px; 
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black; 
    background-color: white;
  }
  </style>