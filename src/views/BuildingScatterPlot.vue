<template>
  <v-container fluid v-if="showComponents">
    <v-row no-gutters class="pa-0 ma-0">
<v-col class="pa-0 ma-0" style="position: absolute; top: 84px; left: 25px; width: 160px; z-index: 20;">
  <CategoricalSelect />
</v-col>
<v-col class="pa-0 ma-0" style="position: absolute; bottom: -23px; right: 10px; width: 124px; z-index: 20;">
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
import { ref } from 'vue';
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
  width: 100%;
  height: 300px;
  background-color: white;
  z-index: 10; /* Ensure it is on top */
}
</style>
