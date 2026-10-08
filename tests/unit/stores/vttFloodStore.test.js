import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	VTT_DEFAULT_DIMENSION,
	VTT_DEFAULT_OPACITY,
	VTT_OPACITY_MAX,
	VTT_OPACITY_MIN,
} from '@/constants/vttFlood.ts'
import { useVttFloodStore } from '@/stores/vttFloodStore.ts'

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
