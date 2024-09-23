<template>
    <v-container v-if="showComponents">
        <v-row >
            <v-col cols="3">
                <SocioEconomicsSelect />
                <SocioEconomicsChart />
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
		SocioEconomicsChart
	},
	setup() {
		const showComponents = ref( true );

		return {
			showComponents
		};
	},
};
</script>