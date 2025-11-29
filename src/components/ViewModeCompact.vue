<template>
	<div class="view-mode-compact">
		<!-- View Mode Button Group -->
		<v-btn-toggle
			v-model="activeViewMode"
			mandatory
			variant="outlined"
			density="compact"
			class="view-toggle-group"
		>
			<v-btn
				value="capitalRegionView"
				size="small"
				aria-label="Capital Region view"
				@click="onToggleChange('capitalRegionView')"
			>
				<v-icon
					:start="!isMobile"
					size="16"
				>
					mdi-city
				</v-icon>
				<span class="d-none d-sm-inline">Capital Region</span>
			</v-btn>

			<v-btn
				value="gridView"
				size="small"
				aria-label="Statistical Grid view"
				@click="onToggleChange('gridView')"
			>
				<v-icon
					:start="!isMobile"
					size="16"
				>
					mdi-grid
				</v-icon>
				<span class="d-none d-sm-inline">Statistical Grid</span>
			</v-btn>
		</v-btn-toggle>

		<!-- Contextual Info Chip - hidden on mobile -->
		<v-chip
			size="small"
			:color="getViewModeColor()"
			variant="tonal"
			class="coverage-chip d-none d-md-flex"
		>
			{{ getCoverageText() }}
		</v-chip>
	</div>
</template>

<script>
import { ref, watch, computed } from 'vue';
import { useDisplay } from 'vuetify';
import { useGlobalStore } from '../stores/globalStore.js';
import { useToggleStore } from '../stores/toggleStore.js';
import Datasource from '../services/datasource.js';
import { removeLandcover } from '../services/landcover';
import Tree from '../services/tree.js';
import FeaturePicker from '../services/featurepicker';

export default {
	name: 'ViewModeCompact',
	setup() {
		const activeViewMode = ref('capitalRegionView');
		const toggleStore = useToggleStore();
		const store = useGlobalStore();
		const { smAndDown } = useDisplay();
		const isMobile = computed(() => smAndDown.value);
		const dataSourceService = new Datasource();
		const featurePicker = new FeaturePicker();

		// View mode information
		const viewModeInfo = {
			capitalRegionView: {
				coverage: '~200 postal codes',
				color: 'blue',
			},
			gridView: {
				coverage: 'Grid analysis',
				color: 'green',
			},
			helsinkiHeat: {
				coverage: '~50 Helsinki areas',
				color: 'orange',
			},
		};

		const getCoverageText = () => {
			return viewModeInfo[activeViewMode.value]?.coverage || '';
		};

		const getViewModeColor = () => {
			return viewModeInfo[activeViewMode.value]?.color || 'grey';
		};

		// Watcher for activeViewMode changes
		watch(activeViewMode, (newViewMode) => {
			onToggleChange(newViewMode);
		});

		const onToggleChange = (viewMode) => {
			activeViewMode.value = viewMode;

			switch (viewMode) {
				case 'capitalRegionView':
					capitalRegion();
					break;
				case 'gridView':
					gridView();
					break;
				case 'capitalRegionCold':
					toggleCold();
					break;
				case 'helsinkiHeat':
					helsinkiHeat();
					break;
				default:
					break;
			}
		};

		const toggleCold = async () => {
			const checked = activeViewMode.value === 'capitalRegionCold';
			toggleStore.setCapitalRegionCold(checked);
			setCapitalRegion();
		};

		const setCapitalRegion = async () => {
			store.setView('capitalRegion');
			toggleStore.setHelsinkiView(false);
			// Don't reset all toggles - preserve data layer states (landCover, ndvi, etc.)
			// Only clear landCover imagery if at start level
			if (store.level === 'start') {
				await clearLandCover();
			}
			await dataSourceService.removeDataSourcesAndEntities();
			await dataSourceService.loadGeoJsonDataSource(0.2, './assets/data/hsy_po.json', 'PostCodes');

			if (store.postalcode) {
				featurePicker.loadPostalCode();
			}
			if (toggleStore.showTrees) {
				await loadTrees();
			}
		};

		const loadTrees = async () => {
			const treeService = new Tree();
			treeService.loadTrees();
		};

		const clearLandCover = async () => {
			removeLandcover(store.landcoverLayers);
		};

		const capitalRegion = async () => {
			const checked = activeViewMode.value === 'capitalRegionView';
			toggleStore.setCapitalRegionCold(!checked);
			setCapitalRegion();
		};

		const helsinkiHeat = async () => {
			const checked = activeViewMode.value === 'helsinkiHeat';
			// Don't reset all toggles - preserve data layer states (landCover, ndvi, etc.)
			toggleStore.setHelsinkiView(checked);
			toggleStore.setCapitalRegionCold(false);
			store.setView('helsinki');
			await dataSourceService.removeDataSourcesAndEntities();
			await dataSourceService.loadGeoJsonDataSource(
				0.2,
				'./assets/data/hki_po_clipped.json',
				'PostCodes'
			);

			if (store.postalcode) {
				featurePicker.loadPostalCode();
			}
		};

		const gridView = () => {
			const isGridView = activeViewMode.value === 'gridView';
			toggleStore.setGridView(isGridView);
			toggleStore.setHelsinkiView(false);
			store.setView(isGridView ? 'grid' : 'capitalRegion');
			if (isGridView) {
				store.setShowBuildingInfo(false);
				toggleStore.setGrid250m(true);
			} else {
				reset();
			}
		};

		const reset = () => {
			// Reset logic if needed
		};

		// Computed property to control the visibility of the Helsinki Heat option
		const showHelsinkiHeat = computed(() => {
			const postalCode = Number(store.postalcode);
			return postalCode === null || (postalCode >= 0 && postalCode <= 1000);
		});

		return {
			activeViewMode,
			onToggleChange,
			showHelsinkiHeat,
			getCoverageText,
			getViewModeColor,
			isMobile,
		};
	},
};
</script>

<style scoped>
.view-mode-compact {
	display: flex;
	align-items: center;
	gap: 12px;
}

.view-toggle-group {
	border-radius: 6px;
}

.coverage-chip {
	font-size: 0.75rem;
	height: 24px;
}

/* Responsive adjustments */
@media (max-width: 960px) {
	.view-mode-compact {
		gap: 8px;
	}

	.view-toggle-group :deep(.v-btn) {
		font-size: 0.75rem;
		padding: 0 8px;
	}
}

/* Mobile: icon-only buttons */
@media (max-width: 600px) {
	.view-mode-compact {
		gap: 4px;
	}

	.view-toggle-group :deep(.v-btn) {
		min-width: 44px;
		min-height: 44px;
		padding: 0 8px;
	}

	.view-toggle-group :deep(.v-btn .v-icon) {
		font-size: 20px;
	}
}
</style>
