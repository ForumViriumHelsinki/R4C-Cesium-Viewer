<template>
	<!-- Layout on top of Cesium -->
	<v-container
		v-if="showComponents"
		fluid
		class="d-flex flex-column pa-0 ma-0"
		style="position: relative; z-index: 10"
	>
		<!-- Row 7 -->
		<v-row
			no-gutters
			class="pa-0 ma-0"
		>
			<v-col
				class="d-flex flex-column pa-0 ma-0"
				style="z-index: 20"
			/>
			<v-col
				v-if="store.postalcode !== '00230'"
				class="d-flex align-end pa-0 ma-0"
				style="z-index: 20"
			>
				<SocioEconomics />
			</v-col>
		</v-row>

		<v-spacer />

		<!-- Row 6 -->
		<v-row
			v-if="showLandcover"
			no-gutters
			class="pa-0 ma-0"
		>
			<v-col
				class="d-flex align-start pa-0 ma-0"
				style="z-index: 20"
			>
				<Landcover />
			</v-col>
		</v-row>

		<v-spacer />

		<!-- Row 1 -->
		<v-row
			no-gutters
			class="pa-0 ma-0"
		>
			<v-col
				class="d-flex flex-column pa-0 ma-0"
				style="z-index: 20"
			>
				<BuildingScatterPlot />
			</v-col>
		</v-row>
		<!-- Conditionally render BuildingInformation when there is buildings to be shown -->
	</v-container>

	<BuildingInformation v-if="buildingStore.buildingFeatures && !store.isLoading" />
	<Loading v-if="store.isLoading" />
	<!-- Use showHSYWMS to control the visibility of the HSYWMS component -->
	<HSYWMS
		v-if="showComponents && showHSYWMS"
		style="z-index: 20"
	/>
</template>

<script>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import BuildingInformation from '../components/BuildingInformation.vue'
import HSYWMS from '../components/HSYWMS.vue'
import Loading from '../components/Loading.vue'
import { eventBus } from '../services/eventEmitter.js'
import { useBuildingStore } from '../stores/buildingStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import BuildingScatterPlot from '../views/BuildingScatterPlot.vue'
import Landcover from '../views/Landcover.vue'
import SocioEconomics from '../views/SocioEconomics.vue'

/**
 * Creates a trailing-edge debounced wrapper around `fn`. Mirrors the subset of
 * `@vueuse/core`'s `useDebounceFn` used here (which is not a project dependency),
 * but additionally exposes `.cancel()` so a pending call can be dropped on
 * component unmount to avoid stale state mutations.
 *
 * @template {(...args: any[]) => void} F
 * @param {F} fn - Function to debounce.
 * @param {number} delay - Trailing delay in milliseconds.
 * @returns {((...args: Parameters<F>) => void) & { cancel: () => void }}
 */
function useDebounceFn(fn, delay) {
	/** @type {ReturnType<typeof setTimeout> | null} */
	let timer = null
	/** @param {Parameters<F>} args */
	const run = (...args) => {
		if (timer !== null) clearTimeout(timer)
		timer = setTimeout(() => {
			timer = null
			fn(...args)
		}, delay)
	}
	const cancel = () => {
		if (timer !== null) {
			clearTimeout(timer)
			timer = null
		}
	}
	return Object.assign(run, { cancel })
}

export default {
	components: {
		BuildingScatterPlot,
		SocioEconomics,
		Landcover,
		BuildingInformation,
		Loading,
		HSYWMS,
	},
	setup() {
		const showComponents = ref(false)
		const showLandcover = ref(false)
		const showHSYWMS = ref(false)
		const store = useGlobalStore()
		const toggleStore = useToggleStore()
		const buildingStore = useBuildingStore()

		onMounted(() => {
			eventBus.on('showCapitalRegion', () => {
				showComponents.value = true
			})

			eventBus.on('hideCapitalRegion', () => {
				showComponents.value = false
			})
		})

		// Debounced handlers to prevent cascading state updates
		const debouncedLandCoverUpdate = useDebounceFn((newValue) => {
			showLandcover.value = toggleStore.helsinkiView ? showLandcover.value : !!newValue
			showHSYWMS.value = !showLandcover.value
		}, 100)

		const debouncedPostalCodeUpdate = useDebounceFn((newPostalCode) => {
			if (!showLandcover.value && newPostalCode) {
				showHSYWMS.value = true
			}
		}, 100)

		// Watch landCover toggle to control mutual exclusivity
		// Capture stop handlers for explicit cleanup on unmount
		const stopWatchLandCover = watch(
			() => toggleStore.landCover,
			(newValue) => {
				debouncedLandCoverUpdate(newValue)
			}
		)

		// Separate control for HSYWMS based on postalcode and landcover visibility
		const stopWatchPostalCode = watch(
			() => store.postalcode,
			(newPostalCode) => {
				debouncedPostalCodeUpdate(newPostalCode)
			}
		)

		onBeforeUnmount(() => {
			eventBus.off('showCapitalRegion')
			eventBus.off('hideCapitalRegion')
			// Stop watchers to prevent stale callbacks
			stopWatchLandCover()
			stopWatchPostalCode()
			// Drop any pending debounced calls so they don't mutate state post-unmount
			debouncedLandCoverUpdate.cancel()
			debouncedPostalCodeUpdate.cancel()
		})

		return {
			showComponents,
			showLandcover,
			showHSYWMS, // Return showHSYWMS to be used in the template
			store,
			buildingStore,
			toggleStore,
		}
	},
}
</script>

<style scoped></style>
