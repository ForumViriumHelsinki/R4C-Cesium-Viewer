<template>
	<v-container v-if="showComponents">
		<v-row no-gutters class="pa-0 ma-0">
			<v-col cols="3" class="pa-0 ma-0">
				<div class="socio-economics-container">
					<SocioEconomicsChart />
					<div class="socio-economics-select">
						<SocioEconomicsSelect />
					</div>
				</div>
			</v-col>
		</v-row>
	</v-container>
</template>

<script>
import { ref, watch } from 'vue';
import SocioEconomicsSelect from '../components/SocioEconomicsSelect.vue';
import SocioEconomicsChart from '../components/SocioEconomicsChart.vue';

export default {
	components: {
		SocioEconomicsSelect,
		SocioEconomicsChart,
	},
	setup() {
		const showComponents = ref(true);

		return {
			showComponents,
		};
	},
};
</script>

<style scoped>
.socio-economics-container {
	position: relative;
	width: 100%;
	height: 250px;
	background-color: white;
	z-index: 10; /* Ensure it is on top */
}

.socio-economics-select {
	position: absolute;
	top: 15px; /* Adjusts distance from top */
	left: 0px; /* Adjusts distance from right */
	width: 295px;
	z-index: 10; /* Ensure it is on top */
}
</style>
