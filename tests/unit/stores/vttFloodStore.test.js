import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { isReactive } from 'vue'
import {
	VTT_DEFAULT_DIMENSION,
	VTT_DEFAULT_OPACITY,
	VTT_FRAME_CACHE_SIZE,
	VTT_OPACITY_MAX,
	VTT_OPACITY_MIN,
} from '@/constants/vttFlood.ts'

const fetchSimulationFrame = vi.fn()
vi.mock('@/services/vttFlood', async () => ({
	...(await vi.importActual('@/services/vttFlood.js')),
	fetchSimulationFrame: (...args) => fetchSimulationFrame(...args),
}))

import { compactFrame } from '@/services/vttFlood.js'
import { useVttFloodStore } from '@/stores/vttFloodStore.ts'

/** A fresh compact frame (new mesh object each call, same geometry). */
function frameFor({ frameNumber }) {
	const ring = [
		[25.04, 60.16],
		[25.041, 60.16],
		[25.041, 60.161],
		[25.04, 60.16],
	]
	return compactFrame([
		{
			type: 'Feature',
			geometry: { coordinates: [ring] },
			properties: { transpiration: frameNumber },
		},
	])
}

describe('vttFloodStore defaults and settings', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
	})

	it('opens on transpiration, the dimension that varies in real VTT frames', () => {
		const store = useVttFloodStore()
		expect(store.dimension).toBe(VTT_DEFAULT_DIMENSION)
		expect(store.dimension).toBe('transpiration')
	})

	it('starts at the default opacity', () => {
		expect(useVttFloodStore().opacity).toBe(VTT_DEFAULT_OPACITY)
	})

	it('clamps opacity to the slider range', () => {
		const store = useVttFloodStore()
		store.setOpacity(5)
		expect(store.opacity).toBe(VTT_OPACITY_MAX)
		store.setOpacity(-1)
		expect(store.opacity).toBe(VTT_OPACITY_MIN)
		store.setOpacity(0.4)
		expect(store.opacity).toBe(0.4)
	})

	it('ignores a non-numeric opacity', () => {
		const store = useVttFloodStore()
		store.setOpacity(0.4)
		store.setOpacity(Number.NaN)
		expect(store.opacity).toBe(0.4)
	})
})

describe('vttFloodStore frame cache', () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		fetchSimulationFrame.mockReset()
		fetchSimulationFrame.mockImplementation(async (params) => frameFor(params))
	})

	it('serves a frame seen before from the cache without fetching', async () => {
		const store = useVttFloodStore()
		await store.fetchCurrentFrame()
		const first = store.frame
		expect(fetchSimulationFrame).toHaveBeenCalledTimes(1)

		store.frameNumber = 5
		await store.fetchCurrentFrame()
		store.frameNumber = 0
		await store.fetchCurrentFrame()

		expect(fetchSimulationFrame).toHaveBeenCalledTimes(2)
		expect(store.frame).toBe(first)
		expect(store.isLoading).toBe(false)
	})

	it('keeps frames out of deep reactivity', async () => {
		const store = useVttFloodStore()
		await store.fetchCurrentFrame()
		expect(isReactive(store.frame)).toBe(false)
		expect(isReactive(store.frame.values)).toBe(false)
	})

	it('shares one mesh object between frames with the same geometry', async () => {
		const store = useVttFloodStore()
		await store.fetchCurrentFrame()
		const mesh = store.frame.mesh
		store.frameNumber = 7
		await store.fetchCurrentFrame()
		expect(store.frame.mesh).toBe(mesh)
	})

	it('never holds more than VTT_FRAME_CACHE_SIZE frames, evicting the oldest', async () => {
		const store = useVttFloodStore()
		for (let n = 0; n <= VTT_FRAME_CACHE_SIZE; n++) {
			store.frameNumber = n
			await store.fetchCurrentFrame()
		}
		expect(store._frameCache.size).toBe(VTT_FRAME_CACHE_SIZE)

		store.frameNumber = 0 // the oldest, evicted
		await store.fetchCurrentFrame()
		expect(fetchSimulationFrame).toHaveBeenCalledTimes(VTT_FRAME_CACHE_SIZE + 2)
	})

	it('empties the cache when the panel closes', async () => {
		const store = useVttFloodStore()
		await store.fetchCurrentFrame()
		store.clear()
		expect(store._frameCache.size).toBe(0)
		expect(store.frame).toBeNull()
	})
})
