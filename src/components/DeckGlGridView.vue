<template>
	<!--
	  deck.gl renderer spike (behind the `r4c-deckgl-renderer` flag).
	  Full-viewport overlay that replaces the Cesium grid view when the flag is on.
	  This whole component is lazy-loaded (App.vue defineAsyncComponent), so the
	  deck.gl bundle is only fetched once the flag flips and the grid is shown.
	-->
	<div class="deckgl-grid-overlay">
		<canvas
			ref="deckCanvas"
			class="deckgl-canvas"
		/>
		<div class="deckgl-spike-badge">deck.gl spike · 250m grid · WMS EPSG:3857</div>
	</div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { usePropsStore } from '../stores/propsStore.js'
import { buildWmsGetMapUrl } from '../utils/deckglWms.js'
import { getGridFillColorRgba } from '../utils/gridColorMapping.js'
import logger from '../utils/logger.js'

const propsStore = usePropsStore()

const deckCanvas = ref(null)

// --- Spike configuration -----------------------------------------------------
/** Stats grid GeoJSON — already WGS84/EPSG:4326, deck's native LNGLAT input. */
const GRID_URL = '/assets/data/r4c_stats_grid_index.json'
/**
 * One HSY WMS layer requested in EPSG:3857 (water landcover — visually distinct,
 * proves HSY GeoServer's on-the-fly reprojection per WO-5). Routed through the
 * app's existing /wms/proxy path.
 */
const WMS_LAYERS = 'asuminen_ja_maankaytto:maanpeite_vesi_2024'
/** Cesium baseAlpha (0.8, NDVI off) -> 0-255 alpha for parity with the Cesium grid. */
const GRID_ALPHA = 204
/**
 * Approximate the app's start view over the Helsinki capital region
 * (camera.js setCameraToHelsinki centers at 24.945, 60.17 top-down).
 */
const INITIAL_VIEW_STATE = {
	longitude: 24.945,
	latitude: 60.17,
	zoom: 10.5,
	pitch: 0,
	bearing: 0,
}

let deck = null
// Guards against the lazy deck.gl import / grid fetch resolving after the
// component has already unmounted (flag flipped off or grid view left during
// the in-flight async window) — without it, a Deck instance would be created
// and leaked with no onBeforeUnmount to finalize() it.
let isMounted = true

/** Read the JS heap size in MB (Chromium-only), or null if unavailable. */
function readHeapMB() {
	const mem = /** @type {any} */ (performance).memory
	if (mem?.usedJSHeapSize == null) return null
	return Math.round(mem.usedJSHeapSize / 1e5) / 10
}

/**
 * Build the deck layer stack for a given stats index.
 * @param {any} grid - grid GeoJSON (FeatureCollection)
 * @param {string} selectedIndex - the stats index to color by (e.g. 'heat_index')
 * @param {typeof import('@deck.gl/layers')} layers - @deck.gl/layers module
 * @param {typeof import('@deck.gl/geo-layers')} geoLayers - @deck.gl/geo-layers module
 */
function buildLayers(grid, selectedIndex, layers, geoLayers) {
	const { GeoJsonLayer, BitmapLayer } = layers
	const { TileLayer } = geoLayers

	// HSY WMS underlay: stable TileLayer + GetMap template (EPSG:3857), not the
	// experimental WMSLayer (WO-5 recommendation).
	const wmsLayer = new TileLayer({
		id: 'hsy-wms-underlay',
		minZoom: 0,
		maxZoom: 18,
		tileSize: 256,
		// Per-tile WMS GetMap URL built from the tile's WGS84 bbox -> EPSG:3857.
		getTileData: (tile) => {
			const { west, south, east, north } = /** @type {any} */ (tile.bbox)
			return buildWmsGetMapUrl({ bbox: { west, south, east, north }, layers: WMS_LAYERS })
		},
		renderSubLayers: (props) => {
			const { west, south, east, north } = /** @type {any} */ (props.tile.bbox)
			return new BitmapLayer(props, {
				image: props.data,
				bounds: [west, south, east, north],
			})
		},
	})

	// 250m stats grid choropleth — colored with the SAME palette as the Cesium
	// path (utils/gridColorMapping.js), no fork.
	const gridLayer = new GeoJsonLayer({
		id: 'stats-grid',
		data: grid,
		filled: true,
		stroked: true,
		getLineColor: [0, 0, 0, 40],
		lineWidthMinPixels: 0.5,
		getFillColor: (f) =>
			getGridFillColorRgba(/** @type {any} */ (f).properties, selectedIndex, GRID_ALPHA),
		pickable: false,
		// Index in the accessor identity so a stats-index change triggers recolor.
		updateTriggers: {
			getFillColor: [selectedIndex],
		},
	})

	return [wmsLayer, gridLayer]
}

