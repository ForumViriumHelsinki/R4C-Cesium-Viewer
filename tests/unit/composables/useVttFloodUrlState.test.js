/**
 * useVttFloodUrlState: flood panel state in the query string. Values read from
 * the URL are validated, writes keep every other parameter, a shared link opens
 * the panel once the flag and viewer are ready, and a link that carries its own
 * camera is not overridden by the default framing.
 */

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, ref } from 'vue'

// Real Cesium math for the camera writer (tests/setup.js mocks `cesium` globally).
vi.mock('@/services/cesiumProvider.js', async () => {
	const Cesium = await vi.importActual('cesium')
	return { getCesium: () => Cesium }
})

const fetchSimulationFrame = vi.fn()
vi.mock('@/services/vttFlood', async () => ({
	...(await vi.importActual('@/services/vttFlood.js')),
	fetchSimulationFrame: (...args) => fetchSimulationFrame(...args),
}))

import { useUrlState } from '@/composables/useUrlState.js'
import {
	parseVttFloodUrlParams,
	serializeVttFloodUrlParams,
	useVttFloodUrlState,
	writeVttFloodUrlParams,
} from '@/composables/useVttFloodUrlState.js'
import {
	VTT_DEFAULT_DIMENSION,
	VTT_DEFAULT_FRAME,
	VTT_DEFAULT_OPACITY,
	VTT_URL_UPDATE_DEBOUNCE_MS,
} from '@/constants/vttFlood.ts'
import { useFeatureFlagStore } from '@/stores/featureFlagStore'
import { useVttFloodStore } from '@/stores/vttFloodStore.ts'
import logger from '@/utils/logger.js'

const FOREIGN =
	'lon=25.05&lat=60.16&alt=900&heading=0&pitch=-45&level=postalcode&postalcode=00590&flags=true'

let replaceState

/** Point window.location at `search`; history.replaceState updates it like a browser. */
function setUrl(search) {
	window.location = { href: `http://localhost:3000/${search}`, pathname: '/', search, hash: '' }
}

beforeEach(() => {
	localStorage.clear()
	setActivePinia(createPinia())
	setUrl('')
	replaceState = vi.fn((_state, _title, url) => {
		const query = url.includes('?') ? url.slice(url.indexOf('?')) : ''
		setUrl(query)
	})
	vi.spyOn(window.history, 'replaceState').mockImplementation(replaceState)
	vi.spyOn(logger, 'warn').mockImplementation(() => {})
	fetchSimulationFrame.mockReset()
})

afterEach(() => {
	vi.useRealTimers()
	vi.restoreAllMocks()
})

describe('parseVttFloodUrlParams', () => {
	it('reads a complete shared link', () => {
		expect(
			parseVttFloodUrlParams(
				'?vtt=1&vttscenario=2&vttframe=120&vttdim=transpiration&vttopacity=0.4'
			)
		).toEqual({
			open: true,
			scenarioId: '2',
			frameNumber: 120,
			dimension: 'transpiration',
			opacity: 0.4,
		})
	})

	it.each(['', 'vtt=0', 'vtt=true', 'vtt=1x'])('treats %j as closed and ignores the rest', (q) => {
		expect(parseVttFloodUrlParams(`?${q}&vttscenario=2&vttframe=5`)).toEqual({ open: false })
	})

	it.each([
		'1e2',
		' 5',
		'',
		'0x1f',
		'-1',
		'12.5',
		'288',
		'99999',
	])('rejects vttframe=%j with a warning', (frame) => {
		const parsed = parseVttFloodUrlParams(`?vtt=1&vttframe=${encodeURIComponent(frame)}`)
		expect(parsed).toEqual({ open: true })
		expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('vttframe='))
	})

	it('accepts the last served frame', () => {
		expect(parseVttFloodUrlParams('?vtt=1&vttframe=287').frameNumber).toBe(287)
	})

	it.each(['9', '1;drop', '', '01'])('rejects vttscenario=%j', (id) => {
		expect(parseVttFloodUrlParams(`?vtt=1&vttscenario=${encodeURIComponent(id)}`)).toEqual({
			open: true,
		})
	})

	it.each(['__proto__', 'constructor', 'TRANSPIRATION', ''])('rejects vttdim=%j', (dim) => {
		expect(parseVttFloodUrlParams(`?vtt=1&vttdim=${encodeURIComponent(dim)}`)).toEqual({
			open: true,
		})
	})

	it.each(['0', '0.05', '1.5', '2', 'NaN', '.5', '0.5e0', '-0.5'])('rejects vttopacity=%j', (o) => {
		expect(parseVttFloodUrlParams(`?vtt=1&vttopacity=${encodeURIComponent(o)}`)).toEqual({
			open: true,
		})
	})

	it('keeps the valid parameters when one is invalid', () => {
		expect(parseVttFloodUrlParams('?vtt=1&vttscenario=9&vttframe=7&vttdim=nope')).toEqual({
			open: true,
			frameNumber: 7,
		})
	})

	it('truncates an untrusted value echoed into the log', () => {
		parseVttFloodUrlParams(`?vtt=1&vttdim=${'x'.repeat(500)}`)
		const [message] = logger.warn.mock.calls[0]
		expect(message.length).toBeLessThan(100)
	})
})

