<template>
  <div id="timeline-container">
    <div>
      <div class="description">{{ description }}</div>

      <v-btn icon @click="decreaseRate" :disabled="rate.value <= 1" class="mr-2">
        <v-icon>mdi-rewind</v-icon>
      </v-btn>

      <v-btn icon @click="increaseRate" :disabled="rate.value >= 10" class="ml-2">
        <v-icon>mdi-fast-forward</v-icon>
      </v-btn>
      Current rate: {{ rate.value }}x
    </div>

    <v-slider v-model="currentPropertyIndex.value"
              :max="timelineLength.value - 1"
              :step="rate.value"
              :tick-size="2"
              tick-labels
              hide-details
              class="timeline-slider">            
      <template v-slot:append>
        <div class="label-container">
          <div class="time-label">Time from start {{ currentPropertyIndex.value }} min</div>
        </div>
      </template>
    </v-slider>
  </div>
</template>

<script>
import * as Cesium from 'cesium';
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';
import { useFloodStore } from '../stores/floodStore';
import { useGlobalStore } from '../stores/globalStore';
import Legend from './Legend.vue';

export default {
  components: {
    Legend,
  },
  setup() {
    const floodStore = useFloodStore();
    const globalStore = useGlobalStore();
    
    const timelineLength = ref(0);
    const currentPropertyIndex = ref(0);
    const rate = ref(5);
    const description = ref(null);
    const simulationInterval = ref(null);
    const speed = ref(1000);
    const legendData = ref([]);
    const entities = ref([]);

    // Method to update legend data
    const updateLegend = () => {
      const counts = {};

      entities.value.forEach((entity) => {
        const waterDepth = Number(entity._properties["water_depth"]._value[currentPropertyIndex.value]);
        
        if (waterDepth >= 0.1) {
          let label = '0.1 - 0.2';
          
          if (waterDepth >= 0.2) {
            label = getLabel(waterDepth);
          }

          counts[label] = (counts[label] || 0) + 1;
        }
      });

      const labelOrder = [
        '0.1 - 0.2',
        '0.2 - 0.3',
        '0.3 - 0.4',
        '0.4 - 0.5',
        '0.5 - 0.6',
        '0.6 - 0.7',
        '0.7 - 0.8',
        '0.8 - 0.9',
        '1.0+'
      ];

      legendData.value = labelOrder.map(label => {
        if (counts[label]) {
          const numericPart = label.slice(0, 3);
          return {
            label,
            count: counts[label],
            color: Cesium.Color.BLUE.withAlpha(Number(numericPart)).toCssColorString(),
          };
        }
        return null;
      }).filter(data => data !== null);
    };

    const updateSimulation = () => {
      if (currentPropertyIndex.value < timelineLength.value) {
        entities.value.forEach((entity) => {
          const waterDepth = Number(entity._properties['water_depth']._value[currentPropertyIndex.value]);

          if (waterDepth > 0.0) {
            if (entity.polygon.extrudedHeight !== waterDepth) {
              entity.polygon.material = Cesium.Color.BLUE.withAlpha(waterDepth);
            }
          }
        });
        currentPropertyIndex.value += rate.value;
        updateLegend();
      }
    };

    const startSimulation = async () => {
      description.value = floodStore.description;
      const geoJson = await Cesium.GeoJsonDataSource.load(floodStore.path);

      if (currentPropertyIndex.value !== 0) {
        restartSimulation();
      } else {
        const entitiesToRemove = [];
        geoJson.entities.values.forEach(entity => {
          if (entity.polygon) {
            const waterDepths = entity.properties.water_depth._value;
            const maxWaterDepth = Math.max(...waterDepths);
            if (maxWaterDepth < 0.01) {
              entitiesToRemove.push(entity);
            }
          }
        });

        entitiesToRemove.forEach(entity => {
          geoJson.entities.remove(entity);
        });

        timelineLength.value = geoJson.entities.values[0].properties.water_depth._value.length;

        geoJson.entities.values.forEach(entity => {
          if (entity.polygon) {
            entity.polygon.outline = false;
            entity.polygon.material = Cesium.Color.WHITE.withAlpha(0);
          }
        });

        globalStore.cesiumViewer.dataSources.add(geoJson);
        entities.value = geoJson.entities.values;

        if (!simulationInterval.value) {
          simulationInterval.value = setInterval(updateSimulation, speed.value);
        }
      }
    };

    const increaseRate = () => {
      rate.value = Math.min(10, rate.value + 1);
      resetInterval();
    };

    const decreaseRate = () => {
      rate.value = Math.max(1, rate.value - 1);
      resetInterval();
    };

    const resetInterval = () => {
      if (simulationInterval.value) {
        clearInterval(simulationInterval.value);
        simulationInterval.value = setInterval(updateSimulation, speed.value);
      }
    };

    // Start simulation when component is mounted
    onMounted(() => {
      startSimulation();
    });

    onBeforeUnmount(() => {
      if (simulationInterval.value) {
        clearInterval(simulationInterval.value);
      }
    });

    return {
      timelineLength,
      currentPropertyIndex,
      rate,
      description,
      legendData,
      increaseRate,
      decreaseRate,
    };
  },
};

// Helper function to get label based on water depth
const getLabel = (waterDepth) => {
  if (waterDepth >= 1) return '1.0+';
  if (waterDepth >= 0.9) return '0.9 - 1.0';
  if (waterDepth >= 0.8) return '0.8 - 0.9';
  if (waterDepth >= 0.7) return '0.7 - 0.8';
  if (waterDepth >= 0.6) return '0.6 - 0.7';
  if (waterDepth >= 0.5) return '0.5 - 0.6';
  if (waterDepth >= 0.4) return '0.4 - 0.5';
  if (waterDepth >= 0.3) return '0.3 - 0.4';
  if (waterDepth >= 0.2) return '0.2 - 0.3';
};
</script>

<style>
.timeline-slider .v-slider__thumb {
  background-color: #00f;
}

.timeline-slider .v-label {
  font-size: 12px;
  color: white;
}

.timeline-slider .v-slider__track-background {
  background-color: #222;
}

.timeline-slider .v-slider__tick {
  background-color: white;
}

.description {
  float: left;
  margin-left: 10px;
}
</style>
