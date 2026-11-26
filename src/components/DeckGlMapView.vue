<template>
	<!--
	  deck.gl map renderer (r4c-deckgl-renderer flag, ADR-012).
	  Full-viewport map that replaces the Cesium view while the flag is on. Each
	  layer type is a factory in the deck.gl layer registry; this component owns
	  the single Deck instance, feeds it store state, and keeps its camera in
	  sync with the hidden Cesium viewer (URL, search, zoom controls). Lazy-loaded (App.vue
	  defineAsyncComponent), so the deck.gl bundle is fetched only with the flag on.
	-->
	<div class="deckgl-map-overlay">
		<canvas
			ref="deckCanvas"
			class="deckgl-canvas"
		/>
		<div class="deckgl-badge">deck.gl renderer (experimental)</div>
	</div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { getCesium } from '../services/cesiumProvider.js'
import { useBackgroundMapStore } from '../stores/backgroundMapStore.js'
import { useGlobalStore } from '../stores/globalStore.js'
import { usePropsStore } from '../stores/propsStore.js'
import { useToggleStore } from '../stores/toggleStore.js'
import { useURLStore } from '../stores/urlStore.js'
import { cesiumCameraToViewState } from '../utils/deckglCamera.js'
import { createCameraSync } from '../utils/deckglCameraSync.js'
import { readCesiumCamera } from '../utils/deckglCesiumBridge.js'
import { GRID_URL, gridLayerDefinition } from '../utils/deckglGridLayer.js'
import { imageryLayerDefinition, readImageryState } from '../utils/deckglImagery.js'
import { createDeckLayerRegistry } from '../utils/deckglLayerRegistry.js'
import logger from '../utils/logger.js'

const globalStore = useGlobalStore()
const toggleStore = useToggleStore()
const propsStore = usePropsStore()
const backgroundMapStore = useBackgroundMapStore()
const urlStore = useURLStore()

const deckCanvas = ref(/** @type {HTMLCanvasElement | null} */ (null))
/** Grid GeoJSON, fetched the first time the grid is shown. */
const gridData = shallowRef(null)

/** Capital-region start view, used when no Cesium camera exists yet. */
const FALLBACK_VIEW_STATE = { longitude: 24.945, latitude: 60.17, zoom: 10.5, pitch: 0, bearing: 0 }

const registry = createDeckLayerRegistry({
	onError: (id, error) => logger.error(`[DeckGlMapView] layer "${id}" failed to build:`, error),
})
registry.register(imageryLayerDefinition)
registry.register(gridLayerDefinition)

/** Plain-value map state; the registry factories never read Pinia directly. */
const mapState = computed(() => ({
	...readImageryState({ toggleStore, backgroundMapStore, urlStore }),
	grid: {
		visible: Boolean(toggleStore.grid250m),
		statsIndex: propsStore.statsIndex,
		data: gridData.value,
	},
}))

let deck = null
let modules = null
/** Two-way camera sync with the hidden Cesium viewer (URL, search, zoom controls). */
let cameraSync = null
// Guards the lazy imports resolving after unmount (flag flipped off mid-load),
// which would otherwise leave a Deck nothing finalizes.
let isMounted = true
let gridFetch = null

function viewport() {
	const canvas = deckCanvas.value
	return { width: canvas?.clientWidth || 1920, height: canvas?.clientHeight || 1080 }
}

function initialViewState() {
	try {
		const camera = readCesiumCamera(globalStore.cesiumViewer, getCesium())
		if (camera) return cesiumCameraToViewState(camera, viewport())
	} catch (error) {
		logger.debug('[DeckGlMapView] no Cesium camera to start from:', error)
	}
	return FALLBACK_VIEW_STATE
}

function renderLayers() {
	if (!deck || !modules) return
	deck.setProps({ layers: registry.buildLayers({ state: mapState.value, modules }) })
}

function loadGridData() {
	if (gridData.value || gridFetch) return
	gridFetch = fetch(GRID_URL)
		.then((response) => {
			if (!response.ok) throw new Error(`Grid fetch failed: HTTP ${response.status}`)
			return response.json()
		})
		.then((json) => {
			if (isMounted) gridData.value = json
		})
		.catch((error) => {
			logger.error('[DeckGlMapView] failed to load the statistics grid:', error)
		})
		.finally(() => {
			gridFetch = null
		})
}

const stopGridWatch = watch(
	() => toggleStore.grid250m,
	(visible) => {
		if (visible) loadGridData()
	},
	{ immediate: true }
)
const stopStateWatch = watch(mapState, renderLayers)

/** Jump deck to a camera set from the Cesium side (search, zoom buttons, flyTo). */
function followCesium(next) {
	deck?.setProps({ initialViewState: /** @type {any} */ ({ ...next }) })
}

/** (Re)start camera sync whenever the viewer appears or is replaced. */
function startCameraSync(viewer) {
	cameraSync?.dispose()
	cameraSync = null
	if (!viewer || !deck) return
	cameraSync = createCameraSync({
		viewer,
		Cesium: getCesium(),
		getViewport: viewport,
		onCesiumMove: followCesium,
	})
}
const stopViewerWatch = watch(
	() => globalStore.cesiumViewer,
	(viewer) => {
		const fresh = !cameraSync
		startCameraSync(viewer)
		// The viewer arrived after deck (flag on at page load): open at its camera.
		if (fresh && cameraSync) followCesium(initialViewState())
	}
)

onMounted(async () => {
	const w = /** @type {any} */ (window)
	try {
		const [core, layers, geoLayers] = await Promise.all([
			import('@deck.gl/core'),
			import('@deck.gl/layers'),
			import('@deck.gl/geo-layers'),
		])
		if (!isMounted) return
		modules = { core, layers, geoLayers }
		deck = new core.Deck({
			canvas: deckCanvas.value,
			views: [new core.MapView({ id: 'map', repeat: true })],
			initialViewState: /** @type {any} */ (initialViewState()),
			controller: true,
			onViewStateChange: ({ viewState: next }) => {
				cameraSync?.pushFromDeck(next)
			},
			layers: /** @type {any} */ (registry.buildLayers({ state: mapState.value, modules })),
		})
		w.__deck = deck
		startCameraSync(globalStore.cesiumViewer)
	} catch (error) {
		logger.error('[DeckGlMapView] failed to initialize deck.gl:', error)
	}
})

onBeforeUnmount(() => {
	isMounted = false
	stopGridWatch()
	stopStateWatch()
	stopViewerWatch()
	// Keep the view when the flag turns off: dispose applies any deck move not
	// yet handed to Cesium.
	try {
		cameraSync?.dispose()
	} catch (error) {
		logger.debug('[DeckGlMapView] could not hand the camera back to Cesium:', error)
	}
	cameraSync = null
	if (deck) {
		deck.finalize()
		deck = null
	}
	const w = /** @type {any} */ (window)
	delete w.__deck
})
</script>

<style scoped>
.deckgl-map-overlay {
	position: absolute;
	inset: 0;
	z-index: 5;
	/* Neutral land backdrop so the Cesium globe underneath does not bleed through
	   transparent tiles. Map surface, not UI chrome. */
	background: #e9e6df;
}

.deckgl-canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.deckgl-badge {
	position: absolute;
	top: 8px;
	left: 50%;
	transform: translateX(-50%);
	z-index: 6;
	padding: 4px 10px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: 600;
	pointer-events: none;
	background: rgba(var(--v-theme-primary), 0.9);
	color: rgb(var(--v-theme-on-primary));
}
</style>