describe('serializeVttFloodUrlParams / writeVttFloodUrlParams', () => {
	const STATE = {
		scenarioId: '3',
		frameNumber: 42,
		dimension: 'overland_water_depth',
		opacity: 0.55,
	}

	it('round-trips through the parser', () => {
		const query = serializeVttFloodUrlParams('', STATE)
		expect(parseVttFloodUrlParams(`?${query}`)).toEqual({ open: true, ...STATE })
	})

	it('writes all five parameters and keeps every other one', () => {
		setUrl(`?${FOREIGN}`)
		writeVttFloodUrlParams(STATE)
		const params = new URLSearchParams(window.location.search)
		for (const [key, value] of new URLSearchParams(FOREIGN)) expect(params.get(key)).toBe(value)
		expect(params.get('vtt')).toBe('1')
		expect(params.get('vttscenario')).toBe('3')
		expect(params.get('vttframe')).toBe('42')
		expect(params.get('vttdim')).toBe('overland_water_depth')
		expect(params.get('vttopacity')).toBe('0.55')
	})

	it('removes only its own parameters on null', () => {
		setUrl(`?${FOREIGN}`)
		writeVttFloodUrlParams(STATE)
		writeVttFloodUrlParams(null)
		expect(window.location.search).toBe(`?${FOREIGN}`)
		expect(replaceState).toHaveBeenLastCalledWith({ path: `/?${FOREIGN}` }, '', `/?${FOREIGN}`)
	})

	it('leaves no dangling ? when nothing remains', () => {
		writeVttFloodUrlParams(STATE)
		writeVttFloodUrlParams(null)
		expect(replaceState).toHaveBeenLastCalledWith({ path: '/' }, '', '/')
	})

	it('survives the camera URL writer, which rewrites the same query string', async () => {
		vi.useFakeTimers()
		const Cesium = await vi.importActual('cesium')
		writeVttFloodUrlParams(STATE)
		const viewer = {
			camera: {
				position: Cesium.Cartesian3.fromDegrees(25.05, 60.16, 900),
				heading: 0,
				pitch: Cesium.Math.toRadians(-35),
			},
		}
		useUrlState().updateUrlFromCamera(viewer)
		vi.runAllTimers()
		const params = new URLSearchParams(window.location.search)
		expect(params.get('lon')).toBe('25.050000')
		expect(parseVttFloodUrlParams(window.location.search)).toEqual({ open: true, ...STATE })
	})
})

