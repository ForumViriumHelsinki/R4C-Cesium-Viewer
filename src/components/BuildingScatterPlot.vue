<template>
  <v-container fluid  v-if="showComponents">
    <v-row>
      <v-col>
        <CategoricalSelect />
      </v-col>
      <v-col>
        <NumericalSelect />
      </v-col>
    </v-row>
    <v-row>
      <v-col>
        <HSYScatterplot />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Plot from '../services/plot.js';
import { eventBus } from '../services/eventEmitter.js';
import CategoricalSelect from './CategoricalSelect.vue';
import NumericalSelect from './NumericalSelect.vue';
import HSYScatterplot from './HSYScatterplot.vue';

export default {
  components: {
    CategoricalSelect,
    NumericalSelect,
    HSYScatterplot,
  },
  setup() {
    const store = useGlobalStore();
    const toggleStore = useToggleStore();
    const plotService = new Plot();
    const plotData = ref([]);
    const showComponents = ref(false);

    onMounted(() => {
      eventBus.$on('showBuildingScatterPlot', () => {
        if (store.level === 'postalCode') {
          showComponents.value = true;
        }
      });

      eventBus.$on('hideBuildingScatterPlot', () => {
        showComponents.value = false;
      });
    });

    onBeforeUnmount(() => {
      eventBus.$off('showBuildingScatterPlot');
      eventBus.$off('hideBuildingScatterPlot');
    });

    return {
      showComponents,
    };
  },
};
</script>