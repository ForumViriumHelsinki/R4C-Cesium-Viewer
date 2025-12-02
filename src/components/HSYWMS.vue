<template>
	<div
		class="wms-layer-switcher"
		@click.stop
	>
		<!-- Added upper margin with link to HSY map service -->

		<div class="search-and-restore">
			<v-text-field
				v-model="searchQuery"
				append-inner-icon="mdi-magnify"
				density="compact"
				label=" Change Background Map"
				placeholder=" Search for WMS layers"
				variant="outlined"
				hide-details
				single-line
				@input="onSearch"
				@keyup.enter="onEnter"
				@click:append.stop="onSearchClick"
				@click.stop
			/>
			<v-btn
				class="restore-btn"
				@click.stop="restoreDefaultLayer"
			>
				Restore Default
			</v-btn>
		</div>

		<div class="hsy-link">
			All Background Map options can be found at
			<a
				href="https://kartta.hsy.fi/"
				target="_blank"
				>HSY map service</a
			>
			under 'karttatasot'.
		</div>

		<v-list v-if="filteredLayers.length > 0">
			<v-list-item
				v-for="(layer, index) in filteredLayers"
				:key="index"
				@click.stop="selectLayer(layer.name)"
			>
				{{ layer.title }}
			</v-list-item>
		</v-list>
	</div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useBackgroundMapStore } from '../stores/backgroundMapStore';
import { useGlobalStore } from '../stores/globalStore';
import wms from '../services/wms';
import { createHSYImageryLayer, removeLandcover } from '../services/landcover';
import axios from 'axios';
import { XMLParser } from 'fast-xml-parser';

export default {
	setup() {
		const backgroundMapStore = useBackgroundMapStore();
		const searchQuery = ref('');
		const filteredLayers = ref([]);
		const wmsService = new wms();

		const fetchLayers = async () => {
			try {
				const response = await axios.get('/wms/layers');

				if (response.data) {
					const parser = new XMLParser({
						ignoreAttributes: false,
						attributeNamePrefix: '@_',
					});
					// Parse the response.data, not undefined 'data' variable
					const parsedXml = parser.parse(response.data);

					// Handle potential different XML structures
					const layerData = parsedXml.WMS_Capabilities?.Capability?.Layer?.Layer || [];
					const layers = (Array.isArray(layerData) ? layerData : [layerData])
						.filter((layer) => layer && layer.Name) // Make sure layer and Name exist
						.map((layer) => ({
							name: layer.Name,
							title: layer.Title ? layer.Title.replace(/_/g, ' ') : layer.Name,
						}));

					// Set the processed layers array, not the raw response data
					backgroundMapStore.setHSYWMSLayers(layers);
				} else {
					backgroundMapStore.setHSYWMSLayers([]);
				}
			} catch (error) {
				console.error('Error fetching WMS layers:', error);
				console.error('Error details:', {
					message: error.message,
					response: error.response?.data,
					status: error.response?.status,
				});
				backgroundMapStore.setHSYWMSLayers([]);
			}
		};

		// Filter layers based on user input
		const onSearch = () => {
			if (searchQuery.value.length >= 3) {
				filteredLayers.value = backgroundMapStore.hSYWMSLayers.filter((layer) =>
					layer.title.toLowerCase().includes(searchQuery.value.toLowerCase())
				);
			} else {
				filteredLayers.value = [];
			}
		};

		// Select and switch the WMS layer
		const selectLayer = async (layerName) => {
			const store = useGlobalStore();
			removeLandcover(store.landcoverLayers, store.cesiumViewer);
			await createHSYImageryLayer(layerName);
			// Clear the filtered layers after selecting
			filteredLayers.value = [];
		};

		// Handle enter key press
		const onEnter = () => {
			const matchingLayer = backgroundMapStore.hSYWMSLayers.find(
				(layer) => layer.title.toLowerCase() === searchQuery.value.toLowerCase()
			);
			if (matchingLayer) {
				void selectLayer(matchingLayer.name); // Switch to the matching layer
			}
		};

		// Handle search button click
		const onSearchClick = () => {
			onEnter(); // Trigger the same behavior as pressing enter
		};

		// Restore default WMS layer
		const restoreDefaultLayer = () => {
			const store = useGlobalStore();
			// Restore default WMS layer (avoindata:Karttasarja_PKS)
			store.cesiumViewer.imageryLayers.add(
				wmsService.createHelsinkiImageryLayer('avoindata:Karttasarja_PKS')
			);
		};

		onMounted(() => {
			if (!backgroundMapStore.hSYWMSLayers) {
				void fetchLayers();
			}
		});

		return {
			searchQuery,
			filteredLayers,
			selectLayer,
			onSearch,
			onEnter,
			onSearchClick,
			restoreDefaultLayer,
		};
	},
};
</script>

<style scoped>
.wms-layer-switcher {
	width: 100%;
	font-size: smaller;
	background-color: white;
	z-index: 100000;
}

.search-and-restore {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.restore-btn {
	margin-left: 10px;
	font-size: 12px;
	text-transform: none;
	background-color: #f5f5f5;
	color: #000;
}

.hsy-link {
	background-color: white;
	margin-top: 5px;
	margin-bottom: 5px;
	font-size: 10px;
	text-align: center;
}

.hsy-link a {
	color: blue;
	text-decoration: underline;
}

.v-list {
	background: white;
	max-height: 200px;
	overflow-y: auto;
}

.v-list-item {
	cursor: pointer;
	padding: 10px;
}

.v-list-item:hover {
	background-color: #f0f0f0;
}
</style>
