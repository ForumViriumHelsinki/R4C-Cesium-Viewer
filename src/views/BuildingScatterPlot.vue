<template>
  <v-container fluid v-if="showComponents">
    <v-row no-gutters class="pa-0 ma-0">
<v-col class="pa-0 ma-0" style="position: absolute; top: 80px; left: 5px; width: 160px; z-index: 10;">
  <CategoricalSelect />
</v-col>
<v-col class="pa-0 ma-0" style="position: absolute; bottom: 35px; right: 0px; width: 124px; z-index: 10;">
  <NumericalSelect />
</v-col>
    </v-row>
    <v-row no-gutters class="pa-0 ma-0">
      <v-col class="pa-0 ma-0">
        <HSYScatterplot />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useGlobalStore } from '../stores/globalStore.js';
import { eventBus } from '../services/eventEmitter.js';
import CategoricalSelect from '../components/CategoricalSelect.vue';
import NumericalSelect from '../components/NumericalSelect.vue';
import HSYScatterplot from '../components/HSYScatterplot.vue';

export default {
	components: {
		CategoricalSelect,
		NumericalSelect,
		HSYScatterplot,
	},
	setup() {
		const store = useGlobalStore();
		const showComponents = ref( true );

		return {
			showComponents,
		};
	},
};
</script>

<style scoped>
/* Ensuring the scatter plot has fixed positioning as required */
#scatterPlotContainerHSY {
  position: relative;
  bottom: 35px;
  left: -19px;
  width: 500px;
  height: 300px;
  background-color: white;
  margin: 20px;
}
</style>
