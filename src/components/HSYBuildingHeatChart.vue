<template>
  <div class="heat-chart-container">
    <!-- Toggle for hiding cold areas (only visible if cold areas are loaded) -->
    <div
v-if="coldAreasLoaded"
class="chart-controls"
>
      <v-switch
        v-model="hideColdAreasChecked"
        label="Hide Cold Areas"
        density="compact"
        hide-details
        @change="hideColdAreas"
      />
    </div>
    
    <!-- Container for the HSY Building Chart -->
    <div
id="hsyBuildingChartContainer"
class="chart-container"
/>
    
    <!-- Timeline Controls -->
    <div class="timeline-section">
      <Timeline />
    </div>
  </div>
</template>

<script>
import { onMounted, watch, ref } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { usePropsStore } from '../stores/propsStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Plot from '../services/plot.js';
import ColdArea from '../services/coldarea.js';
import Datasource from '../services/datasource.js';
import Timeline from './Timeline.vue';

export default {
  components: {
    Timeline,
  },
  setup() {
    const store = useGlobalStore();
    const propsStore = usePropsStore();
    const toggleStore = useToggleStore();
    const plotService = new Plot();
    const coldAreaService = new ColdArea();
    
    const hideColdAreasChecked = ref(toggleStore.hideColdAreas);
    const coldAreasLoaded = ref(false); // To track if cold areas are loaded

    const hideColdAreas = () => {
      toggleStore.setHideColdAreas(hideColdAreasChecked.value);
      const dataSourceService = new Datasource();
      dataSourceService.changeDataSourceShowByName('ColdAreas', !hideColdAreasChecked.value);
    };

    const createHSYBuildingBarChart = () => {
      const buildingHeatExposure = propsStore.buildingHeatTimeseries;
      const postalcodeHeatTimeseries = propsStore.postalcodeHeatTimeseries;
      const address = store.buildingAddress;
      const postinumero = store.postalcode;

      plotService.initializePlotContainer('hsyBuildingChartContainer');

      const postalCodeHeat = createPostalCodeTimeseries(postalcodeHeatTimeseries);

      const margin = { top: 45, right: 10, bottom: 18, left: 20 };
      const width = store.navbarWidth - margin.left - margin.right;
      const height = 250 - margin.top - margin.bottom;

      const svg = plotService.createSVGElement(margin, width, height, '#hsyBuildingChartContainer');

      const allDates = Array.from(
        new Set(buildingHeatExposure.map((d) => d.date).concat(postalCodeHeat.map((d) => d.date)))
      );
      const xScale = plotService.createScaleBand(allDates.sort(), width - 40);
      const maxTemp = Math.max(
        ...buildingHeatExposure.map((d) => d.avg_temp_c),
        ...postalCodeHeat.map((d) => d.averageTemp)
      );
      const minTemp = Math.min(
        ...buildingHeatExposure.map((d) => d.avg_temp_c),
        ...postalCodeHeat.map((d) => d.averageTemp)
      );
      const yScale = plotService.createScaleLinear(minTemp, maxTemp, [height, 0]);

      const combinedData = [
        ...buildingHeatExposure.map((d) => ({ date: d.date, value: d.avg_temp_c, type: 'building' })),
        ...postalCodeHeat.map((d) => ({ date: d.date, value: d.averageTemp, type: 'postalcode' })),
      ];

      const tooltip = plotService.createTooltip('#hsyBuildingChartContainer');

      createHSYBarsWithLabels(svg, combinedData, xScale, yScale, height, { building: 'orange', postalcode: 'steelblue' }, tooltip);

      plotService.setupAxes(svg, xScale, yScale, height);
      plotService.addTitle(svg, 'Temperature in Celsius Comparison', margin.left, margin.top - 20 );

      const legendData = [
        { name: address, color: 'orange' },
        { name: 'Average of ' + postinumero, color: 'steelblue' },
      ];
      const legendX = margin.left + store.navbarWidth / 2.5;
      const legendY = margin.top - 87;

      const legend = svg.append('g').attr('transform', `translate(${legendX}, ${legendY})`);

      legend
        .selectAll('.legend-item')
        .data(legendData)
        .enter()
        .append('rect')
        .attr('class', 'legend-item')
        .attr('width', 10)
        .attr('height', 10)
        .attr('x', 0)
        .attr('y', (d, i) => i * 20)
        .attr('fill', (d) => d.color);

      legend
        .selectAll('.legend-text')
        .data(legendData)
        .enter()
        .append('text')
        .attr('class', 'legend-text')
        .attr('x', 15)
        .attr('y', (d, i) => i * 20 + 9)
        .text((d) => d.name);
    };

    const createHSYBarsWithLabels = (svg, data, xScale, yScale, height, colors, tooltip) => {
      if (!data || !Array.isArray(data) || data.length === 0) {
        console.warn('No data available for chart.');
        return;
      }

      const barWidth = xScale.bandwidth() / 2.5;

      svg
        .selectAll('.bar')
        .data(data, (d) => d.date)
        .join(
          (enter) =>
            enter
              .append('rect')
              .attr('class', (d) => `bar ${d.type}`)
              .attr('x', (d) => xScale(d.date) + (d.type === 'building' ? 0 : barWidth))
              .attr('y', (d) => yScale(d.value))
              .attr('width', barWidth)
              .attr('height', (d) => height - yScale(d.value))
              .attr('fill', (d) => colors[d.type]),
          (update) =>
            update
              .attr('x', (d) => xScale(d.date) + (d.type === 'building' ? 0 : barWidth))
              .attr('y', (d) => yScale(d.value))
              .attr('height', (d) => height - yScale(d.value)),
          (exit) => exit.remove()
        )
        .on('mouseover', (event, d) =>
          plotService.handleMouseover(tooltip, 'hsyBuildingChartContainer', event, d, (data) => `${data.value.toFixed(2)} °C`)
        )
        .on('mouseout', () => plotService.handleMouseout(tooltip));
    };

    const createPostalCodeTimeseries = (postalcodeHeatTimeseries) => {
      const dateToTemps = {};

      postalcodeHeatTimeseries.forEach((subArray) => {
        subArray.forEach((entry) => {
          const date = entry.date;
          const temp = entry.avg_temp_c;

          if (!dateToTemps[date]) {
            dateToTemps[date] = [];
          }

          dateToTemps[date].push(temp);
        });
      });

      const averageTemps = [];
      for (const date in dateToTemps) {
        const totalTemp = dateToTemps[date].reduce((sum, temp) => sum + temp, 0);
        const averageTemp = totalTemp / dateToTemps[date].length;
        averageTemps.push({ date, averageTemp });
      }

      return averageTemps;
    };

    const newHSYBuildingHeat = () => {
      if (store.level === 'building') {
        if (store.view === 'capitalRegion') {
          createHSYBuildingBarChart();

          if (propsStore.buildingHeatExposure > 27.2632995605) {
            // The toggle visibility is controlled by whether the building exposure is above a threshold
            if (!toggleStore.capitalRegionCold) {
              coldAreaService.loadColdAreas();
              coldAreasLoaded.value = true; // Set to true when cold areas are loaded
            }
          } else {
			coldAreasLoaded.value = false;
			hideColdAreas();
		  }
        }
      }
    };

    // Watch for changes in buildingHeatTimeseries and call newHSYBuildingHeat when it changes
    watch(
      () => propsStore.buildingHeatTimeseries,
      (newHeatTimeseries) => {
        if (newHeatTimeseries) {
          newHSYBuildingHeat();
        }
      }
    );

    // Call updateHSYBuildingChart on mounted
    onMounted(() => {
      newHSYBuildingHeat();
    });

    return {
      hideColdAreasChecked,
      hideColdAreas,
      coldAreasLoaded, // Return the variable to control toggle visibility
    };
  },
};
</script>

<style scoped>
.heat-chart-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  height: 100%;
}

.chart-controls {
  display: flex;
  justify-content: flex-start;
  padding: 8px 0;
}

.chart-container {
  position: relative;
  width: 100%;
  height: 300px;
  flex: 1;
  min-height: 250px;
}

.timeline-section {
  border-top: 1px solid rgba(0, 0, 0, 0.12);
  padding-top: 16px;
  background-color: rgba(0, 0, 0, 0.02);
  border-radius: 4px;
  padding: 12px;
}

/* Override timeline positioning when embedded */
.timeline-section :deep(#heatTimeseriesContainer) {
  position: relative !important;
  bottom: auto !important;
  left: auto !important;
  z-index: auto !important;
  background-color: transparent !important;
  border: none !important;
  padding: 0 !important;
  border-radius: 0 !important;
  width: 100% !important;
}
</style>
