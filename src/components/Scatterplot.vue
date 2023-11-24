<template>
  <div id="scatterPlotContainer">
  </div>

  <select id="numericalSelect" value="numerical">
    <option value="measured_height" selected>height</option>
    <option value="c_valmpvm">age</option>
    <option value="area_m2">area</option>
    <option value="i_raktilav">volume</option>
</select>

<select id="categoricalSelect" value="categorical">
  <option value="c_julkisivu" selected>facade material</option>
  <option value="c_rakeaine">building material</option>
  <option value="roof_type">roof type</option>
  <option value="roof_median_color">roof median color</option>
  <option value="roof_mode_color">roof mode color</option>
  <option value="kayttotarkoitus">usage</option>
  <option value="tyyppi">type</option>
  <option value="c_lammtapa">heating method</option>
  <option value="c_poltaine">heating source</option>
</select>
</template>
  
  <script>
  import { eventBus } from '../services/eventEmitter.js';
  import * as d3 from 'd3'; // Import D3.js
  import { useGlobalStore } from '../store.js';
  
  export default {
    data() {
      return {
        showPlot: false,
        buildingEntities: null
      };
    },
    mounted() {
      this.unsubscribe = eventBus.$on('newScatterPlot', this.newScatterPlot);
      this.store = useGlobalStore( );

      const numericalSelect = document.getElementById('numericalSelect');
      numericalSelect.addEventListener('change', this.handleSelectChange);
      
      const categoricalSelect = document.getElementById('categoricalSelect');
      categoricalSelect.addEventListener('change', this.handleSelectChange);

    },
    beforeUnmount() {
      this.unsubscribe();
    },
    methods: {
        newScatterPlot(newData) {
        this.buildingEntities = newData;

        this.showPlot = this.buildingEntities.length > 0 && document.getElementById("showPlotToggle").checked;
        if (this.showPlot) {
            console.log("this.buildingEntities", this.buildingEntities)
          this.selectAttributeForScatterPlot();
        } else {
          // Hide or clear the visualization when not visible
          // Example: call a method to hide or clear the D3 visualization
          this.clearScatterPlot();
        }
      },
      // Method to handle the change event for both selects
        handleSelectChange(event) {
            this.selectAttributeForScatterPlot();
        },
      /**
       * * A function to handle change of categorical or numerical value in the scatter plot
       * 
       * */
 selectAttributeForScatterPlot( ) {

    const urbanHeatDataAndMaterial = [];

    // Process the entities in the buildings data source and populate the urbanHeatDataAndMaterial array with scatter plot data
    this.processEntitiesForScatterPlot( this.buildingEntities, urbanHeatDataAndMaterial );
    // Create a scatter plot with the updated data
    console.log("number of buildings added to scatterplot:", urbanHeatDataAndMaterial.length );
    this.createScatterPlot( urbanHeatDataAndMaterial, this.getSelectedText( "categoricalSelect" ), this.getSelectedText( "numericalSelect" ) );
},
/**
 * A function to process entities for scatter plot data
 * 
 * @param { Array } entities - Array of entities to process
 * @param { Array } urbanHeatDataAndMaterial - Array to store scatter plot data
 * @param { String } categorical - The categorical variable selected by the user
 * @param { String } numerical - The numerical variable selected by the user
 * @param { boolean } hideNonSote - Whether to hide non-SOTE buildings in the scatter plot
 * @param { boolean } hideLowToggle - Whether to hide short buildings in the scatter plot
 */
processEntitiesForScatterPlot(entities, urbanHeatDataAndMaterial) {
    const numerical = document.getElementById("numericalSelect").value;
    const categorical = document.getElementById("categoricalSelect").value;
    const hideNonSote = document.getElementById("hideNonSoteToggle").checked;
    const hideLowToggle = document.getElementById("hideLowToggle").checked;
    const hideNew = document.getElementById("hideNewBuildingsToggle").checked;

    entities.forEach((entity) => {
        let addDataToScatterPlot = true;

        if (!hideNonSote && !hideLowToggle && !hideNew) {
            this.addDataForScatterPlot(
                urbanHeatDataAndMaterial,
                entity,
                this.getSelectedText("categoricalSelect"),
                this.getSelectedText("numericalSelect"),
                categorical,
                numerical
            );
        } else {
            if (hideNonSote && !this.isSoteBuilding(entity)) {
                addDataToScatterPlot = false;
            }

            if (hideLowToggle && this.isLowBuilding(entity)) {
                addDataToScatterPlot = false;
            }

            if (hideNew && this.isNewBuilding(entity)) {
                addDataToScatterPlot = false;
            }

            if (addDataToScatterPlot) {
                this.addDataForScatterPlot(
                    urbanHeatDataAndMaterial,
                    entity,
                    this.getSelectedText("categoricalSelect"),
                    this.getSelectedText("numericalSelect"),
                    categorical,
                    numerical
                );
            }
        }
    });
},

isSoteBuilding(entity) {
    const kayttotark = Number(entity._properties.c_kayttark?._value);

    return !kayttotark || [511, 131, ...Array.from({ length: 28 }, (_, i) => i + 213)].includes(kayttotark);
},

isLowBuilding(entity) {
    const floorCount = Number(entity._properties.i_kerrlkm?._value);

    return !floorCount || floorCount <= 6;
},

isNewBuilding(entity) {
    const c_valmpvm = new Date(entity._properties._c_valmpvm?._value)?.getTime();
    const cutoffDate = new Date("2018-06-01T00:00:00").getTime();

    return !c_valmpvm || c_valmpvm >= cutoffDate;
},

/**
 * This function creates a data set required for scatter plotting urban heat exposure.
 *
 * @param { Object } features buildings in postal code area
 * @param { String } categorical name of categorical attribute displayed for user
 * @param { String } numerical name of numerical attribute displayed for user
 * @param { String } categoricalName name of numerical attribute in register
 * @param { String } numericalName name of numerical attribute in registery
 */
addDataForScatterPlot( urbanHeatDataAndMaterial, entity, categorical, numerical, categoricalName, numericalName ) {
    
    // Check if entity has the required properties.
    if ( entity._properties.avgheatexposuretobuilding && entity._properties[ categoricalName ] && entity._properties[ numericalName ] && entity._properties[ categoricalName ]._value ) {

         // Get the numerical value from the entity properties.
        let numbericalValue = entity._properties[ numericalName ]._value;

        // If the numerical attribute is c_valmpvm, convert it to a number.
        if ( numericalName == 'c_valmpvm' && numbericalValue ) {

            numbericalValue = new Date().getFullYear() - Number( numbericalValue.slice( 0, 4 ));

        }

        if ( entity._properties._area_m2 && Number( entity._properties._area_m2._value ) > 225 ) {

            // Create an object with the required properties and add it to the urbanHeatDataAndMaterial array.
            const element = { heat: entity._properties.avgheatexposuretobuilding._value, [ categorical ]: entity._properties[ categoricalName ]._value, [ numerical ]: numbericalValue };
            urbanHeatDataAndMaterial.push( element );

        }

    }

},

/**
 * Returns the selected text of a dropdown menu with the given element ID.
 * 
 * @param { string } elementId - The ID of the HTML element that represents the dropdown menu.
 * @returns { string } The selected text of the dropdown menu, or null if no option is selected.
 */
getSelectedText( elementId ) {

const elt = document.getElementById( elementId );

if ( elt.selectedIndex == -1 ) {

  return null;

}

return elt.options[ elt.selectedIndex ].text;

},

/**
 * The function finds all unique values for given category.
 *
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } category value code for facade material
 * @return { Array<String> } List containing all unique values for the category
 */
createUniqueValuesList( features, category ) {

let uniqueValues = [ ];

for ( let i = 0; i < features.length; i++ ) {

    let value = features[ i ][ category ] 

    if ( !uniqueValues.includes( value ) ) {

        uniqueValues.push( value );

    }

}

return uniqueValues;

},
/**
 * The function adds heat exposure data for given category value. 
 *
 * @param { String } valeu value of category
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } categorical name of categorical attribute
 * @param { String } numerical name of numerical attribute
 * @return { object } Object that contains list of heat exposures and numerical values, and average heat exposure
 */
addHeatForLabelAndX( value, features, categorical, numerical ) {

let heatList = [ ];
let numericalList = [ ];
let average = 0;
let sum = 0;

for ( let i = 0; i < features.length; i++ ) {

    if ( features[ i ][ categorical ] == value ) {

        heatList.push( features[ i ].heat );
        numericalList.push( features[ i ][ numerical ] );
        sum = sum + features[ i ].heat;

    }

}

// calculate average heat exposure
average = sum / heatList.length;

return [ heatList, numericalList, average ];

},
/**
 * Creates scatter plot that always has average urban heat exposure to building at y-axis. Categorical attributes.
 *
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } categorical name of categorical attribute
 * @param { String } numerical name of numerical attribute
 */
 createScatterPlot(features, categorical, numerical) {
  if (features.length > 0) {
    const values = this.createUniqueValuesList(features, categorical);

    const scatterPlotContainer = document.getElementById( 'scatterPlotContainer' );
    // Clear existing content in the container
    scatterPlotContainer.innerHTML = '';
    // Set container visibility to visible
    scatterPlotContainer.style.visibility = 'visible';
    document.getElementById( 'numericalSelect' ).style.visibility = 'visible';
    document.getElementById( 'categoricalSelect' ).style.visibility = 'visible';

    let heatData = [ ];
    let labelsWithAverage = [ ];
	
    for ( let i = 0; i < values.length; i++ ) {

        const dataWithHeat = this.addHeatForLabelAndX( values[ i ], features, categorical, numerical );

        const plotData = {
            xData: dataWithHeat[ 1 ],
            yData: dataWithHeat[ 0 ],
            name: values[ i ] + ' ' + dataWithHeat[ 2 ].toFixed( 2 )
        };

        for ( let j = 0; j < plotData.xData.length; j++ ) {

            const dData = {
                xData: plotData.xData[ j ],
                yData: plotData.yData[ j ],
                name: values[ i ]

            }

            heatData.push( dData );

        }

        if ( !labelsWithAverage.includes( plotData.name ) ) {
            
            labelsWithAverage.push( plotData.name );
        
        }
    
    }

    const margin = { top: 30, right: 170, bottom: 20, left: 30 };
    const width = 600 - margin.left - margin.right;
    const height = 290 - margin.top - margin.bottom;

    // Create the SVG element
    const svg = d3
        .select('#scatterPlotContainer')
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);

    // Append a white background rectangle
        svg
            .append('rect')
            .attr('width', width)
            .attr('height', height)
            .attr('fill', 'white');


    const xValues = Object.values(heatData).map(entry => entry.xData);
    const yValues = Object.values(heatData).map(entry => entry.yData);

    // Find the minimum and maximum values in heatData
    const minXValue = d3.min(xValues) - 1;
    const maxXValue = d3.max(xValues) + 2;

    const minYValue = d3.min(yValues) - 0.05;
    const maxYValue = d3.max(yValues) + 0.05;

    const xScale = d3.scaleLinear()
      .domain([minXValue, maxXValue])
      .range([0, width]); // Define width or use another variable for width value

    // Append x-axis
    svg.append('g')
      .attr('transform', `translate(0, ${height})`)
      .call( d3.axisBottom( xScale ) );

    const yScale = d3.scaleLinear()
      .domain([minYValue, maxYValue])
      .range([height, 0]); // Define height or use another variable for height value

    // Append y-axis
    svg.append('g')
      .call( d3.axisLeft( yScale ) );

    // Define a color scale using D3's scaleOrdinal
    const colorScale = d3.scaleOrdinal()
        .domain(values)
        .range(d3.schemeCategory10); // Use any color scheme you prefer
    
        const tooltip = d3.select('#scatterPlotContainer')
            .append('div')
            .style('opacity', 0)
            .attr('class', 'tooltip')
            .style('position', 'absolute')
            .style('background-color', 'white')
            .style('border', 'solid')
            .style('border-width', '1px')
            .style('border-radius', '5px')
            .style('padding', '10px');    

// Add dots
svg.append('g')
        .selectAll("dot")
        .data(heatData)
        .enter()
        .append("circle")
        .attr("cx", function (d) { return xScale(d.xData); } )
        .attr("cy", function (d) { return yScale(d.yData); } )
        .attr("r", 2) // Define circle radius
        .style("fill", function (d) { return colorScale(d.name); }) // Assign colors based on name
        .on('mouseover', function (event, d) {
        // Calculate the mouse position relative to the container
        const containerRect = document.getElementById('scatterPlotContainer').getBoundingClientRect();
        const xPos = event.pageX - containerRect.left;
        const yPos = event.pageY - containerRect.top;

        const numValue = d.xData; 
        const heatValue = d.yData;
        const catValue = d.name;

        tooltip.transition().duration(200).style('opacity', 0.9);
        tooltip.html(`${numerical}: ${numValue}<br>heat exposure index: ${heatValue}<br>${categorical}: ${catValue}`)
            .style('left', `${xPos}px`) // Use left for horizontal positioning
            .style('top', `${yPos}px`); // Use top for vertical positioning
    })
            .on('mouseout', function () {
                tooltip.transition().duration(200).style('opacity', 0);
            });

            // Create legend
const legend = svg.append('g')
  .attr('class', 'legend')
  .attr('transform', `translate(${width + margin.right - 100},${margin.top})`); // Adjust the translation for positioning

// Add color rectangles
legend.selectAll('.legend-color')
  .data(values)
  .enter()
  .append('rect')
  .attr('x', -55)
  .attr('y', (_, i) => i * 20 - 50)
  .attr('width', 10)
  .attr('height', 10)
  .style('fill', d => colorScale(d));

// Add labels next to color rectangles
legend.selectAll('.legend-label')
  .data(labelsWithAverage)
  .enter()
  .append('text')
  .attr('x', -40)
  .attr('y', (_, i) => i * 20 - 41)
  .text(d => d)
  .style('font-size', '10px'); // Adjust font size as needed
  }
},
      clearScatterPlot() {
        // Remove or clear the D3.js visualization
        // Example:
        d3.select("#scatterPlotContainer").select("svg").remove();
      },
    },
  };
  </script>
  
  <style>
#scatterPlotContainer {
    position: fixed;
    bottom: 40px;
    left: 10px;
    width: 640px; /* Adjusted width to accommodate margin */
    height: 300px; /* Adjusted height to accommodate margin */
    visibility: hidden;
    font-size: smaller;
    border: 1px solid black;
    box-shadow: 3px 5px 5px black;
    background-color: white;
    margin: 20px; /* Add margins to the container */
}

#categoricalSelect {
    position: fixed;
    bottom: 343px; /* Adjusted position to match scatter plot container */
    left: 31px;
    visibility: hidden;
    font-size: smaller;
}

#numericalSelect {
    position: fixed;
    bottom: 61px;
    left: 480px; /* Adjusted position to match scatter plot container */
    visibility: hidden;
    font-size: smaller;
}
  </style>