onMounted(async () => {
	const w = /** @type {any} */ (window)
	const selectedIndex = propsStore.statsIndex
	const memBefore = readHeapMB()

	try {
		const loadStart = performance.now()

		// Lazy-import deck.gl alongside the grid fetch. These imports live ONLY in
		// this async component, so the deck bundle stays out of the initial chunk.
		const [{ Deck, MapView }, layers, geoLayers, gridResponse] = await Promise.all([
			import('@deck.gl/core'),
			import('@deck.gl/layers'),
			import('@deck.gl/geo-layers'),
			fetch(GRID_URL),
		])

		// Bail if the component unmounted while the imports/fetch were in flight,
		// so we never instantiate a dangling Deck that nothing will finalize().
		if (!isMounted) return

		if (!gridResponse.ok) {
			throw new Error(`Grid fetch failed: HTTP ${gridResponse.status}`)
		}
		const grid = /** @type {any} */ (await gridResponse.json())
		const featureCount = grid.features?.length ?? 0
		const loadMs = performance.now() - loadStart

		// Build layers + instantiate Deck. Time the layer build + first commit.
		const buildStart = performance.now()
		const initialLayers = buildLayers(grid, selectedIndex, layers, geoLayers)

		deck = new Deck({
			canvas: deckCanvas.value,
			views: [new MapView({ id: 'map', repeat: true })],
			initialViewState: /** @type {any} */ (INITIAL_VIEW_STATE),
			controller: true,
			layers: initialLayers,
			onLoad: () => {
				const buildMs = performance.now() - buildStart
				const memAfter = readHeapMB()
				const metrics = {
					ready: true,
					featureCount,
					loadMs: Math.round(loadMs * 10) / 10,
					layerBuildMs: Math.round(buildMs * 10) / 10,
					memoryBeforeMB: memBefore,
					memoryAfterMB: memAfter,
					memoryDeltaMB:
						memBefore != null && memAfter != null
							? Math.round((memAfter - memBefore) * 10) / 10
							: null,
				}
				logger.info('[DeckGlGridView] grid rendered', metrics)
				// Expose for the spike measurement harness (Playwright/manual).
				w.__deckglSpike = metrics
				w.__deck = deck
			},
		})
	} catch (error) {
		logger.error('[DeckGlGridView] failed to initialize deck.gl grid:', error)
		w.__deckglSpike = { ready: false, error: String(error) }
	}
})

onBeforeUnmount(() => {
	isMounted = false
	if (deck) {
		deck.finalize()
		deck = null
	}
	const w = /** @type {any} */ (window)
	delete w.__deck
})
</script>

<style scoped>
.deckgl-grid-overlay {
	position: absolute;
	inset: 0;
	z-index: 5;
	/* Neutral land backdrop so the Cesium globe underneath does not bleed through
	   the transparent WMS tiles — this is a map surface, not UI chrome. */
	background: #e9e6df;
}

.deckgl-canvas {
	position: absolute;
	inset: 0;
	width: 100%;
	height: 100%;
}

.deckgl-spike-badge {
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
