/**
 * DeckGlMapView owns the single deck.gl instance of the whole-map renderer
 * (ADR-012). deck.gl is replaced by recording stand-ins; the layer registry,
 * imagery and grid factories, camera conversion and stores are real.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { POSTAL_CODE_SOURCES } from '@/constants/postalCodeLayers'
import { useGlobalStore } from '@/stores/globalStore'
import { useToggleStore } from '@/stores/toggleStore'

const decks = []

vi.mock('@deck.gl/core', () => {
	class Deck {
		constructor(props) {
			this.props = props
			this.setProps = vi.fn((next) => Object.assign(this.props, next))
			this.finalize = vi.fn()
			decks.push(this)
		}
	}
	class MapView {
		constructor(props) {
			this.props = props
		}
	}
	return { Deck, MapView }
})

class Recorded {
	constructor(props) {
		this.id = props.id
		this.props = props
	}
}
vi.mock('@deck.gl/layers', () => ({ GeoJsonLayer: Recorded, BitmapLayer: Recorded }))
vi.mock('@deck.gl/geo-layers', () => ({ TileLayer: Recorded }))

const Cesium = await vi.importActual('cesium')
vi.mock('@/services/cesiumProvider', () => ({ getCesium: () => Cesium }))

const { GRID_URL } = await import('@/utils/deckglGridLayer')
const { default: DeckGlMapView } = await import('@/components/DeckGlMapView.vue')

/** Viewer stand-in with a real Cesium camera position and a setView that records. */
function fakeViewer() {
	const listeners = new Set()
	const camera = {
		position: Cesium.Cartesian3.fromDegrees(24.945, 60.17, 4000),
		heading: 0,
		pitch: -Math.PI / 2,
		setView: vi.fn(),
		moveEnd: {
			addEventListener: (fn) => {
				listeners.add(fn)
				return () => listeners.delete(fn)
			},
		},
	}
	/** Move the camera as Cesium-side code would (search, zoom buttons) and raise moveEnd. */
	const moveTo = (lon, lat, alt) => {
		camera.position = Cesium.Cartesian3.fromDegrees(lon, lat, alt)
		for (const fn of listeners) fn()
	}
	return { camera, scene: { requestRender: vi.fn() }, moveTo, listeners }
}

const layerIds = (deck) => deck.props.layers.map((l) => l.id)
const fetchedUrls = () => fetch.mock.calls.map(([url]) => url)

describe('DeckGlMapView', () => {
	let viewer

	beforeEach(() => {
		decks.length = 0
		setActivePinia(createPinia())
		viewer = fakeViewer()
		useGlobalStore().setCesiumViewer(viewer)
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				headers: { get: () => 'application/json' },
				json: async () => ({ type: 'FeatureCollection', features: [] }),
			}))
		)
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('starts deck at the Cesium camera with the base map', async () => {
		const wrapper = mount(DeckGlMapView)
		await flushPromises()
		expect(decks).toHaveLength(1)
		const vs = decks[0].props.initialViewState
		expect(vs.longitude).toBeCloseTo(24.945, 4)
		expect(vs.latitude).toBeCloseTo(60.17, 4)
		expect(vs.pitch).toBeCloseTo(0, 4)
		expect(layerIds(decks[0])).toEqual(['imagery-base', 'postal-codes'])
		wrapper.unmount()
	})

	it('rebuilds the layer stack when a layer toggle changes', async () => {
		const wrapper = mount(DeckGlMapView)
		await flushPromises()
		useToggleStore().landCover = true
		await flushPromises()
		expect(layerIds(decks[0])).toEqual(['imagery-base', 'imagery-landcover-2024', 'postal-codes'])
		wrapper.unmount()
	})

	it('fetches the grid once it is shown and draws it above the imagery', async () => {
		const wrapper = mount(DeckGlMapView)
		await flushPromises()
		expect(fetchedUrls()).not.toContain(GRID_URL)
		useToggleStore().grid250m = true
		await flushPromises()
		expect(fetchedUrls().filter((u) => u === GRID_URL)).toHaveLength(1)
		expect(layerIds(decks[0])).toEqual(['imagery-base', 'postal-codes', 'stats-grid'])
		wrapper.unmount()
	})

	it('swaps the postal code areas with the navigation level and view', async () => {
		const wrapper = mount(DeckGlMapView)
		await flushPromises()
		expect(fetchedUrls()).toEqual([POSTAL_CODE_SOURCES.capitalRegion.url])
		useGlobalStore().setLevel('postalCode')
		await flushPromises()
		expect(layerIds(decks[0])).toEqual(['imagery-base'])
		useToggleStore().setHelsinkiView(true)
		await flushPromises()
		expect(fetchedUrls()).toContain(POSTAL_CODE_SOURCES.helsinki.url)
		expect(layerIds(decks[0])).toEqual(['imagery-base', 'postal-codes'])
		wrapper.unmount()
	})

	it('hands a pending deck camera to Cesium and finalizes deck on unmount', async () => {
		const wrapper = mount(DeckGlMapView)
		await flushPromises()
		const deck = decks[0]
		deck.props.onViewStateChange({
			viewState: { longitude: 25.0, latitude: 60.2, zoom: 13, pitch: 0, bearing: 0 },
		})
		wrapper.unmount()
		expect(deck.finalize).toHaveBeenCalled()
		expect(viewer.camera.setView).toHaveBeenCalledTimes(1)
		const { destination } = viewer.camera.setView.mock.calls[0][0]
		const carto = Cesium.Cartographic.fromCartesian(destination)
		expect(Cesium.Math.toDegrees(carto.longitude)).toBeCloseTo(25.0, 4)
		expect(Cesium.Math.toDegrees(carto.latitude)).toBeCloseTo(60.2, 4)
	})

	it('follows a Cesium-side camera move (search, zoom controls) and stops on unmount', async () => {
		const wrapper = mount(DeckGlMapView)
		await flushPromises()
		viewer.moveTo(25.05, 60.21, 2000)
		const next = decks[0].setProps.mock.calls.at(-1)[0].initialViewState
		expect(next.longitude).toBeCloseTo(25.05, 4)
		expect(next.latitude).toBeCloseTo(60.21, 4)
		wrapper.unmount()
		expect(viewer.listeners.size).toBe(0)
	})

	it('creates no Deck when unmounted before deck.gl finished loading', async () => {
		const wrapper = mount(DeckGlMapView)
		wrapper.unmount()
		await flushPromises()
		expect(decks).toHaveLength(0)
	})
})