describe('useVttFloodUrlState', () => {
	/** Run the composable in its own effect scope. */
	function mount({ open = false, viewer = true } = {}) {
		const isOpen = ref(open)
		const viewerReady = ref(viewer)
		const onRestoreOpen = vi.fn(() => {
			isOpen.value = true
		})
		const scope = effectScope()
		const api = scope.run(() => useVttFloodUrlState({ isOpen, viewerReady, onRestoreOpen }))
		return { isOpen, viewerReady, onRestoreOpen, scope, api }
	}

	const enableFlag = () => useFeatureFlagStore().setFlag('vttFloodSimulation', true)

	/** Let the lazy store import, the restore and Vue's watcher queue settle. */
	async function settle(api) {
		await api.ready()
		await nextTick()
	}

	it('waits for the flag before restoring, and leaves the link alone meanwhile', async () => {
		// A frame other than VTT_DEFAULT_FRAME, so the restore is observable.
		setUrl('?vtt=1&vttscenario=2&vttframe=200&vttdim=overland_water_depth')
		const { onRestoreOpen, api } = mount()
		await settle(api)
		expect(onRestoreOpen).not.toHaveBeenCalled()
		expect(replaceState).not.toHaveBeenCalled()

		enableFlag()
		await nextTick()
		await settle(api)
		expect(onRestoreOpen).toHaveBeenCalledTimes(1)
		const store = useVttFloodStore()
		expect(store.scenarioId).toBe('2')
		expect(store.frameNumber).toBe(200)
		expect(store.dimension).toBe('overland_water_depth')
		expect(fetchSimulationFrame).not.toHaveBeenCalled()
	})

	it('waits for the viewer too', async () => {
		setUrl('?vtt=1')
		enableFlag()
		const { onRestoreOpen, viewerReady, api } = mount({ viewer: false })
		await settle(api)
		expect(onRestoreOpen).not.toHaveBeenCalled()
		viewerReady.value = true
		await nextTick()
		await settle(api)
		expect(onRestoreOpen).toHaveBeenCalledTimes(1)
	})

	it('restores once, however often the flag flips', async () => {
		setUrl('?vtt=1')
		enableFlag()
		const { onRestoreOpen, api } = mount()
		await settle(api)
		const flags = useFeatureFlagStore()
		flags.setFlag('vttFloodSimulation', false)
		await nextTick()
		flags.setFlag('vttFloodSimulation', true)
		await nextTick()
		await settle(api)
		expect(onRestoreOpen).toHaveBeenCalledTimes(1)
	})

	it('skips the default flight when the link carries a camera', async () => {
		setUrl(`?${FOREIGN}&vtt=1`)
		enableFlag()
		const { onRestoreOpen, api } = mount()
		await settle(api)
		expect(onRestoreOpen).toHaveBeenCalledWith({ skipFlight: true })
	})

	it('flies when the link has no camera, even if the camera writer adds one before the flag resolves', async () => {
		setUrl('?vtt=1&vttframe=10')
		const { onRestoreOpen, api } = mount()
		setUrl('?vtt=1&vttframe=10&lon=24.9&lat=60.2') // camera moveEnd writer
		enableFlag()
		await nextTick()
		await settle(api)
		expect(onRestoreOpen).toHaveBeenCalledWith({ skipFlight: false })
	})

	it('does not open the panel for a link without vtt=1', async () => {
		setUrl(`?${FOREIGN}&vttframe=10`)
		enableFlag()
		const { onRestoreOpen, api } = mount()
		await settle(api)
		expect(onRestoreOpen).not.toHaveBeenCalled()
		expect(replaceState).not.toHaveBeenCalled()
	})

	it('writes all parameters, defaults included, after the panel opens', async () => {
		vi.useFakeTimers()
		const { isOpen, api } = mount()
		isOpen.value = true
		await nextTick()
		await settle(api)
		expect(replaceState).not.toHaveBeenCalled()
		vi.advanceTimersByTime(VTT_URL_UPDATE_DEBOUNCE_MS)
		expect(parseVttFloodUrlParams(window.location.search)).toEqual({
			open: true,
			scenarioId: '1',
			frameNumber: VTT_DEFAULT_FRAME,
			dimension: VTT_DEFAULT_DIMENSION,
			opacity: VTT_DEFAULT_OPACITY,
		})
	})

	it('coalesces slider scrubbing into one write', async () => {
		vi.useFakeTimers()
		const { isOpen, api } = mount()
		isOpen.value = true
		await nextTick()
		await settle(api)
		const store = useVttFloodStore()
		for (let frame = 1; frame <= 10; frame++) {
			store.frameNumber = frame
			await nextTick()
			vi.advanceTimersByTime(VTT_URL_UPDATE_DEBOUNCE_MS / 2)
		}
		expect(replaceState).not.toHaveBeenCalled()
		vi.advanceTimersByTime(VTT_URL_UPDATE_DEBOUNCE_MS)
		expect(replaceState).toHaveBeenCalledTimes(1)
		expect(new URLSearchParams(window.location.search).get('vttframe')).toBe('10')
	})

	it('removes the parameters at once on close, and a pending write does not re-add them', async () => {
		vi.useFakeTimers()
		setUrl(`?${FOREIGN}`)
		const { isOpen, api } = mount()
		isOpen.value = true
		await nextTick()
		await settle(api)
		vi.advanceTimersByTime(VTT_URL_UPDATE_DEBOUNCE_MS)
		expect(parseVttFloodUrlParams(window.location.search).open).toBe(true)

		useVttFloodStore().dimension = 'overland_water_depth' // schedules a write
		await nextTick()
		isOpen.value = false
		await nextTick()
		expect(window.location.search).toBe(`?${FOREIGN}`)
		vi.advanceTimersByTime(VTT_URL_UPDATE_DEBOUNCE_MS * 2)
		expect(window.location.search).toBe(`?${FOREIGN}`)
	})

	it('stops writing once its scope is disposed', async () => {
		vi.useFakeTimers()
		const { isOpen, scope, api } = mount()
		isOpen.value = true
		await nextTick()
		await settle(api)
		scope.stop()
		vi.advanceTimersByTime(VTT_URL_UPDATE_DEBOUNCE_MS)
		expect(replaceState).not.toHaveBeenCalled()
	})
})

describe('vttFloodStore.hydrateFromUrl', () => {
	it('sets the panel state without fetching or arming the frame debounce', () => {
		const store = useVttFloodStore()
		store.hydrateFromUrl({
			scenarioId: '3',
			frameNumber: 200,
			dimension: 'overland_water_depth',
			opacity: 0.3,
		})
		expect(store.scenarioId).toBe('3')
		expect(store.frameNumber).toBe(200)
		expect(store.dimension).toBe('overland_water_depth')
		expect(store.opacity).toBe(0.3)
		expect(store.frame).toBeNull()
		expect(store._debounceTimer).toBeNull()
		expect(fetchSimulationFrame).not.toHaveBeenCalled()
	})

	it('re-validates and skips invalid values independently', () => {
		const store = useVttFloodStore()
		store.hydrateFromUrl({ scenarioId: '9', frameNumber: 288, dimension: 'nope' })
		expect(store.scenarioId).toBe('1')
		expect(store.frameNumber).toBe(VTT_DEFAULT_FRAME)
		expect(store.dimension).toBe(VTT_DEFAULT_DIMENSION)
		store.hydrateFromUrl({ scenarioId: '9', frameNumber: 5 })
		expect(store.frameNumber).toBe(5)
	})
})
