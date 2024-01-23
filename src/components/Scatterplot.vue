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

      document.getElementById('hideNewBuildingsToggle').addEventListener('change', this.updateScatterPlot);
      document.getElementById('hideNonSoteToggle').addEventListener('change', this.updateScatterPlot);
      document.getElementById('hideLowToggle').addEventListener('change', this.updateScatterPlot);

    },
    beforeUnmount() {
      this.unsubscribe();
    },
    methods: {
        newScatterPlot(newData) {
        this.buildingEntities = newData;

        if (this.buildingEntities.length > 0) {
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
        updateScatterPlot() {
  // Check if the scatter plot container is visible
  if (document.getElementById('scatterPlotContainer').style.visibility === 'visible') {
    // Call the function to update the scatter plot
    this.selectAttributeForScatterPlot();
  }
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

initializeScatterPlotContainer() {
    const scatterPlotContainer = document.getElementById('scatterPlotContainer');
    scatterPlotContainer.innerHTML = '';
    scatterPlotContainer.style.visibility = document.getElementById("showPlotToggle").checked ? 'visible' : 'hidden';
    document.getElementById('numericalSelect').style.visibility = 'visible';
    document.getElementById('categoricalSelect').style.visibility = 'visible';
},

prepareDataForPlot(features, categorical, numerical) {
    const values = this.createUniqueValuesList(features, categorical);
    let heatData = [];
    let labelsWithAverage = [];

    values.forEach(value => {
        const dataWithHeat = this.addHeatForLabelAndX(value, features, categorical, numerical);
        const plotData = { xData: dataWithHeat[1], yData: dataWithHeat[0], name: value };
        plotData.xData.forEach((xData, j) => {
            heatData.push({ xData: xData, yData: plotData.yData[j], name: value });
        });
        const averageLabel = value + ' ' + dataWithHeat[2].toFixed(2);
        if (!labelsWithAverage.includes(averageLabel)) {
            labelsWithAverage.push(averageLabel);
        }
    });

    return { heatData, labelsWithAverage, values };
},

createSVGElement() {
    const margin = { top: 30, right: 170, bottom: 20, left: 30 };
    const width = 600 - margin.left - margin.right;
    const height = 290 - margin.top - margin.bottom;
    const svg = d3.select('#scatterPlotContainer').append('svg')
                  .attr('width', width + margin.left + margin.right)
                  .attr('height', height + margin.top + margin.bottom)
                  .append('g')
                  .attr('transform', `translate(${margin.left},${margin.top})`);
    svg.append('rect').attr('width', width).attr('height', height).attr('fill', 'white');
    return { svg, width, height, margin };
},

setupAxes(svg, heatData, width, height) {
    const xScale = this.createScale(d3.min(heatData, d => d.xData) - 1, d3.max(heatData, d => d.xData) + 2, [0, width]);
    const yScale = this.createScale(d3.min(heatData, d => d.yData) - 0.05, d3.max(heatData, d => d.yData) + 0.05, [height, 0]);

    svg.append('g').attr('transform', `translate(0, ${height})`).call(d3.axisBottom(xScale));
    svg.append('g').call(d3.axisLeft(yScale));

    return { xScale, yScale };
},

createScale(domainMin, domainMax, range) {
    return d3.scaleLinear().domain([domainMin, domainMax]).range(range).nice();
},

addPlotElements(svg, heatData, xScale, yScale, colorScale, numerical, categorical) {
    const tooltip = this.createTooltip();
    
    svg.append('g')
        .selectAll("dot")
        .data(heatData)
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.xData))
        .attr("cy", d => yScale(d.yData))
        .attr("r", 2)
        .style("fill", d => colorScale(d.name))
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
},

showTooltip(event, d) {
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
},

hideTooltip() {
  const tooltip = d3.select('.tooltip');
  tooltip.transition().duration(200).style('opacity', 0);
},

createTooltip() {
  return d3.select('#scatterPlotContainer')
        .append('div')
        .attr('class', 'tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background-color', 'white')
        .style('border', 'solid')
        .style('border-width', '1px')
        .style('border-radius', '5px')
        .style('padding', '10px');
},

createLegend(svg, width, margin, values, colorScale) {
    const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(${width + margin.right - 120},${margin.top})`);

    legend.selectAll('.legend-color')
        .data(values)
        .enter()
        .append('rect')
        .attr('x', 0)
        .attr('y', (_, i) => i * 20)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', d => colorScale(d));

    legend.selectAll('.legend-label')
        .data(values)
        .enter()
        .append('text')
        .attr('x', 20)
        .attr('y', (_, i) => i * 20 + 9)
        .text(d => d)
        .style('font-size', '10px');
},

createColorScale(values) {
    return d3.scaleOrdinal()
        .domain(values)
        .range(d3.schemeCategory10); // This is a D3 predefined set of colors
},

/**
 * Creates scatter plot that always has average urban heat exposure to building at y-axis. Categorical attributes.
 *
 * @param { object } features dataset that contains building heat exposure and attributes of the building
 * @param { String } categorical name of categorical attribute
 * @param { String } numerical name of numerical attribute
 */
createScatterPlot(features, categorical, numerical) {
    // Setup the scatter plot container
    this.initializeScatterPlotContainer();

    // Prepare the data for the plot
    const { heatData, labelsWithAverage } = this.prepareDataForPlot(features, categorical, numerical);

    // Initialize the SVG element
    const { svg, width, height, margin } = this.createSVGElement();

    // Setup the axes
    const { xScale, yScale } = this.setupAxes(svg, heatData, width, height);

    // Create the color scale
    const colorScale = this.createColorScale(labelsWithAverage);

    // Add the dots (plot elements) to the plot
    this.addPlotElements(svg, heatData, xScale, yScale, colorScale, numerical, categorical);

    // Create the legend
    this.createLegend(svg, width, margin, labelsWithAverage, colorScale);
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
    left: 490px; /* Adjusted position to match scatter plot container */
    visibility: hidden;
    font-size: smaller;
}
  </style>