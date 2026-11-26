<template>
	<AdaptationToolSection
		title="Cooling centers"
		:description="`Estimate how much cooling centers cool nearby grid cells. Choose a capacity, select Place on map, then click 250 m grid cells. Up to ${MAX_COOLING_CENTERS_PER_CELL} per cell.`"
	>
		<v-alert
			v-if="limitMessage"
			type="info"
			density="compact"
			variant="tonal"
			closable
			class="mb-3"
			@click:close="limitMessage = ''"
		>
			{{ limitMessage }}
		</v-alert>

		<div class="d-flex align-center justify-space-between mb-1">
			<span
				id="cooling-capacity-label"
				class="text-caption"
			>
				Capacity
			</span>
			<span class="cooling-capacity-value text-caption font-weight-medium">
				{{ formatCapacity(selectedCapacity) }}
			</span>
		</div>
		<v-slider
			v-model="selectedCapacity"
			:min="COOLING_CENTER_CAPACITY.min"
			:max="COOLING_CENTER_CAPACITY.max"
			:step="COOLING_CENTER_CAPACITY.step"
			color="primary"
			density="compact"
			hide-details
			aria-labelledby="cooling-capacity-label"
		/>
		<div
			class="cooling-capacity-range d-flex justify-space-between text-caption text-medium-emphasis mb-3"
		>
			<span>{{ formatNumber(COOLING_CENTER_CAPACITY.min) }}</span>
			<span>{{ formatNumber(COOLING_CENTER_CAPACITY.max) }}</span>
		</div>

		<v-btn
			block
			color="primary"
			:variant="placing ? 'tonal' : 'flat'"
			:prepend-icon="placing ? 'mdi-check' : 'mdi-map-marker-plus'"
			:aria-pressed="placing"
			class="text-none"
			@click="togglePlacement"
		>
			{{ placing ? 'Done' : 'Place on map' }}
		</v-btn>
		<v-alert
			v-if="placing"
			type="info"
			density="compact"
			variant="tonal"
			icon="mdi-cursor-default-click"
			class="cooling-placement-hint mt-2"
		>
			Click a grid cell on the map to place a center for {{ formatCapacity(selectedCapacity) }}.
			Press Esc or Done to stop.
		</v-alert>

		<v-divider class="my-4" />

		<div class="d-flex align-center mb-1">
			<span class="text-subtitle-2">Placed centers</span>
			<v-chip
				size="x-small"
				class="ml-2"
			>
				{{ centers.length }}
			</v-chip>
			<v-spacer />
			<v-btn
				v-if="!confirmingClear"
				variant="text"
				size="small"
				class="text-none"
				:disabled="centers.length === 0"
				@click="confirmingClear = true"
			>
				Clear all
			</v-btn>
		</div>

		<div
			v-if="confirmingClear"
			class="cooling-clear-confirm d-flex align-center flex-wrap ga-2 mb-2"
			role="group"
			aria-label="Confirm clearing cooling centers"
		>
			<span class="text-body-2 flex-grow-1">{{ clearPrompt }}</span>
			<v-btn
				variant="text"
				size="small"
				class="text-none"
				@click="confirmingClear = false"
			>
				Cancel
			</v-btn>
			<v-btn
				color="error"
				variant="tonal"
				size="small"
				class="text-none"
				@click="clearAll"
			>
				Remove all
			</v-btn>
		</div>

		<p
			v-if="centers.length === 0"
			class="cooling-center-empty text-body-2 text-medium-emphasis mb-0"
		>
			No cooling centers yet.
		</p>
		<v-list
			v-else
			density="compact"
			class="cooling-center-list pa-0 bg-transparent"
		>
			<v-list-item
				v-for="center in centers"
				:key="center.id"
				class="cooling-center-item px-0"
				prepend-icon="mdi-snowflake"
				:title="`Cell ${center.grid_id}`"
				:subtitle="formatCapacity(center.capacity ?? 0)"
			>
				<template #append>
					<v-btn
						icon="mdi-close"
						variant="text"
						size="x-small"
						:aria-label="`Remove cooling center in cell ${center.grid_id}`"
						@click="removeCenter(center)"
					/>
				</template>
			</v-list-item>
		</v-list>
	</AdaptationToolSection>
</template>

<script setup>
import * as turf from '@turf/turf'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import {
	COOLING_CENTER_CAPACITY,
	COOLING_CENTER_SLOT_OFFSETS_M,
	formatCapacity,
	MAX_COOLING_CENTERS_PER_CELL,
	nextFreeSlot,
} from '../constants/coolingCenters.js'
import { COOLING_CENTER_MESSAGES } from '../constants/errorMessages.js'
import { getCesium } from '../services/cesiumProvider.js'
import DataSource from '../services/datasource.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useMitigationStore } from '../stores/mitigationStore'
import logger from '../utils/logger.js'
import AdaptationToolSection from './AdaptationToolSection.vue'

const METRES_PER_DEGREE = 111320

const globalStore = useGlobalStore()
const mitigationStore = useMitigationStore()
const viewer = computed(() => globalStore.cesiumViewer)
const centers = computed(() => mitigationStore.coolingCenters)
const placing = ref(false)
const confirmingClear = ref(false)
const selectedCapacity = ref(COOLING_CENTER_CAPACITY.initial)
/** Inline notice when a grid cell is full (#1153: no alert()). */
const limitMessage = ref('')
let coolingCentersDataSource =
	globalStore?.cesiumViewer.dataSources?.getByName('cooling_centers')[0]

const numberFormat = new Intl.NumberFormat('en-US')
const formatNumber = (value) => numberFormat.format(value)

