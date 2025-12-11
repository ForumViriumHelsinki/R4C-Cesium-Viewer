<template>
	<div
		v-if="legendData.length > 0 && legendVisible"
		id="legend"
	>
		<!-- Toggle button to minimize or expand the legend -->
		<v-icon
			class="toggle-icon"
			@click="toggleLegend"
		>
			{{ legendExpanded ? 'mdi-chevron-up' : 'mdi-chevron-down' }}
		</v-icon>

		<div v-if="legendExpanded">
			<h3>Statistical grid options</h3>
			<!-- Conditional rendering of the gradient legend for avgheatexposure -->
			<div
				v-if="
					localSelectedIndex === 'avgheatexposure' ||
					localSelectedIndex === 'combined_avgheatexposure'
				"
				class="gradient-legend"
			>
				<div class="gradient-bar" />
				<div class="gradient-labels">
					<span>0.1</span>
					<span>0.2</span>
					<span>0.3</span>
					<span>0.4</span>
					<span>0.5</span>
					<span>0.6</span>
					<span>0.7</span>
					<span>0.8</span>
					<span>0.9</span>
				</div>
			</div>

			<!-- Custom striped legend for combined_heat_flood_green, simplified to combined heat and flood -->
			<div
				v-else-if="localSelectedIndex === 'combined_heat_flood_green'"
				class="striped-legend"
			>
				<div class="legend-container">
					<!-- Combined Legend for Heat and Flood -->
					<div class="combined-legend">
						<div class="legend-section">
							<div class="heat-legend">
								<h5>Heat Index</h5>
								<div
									v-for="item in indexToColorScheme.partialHeat"
									:key="item.range"
									class="swatch"
								>
									<div
										class="color-box"
										:style="{ backgroundColor: item.color }"
									/>
									<span>{{ item.range }}</span>
								</div>
							</div>

							<div class="flood-legend">
								<h5>Flood Index</h5>
								<div
									v-for="item in indexToColorScheme.partialFlood"
									:key="item.range"
									class="swatch"
								>
									<div
										class="color-box"
										:style="{ backgroundColor: item.color }"
									/>
									<span>{{ item.range }}</span>
								</div>
							</div>

							<div class="missing-legend">
								<h5>Incomplete Data</h5>
								<div
									v-for="item in indexToColorScheme.both"
									:key="item.range"
									class="swatch"
								>
									<div
										class="color-box"
										:style="{ backgroundColor: item.color }"
									/>
									<span>{{ item.range }}</span>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="extrusion-note">
					<span>Green Space Index shown by grid cell <br >
						height visualisation, with a maximum <br >
						height of 250m (least green).</span>
				</div>
			</div>

			<!-- Default legend display for non-gradient indices -->
			<div v-else>
				<div
					v-for="item in legendData"
					:key="item.range"
					class="swatch"
				>
					<div
						class="color-box"
						:style="{ backgroundColor: item.color }"
					/>
					<span>{{ item.range }}</span>
				</div>
			</div>
		</div>

		<div
			v-if="localSelectedIndex === 'combined_avgheatexposure' && legendExpanded"
			class="extrusion-note"
		>
			<span>Heat Index shown by grid <br >
				cell height visualisation, <br >
				with a maximum height of 250m.</span>
		</div>

		<div
			v-if="localSelectedIndex === 'combined_heatindex_avgheatexposure' && legendExpanded"
			class="extrusion-note"
		>
			<span>Normalised Landsat Surface heat shown <br >
				by grid cell height visualisation, <br >
				with a maximum height of 250m.</span>
		</div>

		<div
			v-if="localSelectedIndex === 'combined_heat_flood' && legendExpanded"
			class="extrusion-note"
		>
			<span>Flood Index shown by grid <br >
				cell height visualisation, <br >
				with a maximum height of 250m.</span>
		</div>

		<div
			v-if="localSelectedIndex === 'combined_flood_heat' && legendExpanded"
			class="extrusion-note"
		>
			<span>Heat Index shown by grid <br >
				cell height visualisation, <br >
				with a maximum height of 250m.</span>
		</div>

		<v-tooltip
			v-if="selectedIndexDescription && legendExpanded"
			:text="selectedIndexDescription"
			bottom
		>
			<template #activator="{ props }">
				<v-select
					v-bind="props"
					v-model="localSelectedIndex"
					:items="indexOptions"
					item-title="text"
					item-value="value"
					label="Select Index"
					style="max-width: 300px"
					@update:model-value="handleSelectionChange"
				/>
			</template>
		</v-tooltip>

		<div
			v-if="legendExpanded"
			class="source-note"
		>
			Socioeconomic source data by<br >
			<a
				href="https://stat.fi/index_en.html"
				target="_blank"
				>Statistics Finland</a><br >
			<a
				href="https://www.hsy.fi/globalassets/ilmanlaatu-ja-ilmasto/tiedostot/social-vulnerability-to-climate-change-helsinki-metropolitan-area_2016.pdf"
				target="_blank"
				>Methodology for Assessing Social Vulnerability</a>
		</div>
	</div>
