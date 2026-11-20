/**
 * Helsinki.loadHelsinkiGreenElements loads vegetation, trees and other nature in
 * sequence. Tree.loadTrees rejects when every tree category fails (#1152), and
 * that rejection must not skip the other nature layer that follows it. The real
 * Tree service runs here with only fetch stubbed, so the rejection comes through
 * unifiedLoader and progressiveLoader the way it does in the browser.
 */

import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Helsinki from '@/services/helsinki.js'
import { useGlobalStore } from '@/stores/globalStore.js'
import { useToggleStore } from '@/stores/toggleStore.js'

const loaders = vi.hoisted(() => ({
	otherNature: vi.fn(async () => {}),
	vegetation: vi.fn(async () => {}),
}))

vi.mock('@/services/building.js', () => ({ default: class {} }))
vi.mock('@/services/elementsDisplay.js', () => ({ default: class {} }))
vi.mock('@/services/datasource.js', () => ({
	default: class {
		addDataSourceWithPolygonFix = vi.fn(async () => [])
	},
}))
vi.mock('@/services/vegetation.js', () => ({
	default: class {
		loadVegetation = loaders.vegetation
	},
}))
vi.mock('@/services/othernature.js', () => ({
	default: class {
		loadOtherNature = loaders.otherNature
	},
}))

describe('Helsinki green elements when the tree load fails', { tags: ['@unit'] }, () => {
	beforeEach(() => {
		setActivePinia(createPinia())
		vi.spyOn(console, 'error').mockImplementation(() => {})
		vi.spyOn(console, 'warn').mockImplementation(() => {})
		loaders.otherNature.mockReset().mockResolvedValue(undefined)
		loaders.vegetation.mockReset().mockResolvedValue(undefined)
		useGlobalStore().setPostalCode('00100')
		const toggleStore = useToggleStore()
		toggleStore.showTrees = true
		toggleStore.showOtherNature = true
	})

	afterEach(() => {
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('still loads other nature when every tree category returns 503', async () => {
		const fetchMock = vi.fn(async () => new Response('', { status: 503 }))
		vi.stubGlobal('fetch', fetchMock)

		await expect(new Helsinki().loadHelsinkiGreenElements()).resolves.toBeUndefined()

		expect(fetchMock).toHaveBeenCalled()
		expect(loaders.otherNature).toHaveBeenCalledTimes(1)
	})
})
