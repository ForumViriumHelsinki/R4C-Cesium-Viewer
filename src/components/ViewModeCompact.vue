<template>
	<div class="view-mode-compact">
		<v-btn-toggle
			v-model="activeViewMode"
			mandatory
			variant="outlined"
			density="compact"
			class="view-toggle-group w-100"
		>
			<v-btn
				value="capitalRegionView"
				size="small"
				aria-label="Capital Region view"
			>
				<v-icon
					start
					size="16"
				>
					mdi-city
				</v-icon>
				Region
			</v-btn>

			<v-btn
				value="gridView"
				size="small"
				aria-label="Statistical Grid view"
			>
				<v-icon
					start
					size="16"
				>
					mdi-grid
				</v-icon>
				Grid
			</v-btn>
		</v-btn-toggle>
	</div>
</template>

<script setup>
import { computed } from 'vue'
import Datasource from '../services/datasource.js'
import FeaturePicker from '../services/featurepicker'
import { removeLandcover } from '../services/landcover'
import Tree from '../services/tree.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import logger from '../utils/logger.js'

const toggleStore = useToggleStore()
const store = useGlobalStore()
const dataSourceService = new Datasource()
const featurePicker = new FeaturePicker()

const activeViewMode = computed({
	get: () => (store.view === 'grid' ? 'gridView' : 'capitalRegionView'),
	set: (val) => onToggleChange(val),
})

const onToggleChange = (viewMode) => {
	switch (viewMode) {
		case 'capitalRegionView':
			capitalRegion()
			break
		case 'gridView':
			gridView()
			break
		default:
			break
	}
}

const setCapitalRegion = async () => {
	store.setView('capitalRegion')
	toggleStore.setHelsinkiView(false)
	toggleStore.setGridView(false)
	toggleStore.setGrid250m(false)
	if (store.level === 'start') {
		removeLandcover()
	}
	await dataSourceService.removeDataSourcesAndEntities()
	await dataSourceService.loadGeoJsonDataSource(0.2, './assets/data/hsy_po.json', 'PostCodes')

	if (store.postalcode) {
		featurePicker.loadPostalCode().catch((error) => {
			logger.error('Failed to load postal code:', error)
		})
	}
	if (toggleStore.showTrees) {
		const treeService = new Tree()
		treeService.loadTrees().catch((error) => {
			logger.error('Failed to load trees:', error)
		})
	}
}

const capitalRegion = () => {
	toggleStore.setCapitalRegionCold(false)
	setCapitalRegion().catch((error) => {
		logger.error('Failed to set capital region:', error)
	})
}

const gridView = () => {
	toggleStore.setGridView(true)
	toggleStore.setHelsinkiView(false)
	store.setView('grid')
	store.setShowBuildingInfo(false)
	toggleStore.setGrid250m(true)
}
</script>

<style scoped>
.view-mode-compact {
	display: flex;
	align-items: center;
}

.view-toggle-group {
	border-radius: 6px;
}

.view-toggle-group :deep(.v-btn) {
	flex: 1;
}
</style>