</template>

<script setup>
import { ref, computed } from 'vue';

// Define state to control the visibility and expansion of the legend
const legendVisible = ref(true);
const legendExpanded = ref(true);

// Toggle function for legend expansion/minimization
const toggleLegend = () => {
	legendExpanded.value = !legendExpanded.value;
};
// Define index options with their corresponding colors and descriptions
const indexOptions = [
	{
		text: 'Heat Vulnerability',
		value: 'heat_index',
		description:
			'Total social vulnerability to high temperatures. Includes factors like age, income, and housing conditions.',
	},
	{
		text: 'Flood Vulnerability',
		value: 'flood_index',
		description:
			'Total social vulnerability to flooding. Considers factors such as age, income, overcrowding, and green space.',
	},
	{
		text: 'Sensitivity',
		value: 'sensitivity',
		description:
			'Sensitivity to flooding and high temperatures. Calculated from the percentage of people over 75 years old and the percentage of children aged 0-6 years.',
	},
	{
		text: 'Flood Exposure',
		value: 'flood_exposure',
		description: 'Enhanced exposure to flooding. Based on green space coverage in the area.',
	},
	{
		text: 'Flood Preparedness',
		value: 'flood_prepare',
		description:
			'Ability to prepare for flooding. Includes indicators such as income, employment, social networks, and housing tenure.',
	},
	{
		text: 'Flood Response',
		value: 'flood_respond',
		description:
			'Ability to respond to flooding. Includes access to emergency services, information, and economic stability.',
	},
	{
		text: 'Flood Recovery',
		value: 'flood_recover',
		description:
			'Ability to recover after flooding. Takes into account economic factors, housing conditions, and social support networks.',
	},
	{
		text: 'Heat Exposure',
		value: 'heat_exposure',
		description:
			'Enhanced exposure to high temperatures. Based on factors like housing conditions and the amount of vegetation.',
	},
	{
		text: 'Heat Preparedness',
		value: 'heat_prepare',
		description:
			'Ability to prepare for high temperatures. Considers economic and social factors, as well as housing conditions.',
	},
	{
		text: 'Heat Response',
		value: 'heat_respond',
		description:
			'Ability to respond to high temperatures. Similar factors as preparedness, focusing on response capabilities.',
	},
	{
		text: 'Age',
		value: 'age',
		description:
			'Age-based vulnerability. Combines the percentage of young children (0-6 years old) and elderly people (over 75 years old).',
	},
	{
		text: 'Information',
		value: 'info',
		description:
			'Information-based vulnerability. Calculated from the percentage of people with only basic education.',
	},
	{
		text: 'Tenure',
		value: 'tenure',
		description:
			'Tenure-based vulnerability. Includes the percentage of rented households and those rented from ARA (The Housing Finance and Development Centre of Finland).',
	},
	{
		text: 'Green Space',
		value: 'green',
		description:
			'Greenspace availability. Considers the percentage of water area, green space, low vegetation, and tree coverage in the land area.',
	},
	{
		text: 'Social Networks',
		value: 'social_networks',
		description:
			'Social network-based vulnerability. Includes the percentage of students, single-person households, and school-age children in the population.',
	},
	{
		text: 'Overcrowding',
		value: 'overcrowding',
		description:
			'Overcrowding vulnerability. Based on the occupancy rate and the percentage of households with seven or more people.',
	},
	{
		text: 'Landsat surface heat',
		value: 'avgheatexposure',
		description: 'Landsat surface heat 2023-06-28 (not combined)',
	},
	{
		text: 'Combined Landsat surface heat',
		value: 'combined_avgheatexposure',
		description: 'Combined Landsat surface heat  2023-06-28 and heat index',
	},
	{
		text: 'Heat and Landsat surface heat combined',
		value: 'combined_heatindex_avgheatexposure',
		description: 'Landsat surface heat and heat vulnerability combined',
	},
	{
		text: 'Combined Indices (Heat/Flood)',
		value: 'combined_heat_flood',
		description: 'Combined heat and flood vulnerability, colored by heat and height by flood.',
	},
	{
		text: 'Combined Indices (Flood/Heat)',
		value: 'combined_flood_heat',
		description: 'Combined heat and flood vulnerability, colored by flood and height by heat.',
	},
	{
		text: 'Combined Indices (Heat/Flood/Green)',
		value: 'combined_heat_flood_green',
		description:
			'Combined heat and flood vulnerability, colored by heat and flood, height by green space.',
	},
];

