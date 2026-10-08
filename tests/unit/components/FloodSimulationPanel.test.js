/**
 * FloodSimulationPanel draws through renderFlood, which restyles all 13,077
 * cells of a real VTT frame. Every panel change (frame, dimension, opacity)
 * used to restyle synchronously, so an opacity drag restyled many times per
 * animation frame. Renders are now coalesced to one per animation frame.
 */
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { markRaw, nextTick } from 'vue'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'

const renderFlood = vi.fn()
const hideFlood = vi.fn()
const clearFlood = vi.fn()
const fetchSimulationFrame = vi.fn()
vi.mock('@/services/vttFlood', async () => ({
	...(await vi.importActual('@/services/vttFlood.js')),
	fetchSimulationFrame: (...args) => fetchSimulationFrame(...args),
	renderFlood: (...args) => renderFlood(...args),
	hideFlood: (...args) => hideFlood(...args),
	clearFlood: (...args) => clearFlood(...args),
}))
vi.mock('@/services/vttFloodCamera.js', () => ({ flyToFloodExtent: vi.fn() }))

import FloodSimulationPanel from '@/components/FloodSimulationPanel.vue'
import { compactFrame } from '@/services/vttFlood.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useVttFloodStore } from '@/stores/vttFloodStore.ts'

/** A two-cell frame tagged like fetchSimulationFrame's output. */
function frameFor({ scenarioId, frameNumber }) {
	const ring = (x) => [
		[25.04 + x, 60.16],
		[25.041 + x, 60.16],
		[25.041 + x, 60.161],
	]
	const features = [0, 0.01].map((x, i) => ({
		type: 'Feature',
		geometry: { coordinates: [ring(x)] },
		properties: {
			transpiration: 0.01 * (i + 1) * frameNumber,
			overland_water_depth: 0.05 * (i + 1),
			upper_storage_water_depth: 0.001,
			canopy_air_temperature: 5,
		},
	}))
	return { ...compactFrame(features), scenarioId, synthetic: false }
}

/** Animation-frame callbacks queued by the component, run by flushAnimationFrame. */
let animationFrames

function flushAnimationFrame() {
	const queued = [...animationFrames.values()]
	animationFrames.clear()
	for (const callback of queued) callback(performance.now())
}

async function mountPanel() {
	const wrapper = mount(FloodSimulationPanel, {
		global: { plugins: [createVuetify({ components, directives })] },
	})
	await flushPromises() // the mount fetch
	await nextTick()
	return wrapper
}

beforeEach(() => {
	setActivePinia(createPinia())
	useGlobalStore().cesiumViewer = markRaw({ scene: {} })
	animationFrames = new Map()
	let nextHandle = 1
	vi.stubGlobal('requestAnimationFrame', (callback) => {
		const handle = nextHandle++
		animationFrames.set(handle, callback)
		return handle
	})
	vi.stubGlobal('cancelAnimationFrame', (handle) => animationFrames.delete(handle))
	renderFlood.mockReset()
	hideFlood.mockReset()
	clearFlood.mockReset()
	fetchSimulationFrame.mockReset()
	fetchSimulationFrame.mockImplementation(async (params) => frameFor(params))
})

afterEach(() => {
	vi.unstubAllGlobals()
})

describe('FloodSimulationPanel rendering', { tags: ['@unit'] }, () => {
	it('renders the fetched frame on the next animation frame', async () => {
		const wrapper = await mountPanel()
		expect(renderFlood).not.toHaveBeenCalled()
		flushAnimationFrame()
		expect(renderFlood).toHaveBeenCalledTimes(1)
		expect(renderFlood.mock.calls[0][0]).toMatchObject({ dimension: 'transpiration' })
		wrapper.unmount()
	})

	it('restyles once per animation frame however often the opacity changes', async () => {
		const wrapper = await mountPanel()
		flushAnimationFrame()
		renderFlood.mockClear()

		const store = useVttFloodStore()
		for (let step = 0; step < 10; step++) {
			store.setOpacity(0.2 + step * 0.05)
			await nextTick()
		}
		flushAnimationFrame()

		expect(renderFlood).toHaveBeenCalledTimes(1)
		expect(renderFlood.mock.calls[0][0].opacity).toBeCloseTo(0.65)
		wrapper.unmount()
	})

	it('cancels a pending render on unmount, so nothing redraws the cleared layer', async () => {
		const wrapper = await mountPanel()
		expect(animationFrames.size).toBe(1)
		wrapper.unmount()
		expect(animationFrames.size).toBe(0)
		expect(clearFlood).toHaveBeenCalledTimes(1)
		expect(renderFlood).not.toHaveBeenCalled()
	})
})