const clearPrompt = computed(() =>
	centers.value.length === 1
		? 'Remove the cooling center?'
		: `Remove all ${centers.value.length} cooling centers?`
)

const setPlacing = (value) => {
	placing.value = value
	const canvas = viewer.value?.canvas
	if (canvas) canvas.style.cursor = value ? 'crosshair' : ''
}

const togglePlacement = () => setPlacing(!placing.value)

const handleKeydown = (event) => {
	if (event.key === 'Escape' && placing.value) setPlacing(false)
}

const removeCenter = (center) => {
	mitigationStore.removeCoolingCenter(center.id)
	if (center.entityId) coolingCentersDataSource?.entities.removeById(center.entityId)
	limitMessage.value = ''
	viewer.value?.scene?.requestRender()
}

const clearAll = async () => {
	confirmingClear.value = false
	const Cesium = getCesium()
	const dataSourceService = new DataSource()
	await dataSourceService.removeDataSourcesByNamePrefix('cooling_centers')
	await globalStore.cesiumViewer.dataSources.remove(coolingCentersDataSource)
	mitigationStore.resetStore()
	limitMessage.value = ''
	coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers')
	globalStore.cesiumViewer.dataSources.add(coolingCentersDataSource)
}

const handleMapClick = (clickEvent) => {
	if (!placing.value) return

	const Cesium = getCesium()
	const pickedObject = viewer.value.scene.pick(clickEvent.position)
	const entity = Cesium.defined(pickedObject) ? pickedObject.id : null
	// Stay in placement mode so several centers can be placed in a row.
	if (entity?.properties?.grid_id) addCoolingCenter(entity)
}

const getEntityCentroid = (entity) => {
	if (!entity.polygon) return null
	const Cesium = getCesium()
	const polygonPositions = entity.polygon.hierarchy.getValue().positions

	const coordinates = polygonPositions.map((pos) => {
		const cartographic = Cesium.Cartographic.fromCartesian(pos)
		return [
			Cesium.Math.toDegrees(cartographic.longitude),
			Cesium.Math.toDegrees(cartographic.latitude),
		]
	})

	// turf needs a closed ring: first and last coordinate must match.
	if (
		coordinates.length > 0 &&
		(coordinates[0][0] !== coordinates[coordinates.length - 1][0] ||
			coordinates[0][1] !== coordinates[coordinates.length - 1][1])
	) {
		coordinates.push(coordinates[0])
	}

	const centroid = turf.centroid(turf.polygon([coordinates]))
	const [longitude, latitude] = centroid.geometry.coordinates
	return Cesium.Cartesian3.fromDegrees(longitude, latitude)
}

const addCoolingCenter = (entity) => {
	const Cesium = getCesium()
	const gridId = entity.properties.grid_id?.getValue()
	const slot =
		mitigationStore.getCoolingCenterCount(gridId) >= MAX_COOLING_CENTERS_PER_CELL
			? -1
			: nextFreeSlot(mitigationStore.coolingCenters, gridId)
	if (slot === -1) {
		limitMessage.value = COOLING_CENTER_MESSAGES.limitReached
		return
	}
	limitMessage.value = ''

	const cartesianPosition = getEntityCentroid(entity)
	if (!cartesianPosition) {
		logger.error('Could not calculate centroid for entity')
		return
	}

	const capacity = selectedCapacity.value
	const entityId = `cooling_${gridId}_${slot + 1}`
	mitigationStore.addCoolingCenter({
		grid_id: gridId,
		euref_x: entity.properties.euref_x?.getValue(),
		euref_y: entity.properties.euref_y?.getValue(),
		capacity,
		slot,
		entityId,
	})

	const [dx, dy] = COOLING_CENTER_SLOT_OFFSETS_M[slot]
	const centroid = Cesium.Cartographic.fromCartesian(cartesianPosition)
	const position = Cesium.Cartesian3.fromDegrees(
		Cesium.Math.toDegrees(centroid.longitude) + dx / METRES_PER_DEGREE,
		Cesium.Math.toDegrees(centroid.latitude) + dy / METRES_PER_DEGREE
	)
	const dimension = (capacity / COOLING_CENTER_CAPACITY.max) * 80

	coolingCentersDataSource.entities.add({
		id: entityId,
		position,
		box: {
			dimensions: new Cesium.Cartesian3(dimension, dimension, dimension),
			material: Cesium.Color.BLUE.withAlpha(0.8),
		},
		label: {
			text: formatCapacity(capacity),
			font: '12px sans-serif',
			fillColor: Cesium.Color.BLACK,
			outlineColor: Cesium.Color.BLACK,
			outlineWidth: 1,
			verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
			pixelOffset: new Cesium.Cartesian2(0, -30),
		},
		allowPicking: false,
	})
}

onMounted(() => {
	const Cesium = getCesium()
	if (!viewer.value) {
		logger.error('Cesium viewer is not initialized.')
		return
	}

	if (!coolingCentersDataSource) {
		coolingCentersDataSource = new Cesium.CustomDataSource('cooling_centers')
	}

	viewer.value.dataSources.add(coolingCentersDataSource)

	viewer.value.screenSpaceEventHandler.setInputAction(
		handleMapClick,
		Cesium.ScreenSpaceEventType.LEFT_CLICK
	)
	window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
	const Cesium = getCesium()
	window.removeEventListener('keydown', handleKeydown)
	setPlacing(false)
	if (viewer.value?.screenSpaceEventHandler) {
		viewer.value.screenSpaceEventHandler.removeInputAction(Cesium.ScreenSpaceEventType.LEFT_CLICK)
	}
})
</script>