// Define heat vulnerability colors
const heatColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
	{ color: '#ffffcc', range: '< 0.2' },
	{ color: '#ffeda0', range: '0.2 - 0.4' },
	{ color: '#feb24c', range: '0.4 - 0.6' },
	{ color: '#f03b20', range: '0.6 - 0.8' },
	{ color: '#bd0026', range: '> 0.8' },
];

// Define heat vulnerability colors
const partialHeatColors = [
	{ color: '#ffffcc', range: '< 0.2' },
	{ color: '#ffeda0', range: '0.2 - 0.4' },
	{ color: '#feb24c', range: '0.4 - 0.6' },
	{ color: '#f03b20', range: '0.6 - 0.8' },
	{ color: '#bd0026', range: '> 0.8' },
];

// Define flood vulnerability colors
const floodColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
	{ color: '#c6dbef', range: '< 0.2' }, // More saturated light blue
	{ color: '#9ecae1', range: '0.2 - 0.4' }, // Slightly darker blue
	{ color: '#6baed6', range: '0.4 - 0.6' }, // Mid-tone blue
	{ color: '#3182bd', range: '0.6 - 0.8' }, // Darker blue
	{ color: '#08519c', range: '> 0.8' }, // Deep blue
];

const partialFloodColors = [
	{ color: '#c6dbef', range: '< 0.2' }, // More saturated light blue
	{ color: '#9ecae1', range: '0.2 - 0.4' }, // Slightly darker blue
	{ color: '#6baed6', range: '0.4 - 0.6' }, // Mid-tone blue
	{ color: '#3182bd', range: '0.6 - 0.8' }, // Darker blue
	{ color: '#08519c', range: '> 0.8' }, // Deep blue
];

// Define green space vulnerability colors with the desired gradient
const greenSpaceColors = [
	{ color: '#006d2c', range: '< 0.2' }, // Darkest green for < 0.2
	{ color: '#31a354', range: '0.2 - 0.4' }, // Dark green for 0.2 - 0.4
	{ color: '#74c476', range: '0.4 - 0.6' }, // Medium green for 0.4 - 0.6
	{ color: '#a1d99b', range: '0.6 - 0.8' }, // Light green for 0.6 - 0.8
	{ color: '#e5f5e0', range: '> 0.8' }, // Very light green for > 0.8
];

const bothColors = [
	{ color: '#ffffff', range: 'Incomplete data' },
	{ color: '#A9A9A9', range: 'Missing values' },
];

// Define a mapping of indices to their corresponding color schemes
const indexToColorScheme = {
	partialHeat: partialHeatColors,
	partialFlood: partialFloodColors,
	heat_index: heatColors,
	flood_index: floodColors,
	sensitivity: heatColors, // Sensitivity uses heat coloring
	flood_exposure: greenSpaceColors,
	flood_prepare: floodColors,
	flood_respond: floodColors,
	flood_recover: floodColors,
	heat_exposure: heatColors,
	heat_prepare: heatColors,
	heat_respond: heatColors,
	age: heatColors, // Age uses heat coloring
	income: heatColors, // Income uses heat coloring
	info: heatColors, // Info uses heat coloring
	tenure: heatColors, // Tenure uses heat coloring
	green: greenSpaceColors,
	social_networks: floodColors, // Social networks use flood coloring
	overcrowding: floodColors, // Overcrowding uses flood coloring
	combined_heat_flood: heatColors,
	combined_flood_heat: floodColors,
	combined_heatindex_avgheatexposure: heatColors,
	combined_heat_flood_green: heatColors,
	both: bothColors,
};

