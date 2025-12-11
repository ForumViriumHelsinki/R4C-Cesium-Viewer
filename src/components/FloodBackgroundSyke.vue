<template>
	<div>
		<!-- Disclaimer Title -->
		<div class="disclaimer">
			The map contains significant errors. Not for building-specific evaluation!
		</div>

		<v-radio-group v-model="selectedScenario">
			<v-radio
				label="Stormwater flood map water depth 52 mm rainfall in 1 hour"
				value="HulevesitulvaVesisyvyysSade52mmMallinnettuAlue"
			/>
			<v-radio
				label="Stormwater flood map water depth 80 mm rainfall in 1 hour"
				value="HulevesitulvaVesisyvyysSade80mmMallinnettuAlue"
			/>
			<v-radio
				label="Flood hazard areas under different emission scenarios"
				value="SSP585_re_with_SSP245_with_SSP126_with_current"
			/>
			<v-radio
				label="SSP585, year 2050, recurrence 1/0020 years"
				value="coastal_flood_SSP585_2050_0020_with_protected"
			/>
			<v-radio
				label="SSP585, year 2100, recurrence 1/0020 years"
				value="coastal_flood_SSP585_2100_0020_with_protected"
			/>
			<v-radio
				label="SSP245, year 2050, recurrence 1/0020 years"
				value="coastal_flood_SSP245_2050_0020_with_protected"
			/>
			<v-radio
				label="SSP245, year 2100, recurrence 1/0020 years"
				value="coastal_flood_SSP245_2100_0020_with_protected"
			/>
			<v-radio
				label="SSP126, year 2050, recurrence 1/0020 years"
				value="coastal_flood_SSP126_2050_0020_with_protected"
			/>
			<v-radio
				label="SSP126, year 2100, recurrence 1/0020 years"
				value="coastal_flood_SSP126_2100_0020_with_protected"
			/>
			<v-radio
				label="none"
				value="none"
			/>
		</v-radio-group>

		<div class="legend-container">
			<div
				v-for="item in currentLegend"
				:key="item.color"
			>
				<div
					class="color-square"
					:style="{ backgroundColor: item.color }"
				/>
				<span class="legend-text">{{ item.text }}</span>
			</div>
			<div class="reference">
				Open data distributed by
				<a
					href="https://www.syke.fi/en"
					target="_blank"
					>Finnish Environment Institute (Syke)</a>
				is licensed under Creative Commons Attribution 4.0 International licence.
			</div>
		</div>
	</div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { createFloodImageryLayer, removeFloodLayers } from '../services/floodwms';
import { useURLStore } from '../stores/urlStore';

const urlStore = useURLStore();
const selectedScenario = ref(null);

const legendItemsCombination = ref([
	{ color: '#002a8e', text: 'Current situation (2020)' },
	{ color: '#0f62fe', text: 'Year 2100, low = SSP1-2.6' },
	{ color: '#b2192b', text: 'Year 2100, medium = SSP2-4.5' },
	{ color: '#fde9dc', text: 'Year 2100 ,high = SSP5-8.5' },
]);

const legendItemsSea = ref([
	{ color: '#7ecce6', text: 'Less than 0.5 m' },
	{ color: '#5498cc', text: '0.5-1 m' },
	{ color: '#2b66b3', text: '1-2 m' },
	{ color: '#003399', text: '2-3 m' },
	{ color: '#002673', text: 'More than 3 m' },
	{ color: '#fddbc6', text: 'Flood-protected by permanent structures' },
	{ color: '#d2ffff', text: 'Sea area' },
]);

const legendItemsStormwater = ref([
	{ color: '#82CFFF', text: 'water/sea area' },
	{ color: '#4589FF', text: '0.1 m' }, // Light blue
	{ color: '#0F62FE', text: '0.3 m' }, // Blue
	{ color: '#0059C9', text: '0.5 m' }, // Dark blue
	{ color: '#002A8E', text: '1 m' }, // Darker blue
	{ color: '#001141', text: '2- m' }, // Almost black blue
]);

const currentLegend = computed(() => {
	if (selectedScenario.value?.startsWith('Hulevesitulva')) {
		return legendItemsStormwater.value;
	} else if (selectedScenario.value === 'SSP585_re_with_SSP245_with_SSP126_with_current') {
		return legendItemsCombination.value;
	} else if (selectedScenario.value?.startsWith('coastal_flood')) {
		return legendItemsSea.value;
	} else {
		return [];
	}
});

// WMS configuration using centralized URL store
const wmsConfig = computed(() => {
	if (!selectedScenario.value) {
		return { url: null, layerName: null };
	}

	const url = urlStore.sykeFloodUrl(selectedScenario.value);
	return { url, layerName: selectedScenario.value };
});

const updateWMS = async (config) => {
	if (!config || !config.layerName) return;

	// Remove previous layers
	removeFloodLayers();

	if (config.layerName !== 'none') {
		await createFloodImageryLayer(config.url, config.layerName);
	}
};

watch(selectedScenario, async () => {
	await nextTick(); // Ensure updates propagate before modifying layers
	updateWMS(wmsConfig.value).catch(console.error);
});
</script>

<style scoped>
/* Disclaimer Styling */
.disclaimer {
	color: red; /* Red text */
	font-weight: bold; /* Bold font */
	font-size: 18px; /* Large font size */
	text-align: center; /* Center the text */
	margin-bottom: 10px; /* Space below the disclaimer */
}

.legend-container {
	display: flex; /* Arrange items horizontally */
	flex-direction: column; /* Stack items vertically */
	margin-top: 10px; /* Add some space above the legend */
}

.color-square {
	width: 20px;
	height: 20px;
	margin-right: 10px;
	display: inline-block; /* Make it sit side-by-side with text */
	vertical-align: middle; /* Align vertically with text */
}

.legend-text {
	display: inline-block; /* Make it sit side-by-side with color square */
	vertical-align: middle; /* Align vertically with color square */
}

/* Smaller font size for labels */
.v-radio-group >>> .v-label {
	/* >>> is a deep selector for Vuetify components */
	font-size: 12px; /* Adjust as needed */
}

.reference {
	margin-top: 10px; /* Space above reference */
	font-size: 12px; /* Smaller font for reference */
}

.reference a {
	color: blue; /* Link color */
	text-decoration: none; /* Remove underline */
}

.reference a:hover {
	text-decoration: underline; /* Underline on hover */
}
</style>
