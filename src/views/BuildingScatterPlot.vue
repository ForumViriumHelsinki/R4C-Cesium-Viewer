<template>
  <v-container fluid v-if="showComponents">
    <v-row no-gutters class="pa-0 ma-0">
<v-col class="pa-0 ma-0" style="position: fixed; bottom: 292px; left: 5px; width: 160px; z-index: 10;">
  <CategoricalSelect />
</v-col>
<v-col class="pa-0 ma-0" style="position: fixed; bottom: 35px; left: 426px; width: 124px; z-index: 10;">
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
  position: fixed;
  bottom: 35px;
  left: -19px;
  width: 550px;
  height: 300px;
  font-size: smaller;
  border: 1px solid black;
  box-shadow: 3px 5px 5px black;
  background-color: white;
  margin: 20px;
}
</style>