// Local state to bind to v-select
const localSelectedIndex = ref('heat_index');

// Compute legend data based on the selected index and the color scheme mapping
const legendData = computed(() => indexToColorScheme[localSelectedIndex.value] || heatColors);

const emit = defineEmits(['onIndexChange']);

// Handle selection change and emit event
const handleSelectionChange = (value) => {
	emit('onIndexChange', value);
};

// Compute the title based on the selected index
const _title = computed(() => {
	const selectedOption = indexOptions.find((option) => option.value === localSelectedIndex.value);
	return selectedOption ? selectedOption.text : 'Heat Vulnerability';
});

// Compute the description of the selected index for the tooltip
const selectedIndexDescription = computed(() => {
	const selectedOption = indexOptions.find((option) => option.value === localSelectedIndex.value);
	return selectedOption ? selectedOption.description : '';
});
</script>

<style scoped>
#legend {
	position: absolute;
	top: 100px;
	left: 10px;
	background-color: rgba(255, 255, 255, 0.8);
	border-radius: 4px;
	padding: 10px;
	z-index: 10;
	border: 1px solid black;
	box-shadow: 3px 5px 5px black;
}

.toggle-legend-btn {
	position: absolute;
	top: 70px; /* Adjust position as needed */
	left: 10px;
	background: transparent;
	border: none;
	font-size: 1.5rem;
	cursor: pointer;
	z-index: 11;
}

.legend-section {
	display: flex;
	flex-direction: row; /* Arrange Heat and Flood sections as columns */
	gap: 20px; /* Space between the columns */
}

.swatch {
	display: flex;
	align-items: center;
	margin-bottom: 5px;
}

.color-box {
	width: 20px;
	height: 20px;
	border: 1px solid black;
	margin-right: 5px;
}

.source-note {
	margin-top: -12px;
	font-size: 8px;
}

.source-note a {
	color: #0066cc;
	text-decoration: none;
}

.source-note a:hover {
	text-decoration: underline;
}

.gradient-legend {
	display: flex;
	flex-direction: column;
	align-items: center;
	margin-bottom: 10px;
}

.gradient-bar {
	width: 100%;
	height: 20px;
	background: linear-gradient(
		to right,
		#ffffcc,
		/* Color for < 0.2 */ #ffeda0,
		/* Color for 0.2 - 0.4 */ #feb24c,
		/* Color for 0.4 - 0.6 */ #f03b20,
		/* Color for 0.6 - 0.8 */ #bd0026 /* Color for > 0.8 */
	);
	border: 1px solid black;
	border-radius: 4px;
}

.gradient-labels {
	display: flex;
	justify-content: space-between;
	width: 100%;
	margin-top: 5px;
}

.gradient-labels span {
	font-size: 12px;
	text-align: center;
	flex: 1;
}

.striped-legend {
	margin-top: 1rem;
}

.legend-title {
	font-weight: bold;
	margin-bottom: 0.5rem;
}

.legend-container {
	display: flex; /* Use flexbox for layout */
	justify-content: space-between; /* Space items evenly */
	margin-bottom: 0.5rem; /* Add spacing below the legend container */
}

.heat-legend,
.flood-legend {
	display: flex;
	flex-direction: column; /* Stack items vertically */
	align-items: flex-start; /* Center items vertically */
	margin-bottom: 1rem;
}

.color-box {
	width: 20px; /* Width of the color box */
	height: 20px; /* Height of the color box */
	border: 1px solid black; /* Border for the color box */
	margin-right: 5px; /* Space between color box and text */
}

.extrusion-note {
	margin-top: 0.5rem; /* Spacing above the note */
	font-style: italic; /* Italicize the note text */
}
</style>
